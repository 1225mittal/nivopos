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
  Loader2,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

interface ProductsCatalogProps {
  currentUser: any;
  onNavigateToPos?: () => void;
}

const DEFAULT_CATEGORIES = [
  'Groceries & Staples',
  'Dairy, Bakery & Eggs',
  'Edible Oils & Ghee',
  'Snacks & Confectionery',
  'Beverages & Tea',
  'Personal Care',
  'Cleaning & Household',
  'Packaged Food',
  'Other Items',
];

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['pcs', 'kg', 'ltr', 'pack', 'box'];

export const ProductsCatalog: React.FC<ProductsCatalogProps> = ({
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
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [unit, setUnit] = useState('pcs');
  const [mrp, setMrp] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [gstRate, setGstRate] = useState<number>(5);
  const [stockQty, setStockQty] = useState<number | ''>(0);
  const [lowStockAlert, setLowStockAlert] = useState<number | ''>(10);

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
      console.error('[ProductsCatalog] Error fetching:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to load products.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchProducts();
    }
  }, [currentUser?.id]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setBarcode('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setUnit('pcs');
    setMrp('');
    setSellingPrice('');
    setGstRate(5);
    setStockQty(0);
    setLowStockAlert(10);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBarcode(p.barcode || '');
    setCategory(p.category || DEFAULT_CATEGORIES[0]);
    setUnit(p.unit || 'pcs');
    setMrp(p.mrp);
    setSellingPrice(p.selling_price);
    setGstRate(p.gst_rate);
    setStockQty(p.stock_qty);
    setLowStockAlert(p.low_stock_alert);
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setFeedback(null);

    const mrpVal = Number(mrp) || Number(sellingPrice) || 0;
    const spVal = Number(sellingPrice) || 0;
    const stockVal = Number(stockQty) || 0;
    const lowAlertVal = Number(lowStockAlert) || 5;

    const payload = {
      store_id: currentUser.id,
      name: name.trim(),
      barcode: barcode.trim() || null,
      category: category.trim(),
      unit,
      mrp: mrpVal,
      selling_price: spVal,
      gst_rate: Number(gstRate) || 0,
      stock_qty: stockVal,
      low_stock_alert: lowAlertVal,
    };

    try {
      if (editingProduct) {
        // Update
        const { data, error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id)
          .eq('store_id', currentUser.id)
          .select('*')
          .single();

        if (error) throw error;

        setProducts((prev) =>
          prev.map((item) => (item.id === editingProduct.id ? data : item))
        );
        setFeedback({ type: 'success', message: `Product "${name}" updated successfully!` });
      } else {
        // Insert
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select('*')
          .single();

        if (error) throw error;

        setProducts((prev) => [data, ...prev]);
        setFeedback({ type: 'success', message: `Product "${name}" added to master catalog!` });
      }

      setModalOpen(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('[ProductsCatalog] Error saving:', err);
      setFeedback({ type: 'error', message: err.message || 'Error saving product.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${prodName}"?`)) return;

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
      console.error('[ProductsCatalog] Error deleting:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not delete product.' });
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock_qty <= (p.low_stock_alert || 0)).length;
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Top Banner Actions & KPI Summary */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-[#0F172A]">Product Master Catalog</h2>
            <span className="text-xs font-mono font-bold text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {products.length} Items in Store
            </span>
            {lowStockCount > 0 && (
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockCount} Low Stock
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Create and maintain your store's items, MRP, selling rates, GST %, and real-time inventory levels.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
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
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, barcode, category..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-[#4338CA] focus:bg-white"
          >
            <option value="all">All Categories ({products.length})</option>
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table / Empty State */}
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
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Category</th>
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
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#0F172A]">
                        <div className="flex items-center gap-1.5">
                          <span>{prod.name}</span>
                          {isLowStock && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="Low Stock Alert" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {prod.barcode || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{prod.category || 'General'}</td>
                      <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px] uppercase">
                        {prod.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        ₹{Number(prod.mrp).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#4338CA]">
                        ₹{Number(prod.selling_price).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {prod.gst_rate}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            isLowStock
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'text-slate-800'
                          }`}
                        >
                          {prod.stock_qty} {prod.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            disabled={deletingId === prod.id}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 transition-colors"
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
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 my-auto text-slate-900 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#4338CA]" />
                <h3 className="text-lg font-bold text-[#0F172A]">
                  {editingProduct ? 'Edit Catalog Product' : 'Add New Product to Store'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta 5kg"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Barcode (EAN / UPC)
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 8901030922841"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="245.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) =>
                      setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    placeholder="230.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#4338CA] font-bold font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    GST Rate
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={(e) =>
                      setStockQty(e.target.value === '' ? '' : parseInt(e.target.value))
                    }
                    placeholder="50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    value={lowStockAlert}
                    onChange={(e) =>
                      setLowStockAlert(e.target.value === '' ? '' : parseInt(e.target.value))
                    }
                    placeholder="10"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'Save Changes' : 'Add Product'}</span>
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
