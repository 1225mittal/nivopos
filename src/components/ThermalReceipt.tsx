import React from 'react';
import { StoreProfile } from '../types';

export interface ThermalReceiptItemInput {
  name?: string;
  product_name?: string;
  qty?: number | string;
  quantity?: number | string;
  unit?: string;
  price?: number | string;
  unit_price?: number | string;
  gst_rate?: number | string;
  line_total?: number | string;
}

export interface ThermalReceiptInvoiceInput {
  invoice_number: string;
  created_at?: string;
  payment_mode?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  discount_amount?: number | string;
  grand_total?: number | string;
  subtotal?: number | string;
  total_gst?: number | string;
}

export interface ThermalReceiptProps {
  storeProfile: StoreProfile | null;
  invoice: ThermalReceiptInvoiceInput;
  items: ThermalReceiptItemInput[];
  id?: string;
  className?: string;
}

/**
 * Returns Indian GST Place of Supply (e.g. '09-UP') derived from the first two digits
 * of GSTIN, fallback state code, or '09-UP' per GST Rule 46 standard.
 */
const getPlaceOfSupply = (gstin?: string, stateOrCity?: string): string => {
  if (gstin && gstin.trim().length >= 2) {
    const code = gstin.trim().slice(0, 2);
    const STATE_CODES: Record<string, string> = {
      '01': '01-JK',
      '02': '02-HP',
      '03': '03-PB',
      '04': '04-CH',
      '05': '05-UK',
      '06': '06-HR',
      '07': '07-DL',
      '08': '08-RJ',
      '09': '09-UP',
      '10': '10-BR',
      '11': '11-SK',
      '12': '12-AR',
      '13': '13-NL',
      '14': '14-MN',
      '15': '15-MZ',
      '16': '16-TR',
      '17': '17-ML',
      '18': '18-AS',
      '19': '19-WB',
      '20': '20-JH',
      '21': '21-OR',
      '22': '22-CG',
      '23': '23-MP',
      '24': '24-GJ',
      '26': '26-DD',
      '27': '27-MH',
      '28': '28-AP',
      '29': '29-KA',
      '30': '30-GA',
      '31': '31-LD',
      '32': '32-KL',
      '33': '33-TN',
      '34': '34-PY',
      '35': '35-AN',
      '36': '36-TG',
      '37': '37-AD',
      '38': '38-LA',
    };
    if (STATE_CODES[code]) {
      return STATE_CODES[code];
    }
  }
  if (stateOrCity && stateOrCity.trim()) {
    const raw = stateOrCity.trim().toUpperCase();
    if (raw.includes('UP') || raw.includes('UTTAR PRADESH')) return '09-UP';
    if (raw.includes('MH') || raw.includes('MAHARASHTRA')) return '27-MH';
    if (raw.includes('DL') || raw.includes('DELHI')) return '07-DL';
    if (raw.includes('HR') || raw.includes('HARYANA')) return '06-HR';
    if (raw.includes('RJ') || raw.includes('RAJASTHAN')) return '08-RJ';
    if (raw.includes('GJ') || raw.includes('GUJARAT')) return '24-GJ';
    if (raw.includes('MP') || raw.includes('MADHYA PRADESH')) return '23-MP';
    if (raw.includes('KA') || raw.includes('KARNATAKA')) return '29-KA';
    if (raw.includes('TN') || raw.includes('TAMIL NADU')) return '33-TN';
    if (raw.includes('WB') || raw.includes('WEST BENGAL')) return '19-WB';
  }
  return '09-UP';
};

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  storeProfile,
  invoice,
  items,
  id,
  className = '',
}) => {
  // 1. Header Information
  const storeName =
    storeProfile?.business_name?.trim() ||
    storeProfile?.store_name?.trim() ||
    storeProfile?.full_name?.trim() ||
    'NIVO STORE';

  const addressParts = [
    storeProfile?.store_address?.trim(),
    storeProfile?.city?.trim(),
  ].filter(Boolean);
  const registeredAddress = addressParts.join(', ');

  const gstin = storeProfile?.gstin?.trim() || '';
  const phone = storeProfile?.phone?.trim() || '';

  // 2. Invoice Metadata
  const invoiceNum = invoice.invoice_number || 'INV-000000';
  const invoiceDate = invoice.created_at ? new Date(invoice.created_at) : new Date();
  const formattedDate = invoiceDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = invoiceDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const paymentMode = invoice.payment_mode || 'Cash';
  const placeOfSupply = getPlaceOfSupply(gstin, storeProfile?.city);

  const customerName = invoice.customer_name?.trim() || '';
  const customerPhone = invoice.customer_phone?.trim() || '';
  const hasCustomer =
    customerName &&
    customerName.toLowerCase() !== 'counter customer' &&
    customerName.toLowerCase() !== 'walk-in customer';

  // 3. Items Normalization
  const normalizedItems = items.map((it) => {
    const name = it.name || it.product_name || 'Item';
    const qty = parseFloat(String(it.qty ?? it.quantity ?? 1)) || 1;
    const unit = (it.unit || 'pcs').trim();
    const price = parseFloat(String(it.price ?? it.unit_price ?? 0)) || 0;
    const gstRate = parseFloat(String(it.gst_rate ?? 0)) || 0;
    const lineTotal =
      it.line_total !== undefined && it.line_total !== null
        ? parseFloat(String(it.line_total)) || 0
        : Math.round(qty * price * 100) / 100;
    return {
      name,
      qty,
      unit,
      price,
      gstRate,
      lineTotal,
    };
  });

  const totalItems = normalizedItems.length;
  const totalQty = Math.round(normalizedItems.reduce((sum, it) => sum + it.qty, 0) * 100) / 100;
  const discount = parseFloat(String(invoice.discount_amount ?? 0)) || 0;
  const grandTotal =
    parseFloat(String(invoice.grand_total ?? 0)) ||
    Math.max(
      0,
      Math.round(
        (normalizedItems.reduce((sum, it) => sum + it.lineTotal, 0) - discount) * 100
      ) / 100
    );

  // 4. Bottom GST Summary Table (Slab-wise Breakdown per GST Rule 46)
  const slabMap = new Map<number, { rate: number; lineTotal: number }>();
  normalizedItems.forEach((it) => {
    const r = it.gstRate;
    const existing = slabMap.get(r) || { rate: r, lineTotal: 0 };
    existing.lineTotal += it.lineTotal;
    slabMap.set(r, existing);
  });

  const sortedSlabs = Array.from(slabMap.values()).sort((a, b) => a.rate - b.rate);

  const gstBreakdown = sortedSlabs.map((s) => {
    const lineTotal = Math.round(s.lineTotal * 100) / 100;
    // For tax-inclusive pricing: taxable = lineTotal / (1 + gstRate / 100)
    const taxable =
      s.rate > 0
        ? Math.round((lineTotal / (1 + s.rate / 100)) * 100) / 100
        : lineTotal;
    // taxAmount = lineTotal - taxable
    const taxAmount = Math.round((lineTotal - taxable) * 100) / 100;
    // cgst = taxAmount / 2, sgst = taxAmount - cgst (guarantees taxable + cgst + sgst === lineTotal)
    const cgst = Math.round((taxAmount / 2) * 100) / 100;
    const sgst = Math.round((taxAmount - cgst) * 100) / 100;
    return {
      rate: s.rate,
      taxable,
      cgst,
      sgst,
      totalTax: taxAmount,
      lineTotal,
    };
  });

  const totalTaxable = Math.round(gstBreakdown.reduce((sum, s) => sum + s.taxable, 0) * 100) / 100;
  const totalCgst = Math.round(gstBreakdown.reduce((sum, s) => sum + s.cgst, 0) * 100) / 100;
  const totalSgst = Math.round(gstBreakdown.reduce((sum, s) => sum + s.sgst, 0) * 100) / 100;
  const totalTaxAmount = Math.round((totalCgst + totalSgst) * 100) / 100;

  return (
    <div
      id={id}
      className={`bg-white text-black font-mono text-[11px] leading-tight select-text ${className}`}
      style={{
        color: '#000000',
        backgroundColor: '#FFFFFF',
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      {/* 1. Header (Centered) */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <div className="font-black text-xs uppercase tracking-wider text-black">TAX INVOICE</div>
        <div className="font-black text-sm uppercase mt-0.5 tracking-tight text-black">
          {storeName}
        </div>
        {registeredAddress && (
          <div className="text-[10px] leading-tight mt-0.5 text-black">{registeredAddress}</div>
        )}
        {gstin && (
          <div className="text-[10px] font-bold mt-0.5 text-black tracking-wide">
            GSTIN: {gstin}
          </div>
        )}
        {phone && <div className="text-[10px] mt-0.5 text-black">Ph: {phone}</div>}
      </div>

      {/* 2. Invoice Metadata */}
      <div className="text-[10px] space-y-0.5 py-1.5 border-b border-dashed border-black">
        <div className="flex justify-between">
          <span>Invoice #:</span>
          <span className="font-bold">{invoiceNum}</span>
        </div>
        <div className="flex justify-between">
          <span>Date & Time:</span>
          <span>
            {formattedDate} {formattedTime}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Payment Mode:</span>
          <span className="font-bold">{paymentMode}</span>
        </div>
        <div className="flex justify-between">
          <span>Place of Supply:</span>
          <span className="font-semibold">{placeOfSupply}</span>
        </div>
        <div className="flex justify-between">
          <span>RCM:</span>
          <span>No</span>
        </div>
        {hasCustomer && (
          <div className="flex justify-between items-baseline">
            <span>Customer:</span>
            <span className="font-bold text-right truncate max-w-[150px]">
              {customerName}
              {customerPhone ? ` (${customerPhone})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* 3. Items Section */}
      <div className="py-1.5 border-b border-dashed border-black space-y-1.5">
        <div className="flex justify-between text-[9px] font-bold uppercase border-b border-black pb-0.5">
          <span>Item Description</span>
          <span>Amount</span>
        </div>
        {normalizedItems.map((item, idx) => (
          <div key={idx} className="text-[10px] leading-tight">
            <div className="font-bold text-black break-words">{item.name}</div>
            <div className="flex justify-between items-baseline text-black mt-0.5">
              <span>
                {item.qty} {item.unit} × ₹{item.price.toFixed(2)} [{item.gstRate}%]
              </span>
              <span className="font-bold text-black shrink-0">
                ₹{item.lineTotal.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals Summary */}
      <div className="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Total Items:</span>
          <span className="font-bold">{totalItems}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Qty:</span>
          <span className="font-bold">{totalQty}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-black">
            <span>Flat Discount:</span>
            <span className="font-bold">-₹{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="pt-1 mt-1 border-t border-black">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-black">GRAND TOTAL:</span>
            <span className="text-sm font-black">₹{grandTotal.toFixed(2)}</span>
          </div>
          <div className="text-[9px] text-center font-normal italic mt-0.5 text-black">
            (Inclusive of all taxes)
          </div>
        </div>
      </div>

      {/* 4. Bottom GST Summary Table (Slab-wise Breakdown per GST Rule 46) */}
      <div className="py-1.5 border-b border-dashed border-black text-[9px]">
        <div className="font-bold uppercase text-center mb-1 tracking-wider text-black">
          -- GST TAX SUMMARY --
        </div>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-black text-[9px] font-bold uppercase text-black">
              <th className="text-left pb-0.5">GST%</th>
              <th className="pb-0.5">Taxable</th>
              <th className="pb-0.5">CGST</th>
              <th className="pb-0.5">SGST</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-slate-400">
            {gstBreakdown.map((slab) => (
              <tr key={slab.rate} className="text-black">
                <td className="text-left py-0.5 font-medium">{slab.rate}%</td>
                <td className="py-0.5">₹{slab.taxable.toFixed(2)}</td>
                <td className="py-0.5">₹{slab.cgst.toFixed(2)}</td>
                <td className="py-0.5">₹{slab.sgst.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t border-black font-bold text-[9px] text-black">
              <td className="text-left pt-1">TOTAL</td>
              <td className="pt-1">₹{totalTaxable.toFixed(2)}</td>
              <td className="pt-1">₹{totalCgst.toFixed(2)}</td>
              <td className="pt-1">₹{totalSgst.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-1 pt-0.5 flex justify-between text-[8px] text-black">
          <span>Total Tax: ₹{totalTaxAmount.toFixed(2)}</span>
          <span>Taxable: ₹{totalTaxable.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2 text-[9px] space-y-0.5 text-black">
        <p className="font-medium">Thank you for shopping with us!</p>
        <p className="text-[8px] text-slate-600 font-sans">Powered by nivopos.in</p>
      </div>
    </div>
  );
};

export default ThermalReceipt;
