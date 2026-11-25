import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  ScanLine,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PackageCheck,
  Building2,
  Receipt,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  ClipboardPaste,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreProfile, PurchaseBillItem, PurchaseBillData } from '../types';

interface PurchaseBillsProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onNavigateToProducts: () => void;
}

export const PurchaseBills: React.FC<PurchaseBillsProps> = ({
  currentUser,
  userProfile,
  onNavigateToProducts,
}) => {
  // Mode: File Upload vs Raw Text Input
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsing & State
  const [isParsing, setIsParsing] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Extracted Bill Form State
  const [supplierName, setSupplierName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseBillItem[]>([]);
  const [lastSavedSummary, setLastSavedSummary] = useState<{
    updatedCount: number;
    createdCount: number;
    totalUnits: number;
  } | null>(null);

  // Handle File Selection (image or camera photo)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFeedback({
          type: 'error',
          message: 'Please upload an image file (JPEG, PNG, WebP).',
        });
        return;
      }
      setSelectedFile(file);
      setFeedback(null);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Sample Wholesaler Bill Demo Loader (Metro Cash & Carry / Mandi Wholesaler)
  const handleLoadSampleBill = () => {
    setSupplierName('Metro Wholesale & Distribution Pvt Ltd');
    setBillNumber(`WH-INV-${Math.floor(100000 + Math.random() * 900000)}`);
    setBillDate(new Date().toISOString().slice(0, 10));
    setItems([
      {
        id: '1',
        name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
        qty: 24,
        unit: 'pack',
        purchase_price: 118,
        selling_price: 135,
        gst_rate: 5,
        total_amount: 2832,
      },
      {
        id: '2',
        name: 'Aashirvaad Shudh Chakki Atta 10kg',
        qty: 15,
        unit: 'pack',
        purchase_price: 365,
        selling_price: 420,
        gst_rate: 0,
        total_amount: 5475,
      },
      {
        id: '3',
        name: 'Tata Salt Vaccum Evaporated 1kg',
        qty: 50,
        unit: 'pack',
        purchase_price: 22,
        selling_price: 28,
        gst_rate: 0,
        total_amount: 1100,
      },
      {
        id: '4',
        name: 'Amul Pure Ghee 1L Tin',
        qty: 12,
        unit: 'pack',
        purchase_price: 540,
        selling_price: 610,
        gst_rate: 12,
        total_amount: 6480,
      },
      {
        id: '5',
        name: 'Surf Excel Quick Wash Detergent Powder 1kg',
        qty: 20,
        unit: 'pack',
        purchase_price: 132,
        selling_price: 155,
        gst_rate: 18,
        total_amount: 2640,
      },
    ]);
    setFeedback({
      type: 'info',
      message: 'Sample wholesale distributor bill loaded. Review line items and click "+ Add to Store Master & Update Stock".',
    });
  };

  // Perform AI OCR via Groq serverless handler
  const handleParseBill = async () => {
    if (inputMode === 'upload' && !previewImage) {
      setFeedback({
        type: 'error',
        message: 'Please choose or snap a purchase bill photo first.',
      });
      return;
    }

    if (inputMode === 'text' && !rawText.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please paste bill text or challan item details.',
      });
      return;
    }

    setIsParsing(true);
    setFeedback(null);

    try {
      const payload =
        inputMode === 'upload' ? { image: previewImage } : { text: rawText };

      const res = await fetch('/api/parse-purchase-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback or read error
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || `API returned status ${res.status}. Check GROQ_API_KEY.`
        );
      }

      const result = await res.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to extract items from purchase bill.');
      }

      const data: PurchaseBillData = result.data;
      setSupplierName(data.supplier_name || 'Wholesaler Supplier');
      setBillNumber(data.bill_number || `PB-${Date.now().toString().slice(-6)}`);
      setBillDate(data.bill_date || new Date().toISOString().slice(0, 10));
      setItems(
        data.items.map((it, idx) => ({
          ...it,
          id: `${Date.now()}-${idx}`,
        }))
      );

      setFeedback({
        type: 'success',
        message: `Extracted ${data.items.length} line items successfully with Groq OCR! Review details below.`,
      });
    } catch (err: any) {
      console.warn('[PurchaseBills] Groq API notice:', err.message);
      // If serverless is not running or key is missing, offer sample data
      setFeedback({
        type: 'error',
        message: `${err.message} You can also click "Load Sample Wholesaler Bill" to test instantly or edit items manually.`,
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Update Line Item Field
  const updateItem = (id: string, field: keyof PurchaseBillItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'purchase_price') {
          const qty = Number(field === 'qty' ? value : updated.qty) || 0;
          const buyPrice =
            Number(field === 'purchase_price' ? value : updated.purchase_price) || 0;
          updated.total_amount = Math.round(qty * buyPrice * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Add Empty Line Item Manually
  const handleAddManualItem = () => {
    const newItem: PurchaseBillItem = {
      id: Date.now().toString(),
      name: '',
      qty: 1,
      unit: 'pcs',
      purchase_price: 0,
      selling_price: 0,
      gst_rate: 5,
      total_amount: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Delete Line Item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Live Totals Calculations
  const subtotal = items.reduce(
    (acc, i) => acc + (Number(i.purchase_price) || 0) * (Number(i.qty) || 0),
    0
  );
  const totalGst = items.reduce(
    (acc, i) =>
      acc +
      ((Number(i.purchase_price) || 0) * (Number(i.qty) || 0) * (Number(i.gst_rate) || 0)) / 100,
    0
  );
  const grandTotal = Math.round((subtotal + totalGst) * 100) / 100;
  const totalUnits = items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);

  // Commit Items into Supabase public.products (Updating stock and adding new products)
  const handleSaveToStoreStock = async () => {
    if (items.length === 0) {
      setFeedback({
        type: 'error',
        message: 'No line items to add. Please extract or add items first.',
      });
      return;
    }

    // Validate that items have names
    const invalidItem = items.find((i) => !i.name.trim());
    if (invalidItem) {
      setFeedback({
        type: 'error',
        message: 'All items must have a product name. Please fill empty names.',
      });
      return;
    }

    setIsSavingStock(true);
    setFeedback(null);

    try {
      // 1. Fetch current store catalog to match existing products by name
      const { data: existingProducts, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', currentUser.id);

      if (fetchErr) throw fetchErr;

      const catalog = existingProducts || [];
      let updatedCount = 0;
      let createdCount = 0;

      for (const item of items) {
        const trimmedName = item.name.trim();
        const existing = catalog.find(
          (p) => p.name.toLowerCase().trim() === trimmedName.toLowerCase()
        );

        const buyPrice = Number(item.purchase_price) || 0;
        const sellPrice =
          Number(item.selling_price) || Math.round(buyPrice * 1.2 * 100) / 100;
        const qty = Number(item.qty) || 1;
        const gstRate = Number(item.gst_rate) || 0;

        if (existing) {
          // Increment stock_qty of existing product
          const newStock = (Number(existing.stock_qty) || 0) + qty;
          const { error: updateErr } = await supabase
            .from('products')
            .update({
              stock_qty: newStock,
              selling_price: sellPrice > 0 ? sellPrice : existing.selling_price,
              gst_rate: gstRate,
            })
            .eq('id', existing.id)
            .eq('store_id', currentUser.id);

          if (updateErr) throw updateErr;
          updatedCount++;
        } else {
          // Insert new product in catalog
          const { error: insertErr } = await supabase.from('products').insert({
            store_id: currentUser.id,
            name: trimmedName,
            unit: item.unit || 'pcs',
            mrp: sellPrice,
            selling_price: sellPrice,
            gst_rate: gstRate,
            stock_qty: qty,
            low_stock_alert: 5,
          });

          if (insertErr) throw insertErr;
          createdCount++;
        }
      }

      setLastSavedSummary({
        updatedCount,
        createdCount,
        totalUnits,
      });

      setFeedback({
        type: 'success',
        message: `Inventory Updated! Added ${createdCount} new products and restocked ${updatedCount} existing products (${totalUnits} total units).`,
      });

      // Clear extracted bill state so user can process next bill
      setItems([]);
      setSelectedFile(null);
      setPreviewImage(null);
      setRawText('');
      setSupplierName('');
      setBillNumber('');
    } catch (err: any) {
      console.error('[PurchaseBills] Error updating stock:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update stock in database.',
      });
    } finally {
      setIsSavingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Purchase Bills & AI Stock Inward
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 font-mono">
              Groq AI OCR
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan distributor invoices or delivery challans to automatically update product inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSampleBill}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#4338CA]" />
            <span>Load Sample Wholesaler Bill</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToProducts}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#4338CA] border border-indigo-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Product Master</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-teal-50 border-teal-200 text-[#0D9488]'
              : feedback.type === 'info'
              ? 'bg-indigo-50 border-indigo-200 text-[#4338CA]'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : feedback.type === 'info' ? (
              <Sparkles className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>

          {feedback.type === 'success' && (
            <button
              onClick={onNavigateToProducts}
              className="px-2.5 py-1 rounded-lg bg-nivo-teal text-white text-[11px] font-bold hover:bg-nivo-tealHover shrink-0"
            >
              View in Catalog →
            </button>
          )}
        </div>
      )}

      {/* STEP 1: UPLOAD / SCAN / PASTE CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            {/* Input Mode Selector */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <ScanLine className="w-4 h-4 text-[#4338CA]" />
                <span>1. Scan / Import Bill</span>
              </span>

              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    inputMode === 'upload'
                      ? 'bg-white text-[#4338CA] shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Photo / Upload
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    inputMode === 'text'
                      ? 'bg-white text-[#4338CA] shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paste Text
                </button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewImage ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 max-h-56 flex items-center justify-center">
                      <img
                        src={previewImage}
                        alt="Bill preview"
                        className="object-contain w-full h-auto max-h-56"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewImage(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-rose-600 shadow-sm border border-slate-200 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate text-center">
                      {selectedFile?.name || 'Selected image ready for parsing'}
                    </p>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#4338CA] bg-slate-50/60 hover:bg-slate-50 cursor-pointer text-center space-y-2 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">
                        Snap or Upload Purchase Bill Photo
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        JPEG, PNG, WebP from phone camera or device
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Paste Wholesaler Bill / WhatsApp Order Text
                </label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste text like:&#10;Metro Cash & Carry - Inv #98421&#10;1. Fortune Sunlite Oil 1L x 24 packs @ 118&#10;2. Aashirvaad Atta 10kg x 15 @ 365..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white font-mono"
                />
              </div>
            )}

            {/* Scan Button: Primary #4338CA */}
            <button
              type="button"
              onClick={handleParseBill}
              disabled={isParsing || (inputMode === 'upload' && !previewImage) || (inputMode === 'text' && !rawText.trim())}
              className="w-full py-3 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Line Items (Groq OCR)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract Bill Items with Groq AI</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Tips Box */}
          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 text-slate-700 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#0D9488]">
              <PackageCheck className="w-4 h-4 shrink-0" />
              <span>Smart Kirana Stock Synchronization</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When you commit items, Nivo POS searches existing products in your store master:
              <br />
              • Matching items have their <b>stock quantity incremented</b> immediately.
              <br />
              • New items are <b>automatically created</b> with selling rates and GST %.
            </p>
          </div>
        </div>

        {/* STEP 2: REVIEW & EDIT EXTRACTED TABLE */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#0D9488]" />
                <span>2. Review Extracted Stock Items ({items.length})</span>
              </span>

              <button
                type="button"
                onClick={handleAddManualItem}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#4338CA] border border-indigo-200 text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Bill Header Info (Supplier, Bill Number, Date) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Supplier / Wholesaler
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Wholesale Supplier"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Bill / Invoice #
                </label>
                <div className="relative">
                  <Receipt className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="INV-12345"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Bill Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 text-[10px] font-semibold text-slate-600 uppercase tracking-wider grid grid-cols-12 border-b border-slate-200">
                <span className="col-span-4">Item Name</span>
                <span className="col-span-2 text-center">Qty / Unit</span>
                <span className="col-span-2 text-right">Buy Rate (₹)</span>
                <span className="col-span-2 text-right">Sell Rate (₹)</span>
                <span className="col-span-1 text-center">GST%</span>
                <span className="col-span-1 text-center">Del</span>
              </div>

              {items.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    No items extracted yet. Upload a bill photo on the left or load sample bill.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSampleBill}
                    className="text-xs text-[#4338CA] hover:underline font-semibold"
                  >
                    Load Sample Wholesaler Bill →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="px-3 py-2 grid grid-cols-12 items-center text-xs gap-1.5 hover:bg-slate-50/50"
                    >
                      {/* Name */}
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id || '', 'name', e.target.value)}
                          placeholder="Product Name"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#4338CA]"
                        />
                      </div>

                      {/* Qty & Unit */}
                      <div className="col-span-2 flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(item.id || '', 'qty', parseFloat(e.target.value) || 0)
                          }
                          className="w-12 text-center bg-slate-50 border border-slate-200 rounded-lg py-1 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(item.id || '', 'unit', e.target.value)}
                          className="w-14 bg-slate-50 border border-slate-200 rounded-lg py-1 text-[10px] text-slate-700 focus:outline-none"
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="pack">pack</option>
                          <option value="box">box</option>
                          <option value="ltr">ltr</option>
                          <option value="gm">gm</option>
                        </select>
                      </div>

                      {/* Purchase Price (Buy Rate) */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchase_price}
                          onChange={(e) =>
                            updateItem(
                              item.id || '',
                              'purchase_price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none"
                        />
                      </div>

                      {/* Selling Price */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.selling_price || ''}
                          onChange={(e) =>
                            updateItem(
                              item.id || '',
                              'selling_price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="MRP"
                          className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-[#0D9488] font-bold font-mono focus:bg-white focus:outline-none"
                        />
                      </div>

                      {/* GST % */}
                      <div className="col-span-1">
                        <select
                          value={item.gst_rate}
                          onChange={(e) =>
                            updateItem(item.id || '', 'gst_rate', parseInt(e.target.value) || 0)
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 text-[10px] text-slate-700 text-center focus:outline-none"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id || '')}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals Summary */}
            {items.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3 font-mono">
                <div>
                  <span className="text-slate-500 font-sans">Total Units: </span>
                  <span className="font-bold text-slate-900">{totalUnits}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Subtotal: </span>
                  <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">GST: </span>
                  <span className="font-bold text-[#0D9488]">+₹{totalGst.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Grand Total: </span>
                  <span className="font-black text-[#4338CA] text-sm">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Commit Stock Action Button: Primary #4338CA */}
            <button
              type="button"
              onClick={handleSaveToStoreStock}
              disabled={isSavingStock || items.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isSavingStock ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronizing Inventory to Product Master...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>+ Add to Store Master & Update Stock ({items.length} Items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
