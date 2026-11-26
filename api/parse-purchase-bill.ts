/**
 * Nivo POS - Purchase Bill OCR Parsing Handler
 * File: api/parse-purchase-bill.ts
 *
 * Serverless API using Groq AI OCR (qwen/qwen3.8-27b / llama-3.3-70b-versatile)
 * Extracts structured inventory line items and seller details from wholesaler / distributor purchase bills.
 */

export interface ParsedBillItem {
  item_name: string;
  mrp: number;
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
  selling_price: number;
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

    const systemPrompt = `You are an expert Indian retail & Kirana tax invoice / wholesale purchase bill OCR parser.
Extract seller details and line items strictly as valid JSON with NO markdown codeblocks or comments.

JSON Schema to follow:
{
  "supplier_name": "Wholesaler / Distributor / Vendor Name",
  "supplier_gstin": "15-digit GSTIN (or empty string if not found)",
  "supplier_address": "Full registered address of the supplier (or empty string)",
  "supplier_contact": "Phone / Mobile number of the supplier (or empty string)",
  "supplier_email": "Email address of the supplier (or empty string)",
  "supplier_fssai": "FSSAI License number of the supplier (or empty string)",
  "bill_number": "Invoice / Bill / Challan Number",
  "bill_date": "YYYY-MM-DD",
  "items": [
    {
      "item_name": "Product Name & Specification",
      "mrp": 120.0,
      "price_without_tax": 90.0,
      "gst_rate": 5,
      "price_after_tax": 94.5,
      "quantity": 10,
      "amount": 900.0,
      "barcode": "8901030383921",
      "category": "Grocery",
      "sub_category": "Cooking Oil",
      "unit": "pcs"
    }
  ],
  "subtotal": 900.0,
  "total_gst": 45.0,
  "grand_total": 945.0
}

Rules:
1. Seller Details:
   - Identify the SELLER (wholesaler, distributor, company issuing the bill), NOT the buyer/retailer.
   - Extract supplier_name, supplier_gstin, supplier_address, supplier_contact, supplier_email, supplier_fssai. If any field is not found on the bill, return an empty string "".
   - Standardize bill_date to YYYY-MM-DD format if readable.
2. Line Items:
   - item_name: Full brand name, variant, and pack size (e.g., "Fortune Sunlite Refined Oil 1L Pouch").
   - mrp: Maximum Retail Price printed on invoice/pack.
   - price_without_tax: Tax-exclusive purchase rate per unit before GST.
   - gst_rate: Standard Indian GST rate (0, 5, 12, 18, or 28).
   - price_after_tax: Tax-inclusive purchase rate per unit.
   - quantity: Billed quantity (number).
   - amount: Line taxable or total amount.
   - barcode: Numeric barcode, EAN-13, or UPC if printed on bill, else empty string "".
   - category: Primary category (e.g., "Grocery", "FMCG Packaged Foods", "Dairy & Bakery", "Beverages", "Personal Care", "Household Care", "Snacks & Confectionery").
   - sub_category: Specific sub-category (e.g., "Edible Oil", "Flour & Atta", "Detergent", "Biscuits", "Spices", "Shampoo", "Soap").
   - unit: "pcs", "kg", "pack", "box", "ltr", "gm".
3. Numbers must be numeric floats or integers (not strings).`;

    let groqPayload: any;

    if (imageList.length > 0) {
      // Vision Model: qwen/qwen3.8-27b (supporting up to 4 pages/images)
      const userContent: any[] = [
        {
          type: 'text',
          text: 'Extract seller details (supplier_name, supplier_gstin, supplier_address, supplier_contact, supplier_email, supplier_fssai, bill_number, bill_date) and all line items (item_name, mrp, price_without_tax, gst_rate, price_after_tax, quantity, amount, barcode, category, sub_category) across all pages of this Indian wholesale purchase bill / delivery challan into JSON.',
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
            content: `Extract seller details and all line items from this bill text:\n\n${text}`,
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

    const parsed: any = JSON.parse(cleanedJson);

    // Sanitize and cleanly compute missing numbers for each line item
    const sanitizedItems: ParsedBillItem[] = (parsed.items || []).map((rawItem: any) => {
      const itemName = String(rawItem.item_name || rawItem.name || 'Stock Item').trim();
      const quantity = Math.max(1, Number(rawItem.quantity ?? rawItem.qty) || 1);
      const gstRate = Math.max(0, Number(rawItem.gst_rate) || 0);

      let priceWithoutTax = Number(rawItem.price_without_tax ?? rawItem.purchase_price) || 0;
      let priceAfterTax = Number(rawItem.price_after_tax) || 0;
      let amount = Number(rawItem.amount ?? rawItem.total_amount) || 0;
      let mrp = Number(rawItem.mrp ?? rawItem.selling_price) || 0;

      // Deduction 1: If price_without_tax is known but price_after_tax is missing
      if (priceWithoutTax > 0 && priceAfterTax <= 0) {
        priceAfterTax = Math.round(priceWithoutTax * (1 + gstRate / 100) * 100) / 100;
      }
      // Deduction 2: If price_after_tax is known but price_without_tax is missing
      else if (priceAfterTax > 0 && priceWithoutTax <= 0) {
        priceWithoutTax =
          gstRate > 0
            ? Math.round((priceAfterTax / (1 + gstRate / 100)) * 100) / 100
            : priceAfterTax;
      }
      // Deduction 3: If both unit rates are missing, compute from amount and quantity or MRP
      else if (priceWithoutTax <= 0 && priceAfterTax <= 0) {
        if (amount > 0 && quantity > 0) {
          priceWithoutTax = Math.round((amount / quantity) * 100) / 100;
          priceAfterTax = Math.round(priceWithoutTax * (1 + gstRate / 100) * 100) / 100;
        } else if (mrp > 0) {
          // Estimate wholesale buy rate at ~82% of MRP
          priceAfterTax = Math.round(mrp * 0.82 * 100) / 100;
          priceWithoutTax =
            gstRate > 0
              ? Math.round((priceAfterTax / (1 + gstRate / 100)) * 100) / 100
              : priceAfterTax;
        }
      }

      // Deduction 4: If line amount is missing or 0, compute from quantity * price_without_tax
      if (amount <= 0) {
        amount = Math.round(quantity * priceWithoutTax * 100) / 100;
      }

      // Deduction 5: If MRP is missing or 0, estimate standard 20% retail markup
      if (mrp <= 0) {
        const baseForMrp = priceAfterTax > 0 ? priceAfterTax : priceWithoutTax;
        mrp = Math.round(baseForMrp * 1.2 * 100) / 100;
      }

      const barcode = String(rawItem.barcode || '').trim();
      const category = String(rawItem.category || 'General').trim();
      const subCategory = String(rawItem.sub_category || '').trim();
      const unit = String(rawItem.unit || 'pcs').toLowerCase().trim();

      const roundedMrp = Math.round(mrp * 100) / 100;
      const roundedWithoutTax = Math.round(priceWithoutTax * 100) / 100;
      const roundedAfterTax = Math.round(priceAfterTax * 100) / 100;
      const roundedAmount = Math.round(amount * 100) / 100;

      return {
        item_name: itemName,
        mrp: roundedMrp,
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
        selling_price: roundedMrp,
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
        supplier_name: String(parsed.supplier_name || 'Wholesale Supplier').trim(),
        supplier_gstin: String(parsed.supplier_gstin || '').trim(),
        supplier_address: String(parsed.supplier_address || '').trim(),
        supplier_contact: String(parsed.supplier_contact || '').trim(),
        supplier_email: String(parsed.supplier_email || '').trim(),
        supplier_fssai: String(parsed.supplier_fssai || '').trim(),
        bill_number: String(parsed.bill_number || `PB-${Date.now().toString().slice(-6)}`).trim(),
        bill_date: String(parsed.bill_date || new Date().toISOString().slice(0, 10)).trim(),
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
