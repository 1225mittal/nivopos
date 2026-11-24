import React, { useState, useEffect } from 'react';
import {
  Store,
  QrCode,
  FileText,
  MapPin,
  User,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreProfile } from '../types';

interface StoreSettingsProps {
  currentUser: any;
  userProfile: StoreProfile | null;
  onProfileUpdated: (updated: StoreProfile) => void;
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  currentUser,
  userProfile,
  onProfileUpdated,
}) => {
  const [businessName, setBusinessName] = useState(
    userProfile?.business_name || userProfile?.store_name || ''
  );
  const [fullName, setFullName] = useState(
    userProfile?.full_name || userProfile?.owner_name || ''
  );
  const [upiId, setUpiId] = useState(userProfile?.upi_id || '');
  const [gstin, setGstin] = useState(userProfile?.gstin || '');
  const [storeAddress, setStoreAddress] = useState(userProfile?.store_address || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [email, setEmail] = useState(userProfile?.email || '');

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if userProfile prop changes
  useEffect(() => {
    if (userProfile) {
      setBusinessName(userProfile.business_name || userProfile.store_name || '');
      setFullName(userProfile.full_name || userProfile.owner_name || '');
      setUpiId(userProfile.upi_id || '');
      setGstin(userProfile.gstin || '');
      setStoreAddress(userProfile.store_address || '');
      setCity(userProfile.city || '');
      setPhone(userProfile.phone || '');
      setEmail(userProfile.email || '');
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!businessName.trim()) {
      setErrorMessage('Store/Business Name is required.');
      setSaving(false);
      return;
    }

    try {
      const updatePayload = {
        business_name: businessName.trim(),
        full_name: fullName.trim(),
        upi_id: upiId.trim(),
        gstin: gstin.trim().toUpperCase(),
        store_address: storeAddress.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };

      const { data, error } = await supabase
        .from('store_profiles')
        .update(updatePayload)
        .eq('id', currentUser.id)
        .select('*')
        .maybeSingle();

      if (error) {
        throw error;
      }

      const mergedProfile: StoreProfile = {
        ...(userProfile || { id: currentUser.id, role: 'owner', is_approved: true }),
        ...updatePayload,
        ...(data || {}),
        store_name: businessName.trim(),
        owner_name: fullName.trim(),
      };

      onProfileUpdated(mergedProfile);
      setSuccessMessage('Store settings & UPI ID saved successfully! Active immediately on POS.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('[StoreSettings] Error saving:', err);
      setErrorMessage(err.message || 'Failed to save store profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Store Setup & UPI Configuration</h2>
            <p className="text-xs text-slate-500">
              Configure your store credentials, billing address, and merchant UPI ID for instant dynamic counter QR billing.
            </p>
          </div>
        </div>

        {/* Notices */}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-[#0D9488] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store / Business Name *
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sharma Super Mart"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white focus:ring-1 focus:ring-[#4338CA]"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Printed on top of every tax invoice and thermal slip.
            </span>
          </div>

          {/* Owner Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Proprietor / Owner Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white focus:ring-1 focus:ring-[#4338CA]"
              />
            </div>
          </div>
        </div>

        {/* UPI ID Configuration Box */}
        <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#0D9488] font-bold text-xs uppercase tracking-wider">
              <QrCode className="w-4 h-4" />
              <span>Counter Dynamic UPI QR ID *</span>
            </div>
            <span className="text-[10px] font-mono text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
              Zero MDR • Direct Settlement
            </span>
          </div>

          <div>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. sharmamart@okaxis, 9876543210@paytm, or store@upi"
              className="w-full bg-white border border-teal-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]"
            />
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-[#0D9488] mt-0.5 shrink-0" />
            <span>
              Every counter bill will generate a scannable QR code matching{' '}
              <code className="text-teal-800 bg-white px-1.5 py-0.5 rounded border border-teal-200 font-mono text-[10px]">
                upi://pay?pa={upiId || '<your-upi-id>'}&amp;pn={encodeURIComponent(businessName || 'Store')}&amp;am=...&amp;cu=INR
              </code>
              . Customers scan using Google Pay, PhonePe, Paytm, or BHIM.
            </span>
          </div>
        </div>

        {/* GSTIN & City */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              GSTIN (GST Number)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="e.g. 07AAAAA0000A1Z5"
                maxLength={15}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 uppercase focus:outline-none focus:border-[#4338CA] focus:bg-white focus:ring-1 focus:ring-[#4338CA]"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">Optional for non-GST composite merchants.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              City / State
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Delhi NCR / Jaipur / Bengaluru"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white focus:ring-1 focus:ring-[#4338CA]"
              />
            </div>
          </div>
        </div>

        {/* Store Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Store Physical Address
          </label>
          <textarea
            rows={2}
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            placeholder="Shop Number, Building/Market, Street Address, Landmark..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white focus:ring-1 focus:ring-[#4338CA] resize-none"
          />
        </div>

        {/* Contact Info (Phone & Email) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white focus:ring-1 focus:ring-[#4338CA]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Store Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#4338CA] focus:bg-white focus:ring-1 focus:ring-[#4338CA]"
              />
            </div>
          </div>
        </div>

        {/* Action Button: Primary #4338CA */}
        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Store Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Store Setup & UPI</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
