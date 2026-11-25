import React from 'react';
import { motion } from 'framer-motion';
import {
  XCircle,
  CheckCircle2,
  CloudLightning,
  BookOpen,
  Smartphone,
  Store,
  Truck,
  Sparkles,
} from 'lucide-react';

export const BentoComparison: React.FC = () => {
  const comparisons = [
    {
      title: 'Counter Hardware & Terminals',
      traditional: {
        heading: 'Fragile Proprietary Hardware',
        detail: 'Heavy ₹45,000 legacy desktop machines, driver crashes, expensive annual maintenance contracts.',
      },
      nivo: {
        heading: 'Any Screen, Any Device',
        detail: 'Runs instantly in any browser on your Android phone, tablet, iPad, or existing laptop in 10 seconds.',
        highlight: 'Zero Hardware Lock-In',
      },
      icon: Smartphone,
    },
    {
      title: 'Data Safety & Multi-Device Sync',
      traditional: {
        heading: 'Single Local Hard Drive',
        detail: 'If the PC crashes or is stolen, years of sales data and supplier ledgers vanish forever.',
      },
      nivo: {
        heading: 'Encrypted Cloud + Offline Fallback',
        detail: 'Bank-grade cloud sync with automatic offline caching. Bill seamlessly even when your broadband is down.',
        highlight: '100% Data Protection',
      },
      icon: CloudLightning,
    },
    {
      title: 'Customer Khata & Udhar Collection',
      traditional: {
        heading: 'Red Bahi-Khata Notebooks',
        detail: 'Forgotten credit, awkward verbal reminders, lost paper sheets leading to ₹40,000+ yearly bad debts.',
      },
      nivo: {
        heading: 'Automated WhatsApp UPI Khata',
        detail: '1-click WhatsApp payment reminders with integrated dynamic UPI link. Customers pay straight from their phone.',
        highlight: '94% Faster Recovery',
      },
      icon: BookOpen,
    },
    {
      title: 'Battle Against Quick-Commerce',
      traditional: {
        heading: 'Losing Customers to Dark Stores',
        detail: 'Shoppers switch to Zepto & Blinkit for convenience while your store remains offline and undiscovered.',
      },
      nivo: {
        heading: 'Instant 15-Min Local Web Store',
        detail: 'Launch your free `nivopos.in/store` in 2 minutes. Dispatch orders to your building societies with 0% commissions.',
        highlight: 'Win Back Loyal Shoppers',
      },
      icon: Store,
    },
    {
      title: 'Wholesale B2B Procurement',
      traditional: {
        heading: 'Manual Phone Calls & Messy Chits',
        detail: 'Haggling with 15 different distributors with zero price transparency and delayed delivery trucks.',
      },
      nivo: {
        heading: 'Digitized Multi-Vendor B2B Engine',
        detail: 'Compare wholesale prices across top FMCG distributors, generate digital POs, and verify slips with AI OCR.',
        highlight: 'Best Bulk Margins',
      },
      icon: Truck,
    },
  ];

  return (
    <section id="comparison" className="py-24 bg-[#F4F6F9] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0D9488] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Modernization Shift</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
            Traditional Fragmented Shop vs.{' '}
            <span className="text-[#4338CA]">Nivo-Powered Business</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            See why forward-thinking retailers and distributors across India are retiring legacy desktop software for Nivo POS.
          </p>
        </div>

        {/* Bento Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comparisons.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                      {item.title}
                    </span>
                    <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[#4338CA]">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Traditional Pain Point */}
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 mb-4">
                    <div className="flex items-center gap-2 text-rose-700 text-xs font-bold mb-1">
                      <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{item.traditional.heading}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed pl-6">
                      {item.traditional.detail}
                    </p>
                  </div>

                  {/* Nivo Advantage */}
                  <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200">
                    <div className="flex items-center gap-2 text-[#0D9488] text-xs font-bold mb-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0D9488]" />
                      <span>{item.nivo.heading}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed pl-6">
                      {item.nivo.detail}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Impact Factor</span>
                  <span className="text-[11px] font-bold text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    {item.nivo.highlight}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
