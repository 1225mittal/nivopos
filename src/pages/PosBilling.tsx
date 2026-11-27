import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Copy,
  Check,
  Percent,
  Building2,
  MapPin,
  PauseCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { Product, StoreProfile, Invoice, InvoiceItem } from '../types';
import { ThermalReceipt } from '../components/ThermalReceipt';

export interface HeldBill {
  id: string;
  timestamp: string;
  createdAtFormatted: string;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  cart: CartItem[];
  discountInput: number | '';
  taxMode: 'inclusive' | 'exclusive';
  paymentMode: 'UPI QR' | 'Cash' | 'Card' | 'Udhar Khata';
  itemCount: number;
  totalQty: number;
  totalAmount: number;
}

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

// Pure helper to compute line item values based on tax mode (zero allocations during re-renders)
const calculateItemValues = (
  price: number,
  qty: number,
  gstRate: number,
  mode: 'inclusive' | 'exclusive'
) => {
  const safePrice = Number(price) || 0;
  const safeQty = Number(qty) || 0;
  const safeGst = Number(gstRate) || 0;

  if (mode === 'inclusive') {
    const lineTotal = safePrice * safeQty;
    const taxable = safeGst > 0 ? lineTotal / (1 + safeGst / 100) : lineTotal;
    const gst = lineTotal - taxable;
    return {
      taxable_amount: Math.round(taxable * 100) / 100,
      gst_amount: Math.round(gst * 100) / 100,
      line_total: Math.round(lineTotal * 100) / 100,
    };
  } else {
    const taxable = safePrice * safeQty;
    const gst = (taxable * safeGst) / 100;
    const lineTotal = taxable + gst;
    return {
      taxable_amount: Math.round(taxable * 100) / 100,
      gst_amount: Math.round(gst * 100) / 100,
      line_total: Math.round(lineTotal * 100) / 100,
    };
  }
};

export const PosBilling: React.FC<PosBillingProps> = ({
  currentUser,
  userProfile,
  onNavigateToProducts,
  onNavigateToSettings,
}) => {
  // Store products from public.products
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Tax Mode: 'inclusive' (MRP includes GST) vs 'exclusive' (+GST on base price)
  const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive');

  // Dispatch preference: 'both' | 'print' | 'whatsapp'
  const [dispatchPref, setDispatchPref] = useState<'both' | 'print' | 'whatsapp'>('both');

  // Active Bill State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showGstFields, setShowGstFields] = useState(false);
  const [isSearchingGstin, setIsSearchingGstin] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'UPI QR' | 'Cash' | 'Card' | 'Udhar Khata'>('UPI QR');

  // Held / Parked Bills State (persisted to localStorage)
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    try {
      const raw = localStorage.getItem('nivopos_held_bills');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nivopos_held_bills', JSON.stringify(heldBills));
    } catch (err) {
      console.warn('[PosBilling] Error saving held bills to localStorage:', err);
    }
  }, [heldBills]);

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

  // Copied UPI Link State
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Modal WhatsApp Phone Input
  const [modalPhone, setModalPhone] = useState('');

  // Fetch only this store's real products - stable callback scoped to currentUser.id
  const fetchProducts = useCallback(async () => {
    if (!currentUser?.id) return;
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
  }, [currentUser?.id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update Item Qty
  const updateItemQty = useCallback(
    (cartId: string, newQty: number) => {
      if (newQty <= 0) {
        setCart((prev) => prev.filter((item) => item.cart_id !== cartId));
        return;
      }

      setCart((prev) =>
        prev.map((item) => {
          if (item.cart_id !== cartId) return item;
          const vals = calculateItemValues(item.price, newQty, item.gst_rate, taxMode);
          return {
            ...item,
            qty: newQty,
            ...vals,
          };
        })
      );
    },
    [taxMode]
  );

  // Remove Item
  const removeItemFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cart_id !== cartId));
  }, []);

  // Clear Cart
  const handleClearCart = useCallback(() => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items in the active bill?')) {
      setCart([]);
      setDiscountInput('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerGstin('');
      setCustomerAddress('');
      setShowGstFields(false);
    }
  }, [cart.length]);

  // Toggle Tax Mode and recalculate all cart items
  const handleToggleTaxMode = useCallback(
    (newMode: 'inclusive' | 'exclusive') => {
      setTaxMode(newMode);
      setCart((prev) =>
        prev.map((item) => {
          const vals = calculateItemValues(item.price, item.qty, item.gst_rate, newMode);
          return {
            ...item,
            ...vals,
          };
        })
      );
    },
    []
  );

  // Add catalog product to cart
  const addItemToCart = useCallback(
    (p: Product) => {
      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.product_id === p.id);

        if (existingIndex > -1) {
          const existing = prev[existingIndex];
          const newQty = existing.qty + 1;
          const vals = calculateItemValues(existing.price, newQty, existing.gst_rate, taxMode);
          return prev.map((item, idx) =>
            idx === existingIndex ? { ...item, qty: newQty, ...vals } : item
          );
        } else {
          const price = Number(p.selling_price) || 0;
          const gstRate = Number(p.gst_rate) || 0;
          const vals = calculateItemValues(price, 1, gstRate, taxMode);

          const newItem: CartItem = {
            cart_id: Date.now().toString() + Math.random().toString().slice(-4),
            product_id: p.id,
            name: p.name || 'Unnamed Product',
            unit: p.unit || 'pcs',
            price: price,
            qty: 1,
            gst_rate: gstRate,
            ...vals,
          };

          return [newItem, ...prev];
        }
      });
    },
    [taxMode]
  );

  // Add custom unlisted item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice) return;

    const price = Number(customPrice);
    const qty = Number(customQty) || 1;
    const gstRate = Number(customGst) || 0;
    const vals = calculateItemValues(price, qty, gstRate, taxMode);

    const newItem: CartItem = {
      cart_id: 'custom-' + Date.now().toString(),
      product_id: null,
      name: customName.trim(),
      unit: 'pcs',
      price: price,
      qty: qty,
      gst_rate: gstRate,
      ...vals,
    };

    setCart((prev) => [newItem, ...prev]);
    setCustomItemModal(false);
    setCustomName('');
    setCustomPrice('');
    setCustomQty(1);
  };

  // Handle Barcode Scan / Enter key
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = searchInput.trim();
      if (!val) return;

      // Check if exact barcode matches
      const exactMatch = storeProducts.find(
        (p) => p.barcode && String(p.barcode).toLowerCase() === val.toLowerCase()
      );

      if (exactMatch) {
        addItemToCart(exactMatch);
        setSearchInput('');
        setShowDropdown(false);
      } else {
        // If not exact barcode, check if only 1 product matches search
        const matches = storeProducts.filter((p) =>
          p.name ? String(p.name).toLowerCase().includes(val.toLowerCase()) : false
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

  // Live Bill Calculations
  const taxableSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (Number(item.taxable_amount) || 0), 0);
  }, [cart]);

  const rawSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (Number(item.line_total) || 0), 0);
  }, [cart]);

  const totalGst = useMemo(() => {
    return cart.reduce((acc, item) => acc + (Number(item.gst_amount) || 0), 0);
  }, [cart]);

  const discount = Number(discountInput) || 0;

  // Grand total calculation:
  // In inclusive mode: rawSubtotal is sum(price * qty) which already has GST embedded.
  // In exclusive mode: rawSubtotal is taxableSubtotal + totalGst.
  const grandTotal = Math.round(Math.max(0, rawSubtotal - discount));
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = cgst;

  // Real Dynamic UPI Payment Deep Link (memoized to prevent re-parsing during renders)
  const upiId = userProfile?.upi_id || '';
  const businessName = userProfile?.business_name || userProfile?.store_name || 'Nivo Store';
  const upiPayUrl = useMemo(() => {
    if (!upiId) return '';
    const safeAmount = isNaN(grandTotal) || grandTotal < 0 ? '0.00' : grandTotal.toFixed(2);
    const invoiceNum = completedInvoice?.invoice_number || 'INV';
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      businessName
    )}&am=${safeAmount}&cu=INR&tn=${encodeURIComponent('Bill ' + invoiceNum)}`;
  }, [upiId, businessName, grandTotal, completedInvoice?.invoice_number]);

  const handleCopyUpiLink = () => {
    if (!upiPayUrl) return;
    navigator.clipboard.writeText(upiPayUrl);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Auto-fill repeat buyer details when 15-char GSTIN is entered
  const handleGstinChange = async (val: string) => {
    const cleanGstin = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setCustomerGstin(cleanGstin);

    if (cleanGstin.length === 15 && currentUser?.id) {
      try {
        setIsSearchingGstin(true);
        const { data, error } = await supabase
          .from('invoices')
          .select('customer_name, customer_phone, customer_address')
          .eq('store_id', currentUser.id)
          .eq('customer_gstin', cleanGstin)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const prev = data[0];
          if (prev.customer_name && (!customerName || customerName === 'Counter Customer')) {
            setCustomerName(prev.customer_name);
          }
          if (prev.customer_phone && !customerPhone) {
            setCustomerPhone(prev.customer_phone);
          }
          if (prev.customer_address && !customerAddress) {
            setCustomerAddress(prev.customer_address);
          }
          setFeedback({
            type: 'success',
            message: `Auto-filled details for repeat B2B buyer: ${prev.customer_name || cleanGstin}`,
          });
        }
      } catch (err: any) {
        console.warn('[PosBilling] GSTIN repeat-buyer lookup note:', err?.message);
      } finally {
        setIsSearchingGstin(false);
      }
    }
  };

  // Hold / Park Current Bill
  const handleHoldCurrentBill = () => {
    if (cart.length === 0) {
      setFeedback({ type: 'error', message: 'Cannot hold an empty bill. Add items first.' });
      return;
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const custLabel = customerName.trim() || customerPhone.trim() || 'Walk-in';

    const newHeldBill: HeldBill = {
      id: `HOLD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now.toISOString(),
      createdAtFormatted: timeFormatted,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerGstin: customerGstin.trim(),
      customerAddress: customerAddress.trim(),
      cart: [...cart],
      discountInput: discountInput,
      taxMode: taxMode,
      paymentMode: paymentMode,
      itemCount: cart.length,
      totalQty: cart.reduce((a, b) => a + b.qty, 0),
      totalAmount: grandTotal,
    };

    setHeldBills((prev) => [newHeldBill, ...prev]);

    // Clear active bill screen for next customer
    setCart([]);
    setDiscountInput('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGstin('');
    setCustomerAddress('');
    setShowGstFields(false);

    setFeedback({
      type: 'success',
      message: `Bill for "${custLabel}" (₹${grandTotal}) held. Ready for next customer!`,
    });
  };

  // Resume / Restore a Held Bill
  const handleResumeHeldBill = (billId: string) => {
    const target = heldBills.find((b) => b.id === billId);
    if (!target) return;

    let updatedHeld = heldBills.filter((b) => b.id !== billId);

    // If current active cart has items, automatically park current cart first so nothing is lost!
    if (cart.length > 0) {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const autoHeldBill: HeldBill = {
        id: `HOLD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now.toISOString(),
        createdAtFormatted: timeFormatted,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerGstin: customerGstin.trim(),
        customerAddress: customerAddress.trim(),
        cart: [...cart],
        discountInput: discountInput,
        taxMode: taxMode,
        paymentMode: paymentMode,
        itemCount: cart.length,
        totalQty: cart.reduce((a, b) => a + b.qty, 0),
        totalAmount: grandTotal,
      };
      updatedHeld = [autoHeldBill, ...updatedHeld];
    }

    setHeldBills(updatedHeld);

    // Restore the selected bill
    setCart(target.cart);
    setDiscountInput(target.discountInput);
    setTaxMode(target.taxMode);
    setPaymentMode(target.paymentMode || 'Cash');
    setCustomerName(target.customerName || '');
    setCustomerPhone(target.customerPhone || '');
    setCustomerGstin(target.customerGstin || '');
    setCustomerAddress(target.customerAddress || '');
    setShowGstFields(Boolean(target.customerGstin || target.customerAddress));

    const custLabel = target.customerName || target.customerPhone || 'Walk-in';
    setFeedback({
      type: 'success',
      message: `Resumed bill for "${custLabel}" (${target.cart.length} items, ₹${target.totalAmount}).`,
    });
  };

  // Delete a Held Bill
  const handleDeleteHeldBill = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHeldBills((prev) => prev.filter((b) => b.id !== billId));
  };

  // Generate & Save Bill to database + Deduct Stock
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
      const invoicePayload: any = {
        store_id: currentUser.id,
        invoice_number: invoiceNumber,
        customer_name: customerName.trim() || 'Counter Customer',
        customer_phone: customerPhone.trim() || null,
        customer_gstin: customerGstin.trim() || null,
        customer_address: customerAddress.trim() || null,
        payment_mode: paymentMode,
        subtotal: taxMode === 'inclusive' ? rawSubtotal : taxableSubtotal,
        total_gst: totalGst,
        discount_amount: discount,
        grand_total: grandTotal,
        status: paymentMode === 'Udhar Khata' ? 'unpaid' : 'paid',
        created_at: now,
      };

      let { data: invoiceData, error: invoiceErr } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select('*')
        .single();

      if (invoiceErr && (invoiceErr.message?.includes('customer_gstin') || invoiceErr.message?.includes('customer_address'))) {
        delete invoicePayload.customer_gstin;
        delete invoicePayload.customer_address;
        const retryRes = await supabase
          .from('invoices')
          .insert(invoicePayload)
          .select('*')
          .single();
        invoiceData = retryRes.data;
        invoiceErr = retryRes.error;
      }

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

      // 3. Deduct stock_qty from public.products in Supabase & update local state
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

      // Reactively update local product stock
      setStoreProducts((prev) =>
        prev.map((p) => {
          const cartItem = cart.find((ci) => ci.product_id === p.id);
          if (cartItem) {
            return { ...p, stock_qty: Math.max(0, p.stock_qty - cartItem.qty) };
          }
          return p;
        })
      );

      // Set completed invoice for receipt modal
      const finalInvoiceObj: Invoice = {
        ...(invoiceData || invoicePayload),
        customer_gstin: customerGstin.trim() || undefined,
        customer_address: customerAddress.trim() || undefined,
      };
      setCompletedInvoice(finalInvoiceObj);
      setCompletedItems([...cart]);
      setModalPhone(customerPhone.trim());
      setReceiptModalOpen(true);

      // Handle Dispatch Preference
      if (dispatchPref === 'print') {
        setTimeout(() => window.print(), 350);
      } else if (dispatchPref === 'whatsapp' && customerPhone.trim()) {
        setTimeout(() => handleShareWhatsApp(customerPhone.trim(), finalInvoiceObj, cart), 350);
      }

      // Reset active bill cart
      setCart([]);
      setDiscountInput('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerGstin('');
      setCustomerAddress('');
      setShowGstFields(false);
    } catch (err: any) {
      console.error('[PosBilling] Error saving bill:', err);
      setFeedback({ type: 'error', message: err.message || 'Error saving invoice.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard Shortcuts: Enter outside inputs, or Ctrl+Enter anywhere to generate bill
  const handleSaveBillRef = useRef(handleGenerateAndSaveBill);
  handleSaveBillRef.current = handleGenerateAndSaveBill;

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if receipt modal or custom item modal is open, or processing, or cart is empty
      if (receiptModalOpen || customItemModal || isProcessing || cart.length === 0) {
        return;
      }

      // 1. Ctrl + Enter from anywhere on the page (even inside inputs)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSaveBillRef.current();
        return;
      }

      // 2. Plain Enter key outside inputs/textarea/select/modal
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const activeElem = document.activeElement as HTMLElement | null;
        const tag = (activeElem?.tagName || '').toLowerCase();
        const isTextInput =
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          activeElem?.isContentEditable;

        if (!isTextInput) {
          e.preventDefault();
          handleSaveBillRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [receiptModalOpen, customItemModal, isProcessing, cart.length]);

  // WhatsApp formatted receipt text generator
  const getWhatsAppMessage = (inv?: Invoice, itms?: CartItem[]) => {
    const currentInv = inv || completedInvoice;
    const currentItms = itms || completedItems;
    if (!currentInv) return '';

    const itemsList = currentItms
      .map((i) => `• ${i.name} (${i.qty} ${i.unit}) = ₹${i.line_total}`)
      .join('\n');

    return (
      `🧾 *TAX INVOICE - ${businessName}*\n` +
      `Bill #: ${currentInv.invoice_number}\n` +
      `Date: ${new Date(currentInv.created_at).toLocaleString('en-IN')}\n` +
      `Customer: ${currentInv.customer_name}\n` +
      (currentInv.customer_gstin ? `Buyer GSTIN: ${currentInv.customer_gstin}\n` : '') +
      (currentInv.customer_address ? `Buyer Address: ${currentInv.customer_address}\n` : '') +
      `--------------------------------\n` +
      `${itemsList}\n` +
      `--------------------------------\n` +
      `Subtotal: ₹${currentInv.subtotal.toFixed(2)}\n` +
      (currentInv.discount_amount > 0 ? `Discount: -₹${currentInv.discount_amount.toFixed(2)}\n` : '') +
      `GST (CGST+SGST): ₹${currentInv.total_gst.toFixed(2)}\n` +
      `*GRAND TOTAL: ₹${currentInv.grand_total.toLocaleString('en-IN')}*\n` +
      `Payment Mode: ${currentInv.payment_mode}\n\n` +
      `Thank you for shopping with ${businessName}!\n` +
      `Powered by nivopos.in`
    );
  };

  const handleShareWhatsApp = (customPhoneNum?: string, inv?: Invoice, itms?: CartItem[]) => {
    const text = getWhatsAppMessage(inv, itms);
    const targetPhone = (customPhoneNum !== undefined ? customPhoneNum : modalPhone) || '';
    const phoneClean = targetPhone.replace(/\D/g, '');
    const phoneParam = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filtered product suggestions for search (null-safe and type-safe)
  const filteredProducts = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    return storeProducts
      .filter((p) => {
        const nameMatch = p?.name ? String(p.name).toLowerCase().includes(q) : false;
        const barcodeMatch = p?.barcode ? String(p.barcode).toLowerCase().includes(q) : false;
        return nameMatch || barcodeMatch;
      })
      .slice(0, 8);
  }, [storeProducts, searchInput]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${feedback.type === 'success'
            ? 'bg-teal-50 border-teal-200 text-[#0D9488]'
            : 'bg-rose-50 border-rose-200 text-rose-700'
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

      {/* Held / Parked Bills Bar */}
      {heldBills.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs">
          <div className="flex items-center gap-1.5 font-bold text-nivo-amber shrink-0">
            <PauseCircle className="w-4 h-4 text-nivo-amber" />
            <span>Held Bills ({heldBills.length}):</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {heldBills.map((hb) => (
              <div
                key={hb.id}
                onClick={() => handleResumeHeldBill(hb.id)}
                className="group flex items-center gap-2 px-3 py-1 rounded-xl bg-white border border-amber-200 hover:border-nivo-indigo hover:shadow-xs cursor-pointer transition-all text-xs"
                title={`Click to resume bill (${hb.itemCount} items, ₹${hb.totalAmount})`}
              >
                <span className="font-semibold text-nivo-ink">
                  {hb.customerName || hb.customerPhone || 'Walk-in'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ₹{hb.totalAmount} ({hb.itemCount} itm)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {hb.createdAtFormatted}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteHeldBill(hb.id, e)}
                  className="p-0.5 rounded-full text-slate-400 hover:text-nivo-rose hover:bg-rose-50 transition-colors ml-0.5"
                  title="Delete this held bill"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT 7 COLS: SCANNER, TAX TOGGLE & CART ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Bar: Barcode Scanner & Tax Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <ScanLine className="w-5 h-5 text-[#4338CA] ml-2 shrink-0 animate-pulse" />
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
                  className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCustomItemModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#4338CA] border border-indigo-200 text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Custom Item</span>
                </button>
              </div>

              {/* Dropdown product matches */}
              {showDropdown && searchInput.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 divide-y divide-slate-100 overflow-hidden">
                  {filteredProducts.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      No matching products. Press "Custom Item" to add directly.
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLowStock = p.stock_qty <= (p.low_stock_alert || 5);
                      const isOutOfStock = p.stock_qty <= 0;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            addItemToCart(p);
                            setSearchInput('');
                            setShowDropdown(false);
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[#0F172A]">{p.name}</p>
                              {isOutOfStock ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                  Out of Stock
                                </span>
                              ) : isLowStock ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Low: {p.stock_qty} {p.unit}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {p.barcode ? `Barcode: ${p.barcode} • ` : ''}Stock: {p.stock_qty} {p.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#4338CA] font-mono">
                              ₹{Number(p.selling_price).toFixed(2)}
                            </span>
                            <p className="text-[10px] text-slate-500">GST {p.gst_rate}%</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Tax Mode Segment Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleToggleTaxMode('inclusive')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${taxMode === 'inclusive'
                  ? 'bg-white text-[#4338CA] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Selling price already includes GST"
              >
                Tax Inclusive (MRP)
              </button>
              <button
                type="button"
                onClick={() => handleToggleTaxMode('exclusive')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${taxMode === 'exclusive'
                  ? 'bg-white text-[#4338CA] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
                title="Add GST on top of item base price"
              >
                Tax Exclusive (+GST)
              </button>
            </div>
          </div>

          {/* Cart Items Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 bg-slate-50 text-[10px] font-semibold text-slate-600 uppercase tracking-wider grid grid-cols-12 border-b border-slate-200">
              <span className="col-span-5">Item</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Total</span>
              <span className="col-span-1 text-center">Del</span>
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-xs text-slate-500">Cart is empty. Scan an item or select a product above.</p>
                {storeProducts.length === 0 && !loadingProducts && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 max-w-sm mx-auto text-center space-y-2">
                    <p className="text-xs text-amber-800 font-medium">No products in your catalog yet.</p>
                    <button
                      onClick={onNavigateToProducts}
                      className="px-3 py-1.5 rounded-lg bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Go to Product Master</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.cart_id}
                    className="px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-50/60 text-xs transition-colors"
                  >
                    <div className="col-span-5">
                      <p className="font-semibold text-[#0F172A] truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500">
                        GST: {item.gst_rate}% (₹{item.gst_amount.toFixed(2)}) • {taxMode === 'inclusive' ? 'Incl' : 'Excl'}
                      </p>
                    </div>

                    <div className="col-span-2 text-right font-mono text-slate-700">
                      ₹{item.price.toFixed(2)}
                    </div>

                    <div className="col-span-2 flex items-center justify-center gap-1 font-mono">
                      <button
                        onClick={() => updateItemQty(item.cart_id, item.qty - 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold border border-slate-200"
                      >
                        -
                      </button>
                      <span className="font-bold text-[#0F172A] px-1">{item.qty}</span>
                      <button
                        onClick={() => updateItemQty(item.cart_id, item.qty + 1)}
                        className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold border border-slate-200"
                      >
                        +
                      </button>
                    </div>

                    <div className="col-span-2 text-right font-mono font-bold text-[#4338CA]">
                      ₹{item.line_total.toFixed(2)}
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => removeItemFromCart(item.cart_id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Clear, Hold Bill & Active Items Count */}
          {cart.length > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                {cart.reduce((a, b) => a + b.qty, 0)} units across {cart.length} line items ({taxMode === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive'})
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleHoldCurrentBill}
                  className="text-[#4338CA] hover:text-[#3730A3] flex items-center gap-1 font-bold transition-colors"
                  title="Hold / park current bill and bill next customer"
                >
                  <PauseCircle className="w-3.5 h-3.5" /> Hold Bill
                </button>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-rose-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Clear Active Bill
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT 5 COLS: CUSTOMER, TOTALS & PAYMENT ================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
            {/* Customer Inputs & B2B GST Details */}
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                  Customer Details (Optional)
                </span>
                <button
                  type="button"
                  onClick={() => setShowGstFields((prev) => !prev)}
                  className="text-[11px] font-bold text-nivo-indigo hover:text-nivo-indigoHover flex items-center gap-1 transition-colors"
                >
                  {showGstFields ? '− Hide GST Details' : '+ Add GST Bill Details'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-2 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit Mobile"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-2 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              {/* B2B GST Customer Details Toggle */}
              {showGstFields && (
                <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      maxLength={15}
                      value={customerGstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      placeholder="Customer GSTIN (15-digit uppercase)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 font-mono uppercase placeholder:normal-case placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                    />
                    {isSearchingGstin && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4338CA] absolute right-3 top-2.5" />
                    )}
                  </div>

                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Billing Address (e.g. Shop 4, Market Yard, City)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-2 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  {taxMode === 'inclusive' ? 'Subtotal (Gross):' : 'Taxable Subtotal:'}
                </span>
                <span className="font-mono text-slate-900">
                  ₹{(taxMode === 'inclusive' ? rawSubtotal : taxableSubtotal).toFixed(2)}
                </span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Flat Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountInput}
                  onChange={(e) =>
                    setDiscountInput(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  placeholder="0"
                  className="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#4338CA] focus:bg-white"
                />
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Total GST ({taxMode === 'inclusive' ? 'Embedded' : 'Added'}):
                </span>
                <span className="font-mono text-[#0D9488] font-semibold">+₹{totalGst.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand Total Display */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Grand Total:
                </span>
                <div className="text-right">
                  <span className="text-3xl font-black text-[#0F172A] font-mono tracking-tight">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                  <p className="text-[10px] text-indigo-700 font-medium">Net Payable Amount</p>
                </div>
              </div>
            </div>

            {/* Dispatch Preference Selector */}
            <div className="space-y-1.5 pb-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Bill Action on Save:
              </span>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setDispatchPref('both')}
                  className={`py-1.5 rounded-lg font-bold transition-all text-center ${dispatchPref === 'both'
                    ? 'bg-white text-[#4338CA] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Both / Modal
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchPref('print')}
                  className={`py-1.5 rounded-lg font-bold transition-all text-center ${dispatchPref === 'print'
                    ? 'bg-white text-[#4338CA] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Auto-Print
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchPref('whatsapp')}
                  className={`py-1.5 rounded-lg font-bold transition-all text-center ${dispatchPref === 'whatsapp'
                    ? 'bg-white text-[#0D9488] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Auto-WhatsApp
                </button>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
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
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${isSelected
                        ? 'bg-teal-50 text-[#0D9488] border-teal-500 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic UPI QR Display if mode === UPI QR */}
            {paymentMode === 'UPI QR' && (
              <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200 text-center space-y-3">
                {upiId ? (
                  <>
                    <div className="flex justify-center p-3 bg-white rounded-xl w-max mx-auto border border-teal-200 shadow-sm">
                      <QRCodeSVG value={upiPayUrl} size={150} level="M" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-mono text-[#0D9488] font-bold">
                        Scan to Pay ₹{grandTotal}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">{upiId}</p>
                      <button
                        type="button"
                        onClick={handleCopyUpiLink}
                        className="inline-flex items-center gap-1 text-[10px] text-[#4338CA] hover:underline font-semibold mt-1"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="w-3 h-3 text-[#0D9488]" />
                            <span className="text-[#0D9488]">UPI Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy UPI Payment Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 py-2">
                    <p className="text-xs text-amber-800 font-semibold">
                      UPI ID not configured in store profile.
                    </p>
                    <button
                      onClick={onNavigateToSettings}
                      className="px-3 py-1.5 rounded-lg bg-nivo-teal text-white text-xs font-bold hover:bg-nivo-tealHover shadow-sm"
                    >
                      Configure UPI ID in Store Setup →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generate & Save Bill Button: Primary #4338CA */}
            <button
              onClick={handleGenerateAndSaveBill}
              disabled={isProcessing || cart.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
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
                  <span className="ml-1 text-[10px] font-mono font-medium opacity-80 bg-white/20 px-1.5 py-0.5 rounded tracking-normal lowercase">
                    (Enter)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL: QUICK CUSTOM ITEM ================= */}
      {customItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-[#0F172A]">Add Custom Item to Bill</h3>
              <button
                onClick={() => setCustomItemModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Loose Sugar 1kg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#4338CA] font-bold font-mono focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customQty}
                    onChange={(e) =>
                      setCustomQty(e.target.value === '' ? '' : parseInt(e.target.value))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  GST Rate
                </label>
                <select
                  value={customGst}
                  onChange={(e) => setCustomGst(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
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
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs shadow-sm"
                >
                  + Add to Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE RECEIPT & WHATSAPP ================= */}
      {receiptModalOpen && completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl my-auto space-y-5 border border-slate-200">
            {/* Action Bar (Hidden during print) */}
            <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-[#0D9488] flex items-center gap-1.5">
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

            {/* Real Printable Receipt Paper Body (58mm Thermal GST Rule 46 Compliant) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-[60vh] overflow-y-auto">
              <div className="w-full max-w-[280px] mx-auto bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                <ThermalReceipt
                  storeProfile={userProfile}
                  invoice={completedInvoice}
                  items={completedItems}
                />
              </div>
            </div>

            {/* Quick WhatsApp Phone Number Override */}
            <div className="no-print pt-2 space-y-2 border-t border-slate-200">
              <label className="block text-[10px] font-semibold text-slate-600 uppercase">
                Send WhatsApp Bill to Mobile:
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  maxLength={10}
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(modalPhone)}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>

            {/* Working Action Buttons (Hidden during print) */}
            <div className="no-print pt-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => window.print()}
                  className="py-2.5 px-3 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  onClick={() => handleShareWhatsApp(modalPhone)}
                  className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp Bill</span>
                </button>
              </div>

              <button
                onClick={() => setReceiptModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                + Start Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dedicated 58mm Thermal Receipt Print Area (Printed when window.print() is called) */}
      <div id="thermal-receipt-print-area" className="hidden print:block">
        {completedInvoice && (
          <ThermalReceipt
            storeProfile={userProfile}
            invoice={completedInvoice}
            items={completedItems}
          />
        )}
      </div>
    </div>
  );
};
