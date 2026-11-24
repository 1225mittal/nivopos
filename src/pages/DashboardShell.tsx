import React, { useState } from 'react';
import {
  Store,
  CreditCard,
  Package,
  History,
  Settings,
  LogOut,
  MapPin,
} from 'lucide-react';
import { StoreProfile, ActiveTab } from '../types';
import { PosBilling } from './PosBilling';
import { ProductsCatalog } from './ProductsCatalog';
import { SalesHistory } from './SalesHistory';
import { StoreSettings } from './StoreSettings';

interface DashboardShellProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onSignOut: () => Promise<void>;
  onRefreshProfile?: () => Promise<void>;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  currentUser,
  userProfile,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [localProfile, setLocalProfile] = useState<StoreProfile | null>(userProfile);

  // Sync when prop updates
  React.useEffect(() => {
    setLocalProfile(userProfile);
  }, [userProfile]);

  const businessName =
    localProfile?.business_name ||
    localProfile?.store_name ||
    currentUser?.user_metadata?.store_name ||
    'My Store';

  const city =
    localProfile?.city ||
    currentUser?.user_metadata?.city ||
    'India';

  const planName = localProfile?.plan_name || 'Launch Beta (All Modules)';

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col justify-between selection:bg-indigo-500/20 selection:text-indigo-700">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Store Brand & Location */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm">
              <Store className="w-5 h-5 text-[#4338CA]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight leading-tight">
                  {businessName}
                </h1>
                <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 font-mono">
                  {planName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{city}</span>
                <span>•</span>
                <span className="text-[#0D9488] font-mono font-medium">nivopos.in</span>
              </p>
            </div>
          </div>

          {/* 4 Real Working Views Navigation */}
          <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pos'
                  ? 'bg-white text-[#0D9488] shadow-sm border border-teal-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Counter POS</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'products'
                  ? 'bg-white text-[#0D9488] shadow-sm border border-teal-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Product Master</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'sales'
                  ? 'bg-white text-[#0D9488] shadow-sm border border-teal-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Sales History</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-[#0D9488] shadow-sm border border-teal-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Store Setup</span>
            </button>
          </nav>

          {/* Sign Out Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSignOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs text-slate-700 hover:text-rose-600 transition-colors shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ACTIVE TAB CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {activeTab === 'pos' && (
          <PosBilling
            currentUser={currentUser}
            userProfile={localProfile}
            onNavigateToProducts={() => setActiveTab('products')}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'products' && (
          <ProductsCatalog
            currentUser={currentUser}
            onNavigateToPos={() => setActiveTab('pos')}
          />
        )}

        {activeTab === 'sales' && (
          <SalesHistory
            currentUser={currentUser}
            userProfile={localProfile}
            onNavigateToPos={() => setActiveTab('pos')}
          />
        )}

        {activeTab === 'settings' && (
          <StoreSettings
            currentUser={currentUser}
            userProfile={localProfile}
            onProfileUpdated={(updated) => setLocalProfile(updated)}
          />
        )}
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-[11px] text-slate-500">
        Nivo POS • Module 3 (Counter POS Billing, Product Master & Sales History) • Multi-Tenant Active
      </footer>
    </div>
  );
};
