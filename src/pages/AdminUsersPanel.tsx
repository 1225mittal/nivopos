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
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* ================= HQ TOP HEADER ================= */}
      <header className="border-b border-slate-800 bg-[#0B1120] px-4 sm:px-8 py-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-[1.5px] flex items-center justify-center shadow-glow-cyan">
              <div className="w-full h-full bg-[#070A11] rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-tight">
                  NIVO<span className="text-emerald-400">POS</span> HQ COMMAND CENTER
                </h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Founder Intelligence
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Authorized Admin: <strong className="text-slate-200">{currentUser?.email || currentUser?.phone || currentUser?.id}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Intelligence</span>
            </button>

            <button
              onClick={() => onSignOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-xs text-slate-300 hover:text-rose-400 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN HQ BODY ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full space-y-8">
        {errorNotice && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* ---------------- 1. TOP KPI CARDS ---------------- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Stores */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Registered Stores
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black font-mono text-white tracking-tight">
              {loading ? '...' : totalStores}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">
              Registered across Indian Retail & FMCG
            </p>
          </div>

          {/* Card 2: Active Beta / Paid */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Beta / Paid Stores
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black font-mono text-emerald-400 tracking-tight">
              {loading ? '...' : activeBetaStores}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">
              100% of sign-ups granted instant access
            </p>
          </div>

          {/* Card 3: Total SaaS Revenue */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total SaaS Revenue
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black font-mono text-white tracking-tight">
              {loading ? '...' : `₹${totalRevenue.toLocaleString('en-IN')}`}
            </div>
            <p className="mt-1 text-[11px] text-emerald-400 font-medium">
              Recorded in public.subscription_payments
            </p>
          </div>

          {/* Card 4: Renewals Due This Month */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Renewals Due This Month
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-black font-mono text-amber-300 tracking-tight">
              {loading ? '...' : renewalsDueThisMonth}
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">
              Based on merchant next_renewal_date
            </p>
          </div>
        </section>

        {/* ---------------- 2. SECTION TABS: STORES DIRECTORY VS PAYMENTS LEDGER ---------------- */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'stores'
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/40 shadow-glow-emerald'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registered Stores & Login Credentials Directory ({filteredStores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              activeTab === 'payments'
                ? 'bg-slate-900 text-cyan-400 border-cyan-500/40 shadow-glow-cyan'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Payments & Billing Cycle Ledger ({payments.length})</span>
          </button>
        </div>

        {/* ---------------- TAB CONTENT 1: STORES DIRECTORY ---------------- */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by store, owner, phone, city..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Read-Only Directory Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Store Name</th>
                      <th className="px-4 py-3">Owner Name</th>
                      <th className="px-4 py-3">Login Phone (+91)</th>
                      <th className="px-4 py-3">Login Email</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Registered Date</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3">Current Plan</th>
                      <th className="px-4 py-3">Billing Cycle</th>
                      <th className="px-4 py-3">Next Renewal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredStores.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-slate-500 text-xs">
                          {loading ? 'Loading store profiles...' : 'No store profiles match your criteria.'}
                        </td>
                      </tr>
                    ) : (
                      filteredStores.map((store) => {
                        const regFormatted = store.created_at
                          ? new Date(store.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Recent';

                        const lastLoginFormatted = store.last_login_at
                          ? new Date(store.last_login_at).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A';

                        const renewalFormatted = store.next_renewal_date
                          ? new Date(store.next_renewal_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Active Beta';

                        return (
                          <tr key={store.id} className="hover:bg-slate-900/40 transition-colors">
                            {/* Store Name */}
                            <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                              {store.store_name || 'Store'}
                            </td>

                            {/* Owner Name */}
                            <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                              {store.owner_name || 'Merchant'}
                            </td>

                            {/* Login Phone */}
                            <td className="px-4 py-3 font-mono text-emerald-400 whitespace-nowrap">
                              {store.phone || '—'}
                            </td>

                            {/* Login Email */}
                            <td className="px-4 py-3 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                              {store.email || '—'}
                            </td>

                            {/* City */}
                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                              {store.city || 'India'}
                            </td>

                            {/* Business Category */}
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                              {store.business_category || 'Retail'}
                            </td>

                            {/* Registered Date */}
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                              {regFormatted}
                            </td>

                            {/* Last Login Timestamp */}
                            <td className="px-4 py-3 font-mono text-cyan-300 text-[11px] whitespace-nowrap">
                              {lastLoginFormatted}
                            </td>

                            {/* Current Plan */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                                {store.plan_name || 'Launch Beta (All Modules)'}
                              </span>
                            </td>

                            {/* Billing Cycle */}
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-300">
                              {store.billing_cycle || 'Free Beta'}
                            </td>

                            {/* Next Renewal Date */}
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-amber-300 text-[11px]">
                              {renewalFormatted}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAB CONTENT 2: PAYMENTS LEDGER ---------------- */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
              {payments.length === 0 ? (
                /* Clean Empty State ready for webhook callbacks */
                <div className="p-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      No Subscription Payments Recorded Yet
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      All stores are currently activated under the free <strong>Launch Beta (All Modules)</strong> initiative.
                      Ready to ingest Razorpay, Cashfree, or Stripe webhook callbacks directly into <code className="text-emerald-400 font-mono">public.subscription_payments</code>.
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      Webhook Target: /api/billing/webhook
                    </span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Store / Payer</th>
                        <th className="px-4 py-3">Plan Purchased</th>
                        <th className="px-4 py-3 text-right">Amount (₹)</th>
                        <th className="px-4 py-3">Transaction ID</th>
                        <th className="px-4 py-3">Payment Date</th>
                        <th className="px-4 py-3">Billing Cycle</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-white">
                            {p.store_name || p.owner_name || p.store_id || 'Store Merchant'}
                          </td>
                          <td className="px-4 py-3 text-emerald-400 font-medium">
                            {p.plan_purchased || 'Pro Plan'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-white">
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                            {p.transaction_id}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {new Date(p.payment_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-mono">
                            {p.billing_cycle || 'Monthly'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20">
                              {p.status}
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

      {/* ================= HQ FOOTER ================= */}
      <footer className="border-t border-slate-900 py-4 text-center text-[11px] text-slate-500">
        Nivo POS HQ Command Center • Founder SaaS Intelligence Console • Confirmed Root Administrator
      </footer>
    </div>
  );
};
