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
  RefreshCw,
  ExternalLink,
  Eye,
  X,
  FileCode,
  Image as ImageIcon,
  Barcode,
  Phone,
  MapPin,
  Mail,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '../lib/supabase';
import {
  StoreProfile,
  PurchaseBillItem,
  PurchaseBillData,
  PurchaseBillRecord,
  Product,
} from '../types';

// Configure pdfjs-dist worker using Vite's new URL
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Standard Retail Category & Sub-Category Hierarchy
export const RETAIL_CATEGORIES: Record<string, string[]> = {
  'Groceries & Staples': [
    'Atta & Flours',
    'Rice & Grains',
    'Pulses & Dal',
    'Spices & Masala',
    'Salt, Sugar & Jaggery',
    'Dry Fruits & Nuts',
    'Pooja Essentials',
    'Other Staples',
  ],
  'Edible Oils & Ghee': [
    'Refined Sunflower Oil',
    'Mustard Oil (Sarson)',
    'Soybean Oil',
    'Groundnut Oil',
    'Desi Ghee',
    'Vanaspati',
    'Olive Oil',
    'Other Cooking Oils',
  ],
  'Dairy, Bakery & Eggs': [
    'Milk & Curd (Dahi)',
    'Paneer & Butter',
    'Bread & Buns',
    'Eggs',
    'Cheese & Cream',
    'Toast & Rusk',
    'Other Dairy',
  ],
  'Snacks & Confectionery': [
    'Biscuits & Cookies',
    'Namkeen & Mixtures',
    'Chips & Crisps',
    'Noodles & Instant Pasta',
    'Chocolates & Candies',
    'Indian Sweets (Mithai)',
    'Other Snacks',
  ],
  'Beverages & Tea': [
    'Tea & Chai Patti',
    'Coffee & Premix',
    'Juices & Cold Drinks',
    'Health Drinks',
    'Packaged Mineral Water',
    'Syrups & Concentrates',
  ],
  'Personal Care': [
    'Soaps & Body Wash',
    'Shampoo & Hair Care',
    'Toothpaste & Oral Care',
    'Hair Oil',
    'Skin Care & Creams',
    'Deodorants & Talc',
    'Sanitary & Hygiene',
  ],
  'Cleaning & Household': [
    'Detergent Powder & Bars',
    'Dishwash Bars & Liquids',
    'Floor & Surface Cleaners',
    'Toilet Cleaners',
    'Mosquito & Pest Repellents',
    'Air Fresheners',
    'Garbage Bags & Foils',
  ],
  'Packaged & Instant Food': [
    'Sauces, Ketchups & Dips',
    'Jams, Spreads & Honey',
    'Pickles & Chutneys',
    'Breakfast Cereals & Oats',
    'Ready to Eat & Mixes',
    'Baking Ingredients',
  ],
  'Other Retail Goods': [
    'Stationery & Batteries',
    'General Merchandise',
    'Other Items',
  ],
};

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

  // Editable Seller Details State
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierFssai, setSupplierFssai] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));

  // Line items state
  const [items, setItems] = useState<PurchaseBillItem[]>([]);

  // Category & Sub-Category Options (derived from Store Catalog + Retail Defaults)
  const [storeCategories, setStoreCategories] = useState<string[]>(Object.keys(RETAIL_CATEGORIES));
  const [storeSubCategories, setStoreSubCategories] =
    useState<Record<string, string[]>>(RETAIL_CATEGORIES);

  // Saved Inward Bills History
  const [savedBills, setSavedBills] = useState<PurchaseBillRecord[]>([]);
  const [loadingSavedBills, setLoadingSavedBills] = useState(false);

  // Bill Details Modal State
  const [detailsModalBill, setDetailsModalBill] = useState<PurchaseBillRecord | null>(null);
  const [modalResolvedUrls, setModalResolvedUrls] = useState<
    Array<{ name: string; url: string; isPdf: boolean }>
  >([]);
  const [loadingSignedUrls, setLoadingSignedUrls] = useState(false);

  // Fetch store products to dynamically discover any existing custom categories
  const loadExistingStoreCatalogCategories = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category, sub_category')
        .eq('store_id', currentUser.id);

      if (!error && data) {
        const catSet = new Set<string>(Object.keys(RETAIL_CATEGORIES));
        const subCatMap: Record<string, Set<string>> = {};

        Object.entries(RETAIL_CATEGORIES).forEach(([cat, subs]) => {
          subCatMap[cat] = new Set(subs);
        });

        data.forEach((p: any) => {
          if (p.category && p.category.trim()) {
            const cat = p.category.trim();
            catSet.add(cat);
            if (!subCatMap[cat]) {
              subCatMap[cat] = new Set<string>();
            }
            if (p.sub_category && p.sub_category.trim()) {
              subCatMap[cat].add(p.sub_category.trim());
            }
          }
        });

        setStoreCategories(Array.from(catSet));
        const finalMap: Record<string, string[]> = {};
        Object.entries(subCatMap).forEach(([cat, subSet]) => {
          finalMap[cat] = Array.from(subSet);
        });
        setStoreSubCategories(finalMap);
      }
    } catch (err: any) {
      console.warn('[PurchaseBills] loadExistingStoreCatalogCategories:', err.message);
    }
  }, [currentUser?.id]);

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
    loadExistingStoreCatalogCategories();
  }, [fetchSavedBills, loadExistingStoreCatalogCategories]);

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
    setSupplierGstin('27AABCM9876Q1Z8');
    setSupplierAddress('Plot 14, APMC Market Yard, Navi Mumbai, MH 400705');
    setSupplierContact('+91 98200 12345');
    setSupplierEmail('billing@metrowholesale.in');
    setSupplierFssai('10014022002345');
    setBillNumber(`WH-INV-${Math.floor(100000 + Math.random() * 900000)}`);
    setBillDate(new Date().toISOString().slice(0, 10));
    setItems([
      {
        id: '1',
        name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
        item_name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
        qty: 24,
        quantity: 24,
        unit: 'pack',
        purchase_price: 118,
        price_without_tax: 118,
        price_after_tax: 123.9,
        selling_price: 135,
        mrp: 135,
        gst_rate: 5,
        total_amount: 2832,
        amount: 2832,
        barcode: '8906007280145',
        category: 'Edible Oils & Ghee',
        sub_category: 'Refined Sunflower Oil',
      },
      {
        id: '2',
        name: 'Aashirvaad Shudh Chakki Atta 10kg',
        item_name: 'Aashirvaad Shudh Chakki Atta 10kg',
        qty: 15,
        quantity: 15,
        unit: 'pack',
        purchase_price: 365,
        price_without_tax: 365,
        price_after_tax: 365,
        selling_price: 420,
        mrp: 420,
        gst_rate: 0,
        total_amount: 5475,
        amount: 5475,
        barcode: '8901030383921',
        category: 'Groceries & Staples',
        sub_category: 'Atta & Flours',
      },
      {
        id: '3',
        name: 'Tata Salt Vaccum Evaporated 1kg',
        item_name: 'Tata Salt Vaccum Evaporated 1kg',
        qty: 50,
        quantity: 50,
        unit: 'pack',
        purchase_price: 22,
        price_without_tax: 22,
        price_after_tax: 22,
        selling_price: 28,
        mrp: 28,
        gst_rate: 0,
        total_amount: 1100,
        amount: 1100,
        barcode: '8901058852331',
        category: 'Groceries & Staples',
        sub_category: 'Salt, Sugar & Jaggery',
      },
      {
        id: '4',
        name: 'Amul Pure Ghee 1L Tin',
        item_name: 'Amul Pure Ghee 1L Tin',
        qty: 12,
        quantity: 12,
        unit: 'pack',
        purchase_price: 540,
        price_without_tax: 540,
        price_after_tax: 604.8,
        selling_price: 610,
        mrp: 610,
        gst_rate: 12,
        total_amount: 6480,
        amount: 6480,
        barcode: '8901262010052',
        category: 'Dairy, Bakery & Eggs',
        sub_category: 'Paneer & Butter',
      },
      {
        id: '5',
        name: 'Surf Excel Quick Wash Detergent Powder 1kg',
        item_name: 'Surf Excel Quick Wash Detergent Powder 1kg',
        qty: 20,
        quantity: 20,
        unit: 'pack',
        purchase_price: 132,
        price_without_tax: 132,
        price_after_tax: 155.76,
        selling_price: 155,
        mrp: 155,
        gst_rate: 18,
        total_amount: 2640,
        amount: 2640,
        barcode: '8901030012487',
        category: 'Cleaning & Household',
        sub_category: 'Detergent Powder & Bars',
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
      setSupplierName(data.supplier_name || '');
      setSupplierGstin(data.supplier_gstin || '');
      setSupplierAddress(data.supplier_address || '');
      setSupplierContact(data.supplier_contact || '');
      setSupplierEmail(data.supplier_email || '');
      setSupplierFssai(data.supplier_fssai || '');
      setBillNumber(data.bill_number || `PB-${Date.now().toString().slice(-6)}`);
      setBillDate(data.bill_date || new Date().toISOString().slice(0, 10));

      setItems(
        data.items.map((it, idx) => {
          const qty = Number(it.quantity ?? it.qty) || 1;
          const buyRate = Number(it.price_without_tax ?? it.purchase_price) || 0;
          const gstRate = Number(it.gst_rate) || 0;
          const rateWithTax =
            Number(it.price_after_tax) ||
            Math.round(buyRate * (1 + gstRate / 100) * 100) / 100;

          // Strictly preserve null if MRP was not explicitly printed on invoice
          const mrp =
            it.mrp !== null &&
            it.mrp !== undefined &&
            !isNaN(Number(it.mrp)) &&
            Number(it.mrp) > 0
              ? Math.round(Number(it.mrp) * 100) / 100
              : null;

          const sellPrice =
            it.selling_price !== null &&
            it.selling_price !== undefined &&
            !isNaN(Number(it.selling_price)) &&
            Number(it.selling_price) > 0
              ? Math.round(Number(it.selling_price) * 100) / 100
              : mrp;

          const lineAmount =
            Number(it.amount ?? it.total_amount) || Math.round(qty * buyRate * 100) / 100;

          const cat = it.category?.trim() || '';
          const subCat = it.sub_category?.trim() || '';
          const barcode = it.barcode?.trim() || '';

          return {
            ...it,
            id: `${Date.now()}-${idx}`,
            name: it.item_name || it.name || '',
            item_name: it.item_name || it.name || '',
            qty: qty,
            quantity: qty,
            unit: it.unit || 'pcs',
            purchase_price: buyRate,
            price_without_tax: buyRate,
            price_after_tax: rateWithTax,
            selling_price: sellPrice,
            mrp: mrp,
            gst_rate: gstRate,
            total_amount: lineAmount,
            amount: lineAmount,
            barcode: barcode,
            category: cat,
            sub_category: subCat,
          };
        })
      );

      setFeedback({
        type: 'success',
        message: `Extracted ${data.items.length} line items successfully with Groq AI! All fields are editable below.`,
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

  // Update Line Item Field with Automatic Mathematical Synchronization
  const updateItem = (id: string, field: keyof PurchaseBillItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated: PurchaseBillItem = { ...item, [field]: value };

        const qty =
          Number(field === 'qty' || field === 'quantity' ? value : (updated.quantity ?? updated.qty)) || 1;
        const gst = Number(field === 'gst_rate' ? value : updated.gst_rate) || 0;

        if (field === 'item_name' || field === 'name') {
          updated.item_name = String(value);
          updated.name = String(value);
        } else if (field === 'price_without_tax' || field === 'purchase_price') {
          const buyRate = Math.max(0, parseFloat(value) || 0);
          updated.price_without_tax = buyRate;
          updated.purchase_price = buyRate;
          updated.price_after_tax = Math.round(buyRate * (1 + gst / 100) * 100) / 100;
          updated.amount = Math.round(qty * buyRate * 100) / 100;
          updated.total_amount = updated.amount;
        } else if (field === 'price_after_tax') {
          const rateWithTax = Math.max(0, parseFloat(value) || 0);
          updated.price_after_tax = rateWithTax;
          const buyRate =
            gst > 0 ? Math.round((rateWithTax / (1 + gst / 100)) * 100) / 100 : rateWithTax;
          updated.price_without_tax = buyRate;
          updated.purchase_price = buyRate;
          updated.amount = Math.round(qty * buyRate * 100) / 100;
          updated.total_amount = updated.amount;
        } else if (field === 'gst_rate') {
          const buyRate = Number(updated.price_without_tax ?? updated.purchase_price) || 0;
          updated.gst_rate = gst;
          updated.price_after_tax = Math.round(buyRate * (1 + gst / 100) * 100) / 100;
        } else if (field === 'qty' || field === 'quantity') {
          const buyRate = Number(updated.price_without_tax ?? updated.purchase_price) || 0;
          updated.qty = qty;
          updated.quantity = qty;
          updated.amount = Math.round(qty * buyRate * 100) / 100;
          updated.total_amount = updated.amount;
        } else if (field === 'amount' || field === 'total_amount') {
          const amt = Math.max(0, parseFloat(value) || 0);
          updated.amount = amt;
          updated.total_amount = amt;
          if (qty > 0) {
            const buyRate = Math.round((amt / qty) * 100) / 100;
            updated.price_without_tax = buyRate;
            updated.purchase_price = buyRate;
            updated.price_after_tax = Math.round(buyRate * (1 + gst / 100) * 100) / 100;
          }
        } else if (field === 'mrp' || field === 'selling_price') {
          const sellVal =
            value === '' || value === null || value === undefined
              ? null
              : Math.max(0, parseFloat(value) || 0);
          updated.mrp = sellVal;
          updated.selling_price = sellVal;
        } else if (field === 'category') {
          const newCat = String(value);
          updated.category = newCat;
          const availableSubs = newCat ? storeSubCategories[newCat] || [] : [];
          if (updated.sub_category && !availableSubs.includes(updated.sub_category)) {
            updated.sub_category = '';
          }
        } else if (field === 'sub_category') {
          updated.sub_category = String(value);
        } else if (field === 'barcode') {
          updated.barcode = String(value);
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
      item_name: '',
      qty: 1,
      quantity: 1,
      unit: 'pcs',
      purchase_price: 0,
      price_without_tax: 0,
      price_after_tax: 0,
      selling_price: null,
      mrp: null,
      gst_rate: 5,
      total_amount: 0,
      amount: 0,
      barcode: '',
      category: '',
      sub_category: '',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Delete Line Item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Live Totals Calculations
  const totalAmountWithoutTax = items.reduce(
    (acc, i) =>
      acc +
      (Number(i.price_without_tax ?? i.purchase_price) || 0) *
        (Number(i.quantity ?? i.qty) || 0),
    0
  );

  // Calculate GST breakdown by tax rate (0%, 5%, 12%, 18%, 28%)
  const GST_SLABS = [0, 5, 12, 18, 28];
  const gstBreakdown = GST_SLABS.map((rate) => {
    const taxableForRate = items
      .filter((i) => (Number(i.gst_rate) || 0) === rate)
      .reduce(
        (sum, i) =>
          sum +
          (Number(i.price_without_tax ?? i.purchase_price) || 0) *
            (Number(i.quantity ?? i.qty) || 0),
        0
      );
    const taxForRate = Math.round(((taxableForRate * rate) / 100) * 100) / 100;
    return {
      rate,
      taxable: Math.round(taxableForRate * 100) / 100,
      tax: taxForRate,
    };
  });

  const totalTaxAmount = gstBreakdown.reduce((acc, g) => acc + g.tax, 0);
  const totalAmountWithTax = Math.round((totalAmountWithoutTax + totalTaxAmount) * 100) / 100;
  const totalUnits = items.reduce((acc, i) => acc + (Number(i.quantity ?? i.qty) || 0), 0);

  // Commit Items: Check/Insert public.suppliers -> Upsert public.products -> Save public.purchase_bills
  const handleSaveToStoreStock = async () => {
    if (items.length === 0) {
      setFeedback({
        type: 'error',
        message: 'No line items to add. Please extract or add items first.',
      });
      return;
    }

    const invalidItem = items.find((i) => !(i.item_name || i.name)?.trim());
    if (invalidItem) {
      setFeedback({
        type: 'error',
        message: 'All items must have a product name. Please fill in empty product names.',
      });
      return;
    }

    setIsSavingStock(true);
    setFeedback(null);

    try {
      // 1. Supplier lookup or insertion into public.suppliers
      let linkedSupplierId: string | null = null;
      const cleanGstin = supplierGstin.trim();
      const cleanSuppName = supplierName.trim() || 'Wholesale Supplier';

      try {
        let suppQuery = supabase
          .from('suppliers')
          .select('*')
          .eq('store_id', currentUser.id);

        if (cleanGstin) {
          suppQuery = suppQuery.or(`gstin.eq.${cleanGstin},name.ilike.${cleanSuppName}`);
        } else {
          suppQuery = suppQuery.ilike('name', cleanSuppName);
        }

        const { data: matchedSuppliers, error: suppFetchErr } = await suppQuery;

        if (!suppFetchErr && matchedSuppliers && matchedSuppliers.length > 0) {
          // Supplier exists, reuse ID and update contact/address if newly provided
          const existingSupp = matchedSuppliers[0];
          linkedSupplierId = existingSupp.id;

          const updateSuppPayload: any = {};
          if (cleanGstin && !existingSupp.gstin) updateSuppPayload.gstin = cleanGstin;
          if (supplierAddress.trim() && !existingSupp.address)
            updateSuppPayload.address = supplierAddress.trim();
          if (supplierContact.trim() && !existingSupp.contact) {
            updateSuppPayload.contact = supplierContact.trim();
            updateSuppPayload.phone = supplierContact.trim();
          }
          if (supplierEmail.trim() && !existingSupp.email)
            updateSuppPayload.email = supplierEmail.trim();
          if (supplierFssai.trim() && !existingSupp.fssai)
            updateSuppPayload.fssai = supplierFssai.trim();

          if (Object.keys(updateSuppPayload).length > 0) {
            await supabase
              .from('suppliers')
              .update(updateSuppPayload)
              .eq('id', existingSupp.id)
              .eq('store_id', currentUser.id);
          }
        } else if (!suppFetchErr) {
          // Insert new supplier in public.suppliers
          const newSuppPayload: any = {
            store_id: currentUser.id,
            name: cleanSuppName,
            gstin: cleanGstin || null,
            address: supplierAddress.trim() || null,
            contact: supplierContact.trim() || null,
            phone: supplierContact.trim() || null,
            email: supplierEmail.trim() || null,
            fssai: supplierFssai.trim() || null,
          };

          const { data: insertedSupp, error: suppInsErr } = await supabase
            .from('suppliers')
            .insert(newSuppPayload)
            .select('id')
            .single();

          if (!suppInsErr && insertedSupp) {
            linkedSupplierId = insertedSupp.id;
          }
        }
      } catch (suppErr: any) {
        console.warn('[PurchaseBills] suppliers lookup/insert warning:', suppErr.message);
      }

      // 2. Upload original PDF and image files into private purchase-bills bucket
      const uploadedFilePaths: string[] = [];
      for (const fileInfo of selectedFiles) {
        const cleanFileName = fileInfo.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${currentUser.id}/${Date.now()}-${cleanFileName}`;
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

      // 3. Upsert every line item into public.products (store_id = user.id)
      const { data: existingProducts, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', currentUser.id);

      if (fetchErr) throw fetchErr;

      const catalog: Product[] = existingProducts || [];
      let updatedCount = 0;
      let createdCount = 0;

      for (const item of items) {
        const trimmedName = (item.item_name || item.name || '').trim();
        const trimmedBarcode = item.barcode?.trim() || null;
        const trimmedCategory = (item.category || '').trim();
        const trimmedSubCategory = item.sub_category?.trim() || null;
        const unit = item.unit || 'pcs';

        // Matching strategy:
        // Priority 1: Match by barcode (if provided)
        // Priority 2: Match by name (case-insensitive)
        let existing: Product | undefined;
        if (trimmedBarcode) {
          existing = catalog.find(
            (p) => p.barcode && p.barcode.trim().toLowerCase() === trimmedBarcode.toLowerCase()
          );
        }
        if (!existing) {
          existing = catalog.find(
            (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
          );
        }

        const buyPrice = Number(item.price_without_tax ?? item.purchase_price) || 0;
        // Do NOT auto-calculate MRP from buy rate (never guess with buyPrice * 1.2)
        const mrpVal =
          item.mrp !== null &&
          item.mrp !== undefined &&
          !isNaN(Number(item.mrp)) &&
          Number(item.mrp) > 0
            ? Math.round(Number(item.mrp) * 100) / 100
            : item.selling_price !== null &&
              item.selling_price !== undefined &&
              !isNaN(Number(item.selling_price)) &&
              Number(item.selling_price) > 0
            ? Math.round(Number(item.selling_price) * 100) / 100
            : 0;
        const sellPrice = mrpVal;
        const qty = Number(item.quantity ?? item.qty) || 1;
        const gstRate = Number(item.gst_rate) || 0;

        if (existing) {
          // Increment stock_qty of existing product
          const newStock = (Number(existing.stock_qty) || 0) + qty;
          const updateData: any = {
            stock_qty: newStock,
            purchase_price: buyPrice,
            gst_rate: gstRate,
          };
          if (sellPrice > 0) {
            updateData.mrp = sellPrice;
            updateData.selling_price = sellPrice;
          }
          if (trimmedCategory) {
            updateData.category = trimmedCategory;
          }
          if (trimmedSubCategory) {
            updateData.sub_category = trimmedSubCategory;
          }
          if (trimmedBarcode) {
            updateData.barcode = trimmedBarcode;
          }

          let { error: updateErr } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', existing.id)
            .eq('store_id', currentUser.id);

          // Graceful fallback if database table doesn't have sub_category or purchase_price column
          if (
            updateErr &&
            (updateErr.message?.includes('sub_category') ||
              updateErr.message?.includes('purchase_price'))
          ) {
            delete updateData.sub_category;
            delete updateData.purchase_price;
            const retryRes = await supabase
              .from('products')
              .update(updateData)
              .eq('id', existing.id)
              .eq('store_id', currentUser.id);
            updateErr = retryRes.error;
          }

          if (updateErr) throw updateErr;
          updatedCount++;
        } else {
          // Insert new product into public.products
          const insertData: any = {
            store_id: currentUser.id,
            name: trimmedName,
            unit: unit,
            mrp: sellPrice,
            selling_price: sellPrice,
            purchase_price: buyPrice,
            gst_rate: gstRate,
            stock_qty: qty,
            low_stock_alert: 5,
            category: trimmedCategory,
            sub_category: trimmedSubCategory,
            barcode: trimmedBarcode,
          };

          let { error: insertErr } = await supabase.from('products').insert(insertData);

          // Graceful fallback if database table doesn't have sub_category or purchase_price column
          if (
            insertErr &&
            (insertErr.message?.includes('sub_category') ||
              insertErr.message?.includes('purchase_price'))
          ) {
            delete insertData.sub_category;
            delete insertData.purchase_price;
            const retryRes = await supabase.from('products').insert(insertData);
            insertErr = retryRes.error;
          }

          if (insertErr) throw insertErr;
          createdCount++;
        }
      }

      // 4. Save purchase bill record in public.purchase_bills
      const billPayload: any = {
        store_id: currentUser.id,
        supplier_id: linkedSupplierId,
        supplier_name: cleanSuppName,
        supplier_gstin: cleanGstin || null,
        supplier_address: supplierAddress.trim() || null,
        supplier_contact: supplierContact.trim() || null,
        supplier_email: supplierEmail.trim() || null,
        supplier_fssai: supplierFssai.trim() || null,
        bill_number: billNumber.trim() || `PB-${Date.now().toString().slice(-6)}`,
        bill_date: billDate,
        subtotal: Math.round(totalAmountWithoutTax * 100) / 100,
        total_gst: Math.round(totalTaxAmount * 100) / 100,
        grand_total: Math.round(totalAmountWithTax * 100) / 100,
        total_items: items.length,
        total_units: totalUnits,
        bill_photo_urls: uploadedFilePaths,
        items_json: items,
        created_at: new Date().toISOString(),
      };

      try {
        let { data: savedBillData, error: billErr } = await supabase
          .from('purchase_bills')
          .insert(billPayload)
          .select('*')
          .single();

        // If table doesn't have supplier_id or extra fields, retry with base columns
        if (billErr && billErr.message?.includes('supplier_id')) {
          delete billPayload.supplier_id;
          delete billPayload.supplier_gstin;
          delete billPayload.supplier_address;
          delete billPayload.supplier_contact;
          delete billPayload.supplier_email;
          delete billPayload.supplier_fssai;
          const retryBill = await supabase
            .from('purchase_bills')
            .insert(billPayload)
            .select('*')
            .single();
          billErr = retryBill.error;
          savedBillData = retryBill.data;
        }

        if (!billErr && savedBillData) {
          setSavedBills((prev) => [savedBillData, ...prev]);
        }
      } catch (saveErr: any) {
        console.warn('[PurchaseBills] purchase_bills record save warning:', saveErr.message);
      }

      setFeedback({
        type: 'success',
        message: `Inventory Synchronized! Added ${createdCount} new products and restocked ${updatedCount} existing products (${totalUnits} total units). Supplier and purchase bill records saved.`,
      });

      // Reset state for next bill
      setItems([]);
      clearAllSelectedFiles();
      setRawText('');
      setSupplierName('');
      setSupplierGstin('');
      setSupplierAddress('');
      setSupplierContact('');
      setSupplierEmail('');
      setSupplierFssai('');
      setBillNumber('');
      fetchSavedBills();
      loadExistingStoreCatalogCategories();
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
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Purchase Bills & AI Stock Inward
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 font-mono">
              Auto-Sync Catalog & Suppliers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan distributor invoices, upload wholesale PDFs, or paste challan text. Inward items directly into Product Master.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSampleBill}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#4338CA]" />
            <span>Load Sample Wholesaler Bill</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToProducts}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#4338CA] border border-indigo-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Product Master</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications / Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
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
              className="px-2.5 py-1 rounded-lg bg-[#0D9488] text-white text-[11px] font-bold hover:bg-[#0F766E] shrink-0"
            >
              View in Catalog →
            </button>
          )}
        </div>
      )}

      {/* STEP 1 & STEP 2 WORKSPACE (FULL-WIDTH VERTICAL STACK) */}
      <div className="space-y-6 w-full">
        {/* STEP 1: UPLOAD / SCAN / PASTE CARD (FULL WIDTH) */}
        <div className="w-full space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
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
                      ? 'bg-white text-[#4338CA] shadow-xs font-bold'
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
                      ? 'bg-white text-[#4338CA] shadow-xs font-bold'
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

                {/* Dropzone & Selected Files in a wide responsive layout */}
                <div
                  className={`grid grid-cols-1 ${
                    selectedFiles.length > 0 ? 'lg:grid-cols-12' : ''
                  } gap-4 items-start`}
                >
                  <div className={selectedFiles.length > 0 ? 'lg:col-span-6' : 'w-full'}>
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
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto shadow-xs">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#4338CA] shadow-xs hover:bg-slate-50 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Browse Files</span>
                      </button>
                    </div>
                  </div>

                  {/* Selected Files List with Badges & Thumbnails */}
                  {selectedFiles.length > 0 && (
                    <div className="lg:col-span-6 space-y-2">
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
                                <p className="font-semibold text-[#0F172A] truncate max-w-[200px] sm:max-w-xs">
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
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Paste Wholesaler Bill / WhatsApp Order Text
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste text like:&#10;Metro Cash & Carry - Inv #98421&#10;1. Fortune Sunlite Oil 1L x 24 packs @ 118&#10;2. Aashirvaad Atta 10kg x 15 @ 365..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white font-mono"
                />
              </div>
            )}

            {/* Scan Action Button: Primary #4338CA */}
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

            {/* Quick Tips Box (Tucked cleanly inside Section 1) */}
            <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200 text-slate-700 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 font-bold text-[#0D9488] shrink-0">
                <PackageCheck className="w-4 h-4" />
                <span>Automated Kirana Inward System:</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span>• <b>Suppliers Directory:</b> Verified in <code>public.suppliers</code> by GSTIN/Name</span>
                <span>• <b>Product Master Sync:</b> Items, barcodes & categories auto-upserted to <code>public.products</code></span>
                <span>• <b>Live Stock:</b> Existing catalog inventory incremented automatically</span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: REVIEW & EDIT EXTRACTED SELLER & ITEMS (FULL WIDTH) */}
        <div className="w-full space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#0D9488]" />
                <span>2. Review & Edit Inward Bill Details</span>
              </span>

              <button
                type="button"
                onClick={handleAddManualItem}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#4338CA] border border-indigo-200 text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Editable Seller & Wholesaler Header (All 8 Fields) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#4338CA]" />
                  <span>Wholesaler & Invoice Details</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Auto-syncs with Public Suppliers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Supplier Name */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Wholesaler / Supplier *
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Metro Wholesale Pvt Ltd"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>

                {/* 2. GSTIN */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Supplier GSTIN
                  </label>
                  <div className="relative">
                    <Receipt className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={supplierGstin}
                      onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 27AABCM9876Q1Z8"
                      maxLength={15}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-[#0D9488] font-mono font-semibold focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>

                {/* 3. Bill Number */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Bill / Invoice #
                  </label>
                  <div className="relative">
                    <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={billNumber}
                      onChange={(e) => setBillNumber(e.target.value)}
                      placeholder="e.g. INV-98421"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>

                {/* 4. Bill Date */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Bill Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>

                {/* 5. Contact / Phone */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={supplierContact}
                      onChange={(e) => setSupplierContact(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>

                {/* 6. Email */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="email"
                      value={supplierEmail}
                      onChange={(e) => setSupplierEmail(e.target.value)}
                      placeholder="billing@supplier.com"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>

                {/* 7. Address */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    Registered Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={supplierAddress}
                      onChange={(e) => setSupplierAddress(e.target.value)}
                      placeholder="Plot 14, APMC Market Yard"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>

                {/* 8. FSSAI License */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">
                    FSSAI License #
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={supplierFssai}
                      onChange={(e) => setSupplierFssai(e.target.value)}
                      placeholder="14-digit FSSAI number"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#4338CA]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items List Header & Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                <span>Inward Inventory Items ({items.length})</span>
                <span className="text-[11px] text-slate-500">
                  Auto-syncs Excl. Tax, GST%, Incl. Tax & Line Totals
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-12 text-center space-y-2.5 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <PackageCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    No items extracted yet. Upload a wholesale invoice PDF / photo or paste bill text above.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadSampleBill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#4338CA] shadow-xs hover:bg-slate-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Sample Wholesaler Bill</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {items.map((item, index) => {
                    const availableSubCats = item.category
                      ? storeSubCategories[item.category] || []
                      : [];

                    return (
                      <div
                        key={item.id || index}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5 hover:border-indigo-200 transition-all text-xs"
                      >
                        {/* Row 1: Item Name, Barcode & Delete */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-1 text-[11px] font-bold text-slate-400 font-mono">
                            #{index + 1}
                          </div>

                          <div className="sm:col-span-7">
                            <input
                              type="text"
                              value={item.item_name || item.name}
                              onChange={(e) =>
                                updateItem(item.id || '', 'item_name', e.target.value)
                              }
                              placeholder="Product Name & Specification (e.g. Fortune Oil 1L)"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#4338CA]"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <div className="relative">
                              <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                              <input
                                type="text"
                                value={item.barcode || ''}
                                onChange={(e) =>
                                  updateItem(item.id || '', 'barcode', e.target.value)
                                }
                                placeholder="Barcode / EAN-13"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-1.5 text-xs font-mono text-slate-700 focus:bg-white focus:outline-none focus:border-[#4338CA]"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id || '')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Category, Sub-Category & Unit Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-1 border-t border-slate-100">
                          <div className="sm:col-span-5">
                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                              Category
                            </label>
                            <select
                              value={item.category || ''}
                              onChange={(e) =>
                                updateItem(item.id || '', 'category', e.target.value)
                              }
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#4338CA]"
                            >
                              <option value="">Select Category</option>
                              {storeCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-5">
                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                              Sub-Category
                            </label>
                            <select
                              value={item.sub_category || ''}
                              onChange={(e) =>
                                updateItem(item.id || '', 'sub_category', e.target.value)
                              }
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#4338CA]"
                            >
                              <option value="">Select Sub-Category</option>
                              {availableSubCats.map((sub) => (
                                <option key={sub} value={sub}>
                                  {sub}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                              Unit
                            </label>
                            <select
                              value={item.unit || 'pcs'}
                              onChange={(e) => updateItem(item.id || '', 'unit', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 text-center focus:outline-none"
                            >
                              <option value="pcs">pcs</option>
                              <option value="kg">kg</option>
                              <option value="pack">pack</option>
                              <option value="box">box</option>
                              <option value="ltr">ltr</option>
                              <option value="gm">gm</option>
                            </select>
                          </div>
                        </div>

                        {/* Row 3: Pricing, GST & Auto-Sync Commercials */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end pt-1 border-t border-slate-100 font-mono">
                          {/* Qty */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Qty
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity ?? item.qty}
                              onChange={(e) =>
                                updateItem(
                                  item.id || '',
                                  'quantity',
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-1 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* Buy Rate (Excl Tax) */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Buy Excl. Tax (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price_without_tax ?? item.purchase_price}
                              onChange={(e) =>
                                updateItem(
                                  item.id || '',
                                  'price_without_tax',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* GST % */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              GST %
                            </label>
                            <select
                              value={item.gst_rate}
                              onChange={(e) =>
                                updateItem(
                                  item.id || '',
                                  'gst_rate',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-1 text-xs text-slate-800 font-semibold focus:outline-none"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </div>

                          {/* Buy Rate (Incl Tax) */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Buy Incl. Tax (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price_after_tax}
                              onChange={(e) =>
                                updateItem(
                                  item.id || '',
                                  'price_after_tax',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-[#0D9488] font-bold focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* MRP / Sell */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              MRP / Sell (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.mrp !== null && item.mrp !== undefined ? item.mrp : ''}
                              onChange={(e) =>
                                updateItem(
                                  item.id || '',
                                  'mrp',
                                  e.target.value === '' ? null : parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder=""
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-[#4338CA] font-bold focus:bg-white focus:outline-none"
                            />
                          </div>

                          {/* Total Line Amount */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Total Excl. (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.amount ?? item.total_amount}
                              onChange={(e) =>
                                updateItem(
                                  item.id || '',
                                  'amount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full text-right bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Totals & GST Slabs Summary Breakdown */}
            {items.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
                {/* GST Slab Badges Breakdown */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 font-sans font-bold text-slate-700">
                    <Receipt className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>GST % Breakdown:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {gstBreakdown.map((slab) => (
                      <span
                        key={slab.rate}
                        className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${
                          slab.tax > 0
                            ? 'bg-teal-50 border-teal-200 text-[#0D9488]'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        {slab.rate}%: ₹{slab.tax.toFixed(2)}
                        {slab.taxable > 0 && (
                          <span className="text-[9px] text-slate-500 font-normal ml-1">
                            (on ₹{slab.taxable})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Primary Financial Totals Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] uppercase font-sans text-slate-500 block">
                      Total Units
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {totalUnits} units
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-sans text-slate-500 block">
                      Total Without Tax
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      ₹{totalAmountWithoutTax.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-sans text-slate-500 block">
                      Total Tax (GST)
                    </span>
                    <span className="font-bold text-[#0D9488] text-sm">
                      +₹{totalTaxAmount.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-sans text-slate-500 block">
                      Total With Tax
                    </span>
                    <span className="font-black text-[#4338CA] text-base">
                      ₹{totalAmountWithTax.toLocaleString('en-IN')}
                    </span>
                  </div>
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
                  <span>Synchronizing Suppliers & Product Master...</span>
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  <span>+ Inward to Product Master & Save Bill ({items.length} Items)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* STEP 3: SAVED INWARD BILLS HISTORY */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
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
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[#0F172A] block">
                          {bill.supplier_name}
                        </span>
                        {bill.supplier_gstin && (
                          <span className="text-[10px] font-mono text-[#0D9488]">
                            GSTIN: {bill.supplier_gstin}
                          </span>
                        )}
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
                            <span>
                              {filesCount} {hasPdfs ? 'PDF/Img' : 'Img'}
                            </span>
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
                {(detailsModalBill.supplier_gstin ||
                  detailsModalBill.supplier_contact ||
                  detailsModalBill.supplier_address) && (
                  <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px] text-slate-600">
                    {detailsModalBill.supplier_gstin && (
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[#0D9488] font-semibold">
                        GSTIN: {detailsModalBill.supplier_gstin}
                      </span>
                    )}
                    {detailsModalBill.supplier_contact && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {detailsModalBill.supplier_contact}
                      </span>
                    )}
                    {detailsModalBill.supplier_address && (
                      <span className="flex items-center gap-1 truncate max-w-sm">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {detailsModalBill.supplier_address}
                      </span>
                    )}
                  </div>
                )}
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
                <span className="text-[10px] uppercase font-sans text-slate-500 block">
                  Without Tax
                </span>
                <span className="text-sm font-bold text-slate-900">
                  ₹{(Number(detailsModalBill.subtotal) || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-sans text-slate-500 block">
                  Total Tax (GST)
                </span>
                <span className="text-sm font-bold text-[#0D9488]">
                  +₹{(Number(detailsModalBill.total_gst) || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-sans text-slate-500 block">
                  Grand Total
                </span>
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
                        <th className="py-2 px-3">Item & Category</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Buy Excl.</th>
                        <th className="py-2 px-3 text-right">MRP</th>
                        <th className="py-2 px-3 text-center">GST%</th>
                        <th className="py-2 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailsModalBill.items_json.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3">
                            <span className="font-medium text-[#0F172A] block">
                              {item.item_name || item.name}
                            </span>
                            {(item.barcode || item.category || item.sub_category) && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                {item.barcode && (
                                  <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">
                                    {item.barcode}
                                  </span>
                                )}
                                {item.category && (
                                  <span className="text-teal-700 font-medium">
                                    {item.category}
                                  </span>
                                )}
                                {item.sub_category && (
                                  <span className="text-slate-400">
                                    • {item.sub_category}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono">
                            {item.quantity ?? item.qty} {item.unit}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono">
                            ₹{(Number(item.price_without_tax ?? item.purchase_price) || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-[#4338CA] font-bold">
                            {item.mrp !== null && item.mrp !== undefined && Number(item.mrp) > 0
                              ? `₹${Number(item.mrp).toFixed(2)}`
                              : item.selling_price !== null &&
                                item.selling_price !== undefined &&
                                Number(item.selling_price) > 0
                              ? `₹${Number(item.selling_price).toFixed(2)}`
                              : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono">
                            {item.gst_rate}%
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{(Number(item.amount ?? item.total_amount) || 0).toFixed(2)}
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

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4338CA] group-hover:bg-[#3730A3] text-white text-xs font-bold transition-colors shadow-xs shrink-0">
                          <span>Open PDF Bill</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </a>
                    ) : (
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[#4338CA] hover:bg-slate-50 text-xs font-bold transition-colors shadow-xs shrink-0"
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
