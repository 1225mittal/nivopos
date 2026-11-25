import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  QrCode,
  Mic,
  Bike,
  CheckCircle2,
  Volume2,
  Printer,
  Share2,
  Receipt,
  ScanLine,
  Zap,
  MapPin,
  Clock,
  Check,
  Shield,
} from 'lucide-react';

type TabKey = 'pos' | 'upi' | 'voice' | 'delivery';

export const InteractiveShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('pos');

  // Interactive state for POS billing tab
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'Aashirvaad Shudh Chakki Atta', hindi: 'आशीर्वाद आटा', qty: 1, unit: '5 kg', price: 245, gst: '5%' },
    { id: 2, name: 'Fortune Sunlite Refined Oil', hindi: 'फॉर्च्यून तेल', qty: 2, unit: '1 Ltr', price: 135, gst: '5%' },
    { id: 3, name: 'Tata Salt Vacuum Evaporated', hindi: 'टाटा नमक', qty: 1, unit: '1 kg', price: 28, gst: '0%' },
    { id: 4, name: 'Amul Butter Pasteurised', hindi: 'अमुल मक्खन', qty: 1, unit: '500g', price: 275, gst: '12%' },
  ]);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Soundbox simulation
  const [soundboxPlaying, setSoundboxPlaying] = useState(false);
  const playSoundbox = () => {
    setSoundboxPlaying(true);
    setTimeout(() => setSoundboxPlaying(false), 2400);
  };

  // Voice AI simulation
  const [isRecording, setIsRecording] = useState(false);
  const [voiceParsed, setVoiceParsed] = useState(false);

  const handleSimulateVoice = () => {
    setIsRecording(true);
    setVoiceParsed(false);
    setTimeout(() => {
      setIsRecording(false);
      setVoiceParsed(true);
    }, 1800);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalGst = 34.5;
  const grandTotal = subtotal + totalGst;

  return (
    <section id="features" className="relative py-24 bg-white overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-50/50 to-teal-50/50 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[#4338CA] text-xs font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Interactive Live Product Suite</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0F172A] tracking-tight">
            One Operating System.{' '}
            <span className="text-[#4338CA]">Limitless Counter Speed.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Experience the actual workflows built directly for Indian retail realities. Test each module live below.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10 max-w-4xl mx-auto">
          {[
            { id: 'pos' as TabKey, label: '3s Counter POS Billing', icon: CreditCard, tag: 'Lightning Speed' },
            { id: 'upi' as TabKey, label: 'Instant Dynamic UPI QR', icon: QrCode, tag: '0% MDR Soundbox' },
            { id: 'voice' as TabKey, label: 'AI Voice & Bill OCR', icon: Mic, tag: 'Hinglish Powered' },
            { id: 'delivery' as TabKey, label: 'Hyperlocal 15-Min Dispatch', icon: Bike, tag: 'Quick-Comm Ready' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 border ${
                  isActive
                    ? 'bg-white text-[#4338CA] border-indigo-200 shadow-sm font-semibold'
                    : 'bg-[#F4F6F9] text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#4338CA]' : 'text-slate-500'}`} />
                <span className="font-semibold">{tab.label}</span>
                <span
                  className={`hidden sm:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-indigo-50 text-[#4338CA] border border-indigo-200'
                      : 'bg-slate-200/60 text-slate-600'
                  }`}
                >
                  {tab.tag}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabBadge"
                    className="absolute -bottom-[1px] left-3 right-3 h-[2px] bg-[#4338CA]"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Showcase Canvas Frame */}
        <div className="relative rounded-2xl p-1 bg-slate-100 border border-slate-200 shadow-md overflow-hidden">
          {/* Top Mock Window Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              <span className="w-3 h-3 rounded-full bg-teal-400 inline-block" />
              <span className="ml-2 font-mono text-[11px] text-slate-500 hidden sm:inline">
                nivopos.in/terminal/live-preview
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 text-[#0D9488] text-[11px] font-semibold border border-teal-200">
                <span className="w-1.5 h-1.5 rounded-full bg-nivo-teal animate-ping" />
                Live Mode Connected
              </span>
              <span className="text-slate-500 text-[11px]">GSTN Auto-Sync Active</span>
            </div>
          </div>

          {/* Interactive Screen Content */}
          <div className="p-4 sm:p-8 bg-[#F4F6F9] min-h-[520px]">
            <AnimatePresence mode="wait">
              {/* TAB 1: COUNTER POS BILLING */}
              {activeTab === 'pos' && (
                <motion.div
                  key="pos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  {/* Left Column: Live Cart & Scan */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    {/* Barcode scanner bar */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <ScanLine className="w-5 h-5 text-[#4338CA] animate-pulse" />
                        <span className="text-xs sm:text-sm text-slate-700 font-mono">
                          Barcode Scanner Ready: <span className="text-[#4338CA] font-bold">8901030922841</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-medium bg-teal-50 text-[#0D9488] px-2 py-0.5 rounded border border-teal-200">
                        Avg 3.1s/Bill
                      </span>
                    </div>

                    {/* Cart Items List */}
                    <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-sm">
                      <div className="px-4 py-2 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider grid grid-cols-12">
                        <span className="col-span-6">Item Description</span>
                        <span className="col-span-2 text-center">Qty</span>
                        <span className="col-span-2 text-right">GST</span>
                        <span className="col-span-2 text-right">Total</span>
                      </div>
                      {cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-50/80 transition-colors text-xs"
                        >
                          <div className="col-span-6 flex flex-col">
                            <span className="font-semibold text-[#0F172A]">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-hindi">
                              {item.hindi} • {item.unit}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center justify-center gap-1.5 font-mono">
                            <button
                              onClick={() => {
                                setCartItems(
                                  cartItems.map((i) =>
                                    i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i
                                  )
                                );
                              }}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs border border-slate-200"
                            >
                              -
                            </button>
                            <span className="text-[#0F172A] font-bold">{item.qty}</span>
                            <button
                              onClick={() => {
                                setCartItems(
                                  cartItems.map((i) =>
                                    i.id === item.id ? { ...i, qty: i.qty + 1 } : i
                                  )
                                );
                              }}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 text-xs border border-slate-200"
                            >
                              +
                            </button>
                          </div>
                          <div className="col-span-2 text-right text-slate-500 font-mono">
                            {item.gst}
                          </div>
                          <div className="col-span-2 text-right font-bold text-[#4338CA] font-mono">
                            ₹{(item.price * item.qty).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Bill Actions */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <button
                        onClick={() => setWhatsappSent(!whatsappSent)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${
                          whatsappSent
                            ? 'bg-teal-50 text-[#0D9488] border-teal-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>{whatsappSent ? '✓ WhatsApp E-Invoice Sent' : 'WhatsApp E-Invoice'}</span>
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 hover:border-slate-300">
                        <Printer className="w-3.5 h-3.5 text-[#4338CA]" />
                        <span>Thermal Slip (2" & 3")</span>
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 hover:border-slate-300">
                        <Receipt className="w-3.5 h-3.5 text-amber-600" />
                        <span>Add Customer Khata / Udhar</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Checkout Summary & Total */}
                  <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                          Billing Summary
                        </span>
                        <span className="text-xs font-mono text-[#4338CA] font-bold">
                          Tax Invoice #NIV-8941
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Items Count:</span>
                          <span className="font-mono text-slate-900">{cartItems.reduce((a, b) => a + b.qty, 0)} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subtotal:</span>
                          <span className="font-mono text-slate-900">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">CGST (2.5%) + SGST (2.5%):</span>
                          <span className="font-mono text-[#0D9488] font-bold">+₹{totalGst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Round Off:</span>
                          <span className="font-mono text-slate-500">₹0.50</span>
                        </div>
                      </div>

                      <div className="mt-5 p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
                            Grand Total:
                          </span>
                          <div className="text-right">
                            <span className="text-3xl font-black text-[#0F172A] font-mono tracking-tight">
                              ₹{Math.round(grandTotal).toLocaleString('en-IN')}
                            </span>
                            <p className="text-[10px] text-[#0D9488] font-medium">
                              Instant Dynamic UPI Settlement Ready
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2.5">
                      <button
                        onClick={() => {
                          setPaymentDone(true);
                          setTimeout(() => setPaymentDone(false), 3000);
                        }}
                        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                          paymentDone
                            ? 'bg-nivo-teal text-white font-black'
                            : 'bg-[#4338CA] hover:bg-[#3730A3] text-white'
                        }`}
                      >
                        {paymentDone ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            <span>Payment Received • Bill Finalized</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-white fill-current" />
                            <span>Collect ₹{Math.round(grandTotal)} via Dynamic UPI QR</span>
                          </>
                        )}
                      </button>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                        <span>F2: Cash</span>
                        <span>F4: UPI QR</span>
                        <span>F8: WhatsApp Bill</span>
                        <span>F10: Hold Cart</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: INSTANT DYNAMIC UPI QR & SOUNDBOX */}
              {activeTab === 'upi' && (
                <motion.div
                  key="upi"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  {/* Left: Dynamic QR Mockup */}
                  <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="text-center mb-4">
                      <span className="text-[11px] uppercase tracking-widest font-bold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                        Dynamic Counter QR Code
                      </span>
                      <h4 className="text-lg font-bold text-[#0F172A] mt-1">Scan Any UPI App to Pay</h4>
                      <p className="text-xs text-slate-500">Zero MDR • Instant Direct Bank Settlement</p>
                    </div>

                    {/* QR Canvas Vector */}
                    <div className="relative p-5 bg-white rounded-2xl shadow-sm flex flex-col items-center border-2 border-slate-200">
                      <div className="relative w-48 h-48 bg-white flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                          <rect width="100" height="100" fill="white" />
                          <rect x="5" y="5" width="26" height="26" fill="#0F172A" rx="4" />
                          <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                          <rect x="13" y="13" width="10" height="10" fill="#4338CA" rx="1" />

                          <rect x="69" y="5" width="26" height="26" fill="#0F172A" rx="4" />
                          <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                          <rect x="77" y="13" width="10" height="10" fill="#4338CA" rx="1" />

                          <rect x="5" y="69" width="26" height="26" fill="#0F172A" rx="4" />
                          <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                          <rect x="13" y="77" width="10" height="10" fill="#4338CA" rx="1" />

                          <rect x="36" y="8" width="6" height="6" fill="#0F172A" />
                          <rect x="46" y="8" width="6" height="6" fill="#0F172A" />
                          <rect x="56" y="8" width="6" height="6" fill="#0F172A" />
                          <rect x="36" y="20" width="16" height="6" fill="#0D9488" />
                          <rect x="42" y="32" width="16" height="16" fill="#0F172A" rx="2" />
                          <circle cx="50" cy="40" r="4" fill="#4338CA" />
                          <rect x="12" y="40" width="8" height="18" fill="#0F172A" />
                          <rect x="25" y="45" width="10" height="8" fill="#0F172A" />
                          <rect x="68" y="40" width="12" height="12" fill="#0F172A" />
                          <rect x="84" y="46" width="10" height="14" fill="#0D9488" />
                          <rect x="38" y="58" width="24" height="6" fill="#0F172A" />
                          <rect x="68" y="68" width="8" height="8" fill="#0F172A" />
                          <rect x="80" y="68" width="14" height="6" fill="#0F172A" />
                          <rect x="40" y="76" width="16" height="14" fill="#4338CA" />
                          <rect x="65" y="82" width="26" height="10" fill="#0F172A" />
                        </svg>

                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="px-2 py-1 bg-white rounded border border-[#4338CA] text-[10px] font-bold text-[#4338CA] shadow-sm">
                            NIVO
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500">Exact Bill Amount: </span>
                        <span className="text-xs font-bold text-[#4338CA] font-mono">₹842.00</span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3 text-slate-500 text-xs font-semibold">
                      <span>Supported:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">PhonePe</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">GPay</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">Paytm</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">BHIM</span>
                    </div>
                  </div>

                  {/* Right: Audio Soundbox & Verification Simulator */}
                  <div className="lg:col-span-6 flex flex-col gap-5">
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-5 h-5 text-[#4338CA]" />
                          <h4 className="text-base font-bold text-[#0F172A]">Nivo Smart Soundbox</h4>
                        </div>
                        <span className="text-[11px] font-mono text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Hinglish & 8 Indian Languages
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mb-6">
                        Eliminate payment disputes with instant counter voice verification. Press the button to simulate the audio notification:
                      </p>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              soundboxPlaying
                                ? 'bg-nivo-teal text-white animate-bounce'
                                : 'bg-indigo-50 text-[#4338CA]'
                            }`}
                          >
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#0F172A]">
                              {soundboxPlaying
                                ? '🔊 "Nivo Pay par 842 rupaye prapt hue!"'
                                : 'Voice Announcement Preview'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Instant high-fidelity voice alert (₹842 received)
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={playSoundbox}
                          className="px-3.5 py-2 rounded-lg bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs transition-colors shadow-sm"
                        >
                          Play Audio
                        </button>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 text-[11px]">Instant Settlement:</span>
                          <p className="font-bold text-[#0F172A] mt-0.5">T+0 Direct to Bank A/C</p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-slate-500 text-[11px]">Merchant Fee (MDR):</span>
                          <p className="font-bold text-[#0D9488] mt-0.5">0% Guaranteed</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center gap-3 shadow-sm">
                      <Shield className="w-5 h-5 text-[#4338CA] shrink-0" />
                      <span>
                        Integrated with NPCI UPI 2.0 specs, bank-grade encryption, and automatic ledger posting into your store credit khata.
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: AI VOICE & BILL OCR SCANNING */}
              {activeTab === 'voice' && (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-6 flex flex-col p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Mic className="w-5 h-5 text-[#4338CA]" />
                        <h4 className="text-base font-bold text-[#0F172A]">Multilingual Voice Billing</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0D9488] bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                        Hinglish / Hindi / Regional
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-5">
                      Cashiers speak naturally during peak rush hours. Nivo parses product names, brands, and pack weights in real time.
                    </p>

                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center text-center">
                      <button
                        onClick={handleSimulateVoice}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                          isRecording
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-[#4338CA] hover:bg-[#3730A3] text-white shadow-sm'
                        }`}
                      >
                        <Mic className="w-7 h-7" />
                      </button>
                      <span className="mt-3 text-xs font-semibold text-slate-800">
                        {isRecording ? 'Listening to voice stream...' : 'Tap to Test Voice Recognition'}
                      </span>
                      <p className="mt-1 text-[11px] text-slate-500 italic">
                        "{voiceParsed ? 'Bhaiya do packet Taaza dudh aur ek Tata tea gold 250g add karo' : 'Click mic to speak'}"
                      </p>
                    </div>

                    {voiceParsed && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs"
                      >
                        <div className="flex items-center gap-2 text-[#0D9488] font-bold mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>AI Parsed 2 Items in 140ms</span>
                        </div>
                        <div className="space-y-1.5 text-slate-700">
                          <div className="flex justify-between">
                            <span>• Amul Taaza Milk (500ml pouch) x 2</span>
                            <span className="font-mono font-bold text-slate-900">₹54</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• Tata Tea Gold (250g box) x 1</span>
                            <span className="font-mono font-bold text-slate-900">₹160</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="lg:col-span-6 flex flex-col p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5 text-[#4338CA]" />
                        <h4 className="text-base font-bold text-[#0F172A]">Wholesaler Parchment Slip OCR</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-[#0D9488] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Zero Manual Typing
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-5">
                      Snap a photo of messy handwritten distributor slips or printed GST delivery challans. Nivo updates stock automatically.
                    </p>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-2">
                      <div className="flex justify-between border-b border-slate-200 pb-2 text-slate-500">
                        <span>ORIGINAL DISTRIBUTOR CHIT</span>
                        <span className="text-[#0D9488] font-bold">OCR ACCURACY: 99.4%</span>
                      </div>
                      <div className="text-slate-700 space-y-1">
                        <p className="text-slate-400 line-through">12 Peti Parle-G 10/- MRP @ 108/p</p>
                        <p className="text-slate-900 font-semibold">
                          ➔ Matched: Parle-G Biscuits (Pack of 24) • 12 Cases • Buy Rate: ₹1,296
                        </p>
                        <p className="text-slate-400 line-through">5 Bag Madhur Sugar 50kg @ 1950</p>
                        <p className="text-slate-900 font-semibold">
                          ➔ Matched: Madhur Pure Sugar 50kg Bag • 5 Bags • Buy Rate: ₹9,750
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                      <span className="text-xs text-slate-700 font-medium">Auto-Update Store Stock</span>
                      <button className="px-3 py-1.5 rounded-lg bg-[#4338CA] text-white text-xs font-bold hover:bg-[#3730A3] transition-colors shadow-sm">
                        Apply to Inventory
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: HYPERLOCAL DELIVERY DISPATCH */}
              {activeTab === 'delivery' && (
                <motion.div
                  key="delivery"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#0D9488] tracking-wider">
                          15-Minute Local Dispatch
                        </span>
                        <h4 className="text-base font-bold text-[#0F172A]">Neighbourhood Order #ORD-2041</h4>
                      </div>
                      <span className="text-xs font-mono bg-indigo-50 text-[#4338CA] px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5" /> 8 Mins Away
                      </span>
                    </div>

                    <div className="relative h-56 rounded-xl bg-slate-100 border border-slate-200 p-4 flex flex-col justify-between overflow-hidden">
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" fill="none">
                        <path
                          d="M 60 140 Q 180 80 340 50"
                          stroke="#4338CA"
                          strokeWidth="3"
                          strokeDasharray="6 6"
                          className="animate-pulse"
                        />
                        <circle cx="60" cy="140" r="8" fill="#4338CA" />
                        <circle cx="340" cy="50" r="8" fill="#0D9488" />
                      </svg>

                      <div className="relative z-10 flex items-center gap-2 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg w-max text-xs shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#4338CA] animate-ping" />
                        <span className="font-bold text-[#0F172A]">Your Store (Civil Lines)</span>
                      </div>

                      <div className="relative z-10 self-end flex items-center gap-2 bg-white border border-teal-200 px-3 py-1.5 rounded-lg w-max text-xs shadow-sm">
                        <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span className="font-bold text-[#0F172A]">Flat 402, Green Valley Apts</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 text-[#4338CA] flex items-center justify-center font-bold">
                          RK
                        </div>
                        <div>
                          <p className="font-semibold text-[#0F172A]">Ramesh Kumar (Store Rider)</p>
                          <p className="text-[11px] text-slate-500">Hero Splendor • OTP: 7392</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-teal-50 text-[#0D9488] font-semibold text-[11px] border border-teal-200">
                        Out for Delivery
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <h4 className="text-lg font-bold text-[#0F172A] mb-2">
                        Compete Head-to-Head with Quick-Comm Giants
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mb-6">
                        Why surrender your loyal neighbourhood customers to dark stores? Nivo gives every local store an instant online catalog, 15-min delivery dispatch, and zero commission fees.
                      </p>

                      <div className="space-y-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-[#0D9488] mt-0.5 shrink-0" />
                          <span className="text-slate-700">
                            <strong>Zero 25-30% aggregator commission:</strong> Keep 100% of your retail margin.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-[#0D9488] mt-0.5 shrink-0" />
                          <span className="text-slate-700">
                            <strong>1-Click WhatsApp Shop Link:</strong> Share `nivopos.in/store/yourname` with all residential societies.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-[#0D9488] mt-0.5 shrink-0" />
                          <span className="text-slate-700">
                            <strong>Hybrid Fleet Support:</strong> Use your own shop delivery boy or plug in Dunzo / Porter on-demand.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
