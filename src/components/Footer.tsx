import React from 'react';
import { Store, ArrowRight, ShieldCheck, Mail, Phone, MapPin, Sparkles } from 'lucide-react';

interface FooterProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAuth }) => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs">
      {/* Pre-footer High Impact CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative rounded-3xl p-8 sm:p-12 bg-indigo-50/70 border border-indigo-100 overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-[#4338CA] text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Generation Indian Retail Tech</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight">
              Ready to modernize your counter in 5 minutes?
            </h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Join thousands of Kiranas, Supermarkets, and Wholesale Distributors across India. No expensive hardware needed. Start completely free today on <strong className="text-[#0F172A]">nivopos.in</strong>.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-6 py-3.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Get Started Free on nivopos.in</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 transition-all shadow-sm"
              >
                Sign In to Existing Store
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-[#0F172A] font-sans">
              NIVO<span className="text-[#4338CA]">POS</span>
              <span className="text-slate-500 font-normal">.in</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            India's Next-Generation Retail & Distribution Operating System. Powering MSME Kiranas, Supermarkets, FMCG Distributors & D2C Brands.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[#0D9488] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>NPCI UPI 2.0 & GSTN Compliant</span>
          </div>
        </div>

        <div>
          <h4 className="text-[#0F172A] font-bold text-xs uppercase tracking-wider mb-3">Operating Modules</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#features" className="hover:text-[#4338CA] transition-colors">3-Second Counter POS</a></li>
            <li><a href="#features" className="hover:text-[#4338CA] transition-colors">Instant Dynamic UPI QR</a></li>
            <li><a href="#features" className="hover:text-[#4338CA] transition-colors">Multilingual AI Voice Billing</a></li>
            <li><a href="#features" className="hover:text-[#4338CA] transition-colors">Wholesaler Parchment Slip OCR</a></li>
            <li><a href="#features" className="hover:text-[#4338CA] transition-colors">15-Minute Local Dispatch</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[#0F172A] font-bold text-xs uppercase tracking-wider mb-3">Sectors Served</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="text-slate-600">Kirana & Provision Stores</span></li>
            <li><span className="text-slate-600">Departmental Stores & Supermarkets</span></li>
            <li><span className="text-slate-600">FMCG & Wholesale Distributors</span></li>
            <li><span className="text-slate-600">Packaging & D2C Brands</span></li>
            <li><span className="text-slate-600">Dairy, Bakery & Fresh Produce</span></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[#0F172A] font-bold text-xs uppercase tracking-wider mb-3">Contact & Support</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#4338CA]" />
              <a href="mailto:support@nivopos.in" className="hover:text-[#0F172A]">support@nivopos.in</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>+91 98765 43210 (Merchant Desk)</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
              <span>Bangalore • Delhi NCR • Mumbai, India</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200 bg-slate-50 py-6 text-center text-slate-500 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Nivo POS (<a href="https://nivopos.in" className="text-slate-700 hover:text-[#4338CA]">nivopos.in</a>). All rights reserved.</span>
          <span className="flex items-center gap-1">
            Built with pride for Bharat's retail and distribution backbone 🇮🇳
          </span>
        </div>
      </div>
    </footer>
  );
};
