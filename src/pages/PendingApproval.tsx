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
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-between relative overflow-hidden bg-grid-pattern">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-500/10 via-cyan-500/5 to-transparent blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-[1.5px] flex items-center justify-center shadow-glow-emerald">
              <div className="w-full h-full bg-[#070A11] rounded-[10px] flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-lg tracking-tight">
                  NIVO<span className="text-emerald-400">POS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  .in
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Merchant Onboarding Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Status</span>
            </button>
            <button
              onClick={() => onSignOut()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 text-xs text-slate-300 hover:text-rose-400 transition-all"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-4 shadow-lg shadow-amber-500/5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Registered on nivopos.in — Awaiting Role & Module Activation</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Welcome to Nivo POS, <span className="text-emerald-400">{ownerName}</span>!
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            Your store account has been successfully created. Our verification desk is provisioning your counter POS modules and business credentials.
          </p>

          {refreshNotice && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-cyan-400 mt-2 font-mono"
            >
              ✓ {refreshNotice}
            </motion.p>
          )}
        </motion.div>

        {/* Registered Business Card & Verification Details */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Business Card Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="md:col-span-7 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900 border border-slate-800 p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                  Registered Business Profile
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                REF #{refId}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  Store / Business Name
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">{storeName}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    Store Owner / Merchant
                  </span>
                  <p className="font-semibold text-slate-200 mt-0.5">{ownerName}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    Business Category
                  </span>
                  <p className="font-semibold text-emerald-400 mt-0.5">{category}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    Registered Mobile
                  </span>
                  <p className="font-mono text-slate-200 mt-0.5">{phone}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    City Location
                  </span>
                  <p className="font-semibold text-slate-200 mt-0.5">{city}</p>
                </div>
              </div>

              {email && email !== 'Not provided' && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    Store Email
                  </span>
                  <p className="font-mono text-slate-300 mt-0.5">{email}</p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Registered: {regDate}</span>
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Pending Activation
                </span>
              </div>
            </div>
          </motion.div>

          {/* Activation Progression Steps & Support */}
          <div className="md:col-span-5 flex flex-col gap-5">
            {/* Steps Timeline Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4">
                Activation Checklist
              </h4>

              <div className="space-y-4 text-xs">
                {/* Step 1: Done */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Store Registration & OTP</h5>
                    <p className="text-[11px] text-slate-400">Mobile identity verified on nivopos.in</p>
                  </div>
                </div>

                {/* Step 2: In Review */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 animate-spin text-amber-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-300">Merchant Desk Review</h5>
                    <p className="text-[11px] text-slate-400">
                      Standard review usually takes under 2-4 hours during business hours.
                    </p>
                  </div>
                </div>

                {/* Step 3: Pending */}
                <div className="flex items-start gap-3 opacity-60">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-300">Terminal & Module Access</h5>
                    <p className="text-[11px] text-slate-500">
                      POS Billing, Dynamic UPI Soundbox & Hyperlocal Dispatch unlocked.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Instant Fast-Track Support Card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-white font-bold mb-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Need expedited activation?</span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-3 text-[11px]">
                Reach out to our onboarding assistance team with your Reference ID <strong className="text-emerald-400">#{refId}</strong>:
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <a href="mailto:support@nivopos.in" className="hover:underline">support@nivopos.in</a>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>+91 98765 43210 (WhatsApp Available)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-[11px] text-slate-500">
        Nivo POS (<a href="https://nivopos.in" className="hover:text-emerald-400">nivopos.in</a>) • India's Next-Gen Retail & Distribution Operating System
      </footer>
    </div>
  );
};
