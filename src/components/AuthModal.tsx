import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Mail,
  Lock,
  Store,
  User,
  Phone,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthMode } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onAuthSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
  onAuthSuccess,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode with props
  useEffect(() => {
    setAuthMode(initialMode);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Clean phone input (ensure 10 digits for Indian numbers)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 10) {
      setPhone(raw);
    }
  };

  // Helper to upsert into public.store_profiles with admin access and verified approval
  const upsertStoreProfile = async (user: any) => {
    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const cleanPhone = cleanDigits
        ? `+91${cleanDigits}`
        : user.phone || user.user_metadata?.phone || '';

      const now = new Date().toISOString();
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      // Check for existing profile to preserve any existing details
      const { data: existingProfile } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const profilePayload: any = {
        id: user.id,
        full_name:
          fullName.trim() ||
          existingProfile?.full_name ||
          existingProfile?.owner_name ||
          user.user_metadata?.full_name ||
          'Store Owner',
        owner_name:
          fullName.trim() ||
          existingProfile?.owner_name ||
          existingProfile?.full_name ||
          user.user_metadata?.full_name ||
          'Store Owner',
        business_name:
          storeName.trim() ||
          existingProfile?.business_name ||
          existingProfile?.store_name ||
          user.user_metadata?.business_name ||
          user.user_metadata?.store_name ||
          'My Store',
        store_name:
          storeName.trim() ||
          existingProfile?.store_name ||
          existingProfile?.business_name ||
          user.user_metadata?.store_name ||
          user.user_metadata?.business_name ||
          'My Store',
        phone: cleanPhone || existingProfile?.phone || '',
        email: email.trim().toLowerCase() || existingProfile?.email || user.email || '',
        role: 'admin',
        is_approved: true,
        plan_name: existingProfile?.plan_name || 'Launch Beta (All Modules)',
        subscription_status: existingProfile?.subscription_status || 'active',
        billing_cycle: existingProfile?.billing_cycle || 'Free Beta',
        next_renewal_date: existingProfile?.next_renewal_date || nextYear.toISOString(),
        last_login_at: now,
        updated_at: now,
      };

      const { error: upsertErr } = await supabase
        .from('store_profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (upsertErr) {
        console.warn('[Nivo POS] store_profiles upsert note:', upsertErr.message);
        // Resilient fallback for alternative column sets
        const fallbackData: any = {
          id: user.id,
          owner_name: profilePayload.owner_name,
          store_name: profilePayload.store_name,
          phone: profilePayload.phone,
          email: profilePayload.email,
          role: 'admin',
          is_approved: true,
          last_login_at: now,
          updated_at: now,
        };
        await supabase
          .from('store_profiles')
          .upsert(fallbackData, { onConflict: 'id' });
      }
    } catch (err) {
      console.error('[Nivo POS] Profile upsert error:', err);
    }
  };

  // Direct Email & Password Sign Up / Sign In Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!storeName.trim()) {
        setErrorMsg('Please enter your store or business name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
    }

    setLoading(true);

    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const cleanPhone = cleanDigits ? `+91${cleanDigits}` : '';

      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
              owner_name: fullName.trim(),
              business_name: storeName.trim(),
              store_name: storeName.trim(),
              phone: cleanPhone,
            },
          },
        });

        if (error) throw error;

        const authUser = data?.user;
        if (!authUser) {
          throw new Error('Sign up could not be completed. Please try again.');
        }

        // Immediately upsert into public.store_profiles so they enter directly
        await upsertStoreProfile(authUser);

        setSuccessMsg('Store account created successfully! Launching terminal...');
        setTimeout(() => {
          onAuthSuccess(authUser);
          onClose();
        }, 500);
      } else {
        // Direct Sign In with Email & Password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) throw error;

        const authUser = data?.user;
        if (!authUser) {
          throw new Error('Sign in failed. Please verify credentials.');
        }

        // Ensure store profile is updated / synced
        await upsertStoreProfile(authUser);

        setSuccessMsg('Welcome back! Launching your terminal...');
        setTimeout(() => {
          onAuthSuccess(authUser);
          onClose();
        }, 400);
      }
    } catch (err: any) {
      console.error('[AuthModal] Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Modal Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-800/40 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 my-auto text-slate-900 overflow-hidden"
      >
        {/* Subtle decorative accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-teal-50 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#0F172A]">
              NIVO<span className="text-[#4338CA]">POS</span>
              <span className="text-xs text-slate-500 font-normal">.in</span>
            </span>
          </div>
          <h3 className="text-2xl font-bold text-[#0F172A]">
            {authMode === 'signup' ? 'Start Free Store Account' : 'Welcome Back, Merchant'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {authMode === 'signup'
              ? 'Direct access to your counter terminal and store operating system.'
              : 'Sign in with your email and password to access your counter terminal.'}
          </p>
        </div>

        {/* Auth Mode Toggle: Sign In vs Sign Up */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4F6F9] rounded-xl border border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              authMode === 'signin'
                ? 'bg-white text-[#4338CA] border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              authMode === 'signup'
                ? 'bg-white text-[#4338CA] border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Store Account
          </button>
        </div>

        {/* Alerts / Error feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Direct Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authMode === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Rajesh Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              {/* Store / Business Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Store / Business Name *
                </label>
                <div className="relative">
                  <Store className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Sharma Super Mart"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-2 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-xs font-bold text-slate-700 font-mono">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full bg-[#F4F6F9] border border-slate-300 rounded-r-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono tracking-wider focus:outline-none focus:border-[#4338CA] focus:bg-white"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Store Email Address *
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="owner@store.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
              />
            </div>
            {authMode === 'signup' && (
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Minimum 6 characters
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {authMode === 'signup' ? 'Create Store Account' : 'Sign In to Store'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle between Sign In / Sign Up */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
          {authMode === 'signup' ? (
            <p>
              Already registered on nivopos.in?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-[#4338CA] font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New store merchant?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-[#4338CA] font-bold hover:underline"
              >
                Create Free Account
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
