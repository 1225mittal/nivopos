import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Printer,
  Share2,
  X,
  Loader2,
  Calendar,
  IndianRupee,
  CreditCard,
  Banknote,
  QrCode,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceItem, StoreProfile } from '../types';

interface SalesHistoryProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onNavigateToPos: () => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  currentUser,
  userProfile,
  onNavigateToPos,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Selected Invoice Modal for Reprint & View
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const businessName = userProfile?.business_name || userProfile?.store_name || 'Nivo Store';

  // Fetch real invoices for this store
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('store_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err: any) {
      console.error('[SalesHistory] Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [currentUser.id]);

  // Load line items when an invoice is clicked
  const handleSelectInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', inv.id)
        .eq('store_id', currentUser.id);

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (err: any) {
      console.error('[SalesHistory] Error loading line items:', err);
      setInvoiceItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Mark an unpaid (Udhar) invoice as paid
  const handleMarkAsPaid = async (invoiceId: string) => {
    setMarkingPaid(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId)
        .eq('store_id', currentUser.id);

      if (error) throw error;

      setInvoices((prev) =>
        prev.map((i) => (i.id === invoiceId ? { ...i, status: 'paid' } : i))
      );
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice({ ...selectedInvoice, status: 'paid' });
      }
    } catch (err: any) {
      console.error('[SalesHistory] Error updating status:', err);
    } finally {
      setMarkingPaid(false);
    }
  };

  // WhatsApp formatted receipt text
  const getWhatsAppMessage = () => {
    if (!selectedInvoice) return '';
    const itemsList = invoiceItems
      .map((i) => `• ${i.product_name} (${i.qty} units) = ₹${i.line_total}`)
      .join('\n');

    return (
      `🧾 *TAX INVOICE - ${businessName}*\n` +
      `Bill #: ${selectedInvoice.invoice_number}\n` +
      `Date: ${new Date(selectedInvoice.created_at).toLocaleString('en-IN')}\n` +
      `Customer: ${selectedInvoice.customer_name}\n` +
      `--------------------------------\n` +
      `${itemsList}\n` +
      `--------------------------------\n` +
      `Subtotal: ₹${selectedInvoice.subtotal.toFixed(2)}\n` +
      (selectedInvoice.discount_amount > 0 ? `Discount: -₹${selectedInvoice.discount_amount.toFixed(2)}\n` : '') +
      `GST: ₹${selectedInvoice.total_gst.toFixed(2)}\n` +
      `*GRAND TOTAL: ₹${selectedInvoice.grand_total.toLocaleString('en-IN')}*\n` +
      `Payment Mode: ${selectedInvoice.payment_mode}\n` +
      `Status: ${selectedInvoice.status.toUpperCase()}\n\n` +
      `Thank you for shopping with ${businessName}!\n` +
      `Powered by nivopos.in`
    );
  };

  const handleShareWhatsApp = () => {
    const text = getWhatsAppMessage();
    const phoneClean = selectedInvoice?.customer_phone?.replace(/\D/g, '') || '';
    const phoneParam = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // ---------------- COMPUTED REAL KPIS ----------------
  const todayRevenue = useMemo(() => {
    const todayStr = new Date().toDateString();
    return invoices
      .filter((i) => new Date(i.created_at).toDateString() === todayStr)
      .reduce((acc, i) => acc + (Number(i.grand_total) || 0), 0);
  }, [invoices]);

  const totalInvoicesCount = invoices.length;

  const paymentSplits = useMemo(() => {
    const splits = { upi: 0, cash: 0, card: 0, udhar: 0 };
    invoices.forEach((i) => {
      const mode = (i.payment_mode || '').toLowerCase();
      const amount = Number(i.grand_total) || 0;
      if (mode.includes('upi')) splits.upi += amount;
      else if (mode.includes('cash')) splits.cash += amount;
      else if (mode.includes('card')) splits.card += amount;
      else if (mode.includes('udhar')) splits.udhar += amount;
    });
    return splits;
  }, [invoices]);

  const totalGstCollected = useMemo(() => {
    return invoices.reduce((acc, i) => acc + (Number(i.total_gst) || 0), 0);
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        i.invoice_number?.toLowerCase().includes(q) ||
        i.customer_name?.toLowerCase().includes(q) ||
        i.customer_phone?.toLowerCase().includes(q);

      const matchesPayment =
        paymentFilter === 'all' ||
        (i.payment_mode && i.payment_mode.toLowerCase().includes(paymentFilter.toLowerCase()));

      return matchesSearch && matchesPayment;
    });
  }, [invoices, searchQuery, paymentFilter]);

  return (
    <div className="space-y-6">
      {/* Real Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Today's Revenue */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500">Today's Sales</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            ₹{todayRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">
            Computed from real counter invoices
          </p>
        </div>

        {/* Card 2: Total Bills */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500">Total Bills Billed</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {totalInvoicesCount}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Stored in public.invoices
          </p>
        </div>

        {/* Card 3: Payment Split */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500">UPI vs Cash Split</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs font-mono font-bold mt-2 space-y-0.5">
            <div className="flex justify-between text-emerald-400">
              <span>UPI:</span>
              <span>₹{paymentSplits.upi.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cash:</span>
              <span>₹{paymentSplits.cash.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total GST Collected */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500">Total GST Recorded</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-2">
            ₹{Math.round(totalGstCollected).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            Auto GSTR-1 eligible
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill #, Customer Name, Mobile..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Payment:</span>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Modes</option>
            <option value="upi">UPI QR</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="udhar">Udhar Khata</option>
          </select>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Loading sales ledger...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No invoices billed yet</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Bills generated from the Counter POS terminal will automatically appear here with real-time analytics.
              </p>
            </div>
            <button
              onClick={onNavigateToPos}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-glow-emerald"
            >
              <span>Go to Counter POS & Bill</span>
            </button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No invoices match your search query "{searchQuery}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                    onClick={() => handleSelectInvoice(inv)}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(inv.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{inv.customer_name || 'Counter Customer'}</p>
                      {inv.customer_phone && (
                        <p className="text-[10px] text-slate-400 font-mono">{inv.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-medium">
                      {inv.payment_mode}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      ₹{Number(inv.subtotal).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      ₹{Number(inv.total_gst).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white text-sm">
                      ₹{Number(inv.grand_total).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectInvoice(inv);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: VIEW INVOICE & REPRINT ================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto space-y-5">
            {/* Action Bar (Hidden during print) */}
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                Invoice Details #{selectedInvoice.invoice_number}
              </span>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Real Printable Receipt Body */}
            <div id="printable-receipt" className="text-left font-mono text-xs space-y-3 bg-white p-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="text-base font-black tracking-tight uppercase text-black font-sans">
                  {businessName}
                </h2>
                {userProfile?.store_address && (
                  <p className="text-[10px] text-slate-700 mt-0.5">{userProfile.store_address}</p>
                )}
                {userProfile?.city && (
                  <p className="text-[10px] text-slate-700">{userProfile.city}</p>
                )}
                {userProfile?.gstin && (
                  <p className="text-[10px] font-bold text-black mt-0.5">GSTIN: {userProfile.gstin}</p>
                )}
              </div>

              <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>Invoice #:</span>
                  <span className="font-bold">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span>{new Date(selectedInvoice.created_at).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold">{selectedInvoice.payment_mode}</span>
                </div>
                {selectedInvoice.customer_name && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{selectedInvoice.customer_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-bold uppercase">{selectedInvoice.status}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-600">
                  <span>Item</span>
                  <span>Total</span>
                </div>
                {loadingItems ? (
                  <div className="py-4 text-center text-slate-500">Loading line items...</div>
                ) : invoiceItems.length === 0 ? (
                  <div className="py-2 text-slate-500 text-center">Standard bill items</div>
                ) : (
                  invoiceItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-baseline text-[11px]">
                      <div className="pr-2">
                        <p className="font-medium text-black">{item.product_name}</p>
                        <p className="text-[9px] text-slate-600">
                          {item.qty} units x ₹{Number(item.unit_price).toFixed(2)} (GST {item.gst_rate}%)
                        </p>
                      </div>
                      <span className="font-bold text-black shrink-0">
                        ₹{Number(item.line_total).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{Number(selectedInvoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Total GST:</span>
                  <span>₹{Number(selectedInvoice.total_gst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-black text-black">
                  <span>GRAND TOTAL:</span>
                  <span>₹{Number(selectedInvoice.grand_total).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[10px] text-slate-600 space-y-0.5">
                <p>Thank you for shopping with us!</p>
                <p className="font-sans text-[9px] text-slate-400">Powered by nivopos.in</p>
              </div>
            </div>

            {/* Action Buttons (Hidden during print) */}
            <div className="no-print pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp Share</span>
                </button>
              </div>

              {selectedInvoice.status === 'unpaid' && (
                <button
                  onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                  disabled={markingPaid}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {markingPaid ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Mark Udhar Khata as Paid / Settled</span>
                </button>
              )}

              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
