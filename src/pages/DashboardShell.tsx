import React, { useState, useCallback, useEffect } from 'react';
import {
  Store,
  CreditCard,
  Package,
  History,
  Settings,
  LogOut,
  MapPin,
  Receipt,
  FileText,
  Plus,
  Building2,
  RotateCcw,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { StoreProfile, ActiveTab } from '../types';
import { PosBilling } from './PosBilling';
import { ProductMaster } from './ProductMaster';
import { SalesHistory } from './SalesHistory';
import { StoreSettings } from './StoreSettings';
import { PurchaseBills } from './PurchaseBills';

export type PurchaseSubTab = 'new' | 'ledger' | 'vendors' | 'returns';

export interface DashboardShellProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onSignOut: () => Promise<void>;
  onRefreshProfile?: () => Promise<void>;
  initialTab?: ActiveTab;
  initialPurchaseSubTab?: PurchaseSubTab;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  currentUser,
  userProfile,
  onSignOut,
  initialTab = 'pos',
  initialPurchaseSubTab = 'new',
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [activePurchaseSubTab, setActivePurchaseSubTab] = useState<PurchaseSubTab>(initialPurchaseSubTab);
  const [isPurchaseExpanded, setIsPurchaseExpanded] = useState<boolean>(initialTab === 'purchase-bills');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState<StoreProfile | null>(null);

  // Auto-expand purchase accordion when activeTab becomes 'purchase-bills'
  useEffect(() => {
    if (activeTab === 'purchase-bills') {
      setIsPurchaseExpanded(true);
    }
  }, [activeTab]);

  // Derive active profile directly without runaway useEffect syncing
  const activeProfile = editedProfile || userProfile;

  const businessName =
    activeProfile?.business_name ||
    activeProfile?.store_name ||
    currentUser?.user_metadata?.business_name ||
    currentUser?.user_metadata?.store_name ||
    'MITTAL DEPARTMENTAL STORE';

  const city =
    activeProfile?.city ||
    currentUser?.user_metadata?.city ||
    'India';

  const planName = activeProfile?.plan_name || 'Launch Beta (All Modules)';

  // Memoized navigation callbacks to prevent downstream re-renders
  const navigateToProducts = useCallback(() => {
    setActiveTab('products');
    setIsMobileDrawerOpen(false);
  }, []);

  const navigateToSettings = useCallback(() => {
    setActiveTab('settings');
    setIsMobileDrawerOpen(false);
  }, []);

  const navigateToPos = useCallback(() => {
    setActiveTab('pos');
    setIsMobileDrawerOpen(false);
  }, []);

  const handlePurchaseSubTabSelect = (subTab: PurchaseSubTab) => {
    setActiveTab('purchase-bills');
    setActivePurchaseSubTab(subTab);
    setIsPurchaseExpanded(true);
    setIsMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col justify-between selection:bg-indigo-500/20 selection:text-indigo-700">
      {/* ================= 1. CLEAN TOP HEADER ================= */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mobile/Desktop Sidebar Toggle + Store Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Sidebar Collapse Toggle Button */}
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileDrawerOpen((prev) => !prev);
                } else {
                  setIsSidebarOpen((prev) => !prev);
                }
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
              title="Toggle Sidebar"
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
            </button>

            {/* Store Logo & Store Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] shadow-xs shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-[#4338CA]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-sm md:text-base font-bold text-[#0F172A] tracking-tight leading-tight truncate uppercase">
                    {businessName}
                  </h1>
                  <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 font-mono shrink-0">
                    {planName}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{city}</span>
                  <span>•</span>
                  <span className="text-[#0D9488] font-mono font-medium shrink-0">nivopos.in</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right: Sign Out */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSignOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-semibold text-slate-700 hover:text-rose-600 transition-colors shadow-xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= 2. WORKSPACE LAYOUT (SIDEBAR + CONTENT) ================= */}
      <div className="flex-1 flex flex-row relative min-h-0">
        {/* Mobile Backdrop Overlay */}
        {isMobileDrawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-600/30 backdrop-blur-xs md:hidden"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
        )}

        {/* Left Vertical Sidebar (~240px wide, collapsible on smaller screens) */}
        <aside
          className={`
            fixed md:sticky top-0 md:top-[57px] left-0 z-50 md:z-30
            h-screen md:h-[calc(100vh-57px)] w-60 shrink-0
            bg-white border-r border-slate-200
            flex flex-col justify-between
            transition-transform duration-200 ease-in-out
            ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isSidebarOpen ? 'md:flex' : 'md:hidden'}
          `}
        >
          {/* Top Section: Navigation Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {/* Mobile-only close button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 md:hidden">
              <span className="text-xs font-bold text-[#0F172A]">Menu Navigation</span>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Counter POS */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('pos');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'pos'
                  ? 'bg-[#4338CA] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Counter POS</span>
            </button>

            {/* 2. Product Master */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('products');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'products'
                  ? 'bg-[#4338CA] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Product Master</span>
            </button>

            {/* 3. Purchase Bills Expandable Dropdown Accordion */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'purchase-bills') {
                    setActiveTab('purchase-bills');
                    setIsPurchaseExpanded(true);
                  } else {
                    setIsPurchaseExpanded((prev) => !prev);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  activeTab === 'purchase-bills'
                    ? 'bg-indigo-50 text-[#4338CA] border border-indigo-100/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Receipt className="w-4 h-4 text-[#4338CA] shrink-0" />
                  <span className="truncate">Purchase Bills</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isPurchaseExpanded ? 'rotate-180 text-[#4338CA]' : ''
                  }`}
                />
              </button>

              {/* Indented Sub-Items */}
              {isPurchaseExpanded && (
                <div className="ml-3.5 pl-3 my-1 space-y-0.5 border-l-2 border-indigo-200">
                  {/* + Add New Purchase */}
                  <button
                    type="button"
                    onClick={() => handlePurchaseSubTabSelect('new')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                      activeTab === 'purchase-bills' && activePurchaseSubTab === 'new'
                        ? 'bg-[#4338CA] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">+ Add New Purchase</span>
                  </button>

                  {/* Invoices Ledger */}
                  <button
                    type="button"
                    onClick={() => handlePurchaseSubTabSelect('ledger')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                      activeTab === 'purchase-bills' && activePurchaseSubTab === 'ledger'
                        ? 'bg-[#4338CA] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Invoices Ledger</span>
                  </button>

                  {/* Vendors Directory */}
                  <button
                    type="button"
                    onClick={() => handlePurchaseSubTabSelect('vendors')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                      activeTab === 'purchase-bills' && activePurchaseSubTab === 'vendors'
                        ? 'bg-[#4338CA] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Vendors Directory</span>
                  </button>

                  {/* Sale Return / Debit Note */}
                  <button
                    type="button"
                    onClick={() => handlePurchaseSubTabSelect('returns')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                      activeTab === 'purchase-bills' && activePurchaseSubTab === 'returns'
                        ? 'bg-[#4338CA] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Sale Return / Debit Note</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Sales History */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('sales');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'sales'
                  ? 'bg-[#4338CA] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Sales History</span>
            </button>

            {/* 5. Store Setup */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === 'settings'
                  ? 'bg-[#4338CA] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Store Setup</span>
            </button>
          </div>

          {/* Bottom Sidebar Brand Status Card */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/70 m-2 rounded-xl">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span className="truncate">Nivo Retail POS</span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 font-mono shrink-0">
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Store Engine • Multi-Tenant
            </p>
          </div>
        </aside>

        {/* ================= 3. MAIN ACTIVE VIEW ================= */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'pos' && (
            <PosBilling
              currentUser={currentUser}
              userProfile={activeProfile}
              onNavigateToProducts={navigateToProducts}
              onNavigateToSettings={navigateToSettings}
            />
          )}

          {activeTab === 'products' && (
            <ProductMaster
              currentUser={currentUser}
              onNavigateToPos={navigateToPos}
            />
          )}

          {activeTab === 'purchase-bills' && (
            <PurchaseBills
              currentUser={currentUser}
              userProfile={activeProfile}
              onNavigateToProducts={navigateToProducts}
              activeSubTab={activePurchaseSubTab}
              onSelectSubTab={(tab) => {
                if (tab === 'new' || tab === 'new-purchase') setActivePurchaseSubTab('new');
                else if (tab === 'ledger') setActivePurchaseSubTab('ledger');
                else if (tab === 'vendors') setActivePurchaseSubTab('vendors');
                else if (tab === 'returns' || tab === 'debit-note') setActivePurchaseSubTab('returns');
              }}
            />
          )}

          {activeTab === 'sales' && (
            <SalesHistory
              currentUser={currentUser}
              userProfile={activeProfile}
              onNavigateToPos={navigateToPos}
            />
          )}

          {activeTab === 'settings' && (
            <StoreSettings
              currentUser={currentUser}
              userProfile={activeProfile}
              onProfileUpdated={(updated) => setEditedProfile(updated)}
            />
          )}
        </main>
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-[11px] text-slate-500">
        Nivo POS • Module 3 (Counter POS Billing, Product Master & Sales History) • Multi-Tenant Active
      </footer>
    </div>
  );
};
