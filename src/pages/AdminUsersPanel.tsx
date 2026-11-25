import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Building2,
  Users,
  CreditCard,
  Calendar,
  Search,
  RefreshCw,
  LogOut,
  IndianRupee,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ChevronDown,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreProfile, SubscriptionPayment } from '../types';

interface AdminUsersPanelProps {
  currentUser: any;
  onSignOut: () => Promise<void>;
}

export const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({
  currentUser,
  onSignOut,
}) => {
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'stores' | 'payments'>('stores');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Fetch real-time SaaS intelligence from public.store_profiles and public.subscription_payments
  const fetchSaaSIntelligence = async () => {
    try {
      setErrorNotice(null);
      // 1. Fetch stores
      const { data: storeData, error: storeErr } = await supabase
        .from('store_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeErr) {
        console.warn('[HQ Admin] store_profiles fetch note:', storeErr.message);
      }

      if (storeData) {
        setStores(storeData);
      }

      // 2. Fetch payments
      const { data: paymentData, error: payErr } = await supabase
        .from('subscription_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (payErr) {
        console.warn('[HQ Admin] subscription_payments fetch note:', payErr.message);
      }

      if (paymentData) {
        setPayments(paymentData);
      }
    } catch (err: any) {
      console.error('[HQ Admin] Fetch exception:', err);
      setErrorNotice(err.message || 'Error fetching SaaS data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSaaSIntelligence();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSaaSIntelligence();
  };

  // ---------------- COMPUTED METRICS ----------------
  const totalStores = stores.length;
  const activeBetaStores = stores.filter(
    (s) => s.subscription_status === 'active' || s.is_approved
  ).length;

  const totalRevenue = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  const renewalsDueThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return stores.filter((s) => {
      if (!s.next_renewal_date) return false;
      const d = new Date(s.next_renewal_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [stores]);

  // Filtered stores list
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        store.store_name?.toLowerCase().includes(query) ||
        store.owner_name?.toLowerCase().includes(query) ||
        store.phone?.toLowerCase().includes(query) ||
        store.email?.toLowerCase().includes(query) ||
        store.city?.toLowerCase().includes(query);

      const matchesCat =
        categoryFilter === 'all' || store.business_category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [stores, searchQuery, categoryFilter]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      if (s.business_category) set.add(s.business_category);
    });
    return Array.from(set);
  }, [stores]);

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col justify-between selection:bg-indigo-500/20 selection:text-indigo-700">
      {/* ================= HQ TOP HEADER ================= */}
      <header className="border-b border-slate-200 bg-white px-4 sm:px-8 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-[#4338CA]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0F172A] text-lg tracking-tight">
                  NIVO<span className="text-[#4338CA]">POS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-50 text-[#4338CA] border border-indigo-200">
                  HQ Command Center
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Founder SaaS Intelligence & Store Directory</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 transition-colors shadow-sm"
              title="Refresh SaaS Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#4338CA] ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={() => onSignOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs text-slate-700 hover:text-rose-600 transition-colors shadow-sm"
              title="Sign Out of HQ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit HQ</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-8">
        {/* Notice alert if query fails */}
        {errorNotice && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* 1. TOP SAAS KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-500">Total Registered Stores</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-[#4338CA]">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#0F172A] font-mono mt-3">
              {totalStores}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Live in public.store_profiles</p>
          </div>

          {/* KPI 2 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-500">Active Beta Stores</span>
              <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#0D9488] font-mono mt-3">
              {activeBetaStores}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">100% Modules Provisioned</p>
          </div>

          {/* KPI 3 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-500">Total SaaS Revenue (₹)</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-[#4338CA]">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-[#0F172A] font-mono mt-3">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">From public.subscription_payments</p>
          </div>

          {/* KPI 4 */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-500">Renewals Due This Month</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-700 font-mono mt-3">
              {renewalsDueThisMonth}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Free Launch Beta 1-Year Cycle</p>
          </div>
        </div>

        {/* 2. SECTION TABS: STORE DIRECTORY VS PAYMENTS LEDGER */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'stores'
                ? 'bg-white text-[#4338CA] border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Registered Stores & Merchant Directory ({stores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-white text-[#4338CA] border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments & Billing Cycle Ledger ({payments.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: STORE DIRECTORY ================= */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Store Name, Owner, Phone, City..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                >
                  <option value="all">All Business Sectors</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stores Table */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#4338CA]" />
                  <span>Loading store directory...</span>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs">
                  No registered stores match your search query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3.5">Store & Merchant</th>
                        <th className="px-4 py-3.5">Login Phone (+91)</th>
                        <th className="px-4 py-3.5">Login Email</th>
                        <th className="px-4 py-3.5">City / Sector</th>
                        <th className="px-4 py-3.5">Registered Date</th>
                        <th className="px-4 py-3.5">Last Login</th>
                        <th className="px-4 py-3.5">Current Plan</th>
                        <th className="px-4 py-3.5">Renewal Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStores.map((store) => (
                        <tr key={store.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#0F172A]">{store.store_name || store.business_name || 'My Store'}</p>
                            <p className="text-[11px] text-slate-500">{store.owner_name || store.full_name || 'Store Merchant'}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-700">
                            {store.phone || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {store.email || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-[#0F172A]">{store.city || 'India'}</span>
                            <span className="block text-[10px] text-slate-500">{store.business_category || 'Retail'}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {store.created_at
                              ? new Date(store.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {store.last_login_at
                              ? new Date(store.last_login_at).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Never logged in'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-[#0D9488] border border-teal-200 font-mono">
                              {store.plan_name || 'Launch Beta (All Modules)'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                            {store.next_renewal_date
                              ? new Date(store.next_renewal_date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '1 Year Free Beta'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: PAYMENTS & BILLING LEDGER ================= */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-16 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#4338CA]" />
                  <span>Loading payments ledger...</span>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">No paid subscription transactions yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    All stores are currently activated on the 100% Free Launch Beta plan. Real payment gateway webhooks (Razorpay / Cashfree) will log directly into <code className="text-[#4338CA] font-mono">public.subscription_payments</code> here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3.5">Store ID</th>
                        <th className="px-4 py-3.5">Plan Purchased</th>
                        <th className="px-4 py-3.5">Amount (₹)</th>
                        <th className="px-4 py-3.5">Billing Cycle</th>
                        <th className="px-4 py-3.5">Transaction ID</th>
                        <th className="px-4 py-3.5">Payment Date</th>
                        <th className="px-4 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-[#4338CA]">{pay.store_id}</td>
                          <td className="px-4 py-3 font-semibold text-[#0F172A]">{pay.plan_purchased || 'Launch Beta'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-[#0F172A]">₹{pay.amount}</td>
                          <td className="px-4 py-3 text-slate-700">{pay.billing_cycle}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{pay.transaction_id || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(pay.payment_date).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-[#0D9488] border border-teal-200">
                              {pay.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-500">
        Nivo POS HQ Command Center • Founder Eyes Only • Strict Access Policy Enforced
      </footer>
    </div>
  );
};
