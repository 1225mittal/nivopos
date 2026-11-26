/**
 * Nivo POS - Purchase Bill OCR Parsing Handler
 * File: api/parse-purchase-bill.ts
 *
 * Serverless API using Groq AI OCR (llama-3.2-11b-vision-preview / llama-3.3-70b-versatile)
 * Extracts structured inventory line items from wholesaler / distributor purchase bills.
 */

interface PurchaseBillItemResponse {
  name: string;
  qty: number;
  unit: string;
  purchase_price: number;
  selling_price?: number;
  gst_rate: number;
  total_amount: number;
}

interface ParsedBillResponse {
  supplier_name: string;
  bill_number: string;
  bill_date: string;
  items: PurchaseBillItemResponse[];
  subtotal: number;
  total_gst: number;
  grand_total: number;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Purchase bill parsing requires POST.',
    });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({
      success: false,
      error: 'Server GROQ_API_KEY is not configured. Please set GROQ_API_KEY.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { image, images, text } = body;

    const imageList: string[] =
      Array.isArray(images) && images.length > 0
        ? images
        : image
        ? [image]
        : [];

    if (imageList.length === 0 && !text) {
      return res.status(400).json({
        success: false,
        error: 'Either "image"/"images" (base64 data URL) or "text" (bill text) must be provided.',
      });
    }

    const systemPrompt = `You are an expert Indian retail & Kirana tax invoice / wholesale purchase bill OCR parser.
Extract supplier and line item details strictly as valid JSON with no markdown formatting.
Output Schema:
{
  "supplier_name": "Wholesaler / Distributor Name",
  "bill_number": "Invoice / Bill Number",
  "bill_date": "YYYY-MM-DD",
  "items": [
    {
      "name": "Item Description / Product Name",
      "qty": 10,
      "unit": "pcs", // "pcs", "kg", "pack", "box", "ltr", "gm"
      "purchase_price": 45.0,
      "selling_price": 55.0,
      "gst_rate": 5, // 0, 5, 12, 18, 28
      "total_amount": 450.0
    }
  ],
  "subtotal": 450.0,
  "total_gst": 22.5,
  "grand_total": 472.5
}
All prices and quantities must be numbers. If selling price is not printed, estimate selling_price = round(purchase_price * 1.20).`;

    let groqPayload: any;

    if (imageList.length > 0) {
      // Vision Model: llama-3.2-11b-vision-preview (supporting up to 4 pages/images)
      const userContent: any[] = [
        {
          type: 'text',
          text: 'Extract all line items, supplier name, invoice number, and totals across all pages of this Indian wholesale purchase bill / delivery challan into JSON.',
        },
      ];

      for (const img of imageList.slice(0, 4)) {
        const imageUrl = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
        userContent.push({
          type: 'image_url',
          image_url: { url: imageUrl },
        });
      }

      groqPayload = {
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      };
    } else {
      // Text Model: llama-3.3-70b-versatile
      groqPayload = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract all line items, supplier, bill number, and totals from this bill text:\n\n${text}`,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      };
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(groqPayload),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('[Groq API Error]:', groqResponse.status, errText);
      return res.status(groqResponse.status).json({
        success: false,
        error: `Groq OCR failed with status ${groqResponse.status}: ${errText}`,
      });
    }

    const completion = await groqResponse.json();
    const rawContent = completion.choices?.[0]?.message?.content;

    if (!rawContent) {
      return res.status(500).json({
        success: false,
        error: 'No text returned from Groq OCR model.',
      });
    }

    // Clean JSON markdown if wrapped
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: ParsedBillResponse = JSON.parse(cleanedJson);

    // Sanitize items array
    const sanitizedItems: PurchaseBillItemResponse[] = (parsed.items || []).map((item) => {
      const qty = Number(item.qty) || 1;
      const purchasePrice = Number(item.purchase_price) || 0;
      const gstRate = Number(item.gst_rate) || 0;
      const sellingPrice =
        Number(item.selling_price) || Math.round(purchasePrice * 1.2 * 100) / 100;
      const totalAmount =
        Number(item.total_amount) || Math.round(purchasePrice * qty * 100) / 100;

      return {
        name: String(item.name || 'Stock Item').trim(),
        qty: qty,
        unit: String(item.unit || 'pcs').toLowerCase(),
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        gst_rate: gstRate,
        total_amount: totalAmount,
      };
    });

    const subtotal =
      Number(parsed.subtotal) ||
      sanitizedItems.reduce((acc, i) => acc + i.purchase_price * i.qty, 0);
    const totalGst =
      Number(parsed.total_gst) ||
      sanitizedItems.reduce((acc, i) => acc + (i.purchase_price * i.qty * i.gst_rate) / 100, 0);
    const grandTotal = Number(parsed.grand_total) || subtotal + totalGst;

    return res.status(200).json({
      success: true,
      data: {
        supplier_name: parsed.supplier_name || 'Wholesale Supplier',
        bill_number: parsed.bill_number || `PB-${Date.now().toString().slice(-6)}`,
        bill_date: parsed.bill_date || new Date().toISOString().slice(0, 10),
        items: sanitizedItems,
        subtotal: Math.round(subtotal * 100) / 100,
        total_gst: Math.round(totalGst * 100) / 100,
        grand_total: Math.round(grandTotal * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error('[parse-purchase-bill Exception]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process purchase bill OCR',
    });
  }
}
