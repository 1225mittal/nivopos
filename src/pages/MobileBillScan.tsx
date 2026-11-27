import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  RefreshCw,
  FileCheck2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../lib/r2Upload';

export interface UploadedFileItem {
  name: string;
  type: string;
  publicUrl: string;
  fileKey: string;
  pageNumber: number;
}

export const MobileBillScan: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestPreview, setLatestPreview] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const realtimeChannelRef = useRef<any>(null);

  // 1. Read session and store from URL query and pre-subscribe to Realtime channel
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('session');
      const st = params.get('store');
      setSessionId(s);
      setStoreId(st);

      if (s) {
        const channel = supabase.channel(`bill-scan-${s}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            console.log(`[MobileScan] Connected to realtime channel bill-scan-${s}`);
          }
        });
        realtimeChannelRef.current = channel;
      }
    } catch (err) {
      console.error('[MobileScan] Error parsing URL search params:', err);
    }

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Helper: Client-side compression to max 2200px at 0.85 JPEG quality
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const maxDimension = 2200;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
              const compressedFile = new File([blob], `${cleanBaseName || 'bill-page'}.jpg`, {
                type: 'image/jpeg',
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => resolve(file);
        img.src = event.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // 2. Handle instant capture & upload
  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Reset input so subsequent snaps re-fire onChange

    if (!file) return;

    if (!sessionId || !storeId) {
      setErrorMessage('Missing session or store ID. Please rescan QR code on desktop.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadStatus('Compressing photo (2200px)...');

    // Create a local preview for immediate visual feedback
    const localPreviewUrl = URL.createObjectURL(file);
    setLatestPreview(localPreviewUrl);

    try {
      // 1. Compress image to max 2200px at 0.85 quality
      const compressedFile = await compressImage(file);

      // 2. Upload directly to Cloudflare R2
      setUploadStatus('Uploading to Cloudflare R2...');
      const { fileKey, publicUrl } = await uploadToR2({
        file: compressedFile,
        storeId,
        folder: 'purchases',
      });

      // 3. Broadcast to desktop on bill-scan-${sessionId}
      setUploadStatus('Syncing with desktop screen...');
      let channel = realtimeChannelRef.current;
      if (!channel) {
        channel = supabase.channel(`bill-scan-${sessionId}`);
        realtimeChannelRef.current = channel;
        await channel.subscribe();
      }

      const newPageNumber = uploadedCount + 1;
      const uploadedItem: UploadedFileItem = {
        name: compressedFile.name,
        type: 'image/jpeg',
        publicUrl,
        fileKey,
        pageNumber: newPageNumber,
      };

      await channel.send({
        type: 'broadcast',
        event: 'files-uploaded',
        payload: {
          files: [uploadedItem],
          clubAsSingleBill: true,
        },
      });

      // 4. Update count and status
      setUploadedCount(newPageNumber);
      setUploadStatus('Uploaded! Tap Snap & Upload for next page');
    } catch (err: any) {
      console.error('[MobileScan] Instant upload failed:', err);
      setErrorMessage(err?.message || 'Upload failed. Please check connection and try again.');
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  // Missing session/store guard
  if (!sessionId || !storeId) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Invalid Scan Session</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Session or Store parameter is missing in this link. Please open Purchase Bills on your
              desktop counter and scan the QR code.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry / Refresh</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4 flex flex-col justify-between">
      <div className="max-w-sm w-full mx-auto space-y-4">
        {/* Header Branding */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#0F172A] leading-tight">Nivo POS</h1>
              <p className="text-[10px] text-slate-500">Mobile Camera Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#0D9488] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold">{isConnected ? 'Live Connected' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Hidden Camera Input with capture="environment" */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
        />

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-center space-y-5">
          {/* Status or Latest Preview Area */}
          {latestPreview ? (
            <div className="relative w-36 h-36 mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner flex items-center justify-center">
              <img
                src={latestPreview}
                alt="Latest Bill Page"
                className="w-full h-full object-cover"
              />
              {isUploading ? (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 text-[#4338CA]">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  <span className="text-[10px] font-bold font-mono">Uploading...</span>
                </div>
              ) : (
                <div className="absolute top-2 right-2 bg-[#0D9488] text-white p-1 rounded-full shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] mx-auto shadow-xs">
              <Camera className="w-10 h-10" />
            </div>
          )}

          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              {uploadedCount === 0
                ? 'Capture Purchase Bill'
                : `Page ${uploadedCount} Uploaded!`}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Snap a clear photo of the invoice. It compresses and syncs directly to your desktop
              screen in real time.
            </p>
          </div>

          {/* Upload Status / Success Notice */}
          {uploadStatus && (
            <div
              className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                isUploading
                  ? 'bg-indigo-50 border-indigo-200 text-[#4338CA]'
                  : 'bg-teal-50 border-teal-200 text-[#0D9488]'
              }`}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#4338CA]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0D9488]" />
              )}
              <span>{uploadStatus}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Single Primary Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-4 px-6 rounded-2xl bg-[#4338CA] hover:bg-[#3730A3] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-base shadow-md shadow-indigo-100 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing & Uploading...</span>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>Snap & Upload</span>
                </>
              )}
            </button>
          </div>

          {/* Page Counter & Completion Helper */}
          {uploadedCount > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1 text-[#0D9488] font-bold font-sans">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>{uploadedCount} {uploadedCount === 1 ? 'page' : 'pages'} transferred</span>
              </span>
              <span>Done? Close tab anytime</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center py-2 text-[10px] text-slate-400">
        nivopos.in • Cloudflare R2 & Realtime Sync
      </div>
    </div>
  );
};

export default MobileBillScan;
