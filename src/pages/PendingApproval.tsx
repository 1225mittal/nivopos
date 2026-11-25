import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  Clock,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Mail,
  Phone,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { StoreProfile } from '../types';

interface PendingApprovalProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onRefreshProfile: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({
  currentUser,
  userProfile,
  onRefreshProfile,
  onSignOut,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      await onRefreshProfile();
      setRefreshNotice('Profile status checked with server.');
      setTimeout(() => setRefreshNotice(null), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const storeName =
    userProfile?.store_name ||
    currentUser?.user_metadata?.store_name ||
    'Registered Store';
  const ownerName =
    userProfile?.owner_name ||
    currentUser?.user_metadata?.full_name ||
    'Store Merchant';
  const phone =
    userProfile?.phone ||
    currentUser?.phone ||
    currentUser?.user_metadata?.phone ||
    'Registered via Mobile';
  const email =
    userProfile?.email ||
    currentUser?.email ||
    'Not provided';
  const city =
    userProfile?.city ||
    currentUser?.user_metadata?.city ||
    'Pan India';
  const category =
    userProfile?.business_category ||
    currentUser?.user_metadata?.business_category ||
    'Retail & Distribution';

  const regDate = userProfile?.created_at
    ? new Date(userProfile.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  const refId = (userProfile?.id || currentUser?.id || 'NIVO').slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 flex flex-col justify-between relative overflow-hidden">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#0F172A] text-lg tracking-tight">
                  NIVO<span className="text-[#4338CA]">POS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-teal-50 text-[#0D9488] border border-teal-200">
                  .in
                </span>
              </div>
              <p className="text-[10px] text-slate-500">Merchant Onboarding Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs text-slate-700 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#4338CA] ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Status</span>
            </button>
            <button
              onClick={() => onSignOut()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs text-slate-700 hover:text-rose-600 transition-all shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 flex-1 flex flex-col justify-center w-full z-10">
        {/* Status Announcement Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Registered on nivopos.in — Awaiting Role & Module Activation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight">
            Welcome to Nivo POS, <span className="text-[#4338CA]">{ownerName}</span>!
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
            Your store account has been successfully created. Our verification desk is provisioning your counter POS modules and business credentials.
          </p>

          {refreshNotice && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0D9488] text-xs font-mono"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{refreshNotice}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Profile Details Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Store Profile Summary</h2>
              <p className="text-xs text-slate-500">Credentials submitted for verification</p>
            </div>
            <span className="text-xs font-mono text-[#4338CA] bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              REF ID: #{refId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Store / Business Name</span>
              <span className="font-bold text-[#0F172A] text-sm mt-0.5 block">{storeName}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Proprietor Name</span>
              <span className="font-bold text-[#0F172A] text-sm mt-0.5 block">{ownerName}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Registered Contact</span>
              <span className="font-mono text-slate-800 text-xs mt-0.5 block">{phone}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Business Category & City</span>
              <span className="font-medium text-slate-800 text-xs mt-0.5 block">{category} • {city}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-500">
        Nivo POS • Verification Desk Active • nivopos.in
      </footer>
    </div>
  );
};
