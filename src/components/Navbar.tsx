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
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 py-3 shadow-sm'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 p-2 transition-transform duration-300 group-hover:scale-105 shadow-sm">
              <Store className="w-5 h-5 text-[#4338CA]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-[#0F172A] font-sans">
                  NIVO<span className="text-[#4338CA]">POS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-teal-50 text-[#0D9488] border border-teal-200">
                  .in
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight">
                Operating System for Bharat Retail
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-[#4338CA] transition-colors"
            >
              OS Modules
            </a>
            <a
              href="#metrics"
              className="text-sm font-medium text-slate-600 hover:text-[#4338CA] transition-colors"
            >
              MSME Impact
            </a>
            <a
              href="#comparison"
              className="text-sm font-medium text-slate-600 hover:text-[#4338CA] transition-colors"
            >
              Traditional vs Nivo
            </a>
            <a
              href="#sectors"
              className="text-sm font-medium text-slate-600 hover:text-[#4338CA] transition-colors"
            >
              Who We Serve
            </a>
          </nav>

          {/* Action CTAs / User Session */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-[#0F172A]">
                    {userProfile?.store_name || userProfile?.owner_name || 'My Store'}
                  </span>
                  <span className="text-[10px] text-[#0D9488] flex items-center justify-end gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {userProfile?.is_approved ? 'Verified Merchant' : 'Approval Pending'}
                  </span>
                </div>
                <button
                  onClick={() => onSignOut()}
                  className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 px-3 py-2 rounded-xl transition-all shadow-sm"
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
                  className="text-sm font-semibold text-slate-700 hover:text-[#4338CA] px-4 py-2 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] font-semibold text-sm text-white shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sign Up Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 focus:outline-none"
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
          <div className="md:hidden mt-3 p-4 bg-white border border-slate-200 rounded-2xl flex flex-col gap-3 shadow-xl">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-700 hover:text-[#4338CA] py-1"
            >
              OS Modules
            </a>
            <a
              href="#metrics"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-700 hover:text-[#4338CA] py-1"
            >
              MSME Impact
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-700 hover:text-[#4338CA] py-1"
            >
              Traditional vs Nivo
            </a>
            <a
              href="#sectors"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-700 hover:text-[#4338CA] py-1"
            >
              Who We Serve
            </a>
            {!currentUser && (
              <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="w-full text-center text-sm font-semibold text-slate-700 py-2 rounded-xl bg-slate-100"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="w-full text-center text-sm font-semibold text-white py-2 rounded-xl bg-[#4338CA]"
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
