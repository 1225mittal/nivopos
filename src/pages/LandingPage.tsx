import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Receipt,
  FileText,
  Camera,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Printer,
  Share2,
  Users,
  Award,
  Zap,
  HelpCircle,
  Mail,
  Phone,
  Layers,
  ShoppingBag,
  IndianRupee,
  Check,
} from 'lucide-react';
import { StoreProfile } from '../types';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  currentUser: any;
  userProfile: StoreProfile | null;
  onSignOut: () => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  currentUser,
  userProfile,
  onSignOut,
}) => {
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ---------------- 1. HERO INTERACTIVE COUNTER PREVIEW STATE ----------------
  const [heroItems, setHeroItems] = useState([
    { id: 1, name: 'Aashirvaad Shudh Chakki Atta', unit: '5 kg', price: 245, qty: 1 },
    { id: 2, name: 'Fortune Sunlite Refined Oil', unit: '1 Ltr', price: 135, qty: 2 },
    { id: 3, name: 'Tata Salt Vacuum Evaporated', unit: '1 kg', price: 28, qty: 1 },
  ]);

  const updateHeroQty = (id: number, delta: number) => {
    setHeroItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      })
    );
  };

  const heroSubtotal = heroItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const heroGst = Math.round(heroSubtotal * 0.05 * 100) / 100; // 5% GST
  const heroGrandTotal = Math.round(heroSubtotal + heroGst);

  // ---------------- 2. SCROLL-DRIVEN TWO-HALF-SPHERE JOIN VISUAL ----------------
  const featuresRef = useRef<HTMLElement>(null);
  const [sphereProgress, setSphereProgress] = useState(0);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setSphereProgress(1);
      return;
    }

    const handleScroll = () => {
      if (!featuresRef.current) return;
      const rect = featuresRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate progress as section enters viewport (0 when top is at bottom, 1 when near center)
      const start = windowHeight;
      const end = windowHeight * 0.35;
      const current = rect.top;

      if (current > start) {
        setSphereProgress(0);
      } else if (current < end) {
        setSphereProgress(1);
      } else {
        const p = 1 - (current - end) / (start - end);
        setSphereProgress(Math.min(1, Math.max(0, p)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ---------------- 3. INTERACTIVE FEATURE BLOCKS STATE ----------------
  // Feature 1: Customer Khata
  const [khataReminderSent, setKhataReminderSent] = useState(false);

  // Feature 2: WhatsApp vs Print Toggle
  const [billReceiptFormat, setBillReceiptFormat] = useState<'whatsapp' | 'thermal'>('whatsapp');

  // Feature 3: Damage Return
  const [damageLogged, setDamageLogged] = useState(false);

  // Feature 4: Snap-to-List
  const [snapUploaded, setSnapUploaded] = useState(false);

  return (
    <div className="min-h-screen bg-nivo-bg text-nivo-ink font-sans selection:bg-nivo-indigo/20 selection:text-nivo-indigo">
      {/* ================= 1. CLEAN TOP NAVBAR ================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-nivo-border shadow-nivo-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Mark */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-nivo-indigo flex items-center justify-center text-white shadow-nivo-indigo group-hover:scale-105 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-nivo-ink font-sans">
                  NIVO<span className="text-nivo-indigo">POS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-nivo-teal/10 text-nivo-teal border border-nivo-teal/20">
                  .in
                </span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-semibold text-nivo-inkLight hover:text-nivo-indigo transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-semibold text-nivo-inkLight hover:text-nivo-indigo transition-colors"
            >
              Pricing
            </a>
            <a
              href="#about"
              className="text-sm font-semibold text-nivo-inkLight hover:text-nivo-indigo transition-colors"
            >
              About
            </a>
          </nav>

          {/* CTA & User Status */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-nivo-ink">
                    {userProfile?.business_name || userProfile?.store_name || 'My Store'}
                  </span>
                  <span className="text-[10px] text-nivo-teal font-medium flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Logged In
                  </span>
                </div>
                <button
                  onClick={() => onSignOut()}
                  className="px-3 py-1.5 text-xs font-semibold text-nivo-muted hover:text-nivo-rose border border-nivo-border rounded-xl bg-white hover:bg-slate-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="text-xs sm:text-sm font-semibold text-nivo-inkLight hover:text-nivo-indigo px-3 py-2 rounded-xl transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-nivo-indigo hover:bg-nivo-indigoHover text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-nivo-indigo transition-all transform hover:-translate-y-0.5"
                >
                  <span>Start Free Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-nivo-inkLight hover:text-nivo-ink rounded-lg focus:outline-none"
              aria-label="Toggle Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-nivo-border px-4 py-3 space-y-2 shadow-nivo-dropdown">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-nivo-ink"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-nivo-ink"
            >
              Pricing
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-nivo-ink"
            >
              About
            </a>
            {!currentUser && (
              <div className="pt-2 border-t border-nivo-border flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="w-full text-center py-2 text-sm font-semibold text-nivo-ink bg-slate-50 border border-nivo-border rounded-xl"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="w-full text-center py-2 text-sm font-bold text-white bg-nivo-indigo hover:bg-nivo-indigoHover rounded-xl shadow-nivo-indigo"
                >
                  Start Free Account
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ================= 2. SPLIT HERO SECTION ================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden bg-nivo-bg">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-nivo-indigo/5 via-nivo-teal/5 to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline & Value Prop */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Top Trust Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-nivo-border shadow-nivo-sm text-xs font-semibold text-nivo-indigo">
                <Sparkles className="w-3.5 h-3.5 text-nivo-teal" />
                <span>India's Next-Gen Retail & Distribution OS</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-nivo-ink tracking-tight leading-[1.12]">
                Counter Billing at Light Speed.{' '}
                <span className="text-nivo-indigo">Zero MDR UPI QR.</span>
              </h1>

              {/* Short Value Prop */}
              <p className="text-base sm:text-lg text-nivo-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Modernize your store counter in seconds. Replace bulky desktop machines with 3-second rapid barcode billing, instant dynamic UPI QR checkout, digital WhatsApp e-invoices, and automated customer Khata credit.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="px-6 py-3.5 rounded-xl bg-nivo-indigo hover:bg-nivo-indigoHover text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-nivo-indigo transition-all transform hover:-translate-y-0.5"
                >
                  <span>Start Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenAuth('signin')}
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-nivo-ink font-bold text-sm sm:text-base border border-nivo-border shadow-nivo-sm transition-all"
                >
                  Sign In to Store
                </button>
              </div>

              {/* Key Proof Points */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-nivo-muted font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-nivo-teal" />
                  <span>0% UPI Merchant Fees (MDR)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-nivo-teal" />
                  <span>No Expensive POS Hardware Required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-nivo-teal" />
                  <span>1-Click WhatsApp Khata</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Live Counter POS Preview Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-nivo-border shadow-nivo-dropdown relative">
                {/* Header of Preview */}
                <div className="flex items-center justify-between pb-4 border-b border-nivo-border mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-nivo-teal" />
                    <span className="text-xs font-bold uppercase tracking-wider text-nivo-ink">
                      Live Counter Checkout
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-nivo-indigo bg-nivo-indigo/10 px-2 py-0.5 rounded">
                    Tax Bill #8942
                  </span>
                </div>

                {/* Interactive Items List */}
                <div className="space-y-3 mb-5">
                  {heroItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-nivo-bg border border-nivo-border text-xs"
                    >
                      <div>
                        <p className="font-bold text-nivo-ink">{item.name}</p>
                        <p className="text-[10px] text-nivo-muted font-mono">
                          {item.unit} • ₹{item.price} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        <button
                          onClick={() => updateHeroQty(item.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-nivo-border text-nivo-ink font-bold hover:bg-slate-100 flex items-center justify-center transition-colors"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="font-bold text-nivo-ink w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateHeroQty(item.id, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-nivo-border text-nivo-ink font-bold hover:bg-slate-100 flex items-center justify-center transition-colors"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                        <span className="font-bold text-nivo-indigo w-14 text-right">
                          ₹{item.price * item.qty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Computed Totals */}
                <div className="p-3.5 rounded-2xl bg-nivo-bg border border-nivo-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-nivo-muted">
                    <span>Subtotal:</span>
                    <span className="font-mono text-nivo-ink font-semibold">₹{heroSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-nivo-muted">
                    <span>CGST (2.5%) + SGST (2.5%):</span>
                    <span className="font-mono text-nivo-teal font-semibold">+₹{heroGst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2 border-t border-nivo-border text-nivo-ink">
                    <span>Grand Total:</span>
                    <span className="font-mono text-nivo-indigo">₹{heroGrandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Simulated Dynamic UPI QR & WhatsApp Dispatch */}
                <div className="mt-4 pt-4 border-t border-nivo-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-nivo-teal/10 border border-nivo-teal/20 flex items-center justify-center text-nivo-teal">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-nivo-ink">Dynamic UPI QR</p>
                      <p className="text-[10px] text-nivo-muted">Scan to pay ₹{heroGrandTotal}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenAuth('signup')}
                    className="px-3.5 py-1.5 rounded-xl bg-nivo-indigo text-white font-bold text-xs hover:bg-nivo-indigoHover transition-colors flex items-center gap-1 shadow-nivo-sm"
                  >
                    <span>Try Free</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. SCROLL-LINKED FEATURE SECTIONS (#features) ================= */}
      <section id="features" ref={featuresRef} className="py-24 bg-white relative border-t border-nivo-border">
        {/* Scroll-Driven Two-Half-Sphere Join Visual */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center relative">
          {/* Subtle Twinkling Sparkles Accent */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nivo-teal/10 border border-nivo-teal/20 text-nivo-teal text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-nivo-amber animate-spin" />
            <span>Modern Retail Intelligence</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-nivo-ink tracking-tight">
            Built for Counter Realities.{' '}
            <span className="text-nivo-indigo">Engineered for Profit.</span>
          </h2>

          <p className="mt-3 text-sm sm:text-base text-nivo-muted max-w-2xl mx-auto">
            Everything your store needs to outpace quick-commerce giants, eliminate bad debts, and serve customers in seconds.
          </p>

          {/* Smooth Scroll-Driven Two-Half-Sphere Visual */}
          <div className="mt-10 flex items-center justify-center" aria-hidden="true">
            <div className="relative w-44 h-24 flex items-center justify-center overflow-visible">
              {/* Left Hemisphere (Indigo Gradient) */}
              <div
                className="w-16 h-16 rounded-l-full bg-gradient-to-l from-nivo-indigo to-indigo-400 opacity-90 shadow-nivo-indigo transition-transform duration-100 ease-out"
                style={{
                  transform: `translateX(-${(1 - sphereProgress) * 28}px) scale(${0.9 + sphereProgress * 0.1})`,
                }}
              />
              {/* Right Hemisphere (Teal Gradient) */}
              <div
                className="w-16 h-16 rounded-r-full bg-gradient-to-r from-nivo-teal to-teal-400 opacity-90 shadow-nivo-teal transition-transform duration-100 ease-out"
                style={{
                  transform: `translateX(${(1 - sphereProgress) * 28}px) scale(${0.9 + sphereProgress * 0.1})`,
                }}
              />

              {/* Sparkle center indicator when joined */}
              <div
                className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
                style={{ opacity: sphereProgress > 0.85 ? 1 : 0 }}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-nivo-indigo animate-ping" />
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] font-mono text-nivo-muted mt-1">
            {sphereProgress >= 0.95 ? '✓ Unified Offline + Cloud Retail Engine' : 'Scroll down to connect all modules'}
          </p>
        </div>

        {/* The 4 Feature Blocks in Exact Order */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* ---------------- FEATURE 1: CUSTOMER KHATA CREDIT & LOYALTY POINTS ---------------- */}
          <div className="p-8 sm:p-10 rounded-3xl bg-nivo-bg border border-nivo-border shadow-nivo-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-nivo-teal/10 border border-nivo-teal/20 flex items-center justify-center text-nivo-teal font-bold">
                01
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-nivo-ink">
                Customer Khata Credit & Loyalty Points
              </h3>
              <p className="text-sm text-nivo-muted leading-relaxed">
                Say goodbye to forgotten udhari and torn paper notebooks. Track every customer's credit balance with automatic WhatsApp payment reminders containing a dynamic UPI link. Plus, reward repeat visits by awarding loyalty cashback points on every purchase.
              </p>
              <ul className="space-y-2 text-xs text-nivo-inkLight font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                  <span>Automated WhatsApp reminders recover 94% of Udhar within 7 days.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                  <span>Points-based loyalty system brings neighbourhood families back every week.</span>
                </li>
              </ul>
            </div>

            {/* Interactive Widget for Feature 1 */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-nivo-border shadow-nivo-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-nivo-border">
                <div>
                  <h4 className="font-bold text-nivo-ink text-sm">Rajesh Sharma</h4>
                  <p className="text-[11px] text-nivo-muted font-mono">+91 98101 23456</p>
                </div>
                <span className="text-[11px] font-bold text-nivo-amber bg-nivo-amber/10 px-2 py-0.5 rounded border border-nivo-amber/20">
                  Active Khata
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-nivo-bg border border-nivo-border">
                  <span className="text-[10px] uppercase font-bold text-nivo-muted">Udhar Due</span>
                  <p className="text-lg font-black text-nivo-rose font-mono">₹1,420</p>
                </div>
                <div className="p-3 rounded-xl bg-nivo-bg border border-nivo-border">
                  <span className="text-[10px] uppercase font-bold text-nivo-muted">Loyalty Points</span>
                  <p className="text-lg font-black text-nivo-teal font-mono">280 pts</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setKhataReminderSent(true);
                  setTimeout(() => setKhataReminderSent(false), 3000);
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  khataReminderSent
                    ? 'bg-nivo-teal text-white shadow-nivo-teal'
                    : 'bg-nivo-indigo hover:bg-nivo-indigoHover text-white shadow-nivo-indigo'
                }`}
              >
                {khataReminderSent ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>✓ Payment Link Dispatched to WhatsApp!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send WhatsApp 1-Click UPI Payment Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ---------------- FEATURE 2: PAPERLESS WHATSAPP BILL VS THERMAL PRINT ---------------- */}
          <div className="p-8 sm:p-10 rounded-3xl bg-nivo-bg border border-nivo-border shadow-nivo-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-nivo-indigo/10 border border-nivo-indigo/20 flex items-center justify-center text-nivo-indigo font-bold">
                02
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-nivo-ink">
                Paperless WhatsApp Bill vs. Thermal Print
              </h3>
              <p className="text-sm text-nivo-muted leading-relaxed">
                Give your customers the flexibility they love. Dispatch instant paperless WhatsApp e-invoices directly to their phone (saving you thousands annually on thermal rolls), or print crisp 2-inch and 3-inch slips with one keystroke.
              </p>
              <ul className="space-y-2 text-xs text-nivo-inkLight font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-indigo shrink-0" />
                  <span>Eliminate thermal roll expenses and printer jam delays during rush hours.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-indigo shrink-0" />
                  <span>Customers receive branded PDF receipts they can verify anytime.</span>
                </li>
              </ul>
            </div>

            {/* Interactive Toggle Widget for Feature 2 */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-nivo-border shadow-nivo-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-nivo-border">
                <span className="text-xs font-bold text-nivo-ink">Select Bill Dispatch Mode:</span>
                <div className="flex p-0.5 rounded-xl bg-nivo-bg border border-nivo-border">
                  <button
                    onClick={() => setBillReceiptFormat('whatsapp')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      billReceiptFormat === 'whatsapp'
                        ? 'bg-nivo-teal text-white shadow-sm'
                        : 'text-nivo-muted hover:text-nivo-ink'
                    }`}
                  >
                    WhatsApp E-Bill
                  </button>
                  <button
                    onClick={() => setBillReceiptFormat('thermal')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      billReceiptFormat === 'thermal'
                        ? 'bg-nivo-indigo text-white shadow-sm'
                        : 'text-nivo-muted hover:text-nivo-ink'
                    }`}
                  >
                    Thermal Paper Slip
                  </button>
                </div>
              </div>

              {/* Dynamic Preview Box based on Toggle */}
              {billReceiptFormat === 'whatsapp' ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1 font-sans">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp Message Preview</span>
                  </div>
                  <p className="font-semibold">🧾 TAX INVOICE - Sharma Super Mart</p>
                  <p className="text-[11px] text-emerald-800">Bill #8942 • Total: ₹408.00</p>
                  <p className="text-[10px] text-emerald-700 italic">"Thank you for shopping! Tap to view full PDF bill."</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-800 space-y-1">
                  <div className="text-center pb-1 border-b border-dashed border-slate-400">
                    <p className="font-bold">SHARMA SUPER MART</p>
                    <p className="text-[10px]">Ph: +91 98765 43210</p>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Atta 5kg + Oil 1L</span>
                    <span>₹408.00</span>
                  </div>
                  <p className="text-center pt-1 text-[9px] text-slate-500">*** THANK YOU ***</p>
                </div>
              )}
            </div>
          </div>

          {/* ---------------- FEATURE 3: FMCG DAMAGE RETURN & CREDIT NOTE TRACKING ---------------- */}
          <div className="p-8 sm:p-10 rounded-3xl bg-nivo-bg border border-nivo-border shadow-nivo-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-nivo-amber/10 border border-nivo-amber/20 flex items-center justify-center text-nivo-amber font-bold">
                03
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-nivo-ink">
                FMCG Damage Return & Credit Note Tracking
              </h3>
              <p className="text-sm text-nivo-muted leading-relaxed">
                Leaked milk pouch? Expired biscuit packet? Don't absorb wholesaler losses. Snap a photo of damaged inventory right from the counter to record party returns and track pending distributor credit notes in real time.
              </p>
              <ul className="space-y-2 text-xs text-nivo-inkLight font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-amber shrink-0" />
                  <span>Deduct damaged inventory values from pending distributor payables automatically.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-amber shrink-0" />
                  <span>Photo verification prevents wholesaler disputes during monthly account settlement.</span>
                </li>
              </ul>
            </div>

            {/* Interactive Widget for Feature 3 */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-nivo-border shadow-nivo-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-nivo-border">
                <div>
                  <h4 className="font-bold text-nivo-ink text-sm">Amul Dairy Depot</h4>
                  <p className="text-[11px] text-nivo-muted font-mono">Invoice Ref: #INV-3392</p>
                </div>
                <span className="text-[10px] font-bold text-nivo-amber bg-nivo-amber/10 px-2 py-0.5 rounded">
                  Pending Credit Note
                </span>
              </div>

              <div className="p-3 rounded-xl bg-nivo-bg border border-nivo-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-nivo-muted">Damaged Item:</span>
                  <span className="font-semibold text-nivo-ink">Amul Taaza Milk 500ml</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-nivo-muted">Defect:</span>
                  <span className="text-nivo-rose font-medium">6 Leaked Pouches in Crate</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-nivo-border">
                  <span>Debit Note Amount:</span>
                  <span className="text-nivo-teal font-mono">₹162.00</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setDamageLogged(true);
                  setTimeout(() => setDamageLogged(false), 3000);
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  damageLogged
                    ? 'bg-nivo-teal text-white shadow-nivo-teal'
                    : 'bg-nivo-indigo hover:bg-nivo-indigoHover text-white shadow-nivo-indigo'
                }`}
              >
                {damageLogged ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>✓ Return Logged to Distributor Ledger!</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Log Return & Generate Debit Note</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ---------------- FEATURE 4: SNAP-TO-LIST AI PRODUCT UPLOAD ---------------- */}
          <div className="p-8 sm:p-10 rounded-3xl bg-nivo-bg border border-nivo-border shadow-nivo-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-nivo-teal/10 border border-nivo-teal/20 flex items-center justify-center text-nivo-teal font-bold">
                04
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-nivo-ink">
                Snap-to-List AI Product Upload
              </h3>
              <p className="text-sm text-nivo-muted leading-relaxed">
                Add 100 new FMCG items to your master catalog without typing a single word. Point your phone camera at distributor printed delivery slips or product barcodes to automatically extract item name, MRP, unit, and GST rates.
              </p>
              <ul className="space-y-2 text-xs text-nivo-inkLight font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                  <span>OCR-assisted text capture eliminates hours of manual data entry.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                  <span>Automatic GST slab mapping prevents tax errors at the billing counter.</span>
                </li>
              </ul>
            </div>

            {/* Interactive Widget for Feature 4 */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-nivo-border shadow-nivo-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-nivo-border">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-nivo-indigo" />
                  <span className="font-bold text-nivo-ink text-sm">Challan Snap Scanner</span>
                </div>
                <span className="text-[10px] font-mono text-nivo-teal bg-nivo-teal/10 px-2 py-0.5 rounded">
                  99.4% Accuracy
                </span>
              </div>

              {snapUploaded ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>3 Items Parsed into Catalog</span>
                  </p>
                  <div className="space-y-1 text-[11px] text-emerald-800 font-mono">
                    <p>• Parle-G 1kg @ MRP ₹100 (5% GST)</p>
                    <p>• Madhur Sugar 5kg @ MRP ₹240 (5% GST)</p>
                    <p>• Tata Tea Gold 250g @ MRP ₹160 (5% GST)</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-nivo-bg border border-dashed border-nivo-borderSubtle text-center space-y-2">
                  <Camera className="w-8 h-8 text-nivo-muted mx-auto" />
                  <p className="text-xs text-nivo-ink font-semibold">Ready to scan wholesaler slip</p>
                  <p className="text-[10px] text-nivo-muted">Snap delivery challan or scan packaging barcode</p>
                </div>
              )}

              <button
                onClick={() => setSnapUploaded(!snapUploaded)}
                className="w-full py-2.5 rounded-xl bg-nivo-indigo hover:bg-nivo-indigoHover text-white font-bold text-xs shadow-nivo-indigo transition-all flex items-center justify-center gap-1.5"
              >
                <span>{snapUploaded ? 'Reset Scanner' : 'Simulate Challan Photo Snap'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. PRICING SECTION (#pricing) ================= */}
      <section id="pricing" className="py-24 bg-nivo-bg border-t border-nivo-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-nivo-indigo">Transparent Bharat Pricing</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-nivo-ink tracking-tight">
              Honest Plans. Zero Hidden Fees.
            </h2>
            <p className="text-sm sm:text-base text-nivo-muted">
              Get started completely free. No credit card required. Upgrade only when you open multiple counter lanes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plan 1: Launch Beta (Free) */}
            <div className="p-8 rounded-3xl bg-white border-2 border-nivo-indigo shadow-nivo-dropdown relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-nivo-ink">Launch Beta</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-nivo-indigo/10 text-nivo-indigo border border-nivo-indigo/20">
                    Most Popular
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-nivo-ink font-mono">₹0</span>
                  <span className="text-xs text-nivo-muted font-medium">/ forever in beta</span>
                </div>

                <p className="text-xs text-nivo-muted leading-relaxed">
                  Full unrestricted access to all 5 operating modules for single-counter stores across Bharat.
                </p>

                <ul className="space-y-2.5 pt-3 border-t border-nivo-border text-xs text-nivo-inkLight font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Unlimited Counter POS Invoicing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Dynamic UPI QR (0% MDR Direct Bank)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Customer Khata & WhatsApp E-Invoicing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Product Master & Barcode Search</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>1 Store, Unlimited Billing Staff</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="w-full py-3.5 rounded-xl bg-nivo-indigo hover:bg-nivo-indigoHover text-white font-bold text-sm shadow-nivo-indigo transition-all flex items-center justify-center gap-2"
                >
                  <span>Start Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Plan 2: Multi-Store Supermarket */}
            <div className="p-8 rounded-3xl bg-white border border-nivo-border shadow-nivo-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-nivo-ink">Growth Supermarket</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-nivo-muted">
                    High Volume
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-nivo-ink font-mono">₹599</span>
                  <span className="text-xs text-nivo-muted font-medium">/ month (billed annually)</span>
                </div>

                <p className="text-xs text-nivo-muted leading-relaxed">
                  Tailored for multi-lane supermarkets, regional distributors, and packaging brand warehouses.
                </p>

                <ul className="space-y-2.5 pt-3 border-t border-nivo-border text-xs text-nivo-inkLight font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Everything in Launch Beta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Multi-Lane Cashier Synchronization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Direct FMCG Distributor Purchasing POs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Automated GSTR-1 & GSTR-3B Excel/JSON</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nivo-teal shrink-0" />
                    <span>Dedicated Merchant Helpline Support</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-50 text-nivo-ink font-bold text-sm border border-nivo-border shadow-nivo-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>Start Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 5. ABOUT SECTION (#about) ================= */}
      <section id="about" className="py-24 bg-white border-t border-nivo-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs uppercase font-bold tracking-wider text-nivo-indigo">Our Mission</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-nivo-ink tracking-tight">
              Built for Bharat's Retail Backbone.
            </h2>
            <p className="text-sm sm:text-base text-nivo-muted leading-relaxed">
              India's retail economy runs on millions of hardworking Kiranas, supermarkets, and local distributors. Nivo POS (<strong className="text-nivo-ink">nivopos.in</strong>) was created to give every local store owner enterprise-grade operating tools without expensive hardware or exploitative aggregator commissions.
            </p>
          </div>

          {/* 3 Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-nivo-bg border border-nivo-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-nivo-indigo/10 border border-nivo-indigo/20 flex items-center justify-center text-nivo-indigo font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-nivo-ink">Zero Hardware Lock-In</h4>
              <p className="text-xs text-nivo-muted leading-relaxed">
                Run your entire billing desk on any phone, tablet, iPad, or existing laptop in 10 seconds. No ₹45,000 legacy hardware machines.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-nivo-bg border border-nivo-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-nivo-teal/10 border border-nivo-teal/20 flex items-center justify-center text-nivo-teal font-bold">
                <IndianRupee className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-nivo-ink">0% MDR Direct Bank Settlement</h4>
              <p className="text-xs text-nivo-muted leading-relaxed">
                Every rupee your customers pay via UPI QR settles directly into your current account with zero merchant deductions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-nivo-bg border border-nivo-border space-y-3">
              <div className="w-10 h-10 rounded-xl bg-nivo-amber/10 border border-nivo-amber/20 flex items-center justify-center text-nivo-amber font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-nivo-ink">Bank-Grade Multi-Tenant Privacy</h4>
              <p className="text-xs text-nivo-muted leading-relaxed">
                Your store ledgers, customer debts, and supplier purchase rates are encrypted and strictly isolated by store ID.
              </p>
            </div>
          </div>

          {/* Final Conversion Banner */}
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-nivo-indigo via-indigo-700 to-indigo-900 text-white shadow-nivo-dropdown text-center space-y-6">
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
              Ready to modernize your billing counter in 5 minutes?
            </h3>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-xl mx-auto leading-relaxed">
              Join store owners across Delhi NCR, Mumbai, Bengaluru, and Jaipur who have upgraded to Nivo POS.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-6 py-3.5 rounded-xl bg-white text-nivo-indigo hover:bg-slate-50 font-black text-sm flex items-center gap-2 shadow-lg transition-transform transform hover:-translate-y-0.5"
              >
                <span>Start Free Account on nivopos.in</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-6 py-3.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-800 text-white font-bold text-sm border border-indigo-400/40 transition-colors"
              >
                Sign In to Existing Store
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. CLEAN FOOTER ================= */}
      <footer className="border-t border-nivo-border bg-white py-12 text-xs text-nivo-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-nivo-indigo flex items-center justify-center text-white">
                <Store className="w-4 h-4" />
              </div>
              <span className="text-base font-black text-nivo-ink tracking-tight">
                NIVO<span className="text-nivo-indigo">POS</span>
                <span className="text-xs text-nivo-muted font-normal">.in</span>
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs font-semibold text-nivo-inkLight">
              <a href="#features" className="hover:text-nivo-indigo transition-colors">Features</a>
              <a href="#pricing" className="hover:text-nivo-indigo transition-colors">Pricing</a>
              <a href="#about" className="hover:text-nivo-indigo transition-colors">About</a>
              <a href="mailto:support@nivopos.in" className="hover:text-nivo-indigo transition-colors">Contact Support</a>
            </div>
          </div>

          <div className="pt-6 border-t border-nivo-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
            <p>© {new Date().getFullYear()} Nivo POS (nivopos.in). All rights reserved.</p>
            <p className="flex items-center gap-1.5 font-medium text-nivo-ink">
              <span>Built with pride for Indian Retail & MSMEs 🇮🇳</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
