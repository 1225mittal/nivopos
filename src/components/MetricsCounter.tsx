import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldAlert, Bike, FileCheck2, TrendingUp } from 'lucide-react';

export const MetricsCounter: React.FC = () => {
  return (
    <section id="metrics" className="py-20 bg-white relative border-t border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[#4338CA] text-xs font-semibold mb-3">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Proven MSME Impact Benchmarks</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight">
            Built for High-Volume Counter Realities
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Real metrics observed across Indian Kiranas, Departmental Stores, and FMCG Distributors transitioning to Nivo POS.
          </p>
        </div>

        {/* 4 Core Impact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Metric 1: 3x Faster Checkout */}
          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-[#F4F6F9] border border-slate-200 hover:border-indigo-300 transition-all shadow-sm relative overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-[#0F172A] tracking-tight">
                3x
              </span>
              <span className="text-xs uppercase font-bold text-[#4338CA] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Faster
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A] mt-2">Counter Checkout Speed</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              3.1 seconds average bill generation with hotkey shortcuts, barcode cache, and instant dynamic UPI QR.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Traditional: 18.4s</span>
              <span className="text-[#0D9488] font-bold">Nivo: 3.1s</span>
            </div>
          </motion.div>

          {/* Metric 2: Zero Leakage Stock & Khata */}
          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-[#F4F6F9] border border-slate-200 hover:border-indigo-300 transition-all shadow-sm relative overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0D9488] mb-4 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-[#0F172A] tracking-tight">
                0%
              </span>
              <span className="text-xs uppercase font-bold text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Leakage
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A] mt-2">Zero-Leakage Stock & Khata</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Automated WhatsApp reminders with 1-click UPI links recover 94% of customer Udhar within 7 days.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Paper Ledger: ₹48k lost</span>
              <span className="text-[#0D9488] font-bold">Nivo: 100% Tracked</span>
            </div>
          </motion.div>

          {/* Metric 3: Quick Commerce Ready */}
          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-[#F4F6F9] border border-slate-200 hover:border-indigo-300 transition-all shadow-sm relative overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mb-4 group-hover:scale-110 transition-transform">
              <Bike className="w-5 h-5" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-[#0F172A] tracking-tight">
                15m
              </span>
              <span className="text-xs uppercase font-bold text-[#4338CA] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Hyperlocal
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A] mt-2">Quick-Commerce Delivery</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Turn your physical stock into an instant neighbourhood online store without paying 25% aggregator cuts.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Aggregator Cut: 25%</span>
              <span className="text-[#0D9488] font-bold">Nivo POS: 0% Cut</span>
            </div>
          </motion.div>

          {/* Metric 4: 1-Click GST Compliance */}
          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl bg-[#F4F6F9] border border-slate-200 hover:border-indigo-300 transition-all shadow-sm relative overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0D9488] mb-4 group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black font-mono text-[#0F172A] tracking-tight">
                100%
              </span>
              <span className="text-xs uppercase font-bold text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Automated
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A] mt-2">1-Click GST Compliance</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Auto-reconciles GSTR-1, GSTR-3B and generates B2B e-Way Bills directly from your counter sales ledger.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>CA Audit: 12 Hours</span>
              <span className="text-[#0D9488] font-bold">Nivo: 1 Click</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
