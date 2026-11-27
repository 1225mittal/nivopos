/**
 * Nivo POS - Purchase Bill Extraction API
 * File: api/extract-bill.ts
 *
 * Serverless API using Groq AI OCR (qwen/qwen3.8-27b / llama-3.3-70b-versatile).
 * Extracts complete item fields (name, hsn_code, quantity, unit, mrp, purchase_rate, discount, gst_rate, category, sub_category)
 * and seller details (seller_name, gstin, phone, address, invoice_number, invoice_date).
 */

export interface ExtractedBillItem {
  name: string;
  item_name: string;
  hsn_code: string;
  quantity: number;
  qty: number;
  unit: string;
  mrp: number | null;
  purchase_rate: number;
  purchase_price: number;
  price_without_tax: number;
  price_after_tax: number;
  discount: number;
  gst_rate: number;
  category: string;
  sub_category: string;
  amount: number;
  total_amount: number;
  barcode: string;
  selling_price: number | null;
  bill_line_total: number;
}

export interface ExtractedBillResponse {
  seller_name: string;
  supplier_name: string;
  gstin: string;
  supplier_gstin: string;
  phone: string;
  supplier_contact: string;
  address: string;
  supplier_address: string;
  supplier_email: string;
  supplier_fssai: string;
  invoice_number: string;
  bill_number: string;
  invoice_date: string;
  bill_date: string;
  items: ExtractedBillItem[];
  subtotal: number;
  tax_amount: number;
  total_gst: number;
  total_amount: number;
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
      error: 'Method Not Allowed. Purchase bill extraction requires POST.',
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

    const systemPrompt = `You are an expert Indian FMCG, Kirana, supermarket, and wholesale B2B invoice extraction engine.
Analyze the provided wholesale purchase bill / tax invoice document and extract complete seller and line item details into strictly valid JSON.

Exhaustive Line Item Extraction Rules:
- Extract EVERY SINGLE line item row from Serial No. 1 to the final row before the subtotal/grand total.
- NEVER skip, summarize, or merge similar items or different pack sizes (e.g., 25g, 50g, 100g of the same product must each be separate entries).
- Return strictly raw compact JSON with no markdown or extra commentary.

Permanent Indian Wholesale & FMCG Terminology Rules:
- "CS" = Case / Carton.
- "UPC" = Units Per Case. If both CS (cases) and UPC (units per case) are given, determine the actual total item quantity (Cases * UPC or as billed) and ensure the unit purchase rate aligns consistently.
- "Pcs", "Pieces", and "Qty" mean the same thing: item quantity.
- "Rate", "Price", and "Basic Rate" mean the same thing: unit purchase rate before tax.

Extract top-level seller details:
- "seller_name": Issuer / distributor / seller company name (NOT the customer or consignee).
- "gstin": 15-character GSTIN of the seller (e.g. "27AABCM9876Q1Z8"). Return "" if not printed.
- "phone": Seller contact phone / mobile number. Return "" if not printed.
- "address": Seller warehouse or registered business address. Return "" if not printed.
- "email": Seller email if printed, else "".
- "fssai": 14-digit FSSAI license if printed, else "".
- "invoice_number": Tax invoice number, bill number, or challan number. Return "" if not printed.
- "invoice_date": Invoice date formatted in YYYY-MM-DD. Convert from DD/MM/YYYY or DD-MM-YYYY if needed.

Extract every product line item in "items":
- "name": Full brand and product name (e.g. "Fortune Sunlite Refined Sunflower Oil 1L Pouch", "Amul Butter 500g", "Tata Salt 1kg", "Surf Excel Easy Wash 1kg").
- "hsn_code": 4 to 8 digit HSN/SAC code printed in the invoice row or HSN summary table (e.g. "0405", "1512", "1905", "2106", "3306"). Return "" if not printed.
- "quantity": Numeric quantity purchased (e.g. 10, 24, 50). Minimum 1.
- "unit": Unit of measurement (e.g. "pcs", "kg", "pack", "box", "ltr", "gm", "pouch", "bottle", "tin", "cs"). Default "pcs".
- "mrp": Numeric Maximum Retail Price (MRP) printed on the bill in an MRP column. If NO explicit MRP column or printed MRP exists, return null.
- "purchase_rate": Unit landing rate / purchase rate before GST (numeric).
- "discount": Discount on this line item in ₹ (flat amount or 0). If given as %, calculate the ₹ discount or extract given discount amount. Default 0.
- "bill_line_total": The exact printed line total / net amount for this item row as printed on the invoice.
- "gst_rate": Combined GST percentage (CGST + SGST or IGST %, e.g. 0, 5, 12, 18, 28).
- "category": Inferred FMCG / Kirana category:
  - "Groceries & Staples" (e.g. Atta, Rice, Dal, Pulses, Spices, Sugar, Salt)
  - "Edible Oils & Ghee" (e.g. Cooking oils, Mustard oil, Sunflower oil, Desi Ghee)
  - "Dairy, Bakery & Eggs" (e.g. Milk, Curd, Butter, Paneer, Cheese, Bread, Eggs)
  - "Beverages & Tea" (e.g. Tea, Coffee, Juices, Cold Drinks, Syrups)
  - "Snacks & Confectionery" (e.g. Biscuits, Namkeen, Chips, Noodles, Chocolates)
  - "Personal Care" (e.g. Soaps, Shampoo, Toothpaste, Creams, Deodorants)
  - "Cleaning & Household" (e.g. Detergent, Dishwash, Surface cleaner, Mosquito repellent)
  - "Packaged & Instant Food" (e.g. Ketchups, Jams, Pickles, Ready to eat)
  - "Other Retail Goods"
- "sub_category": Inferred specific sub-category (e.g. "Butter", "Lassi", "Fresh Cream", "Atta & Flours", "Refined Sunflower Oil", "Biscuits & Cookies", "Tea & Chai Patti", "Detergent Powder & Bars", "Toothpaste & Oral Care").
- "barcode": Barcode / EAN-13 if explicitly printed on the bill, else "".

Output schema strictly as valid JSON:
{
  "seller_name": "...",
  "gstin": "...",
  "phone": "...",
  "address": "...",
  "email": "...",
  "fssai": "...",
  "invoice_number": "...",
  "invoice_date": "YYYY-MM-DD",
  "items": [
    {
      "name": "...",
      "hsn_code": "...",
      "quantity": 1,
      "unit": "pcs",
      "mrp": null,
      "purchase_rate": 0.0,
      "discount": 0.0,
      "bill_line_total": 0.0,
      "gst_rate": 0,
      "category": "...",
      "sub_category": "...",
      "barcode": ""
    }
  ],
  "subtotal": 0.0,
  "tax_amount": 0.0,
  "total_amount": 0.0
}`;

    let groqPayload: any;

    if (imageList.length > 0) {
      // Vision Model: qwen/qwen3.8-27b (supporting up to 4 pages/images)
      const userContent: any[] = [
        {
          type: 'text',
          text: 'Extract complete seller details and EVERY SINGLE line item row from Serial No. 1 to the final row before the subtotal/grand total. NEVER skip, summarize, or merge similar items or different pack sizes (e.g., 25g, 50g, 100g of the same product must each be separate entries). Return strictly raw compact JSON with no markdown or extra commentary.',
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
        max_tokens: 8192,
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
            content: `Extract complete seller details and EVERY SINGLE line item row from Serial No. 1 to the final row before the subtotal/grand total. NEVER skip, summarize, or merge similar items or different pack sizes. Return strictly raw compact JSON:\n\n${text}`,
          },
        ],
        temperature: 0.0,
        max_tokens: 8192,
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

    // Clean JSON markdown wrapping if present
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed: any = JSON.parse(cleanedJson);

    // Sanitize items and ensure all aliases and calculated values are present
    const sanitizedItems: ExtractedBillItem[] = (parsed.items || []).map((rawItem: any) => {
      const name = String(rawItem.name || rawItem.item_name || '').trim();
      const hsnCode = String(rawItem.hsn_code || '').trim();
      const quantity = Math.max(1, Number(rawItem.quantity ?? rawItem.qty) || 1);
      const gstRate = Math.max(0, Number(rawItem.gst_rate) || 0);
      const discount = Math.max(0, Number(rawItem.discount) || 0);

      let purchaseRate = Number(rawItem.purchase_rate ?? rawItem.price_without_tax ?? rawItem.purchase_price) || 0;
      let priceAfterTax = Number(rawItem.price_after_tax) || 0;
      let amount = Number(rawItem.amount ?? rawItem.total_amount) || 0;

      // Extract MRP strictly: null if missing or not positive number
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

      // Mathematical synchronizations
      if (purchaseRate > 0 && priceAfterTax <= 0) {
        priceAfterTax = Math.round(purchaseRate * (1 + gstRate / 100) * 100) / 100;
      } else if (priceAfterTax > 0 && purchaseRate <= 0) {
        purchaseRate =
          gstRate > 0
            ? Math.round((priceAfterTax / (1 + gstRate / 100)) * 100) / 100
            : priceAfterTax;
      } else if (purchaseRate <= 0 && priceAfterTax <= 0 && amount > 0 && quantity > 0) {
        purchaseRate = Math.round((amount / quantity) * 100) / 100;
        priceAfterTax = Math.round(purchaseRate * (1 + gstRate / 100) * 100) / 100;
      }

      if (amount <= 0 && purchaseRate > 0) {
        amount = Math.round(quantity * purchaseRate * 100) / 100;
      }

      const barcode = String(rawItem.barcode || '').trim();
      const category = String(rawItem.category || '').trim();
      const subCategory = String(rawItem.sub_category || '').trim();
      const unit = String(rawItem.unit || 'pcs').toLowerCase().trim();

      const roundedPurchaseRate = Math.round(purchaseRate * 100) / 100;
      const roundedAfterTax = Math.round(priceAfterTax * 100) / 100;
      const roundedAmount = Math.round(amount * 100) / 100;

      const rawBillTotal =
        rawItem.bill_line_total !== undefined &&
        rawItem.bill_line_total !== null &&
        rawItem.bill_line_total !== '' &&
        !isNaN(Number(rawItem.bill_line_total))
          ? Number(rawItem.bill_line_total)
          : NaN;
      const billLineTotal = !isNaN(rawBillTotal)
        ? Math.round(rawBillTotal * 100) / 100
        : roundedAmount;

      return {
        name,
        item_name: name,
        hsn_code: hsnCode,
        quantity,
        qty: quantity,
        unit: unit || 'pcs',
        mrp,
        purchase_rate: roundedPurchaseRate,
        purchase_price: roundedPurchaseRate,
        price_without_tax: roundedPurchaseRate,
        price_after_tax: roundedAfterTax,
        discount,
        gst_rate: gstRate,
        category,
        sub_category: subCategory,
        amount: roundedAmount,
        total_amount: roundedAmount,
        barcode,
        selling_price: mrp,
        bill_line_total: billLineTotal,
      };
    });

    const subtotal =
      Number(parsed.subtotal) ||
      sanitizedItems.reduce((acc, i) => acc + i.purchase_rate * i.quantity, 0);

    const totalGst =
      Number(parsed.tax_amount ?? parsed.total_gst) ||
      sanitizedItems.reduce(
        (acc, i) => acc + (i.purchase_rate * i.quantity * i.gst_rate) / 100,
        0
      );

    const totalAmount =
      Number(parsed.total_amount ?? parsed.grand_total) || subtotal + totalGst;

    const sellerName = String(parsed.seller_name ?? parsed.supplier_name ?? '').trim();
    const gstin = String(parsed.gstin ?? parsed.supplier_gstin ?? '').trim();
    const phone = String(parsed.phone ?? parsed.supplier_contact ?? '').trim();
    const address = String(parsed.address ?? parsed.supplier_address ?? '').trim();
    const email = String(parsed.email ?? parsed.supplier_email ?? '').trim();
    const fssai = String(parsed.fssai ?? parsed.supplier_fssai ?? '').trim();
    const invoiceNumber = String(parsed.invoice_number ?? parsed.bill_number ?? '').trim();
    const invoiceDate = String(parsed.invoice_date ?? parsed.bill_date ?? '').trim();

    const responseData: ExtractedBillResponse = {
      seller_name: sellerName,
      supplier_name: sellerName,
      gstin,
      supplier_gstin: gstin,
      phone,
      supplier_contact: phone,
      address,
      supplier_address: address,
      supplier_email: email,
      supplier_fssai: fssai,
      invoice_number: invoiceNumber,
      bill_number: invoiceNumber,
      invoice_date: invoiceDate,
      bill_date: invoiceDate,
      items: sanitizedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(totalGst * 100) / 100,
      total_gst: Math.round(totalGst * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      grand_total: Math.round(totalAmount * 100) / 100,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[extract-bill Exception]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract purchase bill with Groq OCR',
    });
  }
}
