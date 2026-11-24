import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Store, ShieldCheck, LogOut } from 'lucide-react';
import { StoreProfile } from '../types';

interface NavbarProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  currentUser: any;
  userProfile: StoreProfile | null;
  onSignOut: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  currentUser,
  userProfile,
  onSignOut,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070A11]/85 backdrop-blur-md border-b border-slate-800/80 py-3 shadow-lg shadow-black/40'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-[1.5px] transition-transform duration-300 group-hover:scale-105 shadow-glow-emerald">
              <div className="w-full h-full bg-[#070A11] rounded-[10px] flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white font-sans">
                  NIVO<span className="text-emerald-400">POS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  .in
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                Operating System for Bharat Retail
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors"
            >
              OS Modules
            </a>
            <a
              href="#metrics"
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors"
            >
              MSME Impact
            </a>
            <a
              href="#comparison"
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors"
            >
              Traditional vs Nivo
            </a>
            <a
              href="#sectors"
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 transition-colors"
            >
              Who We Serve
            </a>
          </nav>

          {/* Action CTAs / User Session */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white">
                    {userProfile?.store_name || userProfile?.owner_name || 'My Store'}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {userProfile?.is_approved ? 'Verified Merchant' : 'Approval Pending'}
                  </span>
                </div>
                <button
                  onClick={() => onSignOut()}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-rose-400 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-3 py-2 rounded-lg transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700/60"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="relative group overflow-hidden rounded-xl p-[1px] focus:outline-none"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-xl transition-all duration-300 group-hover:opacity-90 group-hover:shadow-glow-emerald"></span>
                  <span className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 font-semibold text-sm text-white group-hover:bg-opacity-80 transition-all duration-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Sign Up Free</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-2xl">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 py-1"
            >
              OS Modules
            </a>
            <a
              href="#metrics"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 py-1"
            >
              MSME Impact
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 py-1"
            >
              Traditional vs Nivo
            </a>
            <a
              href="#sectors"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-300 hover:text-emerald-400 py-1"
            >
              Who We Serve
            </a>
            {!currentUser && (
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="w-full text-center text-sm font-medium text-slate-300 py-2 rounded-lg bg-slate-800/80"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="w-full text-center text-sm font-semibold text-slate-950 py-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400"
                >
                  Sign Up Free
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
