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
  QrCode,
  Smartphone,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  Search,
  Users,
  RotateCcw,
  FileSpreadsheet,
  ChevronRight,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Edit2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../lib/r2Upload';
import {
  StoreProfile,
  PurchaseBillItem,
  PurchaseBillData,
  PurchaseBillRecord,
  Product,
  Supplier,
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
  r2PublicUrl?: string;
  r2FileKey?: string;
}

interface PurchaseBillsProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onNavigateToProducts: () => void;
  activeSubTab?: 'new' | 'new-purchase' | 'ledger' | 'vendors' | 'returns' | 'debit-note' | string;
  onSelectSubTab?: (tab: string) => void;
}

// Format file size nicely
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Clean decimal input: allow digits and at most one decimal point without forcing 0 on backspace
const sanitizeDecimalInput = (val: string): string => {
  if (!val) return '';
  const cleaned = val.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
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
  activeSubTab,
  onSelectSubTab,
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

  // Bill Details Modal & Document Viewer State
  const [detailsModalBill, setDetailsModalBill] = useState<PurchaseBillRecord | null>(null);
  const [modalResolvedUrls, setModalResolvedUrls] = useState<
    Array<{ name: string; url: string; isPdf: boolean }>
  >([]);
  const [loadingSignedUrls, setLoadingSignedUrls] = useState(false);
  const [viewerZoom, setViewerZoom] = useState<number>(1);
  const [viewerRotation, setViewerRotation] = useState<number>(0);
  const [activeViewerDocIndex, setActiveViewerDocIndex] = useState<number>(0);

  // Phone QR Scan Modal State - Persistent session across entire Purchase Bills page lifetime
  const [phoneQrModalOpen, setPhoneQrModalOpen] = useState(false);
  const [phoneQrSessionId] = useState<string>(() => crypto.randomUUID());
  const [phoneQrUrl, setPhoneQrUrl] = useState<string>('');
  const [isReceivingFromPhone, setIsReceivingFromPhone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [receivedPhoneCount, setReceivedPhoneCount] = useState(0);
  const phoneQrChannelRef = useRef<any>(null);

  // Multi-Page Bill Grouping State
  const [clubAsSingleBill, setClubAsSingleBill] = useState(true);
  const [activeSeparateFileIndex, setActiveSeparateFileIndex] = useState(0);
  const [activeExtractedQueueIds, setActiveExtractedQueueIds] = useState<string[]>([]);

  // Purchase Hub Sub-tabs: 'new-purchase' | 'ledger' | 'vendors' | 'debit-note'
  type PurchaseHubTab = 'new-purchase' | 'ledger' | 'vendors' | 'debit-note';
  const [hubTab, _setHubTab] = useState<PurchaseHubTab>(() => {
    if (activeSubTab === 'ledger') return 'ledger';
    if (activeSubTab === 'vendors') return 'vendors';
    if (activeSubTab === 'returns' || activeSubTab === 'debit-note') return 'debit-note';
    return 'new-purchase';
  });

  const setHubTab = useCallback(
    (tab: PurchaseHubTab) => {
      _setHubTab(tab);
      if (onSelectSubTab) {
        const mapped =
          tab === 'new-purchase' ? 'new' : tab === 'debit-note' ? 'returns' : tab;
        onSelectSubTab(mapped);
      }
    },
    [onSelectSubTab]
  );

  // Sync internal sub-tab when parent passes or updates activeSubTab
  useEffect(() => {
    if (!activeSubTab) return;
    if (activeSubTab === 'new' || activeSubTab === 'new-purchase') {
      _setHubTab('new-purchase');
    } else if (activeSubTab === 'ledger') {
      _setHubTab('ledger');
    } else if (activeSubTab === 'vendors') {
      _setHubTab('vendors');
    } else if (activeSubTab === 'returns' || activeSubTab === 'debit-note') {
      _setHubTab('debit-note');
    }
  }, [activeSubTab]);

  // Suppliers Directory State
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  // Supplier Edit Modal State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [suppName, setSuppName] = useState('');
  const [suppGstin, setSuppGstin] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppAddress, setSuppAddress] = useState('');
  const [suppFssai, setSuppFssai] = useState('');
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);

  // Inward Bill Edit & Delete State
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  // Invoices Ledger Search Filter
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  // Sale Return / Debit Note State
  const [debitNotes, setDebitNotes] = useState<
    Array<{
      id: string;
      date: string;
      supplierName: string;
      invoiceNumber: string;
      reason: string;
      amount: number;
      remarks: string;
      status: string;
    }>
  >([]);
  const [debitNoteModalOpen, setDebitNoteModalOpen] = useState(false);
  const [debitNoteSupplier, setDebitNoteSupplier] = useState('');
  const [debitNoteInvoiceNo, setDebitNoteInvoiceNo] = useState('');
  const [debitNoteReason, setDebitNoteReason] = useState('Damaged Goods / Expiry');
  const [debitNoteAmount, setDebitNoteAmount] = useState('');
  const [debitNoteRemarks, setDebitNoteRemarks] = useState('');

  const moveSelectedFile = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedFiles.length) return;
    setSelectedFiles((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const cleanupPhoneQrChannel = useCallback(() => {
    if (phoneQrChannelRef.current) {
      supabase.removeChannel(phoneQrChannelRef.current);
      phoneQrChannelRef.current = null;
    }
  }, []);

  // Keep Supabase Realtime channel subscribed for the entire lifetime of the Purchase Bills page
  useEffect(() => {
    if (!phoneQrSessionId) return;

    // Pre-populate scan URL
    const storeId = currentUser?.id || '';
    if (typeof window !== 'undefined') {
      setPhoneQrUrl(`${window.location.origin}/mobile-scan?session=${phoneQrSessionId}&store=${storeId}`);
    }

    const channel = supabase.channel(`bill-scan-${phoneQrSessionId}`);
    channel
      .on('broadcast', { event: 'files-uploaded' }, async ({ payload }) => {
        if (!payload?.files || !Array.isArray(payload.files) || payload.files.length === 0) return;
        setIsReceivingFromPhone(true);

        const incomingFiles: SelectedFileInfo[] = [];
        for (const item of payload.files) {
          try {
            const res = await fetch(item.publicUrl);
            const blob = await res.blob();
            const uniqueId = crypto.randomUUID();
            const itemName = item.name || `bill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
            const file = new File([blob], itemName, {
              type: item.type || blob.type || 'image/jpeg',
            });
            const isPdf =
              item.type === 'application/pdf' || itemName.toLowerCase().endsWith('.pdf');

            let previewUrl: string | undefined = undefined;
            if (!isPdf) {
              previewUrl = URL.createObjectURL(file);
            }

            incomingFiles.push({
              file,
              id: uniqueId,
              name: itemName,
              size: file.size,
              type: isPdf ? 'pdf' : 'image',
              previewUrl,
              r2PublicUrl: item.publicUrl,
              r2FileKey: item.fileKey,
            });
          } catch (fetchErr) {
            console.error('[PurchaseBills] Failed to fetch file from phone upload URL:', fetchErr);
          }
        }

        if (incomingFiles.length > 0) {
          // Functional state update appending every incoming photo with unique id, NEVER deduplicating by fileName
          setSelectedFiles((prev) => [...prev, ...incomingFiles]);
          setReceivedPhoneCount((c) => c + incomingFiles.length);
          setInputMode('upload');
          setFeedback({
            type: 'success',
            message: `Received ${incomingFiles.length} photo${
              incomingFiles.length > 1 ? 's' : ''
            } from phone! Added to queue.`,
          });
        }

        setIsReceivingFromPhone(false);
      })
      .subscribe((status) => {
        console.log(`[PurchaseBills] Realtime channel bill-scan-${phoneQrSessionId} status:`, status);
      });

    phoneQrChannelRef.current = channel;

    return () => {
      cleanupPhoneQrChannel();
    };
  }, [phoneQrSessionId, currentUser?.id, cleanupPhoneQrChannel]);

  const handleClosePhoneQrModal = () => {
    setPhoneQrModalOpen(false);
    setIsReceivingFromPhone(false);
    setCopiedLink(false);
    // Do NOT unsubscribe here: keep Realtime channel active for the page lifetime so subsequent snaps appear!
  };

  const handleOpenPhoneQrModal = () => {
    const storeId = currentUser?.id || '';
    setPhoneQrUrl(`${window.location.origin}/mobile-scan?session=${phoneQrSessionId}&store=${storeId}`);
    setPhoneQrModalOpen(true);
    setCopiedLink(false);
  };

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

  // Fetch suppliers directory from Supabase
  const fetchSuppliers = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingSuppliers(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('store_id', currentUser.id)
        .order('name', { ascending: true });

      if (!error && data) {
        setSuppliersList(data);
      }
    } catch (err: any) {
      console.warn('[PurchaseBills] fetchSuppliers note:', err.message);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [currentUser?.id]);

  // Edit / Delete Supplier Handlers
  const openEditSupplierModal = (s: Supplier) => {
    setEditingSupplier(s);
    setSuppName(s.name || '');
    setSuppGstin(s.gstin || '');
    setSuppPhone(s.phone || s.contact || '');
    setSuppEmail(s.email || '');
    setSuppAddress(s.address || '');
    setSuppFssai(s.fssai || '');
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.id || !currentUser?.id) return;
    if (!suppName.trim()) {
      alert('Vendor name is required');
      return;
    }
    setIsSavingSupplier(true);
    try {
      const payload = {
        name: suppName.trim(),
        gstin: suppGstin.trim().toUpperCase() || null,
        phone: suppPhone.trim() || null,
        contact: suppPhone.trim() || null,
        email: suppEmail.trim() || null,
        address: suppAddress.trim() || null,
        fssai: suppFssai.trim() || null,
      };
      const { error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', editingSupplier.id)
        .eq('store_id', currentUser.id);

      if (error) {
        alert(`Failed to update vendor: ${error.message}`);
        setIsSavingSupplier(false);
        return;
      }

      setSuppliersList((prev) =>
        prev.map((s) => (s.id === editingSupplier.id ? { ...s, ...payload } : s))
      );
      setSupplierModalOpen(false);
      setEditingSupplier(null);
    } catch (err: any) {
      alert(`Error updating vendor: ${err.message}`);
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleDeleteSupplier = async (s: Supplier) => {
    if (!s.id || !currentUser?.id) return;
    if (!window.confirm(`Are you sure you want to delete vendor "${s.name}"?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', s.id)
        .eq('store_id', currentUser.id);

      if (error) {
        alert(`Failed to delete vendor: ${error.message}`);
        return;
      }

      setSuppliersList((prev) => prev.filter((item) => item.id !== s.id));
    } catch (err: any) {
      alert(`Error deleting vendor: ${err.message}`);
    }
  };

  // Edit / Delete Purchase Bill Handlers
  const handleEditBill = async (bill: PurchaseBillRecord) => {
    if (!bill.id || !currentUser?.id) return;
    try {
      setEditingBillId(bill.id);
      setBillNumber(bill.bill_number || (bill as any).invoice_number || '');
      setBillDate(bill.bill_date || (bill as any).invoice_date || bill.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setSupplierName(bill.supplier_name || (bill as any).seller_name || '');
      setSupplierGstin(bill.supplier_gstin || (bill as any).gstin || '');
      setSupplierAddress(bill.supplier_address || (bill as any).address || '');
      setSupplierContact(bill.supplier_contact || (bill as any).phone || '');
      setSupplierEmail(bill.supplier_email || '');
      setSupplierFssai(bill.supplier_fssai || '');

      // Fetch items from purchase_bill_items scoped strictly by store_id
      const { data: dbItems, error: itemsErr } = await supabase
        .from('purchase_bill_items')
        .select('*')
        .eq('purchase_bill_id', bill.id)
        .eq('store_id', currentUser.id);

      if (!itemsErr && dbItems && dbItems.length > 0) {
        const mappedItems: PurchaseBillItem[] = dbItems.map((row: any) => {
          const qty = Number(row.quantity ?? row.qty) || 1;
          const freeQty = Number(row.free_qty) || 0;
          const rate = Number(row.purchase_rate ?? row.rate) || 0;
          const disc = Number(row.discount) || 0;
          const gst = Number(row.gst_rate) || 0;
          const gross = qty * rate;
          const discPct = gross > 0 ? (disc / gross) * 100 : 0;
          return {
            id: row.id,
            name: row.item_name || row.name || 'Item',
            item_name: row.item_name || row.name || 'Item',
            qty: qty,
            quantity: qty,
            free_qty: freeQty > 0 ? freeQty : '',
            unit: row.unit || 'pcs',
            purchase_price: rate,
            purchase_rate: rate,
            selling_price: row.mrp || null,
            mrp: row.mrp || null,
            gst_rate: gst,
            discount: disc,
            discount_percent: Math.round(discPct * 100) / 100,
            total_amount: row.total || Math.round(Math.max(0, gross - disc) * (1 + gst / 100) * 100) / 100,
            hsn_code: row.hsn_code || '',
            category: row.category || 'General',
            sub_category: row.sub_category || 'General',
          };
        });
        setItems(mappedItems);
      } else if (bill.items_json && Array.isArray(bill.items_json) && bill.items_json.length > 0) {
        setItems(bill.items_json);
      }

      setHubTab('new-purchase');
      if (onSelectSubTab) {
        onSelectSubTab('new');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[PurchaseBills] Error loading bill for edit:', err);
      setFeedback({ type: 'error', message: `Failed to load bill for editing: ${err.message}` });
    }
  };

  const handleCancelEditBill = () => {
    setEditingBillId(null);
    setItems([]);
    setActiveExtractedQueueIds([]);
    setBillNumber('');
    setBillDate(new Date().toISOString().slice(0, 10));
    setSupplierName('');
    setSupplierGstin('');
    setSupplierAddress('');
    setSupplierContact('');
    setSupplierEmail('');
    setSupplierFssai('');
  };

  const handleDeleteBill = async (bill: PurchaseBillRecord) => {
    if (!bill.id || !currentUser?.id) return;
    const invNo = bill.bill_number || (bill as any).invoice_number || 'this bill';
    if (!window.confirm(`Are you sure you want to delete purchase bill "${invNo}"? This action cannot be undone.`)) {
      return;
    }
    try {
      // 1. Delete child items scoped strictly by store_id
      await supabase
        .from('purchase_bill_items')
        .delete()
        .eq('purchase_bill_id', bill.id)
        .eq('store_id', currentUser.id);

      // 2. Delete the purchase bill record scoped strictly by store_id
      const { error } = await supabase
        .from('purchase_bills')
        .delete()
        .eq('id', bill.id)
        .eq('store_id', currentUser.id);

      if (error) {
        setFeedback({ type: 'error', message: `Failed to delete bill: ${error.message}` });
        return;
      }

      setSavedBills((prev) => prev.filter((b) => b.id !== bill.id));
      if (editingBillId === bill.id) {
        handleCancelEditBill();
      }
      setFeedback({ type: 'success', message: `Purchase bill "${invNo}" deleted successfully.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Error deleting bill: ${err.message}` });
    }
  };

  useEffect(() => {
    fetchSavedBills();
    loadExistingStoreCatalogCategories();
    fetchSuppliers();
  }, [fetchSavedBills, loadExistingStoreCatalogCategories, fetchSuppliers]);

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
      const updated = prev.filter((f) => f.id !== id);
      if (activeSeparateFileIndex >= updated.length) {
        setActiveSeparateFileIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    setActiveExtractedQueueIds((prev) => prev.filter((qId) => qId !== id));
  };

  const clearAllSelectedFiles = () => {
    selectedFiles.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setSelectedFiles([]);
    setActiveExtractedQueueIds([]);
    setActiveSeparateFileIndex(0);
    setReceivedPhoneCount(0);
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
        hsn_code: '15121910',
        qty: 24,
        quantity: 24,
        free_qty: 2,
        unit: 'pack',
        purchase_rate: 118,
        purchase_price: 118,
        price_without_tax: 118,
        price_after_tax: 123.9,
        discount: 0,
        discount_percent: 0,
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
        hsn_code: '11010000',
        qty: 15,
        quantity: 15,
        unit: 'pack',
        purchase_rate: 365,
        purchase_price: 365,
        price_without_tax: 365,
        price_after_tax: 365,
        discount: 0,
        discount_percent: 0,
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
        hsn_code: '25010010',
        qty: 50,
        quantity: 50,
        unit: 'pack',
        purchase_rate: 22,
        purchase_price: 22,
        price_without_tax: 22,
        price_after_tax: 22,
        discount: 0,
        discount_percent: 0,
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
        hsn_code: '04059020',
        qty: 12,
        quantity: 12,
        unit: 'pack',
        purchase_rate: 540,
        purchase_price: 540,
        price_without_tax: 540,
        price_after_tax: 604.8,
        discount: 0,
        discount_percent: 0,
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
        hsn_code: '34029090',
        qty: 20,
        quantity: 20,
        unit: 'pack',
        purchase_rate: 132,
        purchase_price: 132,
        price_without_tax: 132,
        price_after_tax: 155.76,
        discount: 0,
        discount_percent: 0,
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
  const handleParseBill = async (overrideFileIndex?: number) => {
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
        const filesToProcess =
          overrideFileIndex !== undefined
            ? [selectedFiles[overrideFileIndex]]
            : clubAsSingleBill || selectedFiles.length <= 1
            ? selectedFiles
            : [selectedFiles[Math.min(activeSeparateFileIndex, selectedFiles.length - 1)]];

        // Store active extracted queue IDs
        const extractedIds = filesToProcess.map((f) => f.id).filter(Boolean);
        setActiveExtractedQueueIds(extractedIds);

        for (const fileInfo of filesToProcess) {
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

      const res = await fetch('/api/extract-bill', {
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

      const data: any = result.data;
      const seller = data.seller_name || data.supplier_name || '';
      const gstin = data.gstin || data.supplier_gstin || '';
      const address = data.address || data.supplier_address || '';
      const phone = data.phone || data.supplier_contact || '';
      const email = data.email || data.supplier_email || '';
      const fssai = data.fssai || data.supplier_fssai || '';
      const invNumber = data.invoice_number || data.bill_number || `PB-${Date.now().toString().slice(-6)}`;
      const invDate = data.invoice_date || data.bill_date || new Date().toISOString().slice(0, 10);

      setSupplierName(seller);
      setSupplierGstin(gstin);
      setSupplierAddress(address);
      setSupplierContact(phone);
      setSupplierEmail(email);
      setSupplierFssai(fssai);
      setBillNumber(invNumber);
      setBillDate(invDate);

      setItems(
        (data.items || []).map((it: any, idx: number) => {
          const qty = Number(it.quantity ?? it.qty) || 1;
          const freeQty = Number(it.free_qty) || 0;
          const buyRate = Number(it.purchase_rate ?? it.price_without_tax ?? it.purchase_price) || 0;
          const gstRate = Number(it.gst_rate) || 0;
          const discount = Number(it.discount) || 0;
          const gross = qty * buyRate;
          const discPct = gross > 0 && discount > 0 ? Math.round(((discount / gross) * 100) * 100) / 100 : 0;
          const rateWithTax =
            Number(it.price_after_tax) ||
            Math.round(buyRate * (1 + gstRate / 100) * 100) / 100;

          const mrp =
            it.mrp !== null &&
            it.mrp !== undefined &&
            !isNaN(Number(it.mrp)) &&
            Number(it.mrp) > 0
              ? Math.round(Number(it.mrp) * 100) / 100
              : null;

          const sellPrice =
            mrp !== null && mrp > 0
              ? mrp
              : it.selling_price !== null &&
                it.selling_price !== undefined &&
                !isNaN(Number(it.selling_price)) &&
                Number(it.selling_price) > 0
              ? Math.round(Number(it.selling_price) * 100) / 100
              : null;

          const lineAmount =
            Number(it.amount ?? it.total_amount) || Math.round(qty * buyRate * 100) / 100;

          const rawBillLineTotal =
            it.bill_line_total !== undefined &&
            it.bill_line_total !== null &&
            it.bill_line_total !== '' &&
            !isNaN(Number(it.bill_line_total))
              ? Math.round(Number(it.bill_line_total) * 100) / 100
              : null;

          const hsn = String(it.hsn_code || '').trim();
          const cat = String(it.category || '').trim();
          const subCat = String(it.sub_category || '').trim();
          const barcode = String(it.barcode || '').trim();
          const itemName = String(it.name || it.item_name || '').trim();

          return {
            ...it,
            id: `${Date.now()}-${idx}`,
            name: itemName,
            item_name: itemName,
            hsn_code: hsn,
            qty: qty,
            quantity: qty,
            free_qty: freeQty > 0 ? freeQty : '',
            unit: it.unit || 'pcs',
            purchase_rate: buyRate,
            purchase_price: buyRate,
            price_without_tax: buyRate,
            price_after_tax: rateWithTax,
            discount: discount,
            discount_percent: discPct > 0 ? discPct : 0,
            selling_price: sellPrice,
            mrp: mrp,
            gst_rate: gstRate,
            total_amount: lineAmount,
            amount: lineAmount,
            barcode: barcode,
            category: cat,
            sub_category: subCat,
            bill_line_total: rawBillLineTotal !== null ? rawBillLineTotal : lineAmount,
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
        const updated: PurchaseBillItem = { ...item };

        if (field === 'item_name' || field === 'name') {
          updated.item_name = String(value);
          updated.name = String(value);
        } else if (field === 'hsn_code') {
          updated.hsn_code = String(value);
        } else if (field === 'barcode') {
          updated.barcode = String(value);
        } else if (field === 'category') {
          const newCat = String(value);
          updated.category = newCat;
          const availableSubs = newCat ? storeSubCategories[newCat] || [] : [];
          if (updated.sub_category && !availableSubs.includes(updated.sub_category)) {
            updated.sub_category = '';
          }
        } else if (field === 'sub_category') {
          updated.sub_category = String(value);
        } else if (field === 'unit') {
          updated.unit = String(value);
        } else if (field === 'gst_rate') {
          const gst = Number(value) || 0;
          updated.gst_rate = gst;
          const buyRateStr = String(updated.purchase_rate ?? updated.price_without_tax ?? updated.purchase_price ?? '');
          if (buyRateStr !== '') {
            const buyRate = parseFloat(buyRateStr) || 0;
            updated.price_after_tax = Math.round(buyRate * (1 + gst / 100) * 100) / 100;
          }
        } else if (field === 'discount') {
          const raw = sanitizeDecimalInput(String(value));
          updated.discount = raw;
          const qtyStr = String(updated.quantity ?? updated.qty ?? '');
          const buyRateStr = String(updated.purchase_rate ?? updated.price_without_tax ?? updated.purchase_price ?? '');
          const q = parseFloat(qtyStr) || 0;
          const r = parseFloat(buyRateStr) || 0;
          const gross = Math.round(q * r * 100) / 100;
          if (raw === '') {
            updated.discount_percent = '';
            const taxable = gross;
            updated.amount = taxable > 0 ? taxable : '';
            updated.total_amount = taxable > 0 ? taxable : '';
          } else {
            const discAmt = parseFloat(raw) || 0;
            const discPct = gross > 0 ? Math.round(((discAmt / gross) * 100) * 100) / 100 : 0;
            updated.discount_percent = discPct > 0 ? String(discPct) : (discAmt === 0 ? '0' : '');
            const taxable = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
            updated.amount = taxable;
            updated.total_amount = taxable;
          }
        } else if (field === 'discount_percent') {
          const raw = sanitizeDecimalInput(String(value));
          updated.discount_percent = raw;
          const qtyStr = String(updated.quantity ?? updated.qty ?? '');
          const buyRateStr = String(updated.purchase_rate ?? updated.price_without_tax ?? updated.purchase_price ?? '');
          const q = parseFloat(qtyStr) || 0;
          const r = parseFloat(buyRateStr) || 0;
          const gross = Math.round(q * r * 100) / 100;
          if (raw === '') {
            updated.discount = '';
            const taxable = gross;
            updated.amount = taxable > 0 ? taxable : '';
            updated.total_amount = taxable > 0 ? taxable : '';
          } else {
            const discPct = parseFloat(raw) || 0;
            const discAmt = Math.round(((gross * discPct) / 100) * 100) / 100;
            updated.discount = discAmt > 0 ? String(discAmt) : (discPct === 0 ? '0' : '');
            const taxable = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
            updated.amount = taxable;
            updated.total_amount = taxable;
          }
        } else if (field === 'quantity' || field === 'qty') {
          const raw = sanitizeDecimalInput(String(value));
          updated.quantity = raw;
          updated.qty = raw;
          const buyRateStr = String(updated.purchase_rate ?? updated.price_without_tax ?? updated.purchase_price ?? '');
          if (raw === '') {
            updated.amount = '';
            updated.total_amount = '';
          } else if (buyRateStr !== '') {
            const q = parseFloat(raw) || 0;
            const r = parseFloat(buyRateStr) || 0;
            const gross = Math.round(q * r * 100) / 100;
            const discPctStr = String(updated.discount_percent ?? '');
            const discAmtStr = String(updated.discount ?? '');
            let discAmt = 0;
            if (discPctStr !== '') {
              const discPct = parseFloat(discPctStr) || 0;
              discAmt = Math.round(((gross * discPct) / 100) * 100) / 100;
              updated.discount = discAmt > 0 ? String(discAmt) : (discPct === 0 ? '0' : '');
            } else if (discAmtStr !== '') {
              discAmt = parseFloat(discAmtStr) || 0;
              const discPct = gross > 0 ? Math.round(((discAmt / gross) * 100) * 100) / 100 : 0;
              updated.discount_percent = discPct > 0 ? String(discPct) : (discAmt === 0 ? '0' : '');
            }
            const taxable = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
            updated.amount = taxable;
            updated.total_amount = taxable;
          }
        } else if (field === 'free_qty') {
          const raw = sanitizeDecimalInput(String(value));
          updated.free_qty = raw;
        } else if (field === 'price_without_tax' || field === 'purchase_price' || field === 'purchase_rate') {
          const raw = sanitizeDecimalInput(String(value));
          updated.price_without_tax = raw;
          updated.purchase_price = raw;
          updated.purchase_rate = raw;
          const gst = Number(updated.gst_rate) || 0;
          const qtyStr = String(updated.quantity ?? updated.qty ?? '');
          if (raw === '') {
            updated.price_after_tax = '';
            updated.amount = '';
            updated.total_amount = '';
          } else {
            const buyRate = parseFloat(raw) || 0;
            updated.price_after_tax = Math.round(buyRate * (1 + gst / 100) * 100) / 100;
            if (qtyStr !== '') {
              const q = parseFloat(qtyStr) || 0;
              const gross = Math.round(q * buyRate * 100) / 100;
              const discPctStr = String(updated.discount_percent ?? '');
              const discAmtStr = String(updated.discount ?? '');
              let discAmt = 0;
              if (discPctStr !== '') {
                const discPct = parseFloat(discPctStr) || 0;
                discAmt = Math.round(((gross * discPct) / 100) * 100) / 100;
                updated.discount = discAmt > 0 ? String(discAmt) : (discPct === 0 ? '0' : '');
              } else if (discAmtStr !== '') {
                discAmt = parseFloat(discAmtStr) || 0;
                const discPct = gross > 0 ? Math.round(((discAmt / gross) * 100) * 100) / 100 : 0;
                updated.discount_percent = discPct > 0 ? String(discPct) : (discAmt === 0 ? '0' : '');
              }
              const taxable = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
              updated.amount = taxable;
              updated.total_amount = taxable;
            }
          }
        } else if (field === 'price_after_tax') {
          const raw = sanitizeDecimalInput(String(value));
          updated.price_after_tax = raw;
          const gst = Number(updated.gst_rate) || 0;
          const qtyStr = String(updated.quantity ?? updated.qty ?? '');
          if (raw === '') {
            updated.price_without_tax = '';
            updated.purchase_price = '';
            updated.purchase_rate = '';
            updated.amount = '';
            updated.total_amount = '';
          } else {
            const rateWithTax = parseFloat(raw) || 0;
            const buyRate = gst > 0 ? Math.round((rateWithTax / (1 + gst / 100)) * 100) / 100 : rateWithTax;
            updated.price_without_tax = buyRate;
            updated.purchase_price = buyRate;
            updated.purchase_rate = buyRate;
            if (qtyStr !== '') {
              const q = parseFloat(qtyStr) || 0;
              const gross = Math.round(q * buyRate * 100) / 100;
              const discPctStr = String(updated.discount_percent ?? '');
              const discAmtStr = String(updated.discount ?? '');
              let discAmt = 0;
              if (discPctStr !== '') {
                const discPct = parseFloat(discPctStr) || 0;
                discAmt = Math.round(((gross * discPct) / 100) * 100) / 100;
                updated.discount = discAmt > 0 ? String(discAmt) : (discPct === 0 ? '0' : '');
              } else if (discAmtStr !== '') {
                discAmt = parseFloat(discAmtStr) || 0;
                const discPct = gross > 0 ? Math.round(((discAmt / gross) * 100) * 100) / 100 : 0;
                updated.discount_percent = discPct > 0 ? String(discPct) : (discAmt === 0 ? '0' : '');
              }
              const taxable = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
              updated.amount = taxable;
              updated.total_amount = taxable;
            }
          }
        } else if (field === 'mrp' || field === 'selling_price') {
          const raw = sanitizeDecimalInput(String(value));
          updated.mrp = raw;
          updated.selling_price = raw;
        } else if (field === 'amount' || field === 'total_amount') {
          const raw = sanitizeDecimalInput(String(value));
          updated.amount = raw;
          updated.total_amount = raw;
          const gst = Number(updated.gst_rate) || 0;
          const qtyStr = String(updated.quantity ?? updated.qty ?? '');
          if (raw !== '' && qtyStr !== '') {
            const amt = parseFloat(raw) || 0;
            const q = parseFloat(qtyStr) || 0;
            if (q > 0) {
              const buyRate = Math.round((amt / q) * 100) / 100;
              updated.price_without_tax = buyRate;
              updated.purchase_price = buyRate;
              updated.purchase_rate = buyRate;
              updated.price_after_tax = Math.round(buyRate * (1 + gst / 100) * 100) / 100;
              updated.discount = '0';
              updated.discount_percent = '0';
            }
          }
        } else {
          (updated as any)[field] = value;
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
      hsn_code: '',
      qty: 1,
      quantity: 1,
      free_qty: '',
      unit: 'pcs',
      purchase_rate: 0,
      purchase_price: 0,
      price_without_tax: 0,
      price_after_tax: 0,
      discount: 0,
      discount_percent: 0,
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
    (acc, i) => {
      const q = parseFloat(String(i.quantity ?? i.qty ?? 0)) || 0;
      const r = parseFloat(String(i.price_without_tax ?? i.purchase_price ?? i.purchase_rate ?? 0)) || 0;
      const d = parseFloat(String(i.discount ?? 0)) || 0;
      return acc + Math.max(0, q * r - d);
    },
    0
  );

  // Calculate GST breakdown by tax rate (0%, 5%, 12%, 18%, 28%)
  const GST_SLABS = [0, 5, 12, 18, 28];
  const gstBreakdown = GST_SLABS.map((rate) => {
    const taxableForRate = items
      .filter((i) => (Number(i.gst_rate) || 0) === rate)
      .reduce(
        (sum, i) => {
          const q = parseFloat(String(i.quantity ?? i.qty ?? 0)) || 0;
          const r = parseFloat(String(i.price_without_tax ?? i.purchase_price ?? i.purchase_rate ?? 0)) || 0;
          const d = parseFloat(String(i.discount ?? 0)) || 0;
          return sum + Math.max(0, q * r - d);
        },
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
  const totalUnits = items.reduce(
    (acc, i) =>
      acc +
      (parseFloat(String(i.quantity ?? i.qty ?? 0)) || 0) +
      (parseFloat(String(i.free_qty ?? 0)) || 0),
    0
  );

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
      // 0. Verify authenticated session before attempting any database operations
      const {
        data: { user: authUser },
        error: authErr,
      } = await supabase.auth.getUser();

      const activeUser = authUser || currentUser;

      if (!activeUser || !activeUser.id) {
        setFeedback({
          type: 'error',
          message:
            'No authenticated session found. Please sign in to your store account before saving inventory.',
        });
        setIsSavingStock(false);
        return;
      }

      const verifiedStoreId: string = activeUser.id;

      // Ensure public.store_profiles has a row for this authenticated user before product upsert
      const storeName =
        userProfile?.business_name ||
        userProfile?.store_name ||
        activeUser.user_metadata?.business_name ||
        activeUser.user_metadata?.store_name ||
        'Mittal Departmental Store';

      try {
        await supabase.from('store_profiles').upsert(
          {
            id: verifiedStoreId,
            business_name: storeName || 'Mittal Departmental Store',
            store_name: storeName || 'Mittal Departmental Store',
            email: activeUser.email || '',
            phone:
              activeUser.phone ||
              userProfile?.phone ||
              activeUser.user_metadata?.phone ||
              '',
            role: 'admin',
            is_approved: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (profileErr: any) {
        console.warn('[PurchaseBills] store_profiles upsert note:', profileErr?.message);
      }

      // 1. First upsert the vendor into public.suppliers (store_id: user.id, name: sellerName, gstin, phone, address) and surface error toast if it fails
      let linkedSupplierId: string | null = null;
      const cleanGstin = supplierGstin.trim();
      const cleanSuppName = supplierName.trim() || 'Wholesale Supplier';

      let suppQuery = supabase
        .from('suppliers')
        .select('*')
        .eq('store_id', verifiedStoreId);

      if (cleanGstin) {
        suppQuery = suppQuery.or(`gstin.eq.${cleanGstin},name.ilike.${cleanSuppName}`);
      } else {
        suppQuery = suppQuery.ilike('name', cleanSuppName);
      }

      const { data: matchedSuppliers, error: suppFetchErr } = await suppQuery;

      if (suppFetchErr) {
        setFeedback({
          type: 'error',
          message: `Failed to query suppliers from database: ${suppFetchErr.message}`,
        });
        setIsSavingStock(false);
        return;
      }

      if (matchedSuppliers && matchedSuppliers.length > 0) {
        const existingSupp = matchedSuppliers[0];
        linkedSupplierId = existingSupp.id;

        const updateSuppPayload: any = {
          name: cleanSuppName,
          phone: supplierContact.trim() || existingSupp.phone || existingSupp.contact || null,
          contact: supplierContact.trim() || existingSupp.contact || existingSupp.phone || null,
          address: supplierAddress.trim() || existingSupp.address || null,
        };
        if (cleanGstin) updateSuppPayload.gstin = cleanGstin;
        if (supplierEmail.trim()) updateSuppPayload.email = supplierEmail.trim();
        if (supplierFssai.trim()) updateSuppPayload.fssai = supplierFssai.trim();

        const { error: suppUpdErr } = await supabase
          .from('suppliers')
          .update(updateSuppPayload)
          .eq('id', existingSupp.id)
          .eq('store_id', verifiedStoreId);

        if (suppUpdErr) {
          setFeedback({
            type: 'error',
            message: `Failed to update supplier "${cleanSuppName}": ${suppUpdErr.message}`,
          });
          setIsSavingStock(false);
          return;
        }
      } else {
        const newSuppPayload: any = {
          store_id: verifiedStoreId,
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

        if (suppInsErr) {
          setFeedback({
            type: 'error',
            message: `Failed to register supplier "${cleanSuppName}": ${suppInsErr.message}`,
          });
          setIsSavingStock(false);
          return;
        }

        if (insertedSupp) {
          linkedSupplierId = insertedSupp.id;
        }
      }

      // 2. Upload original PDF and image files into Cloudflare R2 via uploadToR2
      const filesToSave =
        activeExtractedQueueIds.length > 0
          ? selectedFiles.filter((f) => activeExtractedQueueIds.includes(f.id))
          : clubAsSingleBill || selectedFiles.length <= 1
          ? selectedFiles
          : [selectedFiles[Math.min(activeSeparateFileIndex, selectedFiles.length - 1)]];

      const uploadedFilePaths: string[] = [];
      for (const fileInfo of filesToSave) {
        try {
          if (fileInfo.r2FileKey) {
            uploadedFilePaths.push(fileInfo.r2FileKey);
          } else {
            const { fileKey } = await uploadToR2({
              file: fileInfo.file,
              storeId: verifiedStoreId,
              folder: 'purchases',
            });
            uploadedFilePaths.push(fileKey);
          }
        } catch (r2Err: any) {
          console.warn('[PurchaseBills] Cloudflare R2 upload warning:', r2Err.message);
        }
      }

      const primaryFileUrl =
        filesToSave[0]?.r2PublicUrl ||
        (uploadedFilePaths.length > 0 ? uploadedFilePaths[0] : null);

      // 3. Upsert every line item into public.products with mrp, selling_price, hsn_code, category, sub_category
      const { data: existingProducts, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', verifiedStoreId);

      if (fetchErr) {
        setFeedback({
          type: 'error',
          message: `Failed to fetch store catalog: ${fetchErr.message}`,
        });
        setIsSavingStock(false);
        return;
      }

      const catalog: Product[] = existingProducts || [];
      let updatedCount = 0;
      let createdCount = 0;

      for (const item of items) {
        const trimmedName = (item.item_name || item.name || '').trim();
        const trimmedBarcode = item.barcode?.trim() || null;
        const trimmedHsn = (item.hsn_code || '').trim() || null;
        const trimmedCategory = (item.category || '').trim();
        const trimmedSubCategory = item.sub_category?.trim() || null;
        const unit = item.unit || 'pcs';

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

        const buyPrice = Number(item.purchase_rate ?? item.price_without_tax ?? item.purchase_price) || 0;
        const parsedMrp =
          item.mrp !== null &&
          item.mrp !== undefined &&
          !isNaN(Number(item.mrp)) &&
          Number(item.mrp) > 0
            ? Math.round(Number(item.mrp) * 100) / 100
            : null;

        // Defaulting to mrp if > 0, else editable selling rate—never leaving 0 when MRP is present
        let sellPrice: number;
        if (parsedMrp !== null && parsedMrp > 0) {
          sellPrice = parsedMrp;
        } else if (
          item.selling_price !== null &&
          item.selling_price !== undefined &&
          !isNaN(Number(item.selling_price)) &&
          Number(item.selling_price) > 0
        ) {
          sellPrice = Math.round(Number(item.selling_price) * 100) / 100;
        } else if (item.price_after_tax && Number(item.price_after_tax) > 0) {
          sellPrice = Math.round(Number(item.price_after_tax) * 100) / 100;
        } else {
          sellPrice = buyPrice;
        }

        const mrpForDb = parsedMrp !== null && parsedMrp > 0 ? parsedMrp : sellPrice;
        const qty = Number(item.quantity ?? item.qty) || 1;
        const freeQty = Number(item.free_qty) || 0;
        const totalReceivedUnits = qty + freeQty;
        const gstRate = Number(item.gst_rate) || 0;
        const disc = Number(item.discount) || 0;
        const taxable = Math.max(0, qty * buyPrice - disc);
        const lineTotalIncl = Math.round(taxable * (1 + gstRate / 100) * 100) / 100;
        const effectiveLandingPrice = totalReceivedUnits > 0
          ? Math.round((lineTotalIncl / totalReceivedUnits) * 100) / 100
          : buyPrice;

        if (existing) {
          // Increment stock_qty of existing product (including paid and free quantity)
          const newStock = (Number(existing.stock_qty) || 0) + totalReceivedUnits;
          const updateData: any = {
            stock_qty: newStock,
            purchase_price: effectiveLandingPrice,
            gst_rate: gstRate,
            mrp: mrpForDb,
            selling_price: sellPrice,
          };
          if (trimmedCategory) updateData.category = trimmedCategory;
          if (trimmedSubCategory) updateData.sub_category = trimmedSubCategory;
          if (trimmedBarcode) updateData.barcode = trimmedBarcode;
          if (trimmedHsn) updateData.hsn_code = trimmedHsn;

          let { error: updateErr } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', existing.id)
            .eq('store_id', verifiedStoreId);

          if (
            updateErr &&
            (updateErr.message?.includes('hsn_code') ||
              updateErr.message?.includes('sub_category') ||
              updateErr.message?.includes('purchase_price'))
          ) {
            delete updateData.hsn_code;
            delete updateData.sub_category;
            delete updateData.purchase_price;
            const retryRes = await supabase
              .from('products')
              .update(updateData)
              .eq('id', existing.id)
              .eq('store_id', verifiedStoreId);
            updateErr = retryRes.error;
          }

          if (updateErr) {
            setFeedback({
              type: 'error',
              message: `Failed to update product "${trimmedName}": ${updateErr.message}`,
            });
            setIsSavingStock(false);
            return;
          }
          updatedCount++;
        } else {
          // Insert new product into public.products
          const insertData: any = {
            store_id: verifiedStoreId,
            name: trimmedName,
            unit: unit,
            mrp: mrpForDb,
            selling_price: sellPrice,
            purchase_price: effectiveLandingPrice,
            gst_rate: gstRate,
            stock_qty: totalReceivedUnits,
            low_stock_alert: 5,
            category: trimmedCategory,
            sub_category: trimmedSubCategory,
            barcode: trimmedBarcode,
            hsn_code: trimmedHsn,
          };

          let { error: insertErr } = await supabase.from('products').insert(insertData);

          if (
            insertErr &&
            (insertErr.message?.includes('hsn_code') ||
              insertErr.message?.includes('sub_category') ||
              insertErr.message?.includes('purchase_price'))
          ) {
            delete insertData.hsn_code;
            delete insertData.sub_category;
            delete insertData.purchase_price;
            const retryRes = await supabase.from('products').insert(insertData);
            insertErr = retryRes.error;
          }

          if (insertErr) {
            setFeedback({
              type: 'error',
              message: `Failed to create product "${trimmedName}": ${insertErr.message}`,
            });
            setIsSavingStock(false);
            return;
          }
          createdCount++;
        }
      }

      // 4. Save purchase bill record in public.purchase_bills and rows in public.purchase_bill_items
      const invNo = billNumber.trim() || `PB-${Date.now().toString().slice(-6)}`;
      const invDate = billDate || new Date().toISOString().slice(0, 10);
      const totalAmt = Math.round(totalAmountWithTax * 100) / 100;
      const taxAmt = Math.round(totalTaxAmount * 100) / 100;
      const subtotalAmt = Math.round(totalAmountWithoutTax * 100) / 100;

      const billPayload: any = {
        store_id: verifiedStoreId,
        supplier_id: linkedSupplierId,
        supplier_name: cleanSuppName,
        supplier_gstin: cleanGstin || null,
        supplier_address: supplierAddress.trim() || null,
        supplier_contact: supplierContact.trim() || null,
        supplier_email: supplierEmail.trim() || null,
        supplier_fssai: supplierFssai.trim() || null,
        invoice_number: invNo,
        bill_number: invNo,
        invoice_date: invDate,
        bill_date: invDate,
        total_amount: totalAmt,
        grand_total: totalAmt,
        tax_amount: taxAmt,
        total_gst: taxAmt,
        subtotal: subtotalAmt,
        file_url: primaryFileUrl,
        total_items: items.length,
        total_units: totalUnits,
        bill_photo_urls: uploadedFilePaths,
        items_json: items,
        created_at: new Date().toISOString(),
      };

      let savedBillData: any = null;

      if (editingBillId) {
        // Update existing purchase bill scoped by store_id
        const updatePayload: any = {
          supplier_id: linkedSupplierId,
          supplier_name: cleanSuppName,
          supplier_gstin: cleanGstin || null,
          supplier_address: supplierAddress.trim() || null,
          supplier_contact: supplierContact.trim() || null,
          supplier_email: supplierEmail.trim() || null,
          supplier_fssai: supplierFssai.trim() || null,
          invoice_number: invNo,
          bill_number: invNo,
          invoice_date: invDate,
          bill_date: invDate,
          total_amount: totalAmt,
          grand_total: totalAmt,
          tax_amount: taxAmt,
          total_gst: taxAmt,
          subtotal: subtotalAmt,
          total_items: items.length,
          total_units: totalUnits,
          items_json: items,
        };
        if (primaryFileUrl) {
          updatePayload.file_url = primaryFileUrl;
        }
        if (uploadedFilePaths && uploadedFilePaths.length > 0) {
          updatePayload.bill_photo_urls = uploadedFilePaths;
        }

        const { data: updatedBill, error: updateErr } = await supabase
          .from('purchase_bills')
          .update(updatePayload)
          .eq('id', editingBillId)
          .eq('store_id', verifiedStoreId)
          .select('*')
          .single();

        if (updateErr) {
          console.warn('[PurchaseBills] update purchase_bills retry fallback:', updateErr.message);
          const fallbackUpdate = { ...updatePayload };
          delete fallbackUpdate.file_url;
          delete fallbackUpdate.invoice_number;
          delete fallbackUpdate.invoice_date;
          delete fallbackUpdate.total_amount;
          delete fallbackUpdate.tax_amount;
          if (updateErr.message?.includes('supplier_id')) {
            delete fallbackUpdate.supplier_id;
            delete fallbackUpdate.supplier_gstin;
            delete fallbackUpdate.supplier_address;
            delete fallbackUpdate.supplier_contact;
            delete fallbackUpdate.supplier_email;
            delete fallbackUpdate.supplier_fssai;
          }
          const { data: retryUpdated, error: retryErr } = await supabase
            .from('purchase_bills')
            .update(fallbackUpdate)
            .eq('id', editingBillId)
            .eq('store_id', verifiedStoreId)
            .select('*')
            .single();

          if (retryErr) {
            setFeedback({
              type: 'error',
              message: `Failed to update purchase bill: ${retryErr.message}`,
            });
            setIsSavingStock(false);
            return;
          }
          savedBillData = retryUpdated || { id: editingBillId, ...fallbackUpdate };
        } else {
          savedBillData = updatedBill;
        }

        // Delete existing items for this bill scoped strictly by store_id
        await supabase
          .from('purchase_bill_items')
          .delete()
          .eq('purchase_bill_id', editingBillId)
          .eq('store_id', verifiedStoreId);
      } else {
        let { data: insertedBill, error: billErr } = await supabase
          .from('purchase_bills')
          .insert(billPayload)
          .select('*')
          .single();

        if (billErr) {
          // Fallback for column variances (file_url, invoice_number, etc.)
          const fallbackPayload = { ...billPayload };
          delete fallbackPayload.file_url;
          delete fallbackPayload.invoice_number;
          delete fallbackPayload.invoice_date;
          delete fallbackPayload.total_amount;
          delete fallbackPayload.tax_amount;
          if (billErr.message?.includes('supplier_id')) {
            delete fallbackPayload.supplier_id;
            delete fallbackPayload.supplier_gstin;
            delete fallbackPayload.supplier_address;
            delete fallbackPayload.supplier_contact;
            delete fallbackPayload.supplier_email;
            delete fallbackPayload.supplier_fssai;
          }

          const retryBill = await supabase
            .from('purchase_bills')
            .insert(fallbackPayload)
            .select('*')
            .single();

          if (retryBill.error) {
            setFeedback({
              type: 'error',
              message: `Failed to save purchase bill: ${retryBill.error.message}`,
            });
            setIsSavingStock(false);
            return;
          }
          savedBillData = retryBill.data;
        } else {
          savedBillData = insertedBill;
        }
      }

      if (savedBillData) {
        if (editingBillId) {
          setSavedBills((prev) =>
            prev.map((b) => (b.id === editingBillId ? savedBillData : b))
          );
        } else {
          setSavedBills((prev) => [savedBillData, ...prev]);
        }

        // Insert individual item rows into public.purchase_bill_items
        const savedBillId = savedBillData.id;
        if (savedBillId) {
          const billItemRows = items.map((it) => {
            const qty = Number(it.quantity ?? it.qty) || 1;
            const freeQty = Number(it.free_qty) || 0;
            const rate = Number(it.purchase_rate ?? it.price_without_tax ?? it.purchase_price) || 0;
            const gst = Number(it.gst_rate) || 0;
            const disc = Number(it.discount) || 0;
            const mrpVal = Number(it.mrp) > 0 ? Number(it.mrp) : null;
            const taxable = Math.max(0, qty * rate - disc);
            const total = Number(it.total_amount ?? it.amount) || Math.round(taxable * (1 + gst / 100) * 100) / 100;
            const hsn = (it.hsn_code || '').trim();

            return {
              purchase_bill_id: savedBillId,
              store_id: verifiedStoreId,
              item_name: it.item_name || it.name || '',
              name: it.item_name || it.name || '',
              hsn_code: hsn,
              mrp: mrpVal,
              rate: rate,
              purchase_rate: rate,
              quantity: qty,
              free_qty: freeQty,
              unit: it.unit || 'pcs',
              gst_rate: gst,
              discount: disc,
              total: total,
            };
          });

          try {
            const { error: itemsErr } = await supabase
              .from('purchase_bill_items')
              .insert(billItemRows);
            if (itemsErr) {
              console.warn('[PurchaseBills] purchase_bill_items insert notice:', itemsErr.message);
              // Retry with core columns if extra columns differ
              const fallbackRows = billItemRows.map((r) => ({
                purchase_bill_id: r.purchase_bill_id,
                store_id: r.store_id,
                item_name: r.item_name,
                hsn_code: r.hsn_code,
                mrp: r.mrp,
                rate: r.rate,
                quantity: r.quantity,
                gst_rate: r.gst_rate,
                total: r.total,
              }));
              await supabase.from('purchase_bill_items').insert(fallbackRows);
            }
          } catch (itemsCatchErr: any) {
            console.warn('[PurchaseBills] purchase_bill_items exception:', itemsCatchErr?.message);
          }
        }
      }

      // Immediately refresh invoicesLedger and vendorsDirectory state
      fetchSavedBills();
      fetchSuppliers();
      loadExistingStoreCatalogCategories();

      setFeedback({
        type: 'success',
        message: editingBillId
          ? `Purchase Bill #${invNo} updated successfully! Synchronized ${updatedCount} products and added ${createdCount} new products.`
          : `Inventory Synchronized! Added ${createdCount} new products and restocked ${updatedCount} existing products (${totalUnits} total units). Supplier and purchase bill records saved.`,
      });

      // Reset state for next bill
      setEditingBillId(null);
      setItems([]);

      // Remove only the items whose id is in activeExtractedQueueIds, keeping all other uploaded bills in the queue
      if (activeExtractedQueueIds.length > 0) {
        selectedFiles.forEach((f) => {
          if (activeExtractedQueueIds.includes(f.id) && f.previewUrl) {
            URL.revokeObjectURL(f.previewUrl);
          }
        });
        setSelectedFiles((prev) =>
          prev.filter((item) => !activeExtractedQueueIds.includes(item.id))
        );
      } else if (!clubAsSingleBill && selectedFiles.length > 1) {
        const fileToRemove = filesToSave[0];
        if (fileToRemove?.previewUrl) URL.revokeObjectURL(fileToRemove.previewUrl);
        setSelectedFiles((prev) => prev.filter((f) => f.id !== fileToRemove?.id));
      } else {
        clearAllSelectedFiles();
      }

      // Reset activeExtractedQueueIds and clear bill form fields so user can immediately click Extract on next queued bill
      setActiveExtractedQueueIds([]);
      setActiveSeparateFileIndex(0);
      setRawText('');
      setSupplierName('');
      setSupplierGstin('');
      setSupplierAddress('');
      setSupplierContact('');
      setSupplierEmail('');
      setSupplierFssai('');
      setBillNumber('');
      setBillDate(new Date().toISOString().slice(0, 10));
      fetchSavedBills();
      loadExistingStoreCatalogCategories();
      fetchSuppliers();
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

  // Inspect Bill Details & resolve viewing URLs for PDFs/images via Cloudflare R2
  const handleOpenBillDetails = async (bill: PurchaseBillRecord) => {
    setDetailsModalBill(bill);
    setModalResolvedUrls([]);
    setLoadingSignedUrls(true);
    setViewerZoom(1);
    setViewerRotation(0);
    setActiveViewerDocIndex(0);

    const paths: string[] = [];
    if ((bill as any).file_url) {
      paths.push((bill as any).file_url);
    }
    if (bill.bill_photo_urls && Array.isArray(bill.bill_photo_urls)) {
      bill.bill_photo_urls.forEach((p) => {
        if (!paths.includes(p)) paths.push(p);
      });
    }

    const resolvedList: Array<{ name: string; url: string; isPdf: boolean }> = [];

    for (const path of paths) {
      const isPdf = path.toLowerCase().endsWith('.pdf') || path.toLowerCase().includes('.pdf?');
      const cleanFileName = path.split('/').pop()?.split('?')[0] || 'Invoice Document';

      // 1. If it's already a full HTTP/HTTPS URL, use directly
      if (path.startsWith('http://') || path.startsWith('https://')) {
        resolvedList.push({ name: cleanFileName, url: path, isPdf });
        continue;
      }

      // 2. Otherwise request presigned viewing URL from Cloudflare R2
      try {
        const viewRes = await fetch('/api/r2-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'view',
            key: path,
          }),
        });

        if (viewRes.ok) {
          const viewData = await viewRes.json();
          if (viewData?.url || viewData?.downloadUrl) {
            resolvedList.push({
              name: cleanFileName,
              url: viewData.url || viewData.downloadUrl,
              isPdf,
            });
            continue;
          }
        }
      } catch (r2ViewErr: any) {
        console.warn('[PurchaseBills] R2 presigned view URL error:', r2ViewErr.message);
      }

      // Fallback: push key directly so the link is not dead
      resolvedList.push({ name: cleanFileName, url: path, isPdf });
    }

    // If bill does not have items_json or it is empty, attempt to fetch from purchase_bill_items
    if ((!bill.items_json || bill.items_json.length === 0) && bill.id) {
      try {
        const { data: dbItems } = await supabase
          .from('purchase_bill_items')
          .select('*')
          .eq('purchase_bill_id', bill.id);
        if (dbItems && dbItems.length > 0) {
          bill.items_json = dbItems.map((di: any) => ({
            item_name: di.item_name,
            name: di.item_name,
            hsn_code: di.hsn_code,
            mrp: di.mrp,
            purchase_rate: di.rate,
            purchase_price: di.rate,
            price_without_tax: di.rate,
            quantity: di.quantity,
            qty: di.quantity,
            free_qty: di.free_qty || 0,
            discount: di.discount || 0,
            gst_rate: di.gst_rate,
            total_amount: di.total,
            amount: di.total,
            total: di.total,
            unit: di.unit || 'PCS',
          }));
          setDetailsModalBill({ ...bill });
        }
      } catch (e) {
        console.warn('[PurchaseBills] Error fetching bill line items:', e);
      }
    }

    setModalResolvedUrls(resolvedList);
    setLoadingSignedUrls(false);
  };

  return (
    <div className="space-y-6">

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

      {/* FULL-WIDTH ACTIVE PURCHASE VIEW (Driven by App.tsx sidebar activeSubTab) */}
      <div className="w-full space-y-6">
        {hubTab === 'new-purchase' && (
          <div className="space-y-6">
            {/* Editing Inward Bill Banner */}
            {editingBillId && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Editing Inward Bill #{billNumber || editingBillId}
                    </h4>
                    <p className="text-[11px] text-amber-700">
                      Review or update line items and supplier details. Saving will update this bill and refresh inward inventory.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEditBill}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors shadow-2xs self-start sm:self-auto shrink-0"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            {/* TOP UPLOAD CARD: "Invoice Upload Drop-Zone & Mobile Camera Sync" */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] shrink-0">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Invoice Upload Drop-Zone & Mobile Camera Sync
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Scan phone camera stream or drop multi-page wholesale PDF invoices into Cloudflare R2
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleBill}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                    title="Load sample FMCG distributor bill"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#4338CA]" />
                    <span className="hidden sm:inline">Load Sample Bill</span>
                  </button>

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
                        Drop-Zone & QR
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
                </div>

                {inputMode === 'upload' ? (
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Side-by-side 2-column action boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Box: Scan via Phone QR Code */}
                      <div
                        onClick={handleOpenPhoneQrModal}
                        className="p-5 rounded-2xl border-2 border-dashed border-teal-300 hover:border-[#0D9488] bg-teal-50/25 hover:bg-teal-50/50 cursor-pointer transition-all space-y-3 flex flex-col justify-between group shadow-2xs"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0D9488] group-hover:scale-105 transition-transform shadow-2xs">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center gap-1 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" />
                              Live Sync
                            </span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-[#0D9488] transition-colors">
                              Scan via Phone QR Code
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Open your mobile camera to snap multi-page bills. Photos queue and stream straight to desktop in real time.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPhoneQrModal();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-teal-50 text-[#0D9488] border border-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Scan via Phone QR</span>
                        </button>
                      </div>

                      {/* Right Box: Upload Bill Photos / PDF (Multi-File) */}
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
                        className={`p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all space-y-3 flex flex-col justify-between group shadow-2xs ${
                          isDragOver
                            ? 'border-[#4338CA] bg-indigo-50/50'
                            : 'border-slate-300 hover:border-[#4338CA] bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] group-hover:scale-105 transition-transform shadow-2xs">
                              <Upload className="w-5 h-5" />
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 text-[#4338CA] border border-indigo-200 shadow-2xs">
                              Multi-File R2
                            </span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#0F172A] group-hover:text-[#4338CA] transition-colors">
                              Upload Bill Photos / PDF (Multi-File)
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              Drag & drop wholesale invoice PDFs, bill captures, or receipts into Cloudflare R2 storage (nivopos-media).
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-indigo-50 text-[#4338CA] border border-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Browse Files from PC</span>
                        </button>
                      </div>
                    </div>

                    {/* Uploaded Bills Queue (X bills / X pages) bar */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F172A]">
                            Uploaded Bills Queue ({selectedFiles.length} {selectedFiles.length === 1 ? 'bill/page' : 'bills/pages'})
                          </span>
                          {clubAsSingleBill && selectedFiles.length > 1 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-[#4338CA] border border-indigo-200">
                              {selectedFiles.length} pages clubbed
                            </span>
                          )}
                        </div>

                        {selectedFiles.length > 0 && (
                          <div className="flex items-center gap-2">
                            {/* Toggle: Club pages as 1 bill vs Separate bills */}
                            <div className="inline-flex rounded-xl p-0.5 bg-slate-200/80 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setClubAsSingleBill(true)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                  clubAsSingleBill
                                    ? 'bg-[#4338CA] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Club all pages into a single multi-page bill"
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Club as 1 Bill</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setClubAsSingleBill(false)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                                  !clubAsSingleBill
                                    ? 'bg-[#4338CA] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Treat each page as a separate distinct bill"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Separate Bills</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={clearAllSelectedFiles}
                              className="text-[11px] text-rose-600 hover:underline font-semibold ml-1"
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Mode Explainer Sub-Banner */}
                      {selectedFiles.length > 1 && (
                        <div className="flex items-center justify-between text-[11px] px-1 text-slate-600">
                          {clubAsSingleBill ? (
                            <span className="flex items-center gap-1.5 text-[#4338CA] font-medium">
                              <Layers className="w-3.5 h-3.5 shrink-0" />
                              <span>Multi-Page Clubbing: All {selectedFiles.length} pages will be extracted together under 1 bill record.</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <FileText className="w-3.5 h-3.5 text-[#4338CA] shrink-0" />
                              <span>Separate Mode: Select a bill card below to extract, or click "Extract This Bill" directly on any item.</span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Queue List */}
                      {selectedFiles.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500">
                          Queue is empty. Drop wholesale invoices or scan via Phone QR above to queue bills.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {selectedFiles.map((fileInfo, idx) => {
                            const isSelectedSeparate = !clubAsSingleBill && activeSeparateFileIndex === idx;
                            const isExtracted = activeExtractedQueueIds.includes(fileInfo.id);

                            return (
                              <div
                                key={fileInfo.id}
                                onClick={() => {
                                  if (!clubAsSingleBill) setActiveSeparateFileIndex(idx);
                                }}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                                  isExtracted
                                    ? 'border-teal-300 bg-teal-50/40 ring-1 ring-teal-200 shadow-xs cursor-pointer'
                                    : isSelectedSeparate
                                    ? 'border-[#4338CA] bg-indigo-50/50 ring-2 ring-indigo-200 shadow-xs cursor-pointer'
                                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {fileInfo.type === 'pdf' ? (
                                    <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center">
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
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {clubAsSingleBill ? (
                                        <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-[#4338CA] text-white">
                                          Page {idx + 1}
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-slate-100 text-slate-700 border border-slate-200">
                                          Bill #{idx + 1}
                                        </span>
                                      )}
                                      <p className="font-semibold text-[#0F172A] truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                                        {fileInfo.name}
                                      </p>
                                      {isExtracted && (
                                        <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center gap-1 shadow-2xs">
                                          <CheckCircle2 className="w-2.5 h-2.5 text-[#0D9488]" />
                                          <span>Extracted</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
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
                                      {fileInfo.r2PublicUrl && (
                                        <span className="text-[#0D9488] font-mono font-semibold">
                                          Synced (R2)
                                        </span>
                                      )}
                                      {!clubAsSingleBill && (
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                            isSelectedSeparate
                                              ? 'bg-[#4338CA] text-white'
                                              : 'text-slate-400 bg-slate-100'
                                          }`}
                                        >
                                          {isSelectedSeparate ? '● Selected for Extraction' : 'Click to select'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  {/* Per-card Extract action */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSeparateFileIndex(idx);
                                      setActiveExtractedQueueIds([fileInfo.id]);
                                      handleParseBill(idx);
                                    }}
                                    disabled={isParsing}
                                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50 ${
                                      isExtracted
                                        ? 'bg-teal-50 hover:bg-teal-100 text-[#0D9488] border-teal-200'
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-[#4338CA] border border-indigo-200'
                                    }`}
                                    title={clubAsSingleBill ? "Extract this page only" : "Extract this bill"}
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">
                                      {isExtracted ? 'Re-extract' : (clubAsSingleBill ? 'Extract This Page' : 'Extract This Bill')}
                                    </span>
                                  </button>

                                  {/* Page reordering when clubbed */}
                                  {clubAsSingleBill && selectedFiles.length > 1 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveSelectedFile(idx, 'up');
                                        }}
                                        disabled={idx === 0}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                                        title="Move up"
                                      >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveSelectedFile(idx, 'down');
                                        }}
                                        disabled={idx === selectedFiles.length - 1}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 transition-colors"
                                        title="Move down"
                                      >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {/* Discard / Remove unwanted page */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeSelectedFile(fileInfo.id);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                                    title="Discard / Remove this page from queue"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Primary Extraction Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const targetFiles =
                            clubAsSingleBill || selectedFiles.length <= 1
                              ? selectedFiles
                              : [selectedFiles[Math.min(activeSeparateFileIndex, selectedFiles.length - 1)]];
                          setActiveExtractedQueueIds(targetFiles.map((f) => f.id));
                          handleParseBill();
                        }}
                        disabled={isParsing || selectedFiles.length === 0}
                        className="w-full py-3.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                        {isParsing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{parsingStatusText || 'Extracting Bill Items (Groq AI)...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>
                              {clubAsSingleBill && selectedFiles.length > 1
                                ? `Extract All ${selectedFiles.length} Pages as 1 Combined Bill (Groq AI)`
                                : !clubAsSingleBill && selectedFiles.length > 1
                                ? `Extract Selected Bill #${activeSeparateFileIndex + 1} (${selectedFiles[Math.min(activeSeparateFileIndex, selectedFiles.length - 1)]?.name || ''}) (Groq AI)`
                                : 'Extract Products & Seller Details (Groq AI)'}
                            </span>
                          </>
                        )}
                      </button>

                      {/* Subtle Footer Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                          <Sparkles className="w-3.5 h-3.5 text-[#4338CA]" />
                          <span>Powered by Groq Vision LPU OCR</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Ultra-Fast LPU Vision • Pure Raw Extraction
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                    <button
                      type="button"
                      onClick={() => handleParseBill()}
                      disabled={isParsing || !rawText.trim()}
                      className="w-full py-3 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{parsingStatusText || 'Extracting Text (Groq AI)...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Extract Products & Seller from Text (Groq AI)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
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
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const availableSubCats = item.category
                      ? storeSubCategories[item.category] || []
                      : [];

                    const qNum = parseFloat(String(item.quantity ?? item.qty ?? 0)) || 0;
                    const freeQtyNum = parseFloat(String(item.free_qty ?? 0)) || 0;
                    const totalReceivedUnits = qNum + freeQtyNum;
                    const rNum = parseFloat(String(item.price_without_tax ?? item.purchase_price ?? item.purchase_rate ?? 0)) || 0;
                    const dNum = parseFloat(String(item.discount ?? 0)) || 0;
                    const gstNum = Number(item.gst_rate) || 0;
                    const mrpNum = parseFloat(String(item.mrp ?? 0)) || 0;
                    const buyInclTaxNum =
                      parseFloat(String(item.price_after_tax ?? 0)) ||
                      Math.round(rNum * (1 + gstNum / 100) * 100) / 100;

                    const grossCalc = Math.round(qNum * rNum * 100) / 100;
                    const totalExclTax = Math.max(0, Math.round((grossCalc - dNum) * 100) / 100);
                    const totalInclTax = Math.round(totalExclTax * (1 + gstNum / 100) * 100) / 100;

                    const effectiveUnitInclTax = totalReceivedUnits > 0
                      ? Math.round((totalInclTax / totalReceivedUnits) * 100) / 100
                      : (qNum > 0 ? Math.round((totalInclTax / qNum) * 100) / 100 : buyInclTaxNum);

                    const marginPct =
                      mrpNum > 0
                        ? Math.round((((mrpNum - effectiveUnitInclTax) / mrpNum) * 100) * 10) / 10
                        : null;

                    const rawBillTotal =
                      item.bill_line_total !== undefined &&
                      item.bill_line_total !== null &&
                      item.bill_line_total !== ''
                        ? parseFloat(String(item.bill_line_total))
                        : null;

                    let isMismatch = false;
                    let calcExpected = totalInclTax;
                    if (rawBillTotal !== null && !isNaN(rawBillTotal) && rawBillTotal > 0 && qNum > 0 && rNum > 0) {
                      const diffIncl = Math.abs(rawBillTotal - totalInclTax);
                      const diffTaxable = Math.abs(rawBillTotal - totalExclTax);
                      if (diffIncl > 1.0 && diffTaxable > 1.0) {
                        isMismatch = true;
                        calcExpected = diffIncl <= diffTaxable ? totalInclTax : totalExclTax;
                      }
                    }

                    return (
                      <div
                        key={item.id || index}
                        className={`p-3.5 rounded-2xl bg-white border ${
                          isMismatch
                            ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                            : 'border-slate-200'
                        } shadow-xs space-y-2.5 hover:border-indigo-200 transition-all text-xs`}
                      >
                        {/* Math Mismatch Warning Badge if bill_line_total differs */}
                        {isMismatch && (
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[#D97706] text-xs">
                            <div className="flex items-center gap-1.5 font-bold">
                              <AlertCircle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                              <span>Check Math: Bill ₹{rawBillTotal} vs Calc ₹{calcExpected}</span>
                            </div>
                            <span className="text-[10px] text-amber-700 font-medium hidden sm:inline">
                              Printed bill line total differs from Total Incl. Tax (₹{totalInclTax})
                            </span>
                          </div>
                        )}

                        {/* Row 1: Item Name, HSN Code, Barcode & Delete */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-1 text-[11px] font-bold text-slate-400 font-mono">
                            #{index + 1}
                          </div>

                          <div className="sm:col-span-6">
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

                          <div className="sm:col-span-2">
                            <div className="relative">
                              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                              <input
                                type="text"
                                value={item.hsn_code || ''}
                                onChange={(e) =>
                                  updateItem(item.id || '', 'hsn_code', e.target.value)
                                }
                                placeholder="HSN/SAC"
                                maxLength={8}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-2 py-1.5 text-xs font-mono text-slate-700 focus:bg-white focus:outline-none focus:border-[#4338CA]"
                                title="4–8 digit HSN/SAC code"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <div className="relative">
                              <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                              <input
                                type="text"
                                value={item.barcode || ''}
                                onChange={(e) =>
                                  updateItem(item.id || '', 'barcode', e.target.value)
                                }
                                placeholder="Barcode"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-2 py-1.5 text-xs font-mono text-slate-700 focus:bg-white focus:outline-none focus:border-[#4338CA]"
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2 items-end pt-1 border-t border-slate-100 font-mono">
                          {/* Qty */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Qty
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.quantity !== undefined && item.quantity !== null
                                  ? item.quantity
                                  : (item.qty !== undefined && item.qty !== null ? item.qty : '')
                              }
                              onChange={(e) =>
                                updateItem(item.id || '', 'quantity', e.target.value)
                              }
                              placeholder=""
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-1 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#4338CA]"
                            />
                          </div>

                          {/* Free Qty */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Free Qty
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.free_qty !== undefined && item.free_qty !== null
                                  ? item.free_qty
                                  : ''
                              }
                              onChange={(e) =>
                                updateItem(item.id || '', 'free_qty', e.target.value)
                              }
                              placeholder="0"
                              title={freeQtyNum > 0 ? `Free Scheme Quantity: +${freeQtyNum} free units` : 'Free Scheme Quantity (e.g. 108+12)'}
                              className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-1 text-xs text-[#0D9488] font-bold focus:bg-white focus:outline-none focus:border-[#0D9488]"
                            />
                          </div>

                          {/* Buy Rate (Excl Tax) */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Buy Excl. Tax (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.price_without_tax !== undefined && item.price_without_tax !== null
                                  ? item.price_without_tax
                                  : (item.purchase_price !== undefined && item.purchase_price !== null
                                      ? item.purchase_price
                                      : '')
                              }
                              onChange={(e) =>
                                updateItem(item.id || '', 'price_without_tax', e.target.value)
                              }
                              placeholder=""
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#4338CA]"
                            />
                          </div>

                          {/* Discount (₹) */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Disc (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.discount !== undefined && item.discount !== null
                                  ? item.discount
                                  : ''
                              }
                              onChange={(e) =>
                                updateItem(item.id || '', 'discount', e.target.value)
                              }
                              placeholder=""
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#4338CA]"
                            />
                          </div>

                          {/* Discount % */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Disc %
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.discount_percent !== undefined && item.discount_percent !== null
                                  ? item.discount_percent
                                  : ''
                              }
                              onChange={(e) =>
                                updateItem(item.id || '', 'discount_percent', e.target.value)
                              }
                              placeholder=""
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#4338CA]"
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
                              type="text"
                              inputMode="decimal"
                              value={
                                freeQtyNum > 0 && effectiveUnitInclTax > 0
                                  ? String(effectiveUnitInclTax)
                                  : (item.price_after_tax !== undefined && item.price_after_tax !== null && item.price_after_tax !== ''
                                      ? item.price_after_tax
                                      : (effectiveUnitInclTax > 0 ? String(effectiveUnitInclTax) : ''))
                              }
                              onChange={(e) =>
                                updateItem(item.id || '', 'price_after_tax', e.target.value)
                              }
                              placeholder=""
                              title={freeQtyNum > 0 ? `Effective Landing Cost: ₹${effectiveUnitInclTax} (factoring in ${freeQtyNum} free units)` : 'Buy Rate Incl. Tax'}
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-[#0D9488] font-bold focus:bg-white focus:outline-none focus:border-[#0D9488]"
                            />
                          </div>

                          {/* MRP / Sell */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              MRP / Sell (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.mrp !== null && item.mrp !== undefined ? item.mrp : ''}
                              onChange={(e) =>
                                updateItem(item.id || '', 'mrp', e.target.value)
                              }
                              placeholder=""
                              className="w-full text-right bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-[#4338CA] font-bold focus:bg-white focus:outline-none focus:border-[#4338CA]"
                            />
                          </div>

                          {/* Total Excl. Tax (₹) */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Total Excl. (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={
                                item.amount !== undefined && item.amount !== null
                                  ? item.amount
                                  : (item.total_amount !== undefined && item.total_amount !== null
                                      ? item.total_amount
                                      : '')
                              }
                              onChange={(e) =>
                                updateItem(item.id || '', 'amount', e.target.value)
                              }
                              placeholder=""
                              className="w-full text-right bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-[#4338CA]"
                            />
                          </div>

                          {/* Total Incl. Tax (₹) */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Total Incl. (₹)
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={totalInclTax > 0 ? totalInclTax.toFixed(2) : ''}
                              placeholder="—"
                              className="w-full text-right bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs text-[#0D9488] font-bold focus:outline-none cursor-default"
                            />
                          </div>

                          {/* Margin % */}
                          <div>
                            <label className="block text-[9px] font-bold uppercase font-sans text-slate-400 mb-0.5">
                              Margin %
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={marginPct !== null ? `${marginPct}%` : ''}
                              placeholder="—"
                              className={`w-full text-center border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none cursor-default ${
                                marginPct === null
                                  ? 'bg-slate-50 border-slate-200 text-slate-400'
                                  : marginPct >= 0
                                  ? 'bg-teal-50/60 border-teal-200 text-[#0D9488]'
                                  : 'bg-rose-50 border-rose-200 text-rose-600'
                              }`}
                              title={
                                marginPct !== null
                                  ? `Margin: ${marginPct}% (Net Landing Cost: ₹${effectiveUnitInclTax.toFixed(2)}, MRP: ₹${mrpNum.toFixed(2)})`
                                  : 'Enter MRP to calculate margin %'
                              }
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
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {editingBillId && (
                <button
                  type="button"
                  onClick={handleCancelEditBill}
                  className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-200 shrink-0"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveToStoreStock}
                disabled={isSavingStock || items.length === 0}
                className="w-full flex-1 py-3.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isSavingStock ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synchronizing Suppliers & Product Master...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>
                      {editingBillId
                        ? `Update Purchase Bill #${billNumber || editingBillId} (${items.length} Items)`
                        : `+ Inward to Product Master & Save Bill (${items.length} Items)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* HUB TAB 2: INVOICES LEDGER */}
      {hubTab === 'ledger' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#4338CA]" />
                  <span>Invoices Ledger</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-[#4338CA] border border-indigo-200">
                  {savedBills.length} {savedBills.length === 1 ? 'invoice' : 'invoices'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Audit trail of inward wholesale invoices, attached documents, and verified stock entries
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setHubTab('new-purchase')}
                className="px-3 py-1.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Inward New Bill</span>
              </button>
              <button
                type="button"
                onClick={fetchSavedBills}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                title="Refresh invoices"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSavedBills ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search Filter Strip */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={ledgerSearchQuery}
                onChange={(e) => setLedgerSearchQuery(e.target.value)}
                placeholder="Search ledger by supplier name, invoice #, or GSTIN..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
              />
            </div>
            {ledgerSearchQuery && (
              <button
                type="button"
                onClick={() => setLedgerSearchQuery('')}
                className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-900 font-semibold"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Table or Empty State */}
          {savedBills.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">No Inward Invoices Recorded Yet</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Scan or upload your first distributor invoice to create an entry in the ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHubTab('new-purchase')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4338CA] text-white text-xs font-bold shadow-2xs hover:bg-[#3730A3]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Inward First Bill</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Invoice #</th>
                    <th className="py-3 px-3">Supplier / Vendor</th>
                    <th className="py-3 px-3">GSTIN</th>
                    <th className="py-3 px-3 text-center">Items</th>
                    <th className="py-3 px-3 text-right">Taxable</th>
                    <th className="py-3 px-3 text-right">GST</th>
                    <th className="py-3 px-3 text-right">Grand Total</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedBills
                    .filter((bill) => {
                      if (!ledgerSearchQuery.trim()) return true;
                      const q = ledgerSearchQuery.toLowerCase();
                      return (
                        (bill.supplier_name || '').toLowerCase().includes(q) ||
                        (bill.bill_number || (bill as any).invoice_number || '').toLowerCase().includes(q) ||
                        (bill.supplier_gstin || (bill as any).gstin || '').toLowerCase().includes(q)
                      );
                    })
                    .map((bill) => {
                      const invoiceNum = bill.bill_number || (bill as any).invoice_number || '—';
                      const vendorName = bill.supplier_name || (bill as any).seller_name || 'Vendor';
                      const gstinVal = bill.supplier_gstin || (bill as any).gstin || '';
                      const itemsCount = bill.total_items || (bill.items_json || []).length || 0;
                      const grandTotalVal = Number(bill.grand_total ?? (bill as any).total_amount ?? 0);
                      const gstVal = Number(bill.total_gst ?? (bill as any).tax_amount ?? 0);
                      const taxableVal = Number(bill.subtotal ?? (grandTotalVal - gstVal));

                      return (
                        <tr
                          key={bill.id || bill.created_at}
                          onClick={() => handleOpenBillDetails(bill)}
                          className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">
                            {bill.bill_date || (bill as any).invoice_date || bill.created_at?.slice(0, 10)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#4338CA] text-[11px] whitespace-nowrap">
                            {invoiceNum}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-[#0F172A] block">
                              {vendorName}
                            </span>
                            {bill.supplier_address && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[200px] block">
                                {bill.supplier_address}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                            {gstinVal ? (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                                {gstinVal}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                              {itemsCount} items
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            ₹{taxableVal.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-[#0D9488]">
                            +₹{gstVal.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-[#0F172A] text-[13px]">
                            ₹{grandTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBillDetails(bill);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition-colors border border-slate-200"
                                title="View Bill Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditBill(bill);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#4338CA] font-bold text-xs inline-flex items-center gap-1 transition-colors border border-indigo-200"
                                title="Edit Inward Bill"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteBill(bill);
                                }}
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-nivo-rose font-bold text-xs inline-flex items-center transition-colors border border-rose-200"
                                title="Delete Bill"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HUB TAB 3: VENDORS DIRECTORY */}
      {hubTab === 'vendors' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#4338CA]" />
                  <span>Vendors Directory</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-50 text-[#0D9488] border border-teal-200">
                  {suppliersList.length} verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Distributors, FMCG companies, and local stockists synchronized from your inward bills
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setHubTab('new-purchase')}
                className="px-3 py-1.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Inward Bill from Vendor</span>
              </button>
              <button
                type="button"
                onClick={fetchSuppliers}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                title="Refresh vendors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSuppliers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search Filter Strip */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={vendorSearchQuery}
                onChange={(e) => setVendorSearchQuery(e.target.value)}
                placeholder="Search vendors by name, GSTIN, phone, or address..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
              />
            </div>
            {vendorSearchQuery && (
              <button
                type="button"
                onClick={() => setVendorSearchQuery('')}
                className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-900 font-semibold"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Vendors Table or Empty State */}
          {suppliersList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0D9488] mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">No Vendors Registered Yet</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vendors are automatically created and updated whenever you scan or inward a wholesale bill.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHubTab('new-purchase')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4338CA] text-white text-xs font-bold shadow-2xs hover:bg-[#3730A3]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Inward First Bill</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Vendor / Wholesaler</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3 text-center">FSSAI License</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliersList
                    .filter((s) => {
                      if (!vendorSearchQuery.trim()) return true;
                      const q = vendorSearchQuery.toLowerCase();
                      return (
                        (s.name || '').toLowerCase().includes(q) ||
                        (s.gstin || '').toLowerCase().includes(q) ||
                        (s.phone || s.contact || '').toLowerCase().includes(q) ||
                        (s.email || '').toLowerCase().includes(q) ||
                        (s.address || '').toLowerCase().includes(q)
                      );
                    })
                    .map((supplier) => (
                      <tr key={supplier.id || supplier.name} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#0F172A] block">
                            {supplier.name}
                          </span>
                          {supplier.email && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-2.5 h-2.5" />
                              {supplier.email}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {supplier.gstin ? (
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[#0D9488] font-mono font-semibold text-[11px]">
                              {supplier.gstin}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Unregistered</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {supplier.phone || supplier.contact || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {supplier.address || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                          {supplier.fssai || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditSupplierModal(supplier)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                              title="Edit Vendor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(supplier)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-nivo-rose border border-rose-200 transition-colors"
                              title="Delete Vendor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLedgerSearchQuery(supplier.name);
                                setHubTab('ledger');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors border border-slate-200"
                              title="View invoices from this supplier"
                            >
                              Invoices
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSupplierName(supplier.name);
                                if (supplier.gstin) setSupplierGstin(supplier.gstin);
                                if (supplier.address) setSupplierAddress(supplier.address);
                                if (supplier.phone || supplier.contact)
                                  setSupplierContact(supplier.phone || supplier.contact || '');
                                if (supplier.email) setSupplierEmail(supplier.email);
                                if (supplier.fssai) setSupplierFssai(supplier.fssai);
                                setHubTab('new-purchase');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#4338CA] border border-indigo-200 text-[11px] font-bold transition-colors"
                              title="Inward new bill from this supplier"
                            >
                              + Inward Bill
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* HUB TAB 4: SALE RETURN / DEBIT NOTE */}
      {hubTab === 'debit-note' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-[#4338CA]" />
                  <span>Sale Return / Debit Note (Purchase Return)</span>
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 font-mono">
                  Audit Tracked
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Issue debit notes to distributors for expired stock, damaged packages, or rate adjustments
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDebitNoteSupplier(suppliersList[0]?.name || '');
                setDebitNoteInvoiceNo('');
                setDebitNoteReason('Damaged Goods / Expiry');
                setDebitNoteAmount('');
                setDebitNoteRemarks('');
                setDebitNoteModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Issue Debit Note</span>
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Total Debit Notes
              </span>
              <p className="text-base font-bold text-[#0F172A] font-mono">
                {debitNotes.length}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Total Claimed Value
              </span>
              <p className="text-base font-bold text-[#4338CA] font-mono">
                ₹{debitNotes.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Suppliers Impacted
              </span>
              <p className="text-base font-bold text-[#0D9488] font-mono">
                {new Set(debitNotes.map((d) => d.supplierName)).size}
              </p>
            </div>
          </div>

          {/* Debit Notes Table or Empty State */}
          {debitNotes.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">No Debit Notes Issued Yet</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Issue debit notes against distributor invoices for damaged goods or price discrepancies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDebitNoteSupplier(suppliersList[0]?.name || '');
                  setDebitNoteInvoiceNo('');
                  setDebitNoteReason('Damaged Goods / Expiry');
                  setDebitNoteAmount('');
                  setDebitNoteRemarks('');
                  setDebitNoteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4338CA] text-white text-xs font-bold shadow-2xs hover:bg-[#3730A3]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue First Debit Note</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Ref Invoice #</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-right">Debit Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {debitNotes.map((dn) => (
                    <tr key={dn.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono text-slate-700">{dn.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{dn.supplierName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {dn.invoiceNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{dn.reason}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-mono">
                        -₹{(dn.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#0D9488] border border-teal-200">
                          {dn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

  {/* ================= ISSUE DEBIT NOTE MODAL ================= */}
  {debitNoteModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl my-auto space-y-4 text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Issue Purchase Debit Note</h3>
              <p className="text-[11px] text-slate-500">Debit wholesaler for damaged items or price differences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDebitNoteModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Supplier / Wholesaler *
            </label>
            {suppliersList.length > 0 ? (
              <select
                value={debitNoteSupplier}
                onChange={(e) => setDebitNoteSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
              >
                {suppliersList.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name} {s.gstin ? `(${s.gstin})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={debitNoteSupplier}
                onChange={(e) => setDebitNoteSupplier(e.target.value)}
                placeholder="Enter supplier name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Invoice # Ref (Optional)
              </label>
              <input
                type="text"
                value={debitNoteInvoiceNo}
                onChange={(e) => setDebitNoteInvoiceNo(e.target.value)}
                placeholder="e.g. INV-98421"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#4338CA]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Debit Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={debitNoteAmount}
                onChange={(e) => setDebitNoteAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-[#4338CA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Reason for Debit
            </label>
            <select
              value={debitNoteReason}
              onChange={(e) => setDebitNoteReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
            >
              <option value="Damaged Goods / Expiry">Damaged Goods / Expiry</option>
              <option value="Rate Difference / Overcharge">Rate Difference / Overcharge</option>
              <option value="Short Quantity Delivery">Short Quantity Delivery</option>
              <option value="Product Return to Stockist">Product Return to Stockist</option>
              <option value="Other Commercial Adjustment">Other Commercial Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
              Remarks / Description
            </label>
            <textarea
              rows={2}
              value={debitNoteRemarks}
              onChange={(e) => setDebitNoteRemarks(e.target.value)}
              placeholder="e.g. 5 packets leaked during transit, deducted from wholesaler payment"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setDebitNoteModalOpen(false)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!debitNoteSupplier.trim()) {
                setFeedback({ type: 'error', message: 'Please specify supplier name.' });
                return;
              }
              const amt = parseFloat(debitNoteAmount);
              if (isNaN(amt) || amt <= 0) {
                setFeedback({ type: 'error', message: 'Please enter a valid debit amount.' });
                return;
              }
              const newDebitNote = {
                id: crypto.randomUUID(),
                date: new Date().toISOString().slice(0, 10),
                supplierName: debitNoteSupplier.trim(),
                invoiceNumber: debitNoteInvoiceNo.trim(),
                reason: debitNoteReason,
                amount: amt,
                remarks: debitNoteRemarks.trim(),
                status: 'Issued',
              };
              setDebitNotes((prev) => [newDebitNote, ...prev]);
              setDebitNoteModalOpen(false);
              setFeedback({
                type: 'success',
                message: `Debit note of ₹${amt.toLocaleString('en-IN')} issued to ${debitNoteSupplier}!`,
              });
            }}
            className="px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold shadow-xs transition-colors"
          >
            Save & Record Debit Note
          </button>
        </div>
      </div>
    </div>
  )}

      {/* ================= PURCHASE BILL DETAILS SPLIT-SCREEN MODAL (JAL JEEVAN HUB VIEWER) ================= */}
      {detailsModalBill && (() => {
        const lineItems = (detailsModalBill.items_json && detailsModalBill.items_json.length > 0)
          ? detailsModalBill.items_json
          : (detailsModalBill as any).items || [];

        const totalTaxable = lineItems.reduce((acc: number, item: any) => {
          const qty = Number(item.quantity ?? item.qty ?? 1);
          const rate = Number(item.purchase_rate ?? item.rate ?? item.purchase_price ?? item.price_without_tax ?? 0);
          const disc = Number(item.discount ?? 0);
          const taxable = Number(item.price_without_tax ? item.price_without_tax * qty : Math.max(0, rate * qty - disc));
          return acc + taxable;
        }, 0) || Number(detailsModalBill.subtotal || 0);

        const totalTax = lineItems.reduce((acc: number, item: any) => {
          const qty = Number(item.quantity ?? item.qty ?? 1);
          const rate = Number(item.purchase_rate ?? item.rate ?? item.purchase_price ?? item.price_without_tax ?? 0);
          const disc = Number(item.discount ?? 0);
          const taxable = Number(item.price_without_tax ? item.price_without_tax * qty : Math.max(0, rate * qty - disc));
          const gstRate = Number(item.gst_rate ?? 0);
          return acc + (taxable * (gstRate / 100));
        }, 0) || Number(detailsModalBill.total_gst ?? (detailsModalBill as any).tax_amount ?? 0);

        const grandTotal = Number(detailsModalBill.grand_total ?? (detailsModalBill as any).total_amount ?? (totalTaxable + totalTax));
        const totalUnits = lineItems.reduce((acc: number, it: any) => {
          const q = Number(it.quantity ?? it.qty ?? 0);
          const fq = Number(it.free_qty ?? 0);
          return acc + q + fq;
        }, 0) || Number(detailsModalBill.total_units || 0);

        const activeDoc = modalResolvedUrls[activeViewerDocIndex] || null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-700/40 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-[97vw] h-[94vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
              {/* 1. Modal Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A] leading-tight">
                        {detailsModalBill.supplier_name || (detailsModalBill as any).seller_name || 'Vendor Invoice'}
                      </h3>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-[#4338CA] border border-indigo-200">
                        Invoice #{detailsModalBill.bill_number || (detailsModalBill as any).invoice_number || 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {detailsModalBill.bill_date || (detailsModalBill as any).invoice_date || detailsModalBill.created_at?.slice(0, 10)}
                      </span>
                      {(detailsModalBill.supplier_gstin || (detailsModalBill as any).gstin) && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
                          GSTIN: {detailsModalBill.supplier_gstin || (detailsModalBill as any).gstin}
                        </span>
                      )}
                      {(detailsModalBill.supplier_contact || (detailsModalBill as any).phone) && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {detailsModalBill.supplier_contact || (detailsModalBill as any).phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Grand Total
                    </span>
                    <span className="text-xl font-black text-[#0D9488] font-mono">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const billToEdit = detailsModalBill;
                        setDetailsModalBill(null);
                        handleEditBill(billToEdit);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#4338CA] border border-indigo-200 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                      title="Edit this purchase bill"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const billToDelete = detailsModalBill;
                        setDetailsModalBill(null);
                        handleDeleteBill(billToDelete);
                      }}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-nivo-rose border border-rose-200 text-xs font-bold inline-flex items-center transition-colors"
                      title="Delete this purchase bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailsModalBill(null)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 2. Split-Screen Body */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                {/* Left Pane (Archived Bill Document Viewer) */}
                <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/60 overflow-hidden">
                  {/* Left Toolbar */}
                  <div className="px-4 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#4338CA]" />
                        <span>Archived Bill</span>
                      </span>
                      {modalResolvedUrls.length > 1 && (
                        <div className="flex items-center gap-1 ml-2">
                          {modalResolvedUrls.map((_, dIdx) => (
                            <button
                              key={dIdx}
                              type="button"
                              onClick={() => {
                                setActiveViewerDocIndex(dIdx);
                                setViewerZoom(1);
                                setViewerRotation(0);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                                activeViewerDocIndex === dIdx
                                  ? 'bg-[#4338CA] text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Page {dIdx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Toolbar Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewerRotation((prev) => (prev + 90) % 360)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors flex items-center gap-1 font-semibold"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-mono">90°</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewerZoom((prev) => Math.max(0.5, prev - 0.25))}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setViewerZoom(1);
                          setViewerRotation(0);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-semibold transition-colors"
                        title="Reset 100%"
                      >
                        {Math.round(viewerZoom * 100)}%
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewerZoom((prev) => Math.min(3, prev + 0.25))}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      {activeDoc?.url && (
                        <a
                          href={activeDoc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#4338CA] transition-colors"
                          title="Open in New Tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Document Viewer Frame */}
                  <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-100/70">
                    {loadingSignedUrls ? (
                      <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin text-[#4338CA]" />
                        <span>Loading invoice document...</span>
                      </div>
                    ) : modalResolvedUrls.length === 0 ? (
                      <div className="text-center p-8 space-y-2 text-slate-400">
                        <FileText className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">No archived document file attached to this bill</p>
                      </div>
                    ) : activeDoc?.isPdf ? (
                      <iframe
                        src={activeDoc.url}
                        className="w-full h-full rounded-xl border border-slate-200 bg-white"
                        title="PDF Invoice Document"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img
                          src={activeDoc?.url}
                          alt={activeDoc?.name || 'Invoice Scan'}
                          style={{
                            transform: `rotate(${viewerRotation}deg) scale(${viewerZoom})`,
                            transformOrigin: 'center center',
                            transition: 'transform 0.15s ease-out',
                            maxHeight: '100%',
                            maxWidth: '100%',
                          }}
                          className="object-contain rounded-lg shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Pane (Itemized Ledger Lines & Barcodes) */}
                <div className="w-full lg:w-1/2 flex flex-col bg-white overflow-hidden">
                  {/* Right Header */}
                  <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Itemized Ledger Lines & Barcodes
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#4338CA] border border-indigo-200">
                        {lineItems.length} lines
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Horizontal & Vertical Scrollable
                    </span>
                  </div>

                  {/* Scrollable Table */}
                  <div className="flex-1 overflow-x-auto overflow-y-auto">
                    <table className="min-w-[1050px] w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200 shadow-2xs">
                        <tr>
                          <th className="py-2.5 px-3">ITEM & BARCODE</th>
                          <th className="py-2.5 px-2">HSN</th>
                          <th className="py-2.5 px-2 text-center">QTY</th>
                          <th className="py-2.5 px-2 text-center">UNIT</th>
                          <th className="py-2.5 px-2 text-right">MRP</th>
                          <th className="py-2.5 px-2 text-right">RATE</th>
                          <th className="py-2.5 px-2 text-right">DISC</th>
                          <th className="py-2.5 px-2 text-right">TAXABLE</th>
                          <th className="py-2.5 px-2 text-center">GST %</th>
                          <th className="py-2.5 px-2 text-right">TAXES (CGST/SGST)</th>
                          <th className="py-2.5 px-2 text-right">LANDING COST/UNIT</th>
                          <th className="py-2.5 px-2 text-right">MARGIN (₹ & %)</th>
                          <th className="py-2.5 px-3 text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lineItems.map((item: any, idx: number) => {
                          const qty = Number(item.quantity ?? item.qty ?? 1);
                          const freeQty = Number(item.free_qty ?? 0);
                          const totalItemUnits = qty + freeQty;
                          const unit = (item.unit || 'PCS').toUpperCase();
                          const mrp = Number(item.mrp ?? item.selling_price ?? 0);
                          const rate = Number(item.purchase_rate ?? item.rate ?? item.purchase_price ?? item.price_without_tax ?? 0);
                          const disc = Number(item.discount ?? 0);
                          const taxable = Number(item.price_without_tax ? item.price_without_tax * qty : Math.max(0, rate * qty - disc));
                          const gstRate = Number(item.gst_rate ?? 0);
                          const taxAmount = taxable * (gstRate / 100);
                          const lineTotal = Number(item.total ?? item.amount ?? item.total_amount ?? (taxable + taxAmount));
                          const landingCostPerUnit = totalItemUnits > 0 ? (lineTotal / totalItemUnits) : rate;
                          const marginRs = mrp > 0 ? mrp - landingCostPerUnit : 0;
                          const marginPct = mrp > 0 ? (marginRs / mrp) * 100 : 0;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                              {/* ITEM & BARCODE */}
                              <td className="py-2 px-3">
                                <span className="font-semibold text-[#0F172A] block text-xs">
                                  {item.item_name || item.name}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px]">
                                  {item.barcode && (
                                    <span className="font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                                      {item.barcode}
                                    </span>
                                  )}
                                  {item.category && (
                                    <span className="text-[#4338CA] bg-indigo-50 px-1.5 py-0.2 rounded font-medium border border-indigo-100">
                                      {item.category}
                                    </span>
                                  )}
                                  {item.sub_category && (
                                    <span className="text-slate-500">
                                      {item.sub_category}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* HSN */}
                              <td className="py-2 px-2 font-mono text-slate-700 text-[11px]">
                                {item.hsn_code || '—'}
                              </td>

                              {/* QTY */}
                              <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">
                                <span>{qty}</span>
                                {freeQty > 0 && (
                                  <span className="ml-1 text-[10px] text-[#0D9488] font-bold bg-teal-50 px-1 py-0.5 rounded border border-teal-200">
                                    +{freeQty} free
                                  </span>
                                )}
                              </td>

                              {/* UNIT */}
                              <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-500 font-semibold uppercase">
                                {unit}
                              </td>

                              {/* MRP */}
                              <td className="py-2 px-2 text-right font-mono text-slate-700">
                                {mrp > 0 ? `₹${mrp.toFixed(2)}` : '—'}
                              </td>

                              {/* RATE */}
                              <td className="py-2 px-2 text-right font-mono text-slate-700">
                                ₹{rate.toFixed(2)}
                              </td>

                              {/* DISC */}
                              <td className="py-2 px-2 text-right font-mono text-slate-500">
                                {disc > 0 ? `₹${disc.toFixed(2)}` : '—'}
                              </td>

                              {/* TAXABLE */}
                              <td className="py-2 px-2 text-right font-mono font-semibold text-slate-800">
                                ₹{taxable.toFixed(2)}
                              </td>

                              {/* GST % */}
                              <td className="py-2 px-2 text-center font-mono text-slate-700">
                                {gstRate}%
                              </td>

                              {/* TAXES (CGST/SGST) */}
                              <td className="py-2 px-2 text-right font-mono text-[#0D9488]">
                                <div>+₹{taxAmount.toFixed(2)}</div>
                                {gstRate > 0 && (
                                  <div className="text-[9px] text-slate-400">
                                    {gstRate / 2}%+{gstRate / 2}%
                                  </div>
                                )}
                              </td>

                              {/* LANDING COST/UNIT */}
                              <td className="py-2 px-2 text-right font-mono font-medium text-slate-800">
                                ₹{landingCostPerUnit.toFixed(2)}
                              </td>

                              {/* MARGIN (₹ & %) */}
                              <td className="py-2 px-2 text-right font-mono">
                                {mrp > 0 ? (
                                  <div>
                                    <span className={`font-bold ${marginRs >= 0 ? 'text-[#0D9488]' : 'text-rose-600'}`}>
                                      ₹{marginRs.toFixed(2)}
                                    </span>
                                    <span className={`block text-[10px] ${marginPct >= 0 ? 'text-[#0D9488]' : 'text-rose-600'}`}>
                                      ({marginPct.toFixed(1)}%)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* TOTAL */}
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#4338CA]">
                                ₹{lineTotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 3. Bottom Summary Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-[#4338CA]" />
                    <span>Total Items: <strong className="text-slate-900 font-mono">{lineItems.length}</strong></span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>Total Units: <strong className="text-slate-900 font-mono">{totalUnits}</strong></span>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
                  <div>
                    <span className="text-[10px] uppercase font-bold font-sans text-slate-500 block">
                      Total Taxable
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      ₹{totalTaxable.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold font-sans text-slate-500 block">
                      Total Tax
                    </span>
                    <span className="text-sm font-bold text-[#0D9488]">
                      +₹{totalTax.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold font-sans text-slate-500 block">
                      Grand Total
                    </span>
                    <span className="text-base font-black text-[#4338CA]">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= SCAN VIA PHONE QR MODAL ================= */}
      {phoneQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-700/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-[#0F172A] leading-tight">
                    Scan Bill via Phone
                  </h3>
                  <p className="text-[10px] text-slate-500">Live Realtime Sync</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClosePhoneQrModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Canvas */}
            <div className="py-2">
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-xs inline-block mx-auto">
                <QRCode
                  value={phoneQrUrl}
                  size={180}
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                  level="M"
                />
              </div>
            </div>

            {/* Status Indicator & Live Phone Counter */}
            {isReceivingFromPhone ? (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#4338CA] bg-indigo-50 py-2.5 px-3 rounded-xl border border-indigo-200">
                <Loader2 className="w-4 h-4 animate-spin text-[#4338CA]" />
                <span>Receiving snap from phone...</span>
              </div>
            ) : receivedPhoneCount > 0 ? (
              <div className="flex items-center justify-between text-xs font-bold text-[#0D9488] bg-teal-50 py-2 px-3 rounded-xl border border-teal-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0D9488]" />
                  <span>
                    {receivedPhoneCount} {receivedPhoneCount === 1 ? 'snap' : 'snaps'} received from phone
                  </span>
                </div>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-mono">
                  Live
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 bg-slate-50 py-2 px-3 rounded-xl border border-slate-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D9488] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0D9488]" />
                </span>
                <span className="text-[11px] font-medium text-slate-600">
                  Waiting for phone to snap and upload...
                </span>
              </div>
            )}

            {/* Live Snaps Miniature Strip with instant discard */}
            {receivedPhoneCount > 0 && selectedFiles.length > 0 && (
              <div className="space-y-1.5 text-left bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold px-0.5">
                  <span>Queued in laptop ({selectedFiles.length}):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tap trash to discard</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
                  {selectedFiles.map((f, fIdx) => (
                    <div
                      key={f.id}
                      className="relative shrink-0 w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs group"
                    >
                      {f.previewUrl ? (
                        <img
                          src={f.previewUrl}
                          alt={`Snap ${fIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      {activeExtractedQueueIds.includes(f.id) && (
                        <span className="absolute top-0 left-0 bg-[#0D9488] text-white font-mono font-bold text-[7px] px-1 rounded-br">
                          Extracted
                        </span>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-[#0F172A]/80 text-white font-mono font-bold text-[8px] text-center">
                        P{fIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedFile(f.id);
                        }}
                        className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors"
                        title="Discard this snap"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="text-[11px] text-slate-500 space-y-1 text-left bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-700 text-xs">How it works:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                <li>Scan this QR code with your phone camera</li>
                <li>Tap <strong>Snap & Upload</strong> for each bill page</li>
                <li>Photos stream here in real time. Keep snapping!</li>
                <li>Click <strong>Done / Organize & Extract</strong> below to extract on laptop</li>
              </ol>
            </div>

            {/* Copy Link Helper */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                readOnly
                value={phoneQrUrl}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-600 font-mono truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(phoneQrUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 flex items-center gap-1 shadow-2xs transition-colors shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span className="text-[#0D9488]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClosePhoneQrModal}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                  receivedPhoneCount > 0
                    ? 'bg-[#4338CA] hover:bg-[#3730A3] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>
                  {receivedPhoneCount > 0
                    ? `Done / Organize & Extract (${receivedPhoneCount} ${
                        receivedPhoneCount === 1 ? 'snap' : 'snaps'
                      } received)`
                    : 'Done / Close'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT VENDOR / SUPPLIER MODAL ================= */}
      {supplierModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 my-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Edit Vendor Profile</h3>
                  <p className="text-[11px] text-slate-500">Update supplier contact, GSTIN, and licensing details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSupplierModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vendor / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  placeholder="e.g. Hindustan Unilever Ltd"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={suppGstin}
                    onChange={(e) => setSuppGstin(e.target.value.toUpperCase())}
                    placeholder="07AAAAA0000A1Z5"
                    maxLength={15}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] text-slate-900 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone / Contact
                  </label>
                  <input
                    type="text"
                    inputMode="tel"
                    value={suppPhone}
                    onChange={(e) => setSuppPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={suppEmail}
                    onChange={(e) => setSuppEmail(e.target.value)}
                    placeholder="billing@vendor.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    FSSAI License #
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={suppFssai}
                    onChange={(e) => setSuppFssai(e.target.value)}
                    placeholder="14-digit FSSAI number"
                    maxLength={14}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Business Address
                </label>
                <textarea
                  rows={2}
                  value={suppAddress}
                  onChange={(e) => setSuppAddress(e.target.value)}
                  placeholder="Street, City, State, PIN"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#4338CA] focus:ring-1 focus:ring-[#4338CA] text-slate-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSupplierModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupplier}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {isSavingSupplier && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Vendor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
