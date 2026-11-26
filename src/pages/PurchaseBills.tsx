import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ExternalLink,
  Eye,
  X,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';
import { StoreProfile, PurchaseBillItem, PurchaseBillData, PurchaseBillRecord } from '../types';

// Configure pdfjs-dist worker using Vite's new URL as required
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface SelectedFileInfo {
  file: File;
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'image';
  previewUrl?: string;
}

interface PurchaseBillsProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onNavigateToProducts: () => void;
}

// Format file size nicely
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper: Convert regular image file to base64 data URL
const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Helper: Render up to first 4 pages of a PDF file onto offscreen canvas at 1.5x scale
const renderPdfToImageUrls = async (file: File, maxPages = 4): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const dataUrls: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');

    if (context) {
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      dataUrls.push(canvas.toDataURL('image/jpeg', 0.85));
    }
  }

  return dataUrls;
};

export const PurchaseBills: React.FC<PurchaseBillsProps> = ({
  currentUser,
  userProfile,
  onNavigateToProducts,
}) => {
  // Mode: File Upload vs Raw Text Input
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileInfo[]>([]);
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parsing & State
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatusText, setParsingStatusText] = useState('');
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

  // Saved Inward Bills History
  const [savedBills, setSavedBills] = useState<PurchaseBillRecord[]>([]);
  const [loadingSavedBills, setLoadingSavedBills] = useState(false);

  // Bill Details Modal State
  const [detailsModalBill, setDetailsModalBill] = useState<PurchaseBillRecord | null>(null);
  const [modalResolvedUrls, setModalResolvedUrls] = useState<
    Array<{ name: string; url: string; isPdf: boolean }>
  >([]);
  const [loadingSignedUrls, setLoadingSignedUrls] = useState(false);

  // Fetch saved purchase bills from Supabase
  const fetchSavedBills = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingSavedBills(true);
      const { data, error } = await supabase
        .from('purchase_bills')
        .select('*')
        .eq('store_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSavedBills(data);
      }
    } catch (err: any) {
      console.warn('[PurchaseBills] fetchSavedBills note:', err.message);
    } finally {
      setLoadingSavedBills(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchSavedBills();
  }, [fetchSavedBills]);

  // Handle File Selection (multiple PDFs or images)
  const handleFiles = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setFeedback(null);

    const newFiles: SelectedFileInfo[] = [];
    Array.from(filesList).forEach((file) => {
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');

      if (!isPdf && !isImage) {
        setFeedback({
          type: 'error',
          message: `Skipped "${file.name}": Only PDF documents or images (JPEG, PNG, WebP) are supported.`,
        });
        return;
      }

      const fileInfo: SelectedFileInfo = {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: isPdf ? 'pdf' : 'image',
      };

      if (isImage) {
        fileInfo.previewUrl = URL.createObjectURL(file);
      }

      newFiles.push(fileInfo);
    });

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearAllSelectedFiles = () => {
    selectedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setSelectedFiles([]);
  };

  // Sample Wholesaler Bill Demo Loader
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

  // Perform AI OCR via Groq serverless handler (supports PDFs and images)
  const handleParseBill = async () => {
    if (inputMode === 'upload' && selectedFiles.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Please choose or drag a PDF bill or image file first.',
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
    setParsingStatusText('Processing files...');

    try {
      let pageDataUrls: string[] = [];

      if (inputMode === 'upload') {
        for (const fileInfo of selectedFiles) {
          if (fileInfo.type === 'pdf') {
            setParsingStatusText(`Rendering PDF "${fileInfo.name}" to high-res images...`);
            try {
              const pdfPages = await renderPdfToImageUrls(fileInfo.file, 4);
              pageDataUrls = [...pageDataUrls, ...pdfPages];
            } catch (pdfErr: any) {
              console.error('[PurchaseBills] PDF rendering error:', pdfErr);
              throw new Error(`Failed to render PDF "${fileInfo.name}": ${pdfErr.message}`);
            }
          } else {
            setParsingStatusText(`Reading image "${fileInfo.name}"...`);
            const imgDataUrl = await readFileAsDataUrl(fileInfo.file);
            pageDataUrls.push(imgDataUrl);
          }
        }
      }

      setParsingStatusText('Analyzing invoice layout with Groq AI Vision OCR...');

      const payload =
        inputMode === 'upload'
          ? { images: pageDataUrls.slice(0, 4) }
          : { text: rawText };

      const res = await fetch('/api/parse-purchase-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
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
        message: `Extracted ${data.items.length} line items successfully with Groq AI! Review details below.`,
      });
    } catch (err: any) {
      console.warn('[PurchaseBills] Groq API notice:', err.message);
      setFeedback({
        type: 'error',
        message: `${err.message} You can also click "Load Sample Wholesaler Bill" to test instantly or edit items manually.`,
      });
    } finally {
      setIsParsing(false);
      setParsingStatusText('');
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

  // Commit Items into Supabase public.products + Upload to storage + Save Purchase Bill
  const handleSaveToStoreStock = async () => {
    if (items.length === 0) {
      setFeedback({
        type: 'error',
        message: 'No line items to add. Please extract or add items first.',
      });
      return;
    }

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
      // 1. Upload original PDF and image files into private purchase-bills bucket
      const uploadedFilePaths: string[] = [];
      for (const fileInfo of selectedFiles) {
        const cleanName = fileInfo.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${currentUser.id}/${Date.now()}-${cleanName}`;
        try {
          const { error: uploadErr } = await supabase.storage
            .from('purchase-bills')
            .upload(filePath, fileInfo.file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadErr) {
            console.warn('[PurchaseBills] Storage upload warning:', uploadErr.message);
          }
          uploadedFilePaths.push(filePath);
        } catch (stErr: any) {
          console.warn('[PurchaseBills] Storage exception:', stErr.message);
          uploadedFilePaths.push(filePath);
        }
      }

      // 2. Fetch current store catalog to match existing products by name
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

      // 3. Save purchase bill record in public.purchase_bills
      const billPayload: PurchaseBillRecord = {
        store_id: currentUser.id,
        supplier_name: supplierName.trim() || 'Wholesale Supplier',
        bill_number: billNumber.trim() || `PB-${Date.now().toString().slice(-6)}`,
        bill_date: billDate,
        subtotal: subtotal,
        total_gst: totalGst,
        grand_total: grandTotal,
        total_items: items.length,
        total_units: totalUnits,
        bill_photo_urls: uploadedFilePaths,
        items_json: items,
        created_at: new Date().toISOString(),
      };

      try {
        const { data: savedBillData, error: billErr } = await supabase
          .from('purchase_bills')
          .insert(billPayload)
          .select('*')
          .single();

        if (!billErr && savedBillData) {
          setSavedBills((prev) => [savedBillData, ...prev]);
        }
      } catch (saveErr: any) {
        console.warn('[PurchaseBills] purchase_bills record save warning:', saveErr.message);
      }

      setFeedback({
        type: 'success',
        message: `Inventory Updated! Added ${createdCount} new products and restocked ${updatedCount} existing products (${totalUnits} total units). Bill record saved.`,
      });

      // Reset state for next bill
      setItems([]);
      clearAllSelectedFiles();
      setRawText('');
      setSupplierName('');
      setBillNumber('');
      fetchSavedBills();
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

  // Inspect Bill Details & resolve signed URLs for PDFs/images
  const handleOpenBillDetails = async (bill: PurchaseBillRecord) => {
    setDetailsModalBill(bill);
    setModalResolvedUrls([]);
    setLoadingSignedUrls(true);

    const paths = bill.bill_photo_urls || [];
    const resolvedList: Array<{ name: string; url: string; isPdf: boolean }> = [];

    for (const path of paths) {
      const isPdf = path.toLowerCase().endsWith('.pdf');
      const cleanFileName = path.split('/').pop() || 'Invoice Document';

      try {
        const { data, error } = await supabase.storage
          .from('purchase-bills')
          .createSignedUrl(path, 3600);

        if (!error && data?.signedUrl) {
          resolvedList.push({ name: cleanFileName, url: data.signedUrl, isPdf });
        } else {
          const publicData = supabase.storage.from('purchase-bills').getPublicUrl(path);
          resolvedList.push({ name: cleanFileName, url: publicData.data.publicUrl, isPdf });
        }
      } catch {
        const publicData = supabase.storage.from('purchase-bills').getPublicUrl(path);
        resolvedList.push({ name: cleanFileName, url: publicData.data.publicUrl, isPdf });
      }
    }

    setModalResolvedUrls(resolvedList);
    setLoadingSignedUrls(false);
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
              PDF & Groq OCR
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan distributor invoices, upload wholesale PDFs, or paste challan text to automatically inward inventory.
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
                  PDF / Images
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
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Dropzone Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed cursor-pointer text-center space-y-2 transition-colors ${
                    isDragOver
                      ? 'border-[#4338CA] bg-indigo-50/50'
                      : 'border-slate-300 hover:border-[#4338CA] bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto shadow-sm">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      Drop PDF Invoice or Bill Photos here
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports PDF, JPEG, PNG, WebP (multiple files allowed)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#4338CA] shadow-sm hover:bg-slate-50 mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Browse Files</span>
                  </button>
                </div>

                {/* Selected Files List with Badges & Thumbnails */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
                      <span>Selected Files ({selectedFiles.length})</span>
                      <button
                        type="button"
                        onClick={clearAllSelectedFiles}
                        className="text-rose-600 hover:underline text-[11px]"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedFiles.map((fileInfo) => (
                        <div
                          key={fileInfo.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {fileInfo.type === 'pdf' ? (
                              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center">
                                {fileInfo.previewUrl ? (
                                  <img
                                    src={fileInfo.previewUrl}
                                    alt="thumb"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-semibold text-[#0F172A] truncate max-w-[170px] sm:max-w-xs">
                                {fileInfo.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                                    fileInfo.type === 'pdf'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-indigo-50 text-[#4338CA] border border-indigo-200'
                                  }`}
                                >
                                  {fileInfo.type === 'pdf' ? 'PDF' : 'IMAGE'}
                                </span>
                                <span>{formatFileSize(fileInfo.size)}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSelectedFile(fileInfo.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
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
              disabled={
                isParsing ||
                (inputMode === 'upload' && selectedFiles.length === 0) ||
                (inputMode === 'text' && !rawText.trim())
              }
              className="w-full py-3 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{parsingStatusText || 'Extracting Bill Items (Groq AI)...'}</span>
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
              <br />
              • Original bills and PDFs are stored securely in your private cloud storage.
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
                    No items extracted yet. Upload a PDF or bill photo on the left or load sample bill.
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

      {/* STEP 3: SAVED INWARD BILLS HISTORY */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-[#4338CA]" />
              <span>Saved Inward Bills History ({savedBills.length})</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Audit trail of inward wholesale invoices and attached PDF/image documents.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSavedBills}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSavedBills ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {savedBills.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No purchase bills recorded yet. Extract and commit your first bill above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Bill #</th>
                  <th className="py-2.5 px-3 text-center">Items / Units</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-center">Attachments</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savedBills.map((bill) => {
                  const hasPdfs = (bill.bill_photo_urls || []).some((u) =>
                    u.toLowerCase().endsWith('.pdf')
                  );
                  const filesCount = (bill.bill_photo_urls || []).length;

                  return (
                    <tr key={bill.id || bill.created_at} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {bill.bill_date || bill.created_at?.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                        {bill.supplier_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {bill.bill_number}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-semibold text-slate-800">
                          {bill.total_items || (bill.items_json || []).length || 0}
                        </span>{' '}
                        items ({bill.total_units || 0} units)
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#4338CA] font-mono">
                        ₹{(Number(bill.grand_total) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {filesCount > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              hasPdfs
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-indigo-50 text-[#4338CA] border border-indigo-200'
                            }`}
                          >
                            {hasPdfs ? <FileText className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                            <span>{filesCount} {hasPdfs ? 'PDF/Img' : 'Img'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenBillDetails(bill)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-[#4338CA] border border-slate-200 hover:border-indigo-200 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= PURCHASE BILL DETAILS MODAL ================= */}
      {detailsModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl my-auto space-y-5 text-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {detailsModalBill.supplier_name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 font-mono">
                    Synchronized
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Bill #{detailsModalBill.bill_number} • Date:{' '}
                  {detailsModalBill.bill_date || detailsModalBill.created_at?.slice(0, 10)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailsModalBill(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase font-sans text-slate-500 block">Subtotal</span>
                <span className="text-sm font-bold text-slate-900">
                  ₹{(Number(detailsModalBill.subtotal) || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-sans text-slate-500 block">Total GST</span>
                <span className="text-sm font-bold text-[#0D9488]">
                  +₹{(Number(detailsModalBill.total_gst) || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-sans text-slate-500 block">Grand Total</span>
                <span className="text-base font-black text-[#4338CA]">
                  ₹{(Number(detailsModalBill.grand_total) || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            {detailsModalBill.items_json && detailsModalBill.items_json.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#0F172A]">
                  Inward Items ({detailsModalBill.items_json.length})
                </span>
                <div className="rounded-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Buy Rate</th>
                        <th className="py-2 px-3 text-right">Sell Rate</th>
                        <th className="py-2 px-3 text-center">GST%</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailsModalBill.items_json.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3 font-medium text-[#0F172A]">
                            {item.name}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono">
                            {item.qty} {item.unit}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono">
                            ₹{(Number(item.purchase_price) || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-[#0D9488]">
                            ₹{(Number(item.selling_price) || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono">
                            {item.gst_rate}%
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-[#4338CA]">
                            ₹{(Number(item.total_amount) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Attached Invoices & PDF Inspection */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-[#0F172A] block">
                Attached Invoices & Documents
              </span>

              {loadingSignedUrls ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4338CA]" />
                  <span>Loading attached invoice documents...</span>
                </div>
              ) : modalResolvedUrls.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No files attached to this bill.</p>
              ) : (
                <div className="space-y-2">
                  {modalResolvedUrls.map((doc, idx) =>
                    doc.isPdf ? (
                      /* Clickable Open PDF Bill Link/Card as explicitly requested */
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0F172A] truncate max-w-[200px] sm:max-w-md">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">
                              PDF Invoice Document
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4338CA] group-hover:bg-[#3730A3] text-white text-xs font-bold transition-colors shadow-sm shrink-0">
                          <span>Open PDF Bill</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </a>
                    ) : (
                      /* Image preview for image files */
                      <div
                        key={idx}
                        className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
                            <img
                              src={doc.url}
                              alt={doc.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0F172A] truncate max-w-[180px] sm:max-w-xs">
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">
                              Image Attachment
                            </p>
                          </div>
                        </div>

                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[#4338CA] hover:bg-slate-50 text-xs font-bold transition-colors shadow-sm shrink-0"
                        >
                          <span>View Image</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDetailsModalBill(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
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
