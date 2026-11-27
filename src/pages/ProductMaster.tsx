import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Barcode,
  Tag,
  Loader2,
  Upload,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  TrendingDown,
  Layers2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { uploadToR2 } from '../lib/r2Upload';

export interface ProductMasterProps {
  currentUser: any;
  onNavigateToPos?: () => void;
}

const DEFAULT_CATEGORIES = [
  'Dairy & Bakery',
  'Staples & Grains',
  'Edible Oils & Ghee',
  'Snacks & Confectionery',
  'Beverages & Tea',
  'Packaged Foods',
  'Personal Care & Hygiene',
  'Cleaning & Household',
  'Spices & Masala',
  'General Retail',
];

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['pcs', 'kg', 'ltr', 'pack', 'box', 'gm', 'ml'];

const sanitizeDecimalInput = (val: string): string => {
  let cleaned = val.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
};

export const ProductMaster: React.FC<ProductMasterProps> = ({
  currentUser,
  onNavigateToPos,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [mrp, setMrp] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [gstRate, setGstRate] = useState<number>(5);
  const [stockQty, setStockQty] = useState<string>('0');
  const [lowStockAlert, setLowStockAlert] = useState<string>('10');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch real products for this store
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', currentUser.id)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setProducts(data || []);
    } catch (err: any) {
      console.error('[ProductMaster] Error fetching products:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load store products.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchProducts();
    }
  }, [currentUser?.id]);

  // Dynamic categories available across existing products and defaults
  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setBarcode('');
    setHsnCode('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setIsCustomCategory(false);
    setCustomCategory('');
    setSubCategory('');
    setUnit('pcs');
    setMrp('');
    setSellingPrice('');
    setPurchasePrice('');
    setGstRate(5);
    setStockQty('0');
    setLowStockAlert('10');
    setImageUrl('');
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name || '');
    setBarcode(p.barcode || '');
    setHsnCode(p.hsn_code || '');

    const cat = p.category || DEFAULT_CATEGORIES[0];
    if (availableCategories.includes(cat)) {
      setCategory(cat);
      setIsCustomCategory(false);
      setCustomCategory('');
    } else {
      setCategory('__custom__');
      setIsCustomCategory(true);
      setCustomCategory(cat);
    }

    setSubCategory(p.sub_category || '');
    setUnit(p.unit || 'pcs');
    setMrp(p.mrp !== undefined && p.mrp !== null ? String(p.mrp) : '');
    setSellingPrice(p.selling_price !== undefined && p.selling_price !== null ? String(p.selling_price) : '');
    setPurchasePrice(p.purchase_price !== undefined && p.purchase_price !== null ? String(p.purchase_price) : '');
    setGstRate(p.gst_rate !== undefined && p.gst_rate !== null ? p.gst_rate : 5);
    setStockQty(p.stock_qty !== undefined && p.stock_qty !== null ? String(p.stock_qty) : '0');
    setLowStockAlert(p.low_stock_alert !== undefined && p.low_stock_alert !== null ? String(p.low_stock_alert) : '10');
    setImageUrl(p.image_url || '');
    setModalOpen(true);
  };

  // Upload product photo directly to Cloudflare R2
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { publicUrl, fileKey } = await uploadToR2({
        file,
        storeId: currentUser.id,
        folder: 'products',
      });
      setImageUrl(publicUrl || fileKey);
    } catch (err: any) {
      console.error('[ProductMaster] Error uploading product image:', err);
      setFeedback({ type: 'error', message: 'Failed to upload product image to Cloudflare R2.' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setFeedback(null);

    const mrpVal = parseFloat(mrp) || parseFloat(sellingPrice) || 0;
    // Never leave selling_price as 0 when MRP is present
    let spVal = parseFloat(sellingPrice);
    if ((isNaN(spVal) || spVal <= 0) && mrpVal > 0) {
      spVal = mrpVal;
    }
    const buyVal = purchasePrice.trim() !== '' ? parseFloat(purchasePrice) || null : null;
    const stockVal = parseFloat(stockQty) || 0;
    const lowAlertVal = parseFloat(lowStockAlert) || 5;

    const finalCategory = isCustomCategory
      ? customCategory.trim() || 'General Retail'
      : category.trim();

    const payload: any = {
      store_id: currentUser.id,
      name: name.trim(),
      barcode: barcode.trim() || null,
      hsn_code: hsnCode.trim() || null,
      category: finalCategory,
      sub_category: subCategory.trim() || null,
      unit,
      mrp: mrpVal,
      selling_price: spVal,
      purchase_price: buyVal,
      gst_rate: Number(gstRate) || 0,
      stock_qty: stockVal,
      low_stock_alert: lowAlertVal,
      image_url: imageUrl.trim() || null,
    };

    try {
      if (editingProduct) {
        // Update product
        let { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
          .eq('store_id', currentUser.id)
          .select('*')
          .single();

        // Handle possible column schema fallback gracefully
        if (error && (error.message?.includes('image_url') || error.message?.includes('sub_category') || error.message?.includes('hsn_code'))) {
          const fallbackPayload = { ...payload };
          if (error.message?.includes('image_url')) delete fallbackPayload.image_url;
          if (error.message?.includes('sub_category')) delete fallbackPayload.sub_category;
          if (error.message?.includes('hsn_code')) delete fallbackPayload.hsn_code;

          const retryRes = await supabase
            .from('products')
            .update(fallbackPayload)
            .eq('id', editingProduct.id)
            .eq('store_id', currentUser.id)
            .select('*')
            .single();

          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) throw error;

        setProducts((prev) =>
          prev.map((item) => (item.id === editingProduct.id ? data : item))
        );
        setFeedback({ type: 'success', message: `Product "${name}" updated successfully!` });
      } else {
        // Insert new product
        let { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('*')
          .single();

        // Handle possible column schema fallback gracefully
        if (error && (error.message?.includes('image_url') || error.message?.includes('sub_category') || error.message?.includes('hsn_code'))) {
          const fallbackPayload = { ...payload };
          if (error.message?.includes('image_url')) delete fallbackPayload.image_url;
          if (error.message?.includes('sub_category')) delete fallbackPayload.sub_category;
          if (error.message?.includes('hsn_code')) delete fallbackPayload.hsn_code;

          const retryRes = await supabase
            .from('products')
            .insert(fallbackPayload)
            .select('*')
            .single();

          data = retryRes.data;
          error = retryRes.error;
        }

        if (error) throw error;

        setProducts((prev) => [data, ...prev]);
        setFeedback({ type: 'success', message: `Product "${name}" added to master catalog!` });
      }

      setModalOpen(false);
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('[ProductMaster] Error saving product:', err);
      setFeedback({ type: 'error', message: err.message || 'Error saving product.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}" from catalog?`)) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('store_id', currentUser.id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
      setFeedback({ type: 'success', message: `Deleted "${prodName}" from catalog.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('[ProductMaster] Error deleting product:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not delete product.' });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Products matching search query and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.hsn_code && p.hsn_code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sub_category && p.sub_category.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock_qty <= (p.low_stock_alert || 0)).length;
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.stock_qty || 0) * Number(p.selling_price || 0)), 0);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* ================= TOP BANNER & STORE KPI SUMMARY ================= */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">Product Master & Inventory</h2>
            <span className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {products.length} Items Listed
            </span>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Stock Value: ₹{totalInventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            {lowStockCount > 0 && (
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockCount} Low Stock
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Enterprise Item Catalog • HSN Codes • GST Rates • FMCG Category / Subcategory • Real-time Stock Tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToPos && (
            <button
              onClick={onNavigateToPos}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <span>POS Billing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-teal-50 border-teal-200 text-[#0D9488]'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0D9488]" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, barcode, HSN code, category..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-[#4338CA] focus:bg-white font-medium"
          >
            <option value="all">All Categories ({products.length})</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================= PRODUCTS CATALOG TABLE ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#4338CA]" />
            <span>Loading store product master...</span>
          </div>
        ) : products.length === 0 ? (
          /* Empty state when 0 products exist in store */
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">No products in your store master yet</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Add your items to begin rapid 3-second counter barcode billing, stock management, and automatic GST calculation.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Product</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No products match your search query "{searchQuery}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">HSN Code</th>
                  <th className="px-4 py-3">Category / Subcategory</th>
                  <th className="px-4 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-right">MRP (₹)</th>
                  <th className="px-4 py-3 text-right">Selling Price (₹)</th>
                  <th className="px-4 py-3 text-right">GST %</th>
                  <th className="px-4 py-3 text-right">Stock Qty</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => {
                  const isLowStock = prod.stock_qty <= (prod.low_stock_alert || 0);
                  const parsedMrp = Number(prod.mrp) || 0;
                  const parsedSp = Number(prod.selling_price) || 0;
                  const discountDiff = parsedMrp > parsedSp ? parsedMrp - parsedSp : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name + Barcode */}
                      <td className="px-4 py-3 font-bold text-[#0F172A]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                            {prod.image_url ? (
                              <img
                                src={prod.image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="truncate block font-semibold text-slate-900 text-xs">
                              {prod.name}
                            </span>
                            {prod.barcode ? (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                <Barcode className="w-3 h-3 text-slate-400" />
                                {prod.barcode}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No barcode</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* HSN CODE */}
                      <td className="px-4 py-3 font-mono text-slate-700 text-[11px]">
                        {prod.hsn_code ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-semibold">
                            <Tag className="w-3 h-3 text-slate-500" />
                            {prod.hsn_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* CATEGORY / SUBCATEGORY */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-[#4338CA] border border-indigo-100 max-w-[180px] truncate">
                            {prod.category || 'General Retail'}
                          </span>
                          {prod.sub_category ? (
                            <span className="text-[11px] text-slate-600 font-medium pl-0.5 max-w-[180px] truncate">
                              {prod.sub_category}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 pl-0.5 italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* UNIT */}
                      <td className="px-4 py-3 text-center text-slate-600 font-mono text-[11px] uppercase font-bold">
                        {prod.unit || 'PCS'}
                      </td>

                      {/* MRP (₹) */}
                      <td className="px-4 py-3 text-right font-mono text-slate-600 font-medium text-[11px]">
                        ₹{parsedMrp.toFixed(2)}
                      </td>

                      {/* SELLING PRICE (₹) */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#4338CA] text-xs">
                        ₹{parsedSp.toFixed(2)}
                        {discountDiff > 0 && (
                          <span className="block text-[10px] text-[#0D9488] font-semibold mt-0.5">
                            -₹{discountDiff.toFixed(2)} off
                          </span>
                        )}
                      </td>

                      {/* GST % */}
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                          {prod.gst_rate || 0}%
                        </span>
                      </td>

                      {/* STOCK QTY */}
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] ${
                            isLowStock
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {prod.stock_qty} {(prod.unit || 'PCS').toUpperCase()}
                        </span>
                        {isLowStock && (
                          <span className="block text-[10px] text-amber-700 font-medium mt-0.5">
                            Low Stock Alert
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-[#4338CA] border border-slate-200 hover:border-indigo-200 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            disabled={deletingId === prod.id}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
                            title="Delete Product"
                          >
                            {deletingId === prod.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
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

      {/* ================= MODAL: ADD / EDIT PRODUCT ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 my-auto text-slate-900 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    {editingProduct ? 'Edit Catalog Product' : 'Add New Product to Store'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Maintain accurate HSN, category, MRP, selling price, and stock levels
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amul Butter Pasteurized 500g"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                />
              </div>

              {/* Product Image (Cloudflare R2) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Image (Cloudflare R2)
                </label>
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-[#4338CA] hover:bg-slate-100 shadow-xs transition-colors">
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Uploading to R2...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="ml-2 text-[11px] text-rose-600 hover:underline font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row: Barcode & HSN Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Barcode (EAN / UPC / SKU)
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 8901262010053"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    HSN / SAC Code
                  </label>
                  <div className="relative">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      placeholder="e.g. 0405, 1901, 2106"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Row: Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(!isCustomCategory);
                        if (!isCustomCategory) {
                          setCustomCategory('');
                        }
                      }}
                      className="text-[11px] font-semibold text-[#4338CA] hover:underline"
                    >
                      {isCustomCategory ? 'Choose Preset' : '+ Custom Category'}
                    </button>
                  </div>

                  {isCustomCategory ? (
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Ayurvedic, Cosmetics, Frozen Foods"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                    />
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategory(true);
                          setCustomCategory('');
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white font-medium"
                    >
                      {availableCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__custom__">+ Enter Custom Category...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Subcategory (Product Type)
                  </label>
                  <input
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="e.g. Butter, Fresh Cream, Wheat Atta"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              {/* Row: Unit, MRP, Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white uppercase font-mono font-semibold"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    MRP (₹) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={mrp}
                    onChange={(e) => setMrp(sanitizeDecimalInput(e.target.value))}
                    placeholder="275.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(sanitizeDecimalInput(e.target.value))}
                    placeholder="260.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#4338CA] font-bold font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              {/* Row: Purchase Rate, GST %, Current Stock, Low Stock Alert */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Purchase Rate (₹)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(sanitizeDecimalInput(e.target.value))}
                    placeholder="240.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    GST Rate
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white font-mono font-semibold"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}% GST
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Current Stock
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={stockQty}
                    onChange={(e) => setStockQty(sanitizeDecimalInput(e.target.value))}
                    placeholder="50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lowStockAlert}
                    onChange={(e) => setLowStockAlert(sanitizeDecimalInput(e.target.value))}
                    placeholder="10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Catalog...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Save Changes' : 'Add to Catalog'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Backwards-compatible alias for existing imports
export const ProductsCatalog = ProductMaster;
