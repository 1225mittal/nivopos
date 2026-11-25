import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Phone,
  Mail,
  Lock,
  Store,
  User,
  MapPin,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BUSINESS_CATEGORIES, BusinessCategory, AuthMode, AuthMethod } from '../types';

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
  const [method, setMethod] = useState<AuthMethod>('phone'); // Phone OTP is primary for India

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('Kirana & Grocery');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP flow state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(45);

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode with props
  useEffect(() => {
    setAuthMode(initialMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setOtpSent(false);
  }, [initialMode, isOpen]);

  // OTP countdown effect
  useEffect(() => {
    let timer: any;
    if (otpSent && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, otpCountdown]);

  if (!isOpen) return null;

  // Clean phone input (ensure 10 digits without prefix for UI state)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 10) {
      setPhone(raw);
    }
  };

  // Helper to upsert into public.store_profiles with instant owner access & active launch beta plan
  const upsertStoreProfile = async (user: any) => {
    try {
      const sanitizedPhone = phone
        ? phone.startsWith('+91')
          ? phone
          : `+91${phone}`
        : user.phone || '';

      const now = new Date().toISOString();
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      // Check if user already has an existing profile to preserve existing store names if not re-entered
      const { data: existingProfile } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const profileData = {
        id: user.id,
        owner_name:
          fullName.trim() ||
          existingProfile?.owner_name ||
          user.user_metadata?.full_name ||
          'Store Owner',
        store_name:
          storeName.trim() ||
          existingProfile?.store_name ||
          user.user_metadata?.store_name ||
          'My Store',
        phone: sanitizedPhone || existingProfile?.phone || '',
        email: email.trim() || existingProfile?.email || user.email || '',
        city: city.trim() || existingProfile?.city || user.user_metadata?.city || 'India',
        business_category:
          category ||
          existingProfile?.business_category ||
          user.user_metadata?.business_category ||
          'Kirana & Grocery',
        role: 'owner',
        is_approved: true,
        plan_name: 'Launch Beta (All Modules)',
        subscription_status: 'active',
        billing_cycle: existingProfile?.billing_cycle || 'Free Beta',
        next_renewal_date: existingProfile?.next_renewal_date || nextYear.toISOString(),
        last_login_at: now,
        updated_at: now,
      };

      const { error: upsertErr } = await supabase
        .from('store_profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (upsertErr) {
        console.warn('[Nivo POS] store_profiles upsert note:', upsertErr.message);
      }
    } catch (err) {
      console.error('[Nivo POS] Profile upsert error:', err);
    }
  };

  // 1. Submit Phone OTP (Request OTP)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (phone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (authMode === 'signup' && (!fullName.trim() || !storeName.trim())) {
      setErrorMsg('Please enter your Full Name and Store Name.');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = `+91${phone}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            full_name: fullName.trim(),
            store_name: storeName.trim(),
            city: city.trim(),
            business_category: category,
          },
        },
      });

      if (error) {
        throw error;
      }

      setOtpSent(true);
      setOtpCountdown(45);
      setSuccessMsg(`6-digit verification code sent to +91 ${phone}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to send SMS OTP. Please check your number.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify Phone OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP code.');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = `+91${phone}`;

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode.trim(),
        type: 'sms',
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        await upsertStoreProfile(data.user);
        setSuccessMsg('Phone verified! Launching your Nivo POS dashboard...');
        setTimeout(() => {
          onAuthSuccess(data.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Authentication Flow
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim() || !storeName.trim()) {
        setErrorMsg('Please enter your Full Name and Store Name.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return;
      }
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
              store_name: storeName.trim(),
              phone: phone ? `+91${phone}` : '',
              city: city.trim(),
              business_category: category,
            },
          },
        });

        if (error) throw error;

        if (data?.user) {
          await upsertStoreProfile(data.user);
          setSuccessMsg('Account created! Activating all modules...');
          setTimeout(() => {
            onAuthSuccess(data.user);
            onClose();
          }, 700);
        }
      } else {
        // Sign In with email & password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        if (data?.user) {
          await upsertStoreProfile(data.user);
          setSuccessMsg('Welcome back! Launching your terminal...');
          setTimeout(() => {
            onAuthSuccess(data.user);
            onClose();
          }, 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
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
              ? 'Instant Launch Beta access with all core modules unlocked for your store.'
              : 'Sign in to access your counter terminal and store operating system.'}
          </p>
        </div>

        {/* Auth Method Toggle: Mobile OTP vs Email */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4F6F9] rounded-xl border border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setMethod('phone');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              method === 'phone'
                ? 'bg-white text-[#4338CA] border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Mobile OTP (+91)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod('email');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              method === 'email'
                ? 'bg-white text-[#4338CA] border border-indigo-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email & Password</span>
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

        {/* ================= METHOD 1: MOBILE OTP FLOW ================= */}
        {method === 'phone' && (
          <div>
            {!otpSent ? (
              // Step 1: Input Phone & (if signup) Store Info
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                {authMode === 'signup' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          City *
                        </label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Delhi NCR / Jaipur"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Business Category
                        </label>
                        <div className="relative">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                            className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white appearance-none"
                          >
                            {BUSINESS_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 10-Digit Mobile Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    10-Digit Indian Mobile Number *
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
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    We will send a 6-digit one-time password via SMS.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  className="w-full mt-2 py-3 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Get 6-Digit OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              // Step 2: 6-Digit OTP Verification Screen
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F4F6F9] border border-slate-200 text-center">
                  <p className="text-xs text-slate-700">
                    Enter the 6-digit code sent to{' '}
                    <strong className="text-[#4338CA] font-mono">+91 {phone}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[11px] text-[#0D9488] hover:underline font-semibold mt-1"
                  >
                    Change Number
                  </button>
                </div>

                <div>
                  <label className="block text-center text-xs font-semibold text-slate-700 mb-2">
                    Verification Code (OTP)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.6em] font-mono font-bold text-xl bg-[#F4F6F9] border border-indigo-300 rounded-xl py-3 text-[#4338CA] focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>
                    {otpCountdown > 0 ? (
                      `Resend code in ${otpCountdown}s`
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[#0D9488] hover:underline font-semibold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Resend OTP
                      </button>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Secured by Nivo SMS</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Verify & Launch Terminal</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================= METHOD 2: EMAIL & PASSWORD FLOW ================= */}
        {method === 'email' && (
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {authMode === 'signup' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Mumbai / Bengaluru"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Business Category
                    </label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as BusinessCategory)}
                        className="w-full bg-[#F4F6F9] border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white appearance-none"
                      >
                        {BUSINESS_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

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
            </div>

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
                    {authMode === 'signup' ? 'Create Store Profile' : 'Sign In to Store'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Toggle between Sign In / Sign Up */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
          {authMode === 'signup' ? (
            <p>
              Already registered on nivopos.in?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setOtpSent(false);
                  setErrorMsg(null);
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
                  setOtpSent(false);
                  setErrorMsg(null);
                }}
                className="text-[#4338CA] font-bold hover:underline"
              >
                Sign Up Free
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
