/**
 * Nivo POS - Purchase Bill OCR Parsing Handler
 * File: api/parse-purchase-bill.ts
 *
 * Serverless API using Groq AI OCR (qwen/qwen3.8-27b / llama-3.3-70b-versatile)
 * Extracts structured inventory line items and seller details strictly from values
 * explicitly printed on wholesaler / distributor purchase bills.
 */

export interface ParsedBillItem {
  item_name: string;
  mrp: number | null;
  price_without_tax: number;
  gst_rate: number;
  price_after_tax: number;
  quantity: number;
  amount: number;
  barcode: string;
  category: string;
  sub_category: string;
  // Aliases for seamless backward compatibility
  name: string;
  qty: number;
  unit: string;
  purchase_price: number;
  selling_price: number | null;
  total_amount: number;
}

export interface ParsedBillResponse {
  supplier_name: string;
  supplier_gstin: string;
  supplier_address: string;
  supplier_contact: string;
  supplier_email: string;
  supplier_fssai: string;
  bill_number: string;
  bill_date: string;
  items: ParsedBillItem[];
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

    const systemPrompt = `You are a strict, precision Indian wholesale tax invoice / purchase bill OCR extraction engine.
CRITICAL MANDATE:
Extract ONLY information that is EXPLICITLY PRINTED on the document.
DO NOT guess, DO NOT calculate, DO NOT estimate, and DO NOT infer any unprinted values.
If any field or attribute is not explicitly printed in the text or table of the bill:
- For text fields (category, sub_category, barcode, supplier_gstin, supplier_address, supplier_contact, supplier_email, supplier_fssai): return "" (empty string).
- For mrp / selling_price: return null if there is no explicit "MRP" printed for that item. NEVER guess or estimate retail MRP from purchase rates.

Output Schema strictly as valid JSON:
{
  "supplier_name": "Exact seller business name printed on the invoice header, or empty string",
  "supplier_gstin": "15-digit GSTIN printed on invoice, or empty string if not printed",
  "supplier_address": "Seller address printed on invoice, or empty string if not printed",
  "supplier_contact": "Seller phone / mobile printed on invoice, or empty string if not printed",
  "supplier_email": "Seller email printed on invoice, or empty string if not printed",
  "supplier_fssai": "Seller FSSAI license printed on invoice, or empty string if not printed",
  "bill_number": "Invoice / bill / challan number printed, or empty string if not printed",
  "bill_date": "Invoice date printed in YYYY-MM-DD format, or empty string if not printed",
  "items": [
    {
      "item_name": "Exact product description / name printed on this line item",
      "mrp": null, // ONLY a number if an explicit "MRP" column or label is printed for this item. Otherwise null.
      "price_without_tax": 0.0, // Base rate / taxable rate per unit before GST if printed
      "gst_rate": 0, // GST % slab printed (e.g. 0, 5, 12, 18, 28)
      "price_after_tax": 0.0, // Gross unit rate including tax if printed
      "quantity": 1, // Quantity printed
      "amount": 0.0, // Line taxable or net amount printed
      "barcode": "", // Barcode / EAN-13 / UPC ONLY if explicitly printed on the bill, else ""
      "category": "", // Category ONLY if explicitly printed on the bill, else ""
      "sub_category": "", // Sub-category ONLY if explicitly printed on the bill, else ""
      "unit": "pcs" // Unit printed (e.g. "pcs", "kg", "pack", "box", "ltr", "gm") or "pcs"
    }
  ],
  "subtotal": 0.0, // Taxable subtotal printed on bill
  "total_gst": 0.0, // Total tax amount printed on bill
  "grand_total": 0.0 // Grand total / net invoice amount printed on bill
}

Rules:
1. Seller vs Buyer: Extract details of the SELLER / DISTRIBUTOR (the issuer of the bill), NOT the buyer / consignee.
2. Absolutely NO Category or Sub-Category Hallucination: Wholesale bills almost never print retail categories. Unless the invoice explicitly contains a "Category" or "Department" column, return "" for category and sub_category.
3. Absolutely NO MRP Guessing: Most B2B wholesale invoices only list wholesale buy rates (Base Rate, Taxable Value, GST). Do NOT multiply by 1.2 or estimate MRP. If no MRP is printed, return null.
4. Barcode: If no barcode digits are printed on the bill line, return "".
5. Numbers must be numeric (e.g. 10, 45.5, null) not strings.`;

    let groqPayload: any;

    if (imageList.length > 0) {
      // Vision Model: qwen/qwen3.8-27b (supporting up to 4 pages/images)
      const userContent: any[] = [
        {
          type: 'text',
          text: 'Strictly extract only explicitly printed seller details and line items from this wholesale invoice. Do not guess, estimate or invent unprinted fields. Return JSON.',
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
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.0,
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
            content: `Strictly extract only explicitly printed seller details and line items from this invoice text. Do not guess, estimate or invent unprinted fields:\n\n${text}`,
          },
        ],
        temperature: 0.0,
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

    const parsed: any = JSON.parse(cleanedJson);

    // Sanitize and strictly preserve ONLY explicitly extracted numbers, without estimating MRP or categories
    const sanitizedItems: ParsedBillItem[] = (parsed.items || []).map((rawItem: any) => {
      const itemName = String(rawItem.item_name || rawItem.name || '').trim();
      const quantity = Math.max(1, Number(rawItem.quantity ?? rawItem.qty) || 1);
      const gstRate = Math.max(0, Number(rawItem.gst_rate) || 0);

      let priceWithoutTax = Number(rawItem.price_without_tax ?? rawItem.purchase_price) || 0;
      let priceAfterTax = Number(rawItem.price_after_tax) || 0;
      let amount = Number(rawItem.amount ?? rawItem.total_amount) || 0;

      // Extract MRP strictly: null if missing, empty, or not a positive number
      let mrp: number | null = null;
      if (
        rawItem.mrp !== null &&
        rawItem.mrp !== undefined &&
        rawItem.mrp !== '' &&
        !isNaN(Number(rawItem.mrp)) &&
        Number(rawItem.mrp) > 0
      ) {
        mrp = Math.round(Number(rawItem.mrp) * 100) / 100;
      } else if (
        rawItem.selling_price !== null &&
        rawItem.selling_price !== undefined &&
        rawItem.selling_price !== '' &&
        !isNaN(Number(rawItem.selling_price)) &&
        Number(rawItem.selling_price) > 0
      ) {
        mrp = Math.round(Number(rawItem.selling_price) * 100) / 100;
      }

      // Mathematical deductions ONLY between purchase price, GST rate, and line amount
      // 1. If base price without tax is printed, but price after tax is missing:
      if (priceWithoutTax > 0 && priceAfterTax <= 0) {
        priceAfterTax = Math.round(priceWithoutTax * (1 + gstRate / 100) * 100) / 100;
      }
      // 2. If price after tax is printed, but base price is missing:
      else if (priceAfterTax > 0 && priceWithoutTax <= 0) {
        priceWithoutTax =
          gstRate > 0
            ? Math.round((priceAfterTax / (1 + gstRate / 100)) * 100) / 100
            : priceAfterTax;
      }
      // 3. If unit price is missing but line amount and quantity are printed:
      else if (priceWithoutTax <= 0 && priceAfterTax <= 0 && amount > 0 && quantity > 0) {
        priceWithoutTax = Math.round((amount / quantity) * 100) / 100;
        priceAfterTax = Math.round(priceWithoutTax * (1 + gstRate / 100) * 100) / 100;
      }

      // 4. If line amount is missing or 0, compute from quantity * price_without_tax
      if (amount <= 0 && priceWithoutTax > 0) {
        amount = Math.round(quantity * priceWithoutTax * 100) / 100;
      }

      // Text fields strictly empty string if not explicitly extracted
      const barcode = String(rawItem.barcode || '').trim();
      const category = String(rawItem.category || '').trim();
      const subCategory = String(rawItem.sub_category || '').trim();
      const unit = String(rawItem.unit || 'pcs').toLowerCase().trim();

      const roundedWithoutTax = Math.round(priceWithoutTax * 100) / 100;
      const roundedAfterTax = Math.round(priceAfterTax * 100) / 100;
      const roundedAmount = Math.round(amount * 100) / 100;

      return {
        item_name: itemName,
        mrp: mrp,
        price_without_tax: roundedWithoutTax,
        gst_rate: gstRate,
        price_after_tax: roundedAfterTax,
        quantity: quantity,
        amount: roundedAmount,
        barcode: barcode,
        category: category,
        sub_category: subCategory,
        // Backward-compatibility aliases
        name: itemName,
        qty: quantity,
        unit: unit,
        purchase_price: roundedWithoutTax,
        selling_price: mrp,
        total_amount: roundedAmount,
      };
    });

    const subtotal =
      Number(parsed.subtotal) ||
      sanitizedItems.reduce((acc, i) => acc + i.price_without_tax * i.quantity, 0);

    const totalGst =
      Number(parsed.total_gst) ||
      sanitizedItems.reduce(
        (acc, i) => acc + (i.price_without_tax * i.quantity * i.gst_rate) / 100,
        0
      );

    const grandTotal = Number(parsed.grand_total) || subtotal + totalGst;

    return res.status(200).json({
      success: true,
      data: {
        supplier_name: String(parsed.supplier_name || '').trim(),
        supplier_gstin: String(parsed.supplier_gstin || '').trim(),
        supplier_address: String(parsed.supplier_address || '').trim(),
        supplier_contact: String(parsed.supplier_contact || '').trim(),
        supplier_email: String(parsed.supplier_email || '').trim(),
        supplier_fssai: String(parsed.supplier_fssai || '').trim(),
        bill_number: String(parsed.bill_number || '').trim(),
        bill_date: String(parsed.bill_date || '').trim(),
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
