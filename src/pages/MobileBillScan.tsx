import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  FileUp,
  FileText,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Store,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../lib/r2Upload';

export interface UploadedFileItem {
  name: string;
  type: string;
  publicUrl: string;
  fileKey: string;
}

export const MobileBillScan: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const realtimeChannelRef = useRef<any>(null);

  // 1. Read session and store from URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('session');
      const st = params.get('store');
      setSessionId(s);
      setStoreId(st);

      // Subscribe to Realtime channel ahead of time
      if (s) {
        const channel = supabase.channel(`bill-scan-${s}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[MobileScan] Subscribed to realtime channel bill-scan-${s}`);
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

  // Generate preview URLs for newly selected image files
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      return combined;
    });

    const newPreviews: { [key: string]: string } = { ...previewUrls };
    newFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        newPreviews[file.name] = URL.createObjectURL(file);
      }
    });
    setPreviewUrls(newPreviews);
    setErrorMessage(null);

    // Reset input value so the same file can be re-selected if removed
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => {
      const target = prev[indexToRemove];
      if (target && previewUrls[target.name]) {
        URL.revokeObjectURL(previewUrls[target.name]);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  // Submit and upload all files to Cloudflare R2, then broadcast via Realtime
  const handleUploadAndSend = async () => {
    if (!sessionId || !storeId) {
      setErrorMessage('Missing session or store ID. Please rescan the QR code.');
      return;
    }
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select or capture at least one purchase bill first.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(0);

    const uploadedFiles: UploadedFileItem[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const stepNum = i + 1;
        setUploadStatus(`Uploading bill ${stepNum} of ${selectedFiles.length}...`);

        const { fileKey, publicUrl } = await uploadToR2({
          file,
          storeId,
          folder: 'purchases',
        });

        uploadedFiles.push({
          name: file.name,
          type: file.type || 'image/jpeg',
          publicUrl,
          fileKey,
        });

        setUploadProgress(Math.round((stepNum / selectedFiles.length) * 100));
      }

      setUploadStatus('Syncing with desktop in real time...');

      // Broadcast payload to desktop listener
      let channel = realtimeChannelRef.current;
      if (!channel) {
        channel = supabase.channel(`bill-scan-${sessionId}`);
        realtimeChannelRef.current = channel;
      }

      // Ensure channel is ready and send
      await new Promise<void>((resolve) => {
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });
        setTimeout(resolve, 800);
      });

      await channel.send({
        type: 'broadcast',
        event: 'files-uploaded',
        payload: { files: uploadedFiles },
      });

      setUploadedCount(uploadedFiles.length);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[MobileScan] Upload failed:', err);
      setErrorMessage(err?.message || 'Upload failed. Please check connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetForAnother = () => {
    setSelectedFiles([]);
    setPreviewUrls({});
    setIsSuccess(false);
    setErrorMessage(null);
    setUploadStatus('');
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Missing session / storeId Error View
  if (!sessionId || !storeId) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Invalid Scan Session</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Session ID or Store ID is missing in this link. Please open the Purchase Bills page on
              your desktop screen and rescan the QR code.
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

  // Success Confirmation Screen
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0D9488] mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-[#0F172A]">Sent to Desktop!</h1>
            <p className="text-xs font-semibold text-[#0D9488]">You can close this tab.</p>
            <p className="text-xs text-slate-500 pt-1 leading-relaxed">
              {uploadedCount} purchase bill file{uploadedCount > 1 ? 's' : ''} uploaded to Cloudflare
              R2 and instantly synced with your desktop screen.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              onClick={handleResetForAnother}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Camera className="w-4 h-4 text-slate-500" />
              <span>Scan / Upload Another Bill</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1 text-[11px] text-slate-400">
          <Store className="w-3.5 h-3.5" />
          <span>Nivo POS • Mobile Scanner</span>
        </div>
      </div>
    );
  }

  // Standard Mobile Bill Uploader Card
  return (
    <div className="min-h-screen bg-[#F4F6F9] py-5 px-3 flex flex-col justify-between">
      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Header Branding */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#0F172A] leading-tight">Nivo POS</h1>
              <p className="text-[10px] text-slate-500">Mobile Purchase Bill Scanner</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Live Link Active
          </span>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />

        {/* Actions Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="text-center pb-1">
            <h2 className="text-sm font-bold text-[#0F172A]">Capture or Select Purchase Bill</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Photos or PDFs will instantly appear on your desktop Purchase Bills screen
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Primary Action: Camera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition-all"
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>Take Photo of Bill</span>
            </button>

            {/* Secondary Action: File / Gallery */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <FileUp className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Choose PDF / Gallery</span>
            </button>
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-[#0F172A]">
                Selected Files ({selectedFiles.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFiles([]);
                  setPreviewUrls({});
                }}
                disabled={isUploading}
                className="text-[11px] text-rose-600 hover:underline font-medium"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {previewUrls[file.name] ? (
                      <img
                        src={previewUrls[file.name]}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate text-[11px]">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>

                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors shrink-0"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Error notice if any */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Prominent Upload & Send to Desktop Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleUploadAndSend}
                disabled={isUploading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100 active:scale-[0.99] transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{uploadStatus || 'Uploading to R2...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Upload & Send to Desktop ({selectedFiles.length}{' '}
                      {selectedFiles.length === 1 ? 'file' : 'files'})
                    </span>
                  </>
                )}
              </button>
              {isUploading && uploadProgress > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-[#4338CA] h-1.5 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center py-3 text-[10px] text-slate-400">
        nivopos.in • Cloudflare R2 Powered
      </div>
    </div>
  );
};

export default MobileBillScan;
