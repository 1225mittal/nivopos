import React, { useState } from 'react';
import {
  Store,
  CreditCard,
  Package,
  History,
  Settings,
  LogOut,
  MapPin,
  CheckCircle2,
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
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="border-b border-slate-800 bg-[#0B1120] sticky top-0 z-40 px-4 sm:px-6 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Store Brand & Location */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-[1.5px] flex items-center justify-center shadow-glow-emerald">
              <div className="w-full h-full bg-[#070A11] rounded-[10px] flex items-center justify-center">
                <Store className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight leading-tight">
                  {businessName}
                </h1>
                <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {planName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>{city}</span>
                <span>•</span>
                <span className="text-emerald-400 font-mono">nivopos.in</span>
              </p>
            </div>
          </div>

          {/* 4 Real Working Views Navigation */}
          <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'pos'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Counter POS</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'products'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Product Master</span>
            </button>

            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'sales'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Sales History</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'settings'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-xs text-slate-300 hover:text-rose-400 transition-colors"
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
      <footer className="border-t border-slate-900 py-3 text-center text-[11px] text-slate-600">
        Nivo POS • Module 3 (Counter POS Billing, Product Master & Sales History) • Multi-Tenant Active
      </footer>
    </div>
  );
};
