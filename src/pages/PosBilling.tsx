import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScanLine,
  Search,
  Plus,
  Trash2,
  Printer,
  Share2,
  QrCode,
  CreditCard,
  Banknote,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Product, StoreProfile, Invoice, InvoiceItem } from '../types';

interface CartItem {
  cart_id: string;
  product_id?: string | null;
  name: string;
  unit: string;
  price: number;
  qty: number;
  gst_rate: number;
  taxable_amount: number;
  gst_amount: number;
  line_total: number;
}

interface PosBillingProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onNavigateToProducts: () => void;
  onNavigateToSettings: () => void;
}

export const PosBilling: React.FC<PosBillingProps> = ({
  currentUser,
  userProfile,
  onNavigateToProducts,
  onNavigateToSettings,
}) => {
  // Store products from public.products
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Active Bill State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'UPI QR' | 'Cash' | 'Card' | 'Udhar Khata'>('UPI QR');

  // Barcode / Search Input State
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick Custom Item Modal State
  const [customItemModal, setCustomItemModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [customQty, setCustomQty] = useState<number | ''>(1);
  const [customGst, setCustomGst] = useState<number>(5);

  // Processing & Receipt Modal State
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [completedItems, setCompletedItems] = useState<CartItem[]>([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Fetch only this store's real products
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', currentUser.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setStoreProducts(data || []);
    } catch (err: any) {
      console.error('[PosBilling] Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentUser.id]);

  // Handle Barcode Scan / Enter key
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = searchInput.trim();
      if (!val) return;

      // Check if exact barcode matches
      const exactMatch = storeProducts.find(
        (p) => p.barcode && p.barcode.toLowerCase() === val.toLowerCase()
      );

      if (exactMatch) {
        addItemToCart(exactMatch);
        setSearchInput('');
        setShowDropdown(false);
      } else {
        // If not exact barcode, check if only 1 product matches search
        const matches = storeProducts.filter((p) =>
          p.name.toLowerCase().includes(val.toLowerCase())
        );
        if (matches.length === 1) {
          addItemToCart(matches[0]);
          setSearchInput('');
          setShowDropdown(false);
        } else {
          setShowDropdown(true);
        }
      }
    }
  };

  // Add catalog product to cart
  const addItemToCart = (p: Product) => {
    const existingIndex = cart.findIndex((item) => item.product_id === p.id);

    if (existingIndex > -1) {
      // Increase qty
      updateItemQty(cart[existingIndex].cart_id, cart[existingIndex].qty + 1);
    } else {
      const price = Number(p.selling_price) || 0;
      const gstRate = Number(p.gst_rate) || 0;
      const taxable = price / (1 + gstRate / 100);
      const gst = price - taxable;

      const newItem: CartItem = {
        cart_id: Date.now().toString() + Math.random().toString().slice(-4),
        product_id: p.id,
        name: p.name,
        unit: p.unit || 'pcs',
        price: price,
        qty: 1,
        gst_rate: gstRate,
        taxable_amount: Math.round(taxable * 100) / 100,
        gst_amount: Math.round(gst * 100) / 100,
        line_total: price,
      };

      setCart((prev) => [newItem, ...prev]);
    }
  };

  // Add custom unlisted item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice) return;

    const price = Number(customPrice);
    const qty = Number(customQty) || 1;
    const gstRate = Number(customGst) || 0;
    const singleTaxable = price / (1 + gstRate / 100);
    const singleGst = price - singleTaxable;

    const newItem: CartItem = {
      cart_id: 'custom-' + Date.now().toString(),
      product_id: null,
      name: customName.trim(),
      unit: 'pcs',
      price: price,
      qty: qty,
      gst_rate: gstRate,
      taxable_amount: Math.round(singleTaxable * qty * 100) / 100,
      gst_amount: Math.round(singleGst * qty * 100) / 100,
      line_total: price * qty,
    };

    setCart((prev) => [newItem, ...prev]);
    setCustomItemModal(false);
    setCustomName('');
    setCustomPrice('');
    setCustomQty(1);
  };

  // Update Item Qty
  const updateItemQty = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItemFromCart(cartId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.cart_id !== cartId) return item;
        const total = item.price * newQty;
        const taxable = total / (1 + item.gst_rate / 100);
        const gst = total - taxable;
        return {
          ...item,
          qty: newQty,
          taxable_amount: Math.round(taxable * 100) / 100,
          gst_amount: Math.round(gst * 100) / 100,
          line_total: total,
        };
      })
    );
  };

  // Remove Item
  const removeItemFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cart_id !== cartId));
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items in the active bill?')) {
      setCart([]);
      setDiscountInput('');
      setCustomerName('');
      setCustomerPhone('');
    }
  };

  // Live Bill Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.line_total, 0);
  }, [cart]);

  const discount = Number(discountInput) || 0;
  const taxableAfterDiscount = Math.max(0, subtotal - discount);

  const totalGst = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.gst_amount, 0);
  }, [cart]);

  const grandTotal = Math.round(Math.max(0, subtotal - discount));
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = cgst;

  // Real UPI Payment Deep Link
  const upiId = userProfile?.upi_id || '';
  const businessName = userProfile?.business_name || userProfile?.store_name || 'Nivo Store';
  const upiPayUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${grandTotal.toFixed(2)}&cu=INR`
    : '';

  // Generate & Save Bill to database
  const handleGenerateAndSaveBill = async () => {
    if (cart.length === 0) {
      setFeedback({ type: 'error', message: 'Cart is empty. Add at least 1 item to bill.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      // 1. Insert into public.invoices
      const invoicePayload = {
        store_id: currentUser.id,
        invoice_number: invoiceNumber,
        customer_name: customerName.trim() || 'Counter Customer',
        customer_phone: customerPhone.trim() || null,
        payment_mode: paymentMode,
        subtotal: subtotal,
        total_gst: totalGst,
        discount_amount: discount,
        grand_total: grandTotal,
        status: paymentMode === 'Udhar Khata' ? 'unpaid' : 'paid',
        created_at: now,
      };

      const { data: invoiceData, error: invoiceErr } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select('*')
        .single();

      if (invoiceErr) throw invoiceErr;

      // 2. Insert line items into public.invoice_items
      const itemsPayload = cart.map((item) => ({
        invoice_id: invoiceData.id,
        store_id: currentUser.id,
        product_id: item.product_id || null,
        product_name: item.name,
        qty: item.qty,
        unit_price: item.price,
        gst_rate: item.gst_rate,
        gst_amount: item.gst_amount,
        line_total: item.line_total,
      }));

      const { error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(itemsPayload);

      if (itemsErr) {
        console.warn('[PosBilling] invoice_items insert note:', itemsErr.message);
      }

      // 3. Deduct stock_qty from public.products for catalog products
      for (const item of cart) {
        if (item.product_id) {
          const currentProd = storeProducts.find((p) => p.id === item.product_id);
          if (currentProd) {
            const newStock = Math.max(0, currentProd.stock_qty - item.qty);
            await supabase
              .from('products')
              .update({ stock_qty: newStock })
              .eq('id', item.product_id)
              .eq('store_id', currentUser.id);
          }
        }
      }

      // Refresh local store products stock count
      fetchProducts();

      // Set for receipt modal
      setCompletedInvoice(invoiceData);
      setCompletedItems([...cart]);
      setReceiptModalOpen(true);

      // Reset bill cart
      setCart([]);
      setDiscountInput('');
      setCustomerName('');
      setCustomerPhone('');
    } catch (err: any) {
      console.error('[PosBilling] Error saving bill:', err);
      setFeedback({ type: 'error', message: err.message || 'Error saving invoice.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // WhatsApp formatted receipt text
  const getWhatsAppMessage = () => {
    if (!completedInvoice) return '';
    const itemsList = completedItems
      .map((i) => `• ${i.name} (${i.qty} ${i.unit}) = ₹${i.line_total}`)
      .join('\n');

    return (
      `🧾 *TAX INVOICE - ${businessName}*\n` +
      `Bill #: ${completedInvoice.invoice_number}\n` +
      `Date: ${new Date(completedInvoice.created_at).toLocaleString('en-IN')}\n` +
      `Customer: ${completedInvoice.customer_name}\n` +
      `--------------------------------\n` +
      `${itemsList}\n` +
      `--------------------------------\n` +
      `Subtotal: ₹${completedInvoice.subtotal.toFixed(2)}\n` +
      (completedInvoice.discount_amount > 0 ? `Discount: -₹${completedInvoice.discount_amount.toFixed(2)}\n` : '') +
      `GST (CGST+SGST): ₹${completedInvoice.total_gst.toFixed(2)}\n` +
      `*GRAND TOTAL: ₹${completedInvoice.grand_total.toLocaleString('en-IN')}*\n` +
      `Payment Mode: ${completedInvoice.payment_mode}\n\n` +
      `Thank you for shopping with ${businessName}!\n` +
      `Powered by nivopos.in`
    );
  };

  const handleShareWhatsApp = () => {
    const text = getWhatsAppMessage();
    const phoneClean = completedInvoice?.customer_phone?.replace(/\D/g, '') || '';
    const phoneParam = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filtered product suggestions for search
  const filteredProducts = useMemo(() => {
    if (!searchInput.trim()) return [];
    const q = searchInput.toLowerCase().trim();
    return storeProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [storeProducts, searchInput]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT 7 COLS: SCANNER & CART ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode Scanner & Search Bar */}
          <div className="relative">
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
              <ScanLine className="w-5 h-5 text-emerald-400 ml-2 shrink-0 animate-pulse" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowDropdown(true);
                }}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode or type item name & press Enter..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCustomItemModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom Item</span>
              </button>
            </div>

            {/* Dropdown product matches */}
            {showDropdown && searchInput.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-30 divide-y divide-slate-800 overflow-hidden">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 text-center">
                    No matching products. Press "Custom Item" to add directly.
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        addItemToCart(p);
                        setSearchInput('');
                        setShowDropdown(false);
                      }}
                      className="p-3 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {p.barcode ? `Barcode: ${p.barcode} • ` : ''}Stock: {p.stock_qty} {p.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 font-mono">
                          ₹{Number(p.selling_price).toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-500">GST {p.gst_rate}%</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Cart Items Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-xl">
            <div className="px-4 py-2.5 bg-slate-900/90 text-[10px] font-bold text-slate-400 uppercase tracking-wider grid grid-cols-12 border-b border-slate-800">
              <span className="col-span-5">Item</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1 text-center">Del</span>
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-xs text-slate-400">Cart is empty. Scan an item or select a product above.</p>
                {storeProducts.length === 0 && !loadingProducts && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto text-center space-y-2">
                    <p className="text-xs text-amber-300 font-medium">No products in your catalog yet.</p>
                    <button
                      onClick={onNavigateToProducts}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Go to Product Master</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.cart_id} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-900/40 text-xs transition-colors">
                    <div className="col-span-5">
                      <p className="font-semibold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">
                        GST: {item.gst_rate}% (₹{item.gst_amount})
                      </p>
                    </div>

                    <div className="col-span-2 text-right font-mono text-slate-300">
                      ₹{item.price.toFixed(2)}
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-1 font-mono">
                      <button
                        onClick={() => updateItemQty(item.cart_id, item.qty - 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold"
                      >
                        -
                      </button>
                      <span className="font-bold text-white px-1">{item.qty}</span>
                      <button
                        onClick={() => updateItemQty(item.cart_id, item.qty + 1)}
                        className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="col-span-2 text-right font-mono font-bold text-emerald-400">
                      ₹{item.line_total.toFixed(2)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => removeItemFromCart(item.cart_id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Clear & Active Items Count */}
          {cart.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>{cart.reduce((a, b) => a + b.qty, 0)} units across {cart.length} line items</span>
              <button
                onClick={handleClearCart}
                className="text-rose-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear Active Bill
              </button>
            </div>
          )}
        </div>

        {/* ================= RIGHT 5 COLS: CUSTOMER, TOTALS & PAYMENT ================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl space-y-5">
            {/* Customer Inputs */}
            <div className="space-y-3 pb-4 border-b border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Customer Details (Optional)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-2 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit Mobile"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-2 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-mono">₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Flat Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountInput}
                  onChange={(e) =>
                    setDiscountInput(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  placeholder="0"
                  className="w-20 text-right bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">CGST + SGST:</span>
                <span className="font-mono text-emerald-400">+₹{totalGst.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand Total Display */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-slate-900 border border-emerald-500/30">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Grand Total:
                </span>
                <div className="text-right">
                  <span className="text-3xl font-black text-white font-mono tracking-tight">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                  <p className="text-[10px] text-emerald-400 font-medium">Net Payable Amount</p>
                </div>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Select Payment Mode:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'UPI QR', label: 'UPI QR', icon: QrCode },
                  { id: 'Cash', label: 'Cash', icon: Banknote },
                  { id: 'Card', label: 'Card / POS', icon: CreditCard },
                  { id: 'Udhar Khata', label: 'Udhar Khata', icon: BookOpen },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id as any)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-emerald-400 border-emerald-500/60 shadow-glow-emerald'
                          : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* UPI QR Display if mode === UPI QR */}
            {paymentMode === 'UPI QR' && (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
                {upiId ? (
                  <>
                    <div className="flex justify-center p-3 bg-white rounded-xl w-max mx-auto border-2 border-slate-700">
                      <QRCodeSVG value={upiPayUrl} size={150} />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono text-emerald-400">Scan to Pay ₹{grandTotal}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{upiId}</p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 py-2">
                    <p className="text-xs text-amber-300 font-semibold">
                      UPI ID not configured in store profile.
                    </p>
                    <button
                      onClick={onNavigateToSettings}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20"
                    >
                      Configure UPI ID in Store Setup →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generate & Save Bill Button */}
            <button
              onClick={handleGenerateAndSaveBill}
              disabled={isProcessing || cart.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-glow-emerald disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing & Saving Bill...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Generate & Save Bill (₹{grandTotal})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL: QUICK CUSTOM ITEM ================= */}
      {customItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-[#0B1120] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Add Custom Item to Bill</h3>
              <button
                onClick={() => setCustomItemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Loose Sugar 1kg"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={customPrice}
                    onChange={(e) =>
                      setCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    placeholder="45.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customQty}
                    onChange={(e) =>
                      setCustomQty(e.target.value === '' ? '' : parseInt(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  GST Rate
                </label>
                <select
                  value={customGst}
                  onChange={(e) => setCustomGst(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value={0}>0% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={28}>28% GST</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomItemModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  + Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE RECEIPT ================= */}
      {receiptModalOpen && completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto space-y-5">
            {/* Action Bar (Hidden during print) */}
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Bill Finalized & Saved!</span>
              </span>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Real Printable Receipt Paper Body */}
            <div id="printable-receipt" className="text-left font-mono text-xs space-y-3 bg-white p-2">
              {/* Store Header */}
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
                {userProfile?.phone && (
                  <p className="text-[10px] text-slate-700">Ph: {userProfile.phone}</p>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span>Invoice #:</span>
                  <span className="font-bold">{completedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span>{new Date(completedInvoice.created_at).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="font-bold">{completedInvoice.payment_mode}</span>
                </div>
                {completedInvoice.customer_name && completedInvoice.customer_name !== 'Counter Customer' && (
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{completedInvoice.customer_name}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-600">
                  <span>Item</span>
                  <span>Total</span>
                </div>
                {completedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-baseline text-[11px]">
                    <div className="pr-2">
                      <p className="font-medium text-black">{item.name}</p>
                      <p className="text-[9px] text-slate-600">
                        {item.qty} {item.unit} x ₹{item.price.toFixed(2)} (GST {item.gst_rate}%)
                      </p>
                    </div>
                    <span className="font-bold text-black shrink-0">
                      ₹{item.line_total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="space-y-1 pt-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{completedInvoice.subtotal.toFixed(2)}</span>
                </div>
                {completedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{completedInvoice.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700">
                  <span>Total GST:</span>
                  <span>₹{completedInvoice.total_gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-black text-black">
                  <span>GRAND TOTAL:</span>
                  <span>₹{completedInvoice.grand_total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-3 text-[10px] text-slate-600 space-y-0.5">
                <p>Thank you for shopping with us!</p>
                <p className="font-sans text-[9px] text-slate-400">Powered by nivopos.in</p>
              </div>
            </div>

            {/* Working Action Buttons (Hidden during print) */}
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
                  <span>WhatsApp Bill</span>
                </button>
              </div>

              <button
                onClick={() => setReceiptModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
              >
                + Start Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
