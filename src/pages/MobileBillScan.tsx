import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  FileUp,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Store,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadToR2 } from '../lib/r2Upload';

export interface QueuedBillFile {
  id: string;
  file: File;
  previewUrl: string;
  pageNumber: number;
}

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

  // Local queue of pending bill files with page numbers
  const [queuedFiles, setQueuedFiles] = useState<QueuedBillFile[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [closeWindowNotice, setCloseWindowNotice] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const realtimeChannelRef = useRef<any>(null);

  // 1. Read session and store from URL query
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

  // 2. Append new captured/selected photos to the queue without replacing existing ones
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFilesArray = Array.from(files);

    setQueuedFiles((prev) => {
      const startPage = prev.length;
      const newItems: QueuedBillFile[] = newFilesArray.map((file, idx) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        pageNumber: startPage + idx + 1,
      }));

      const combined = [...prev, ...newItems];
      return combined.map((item, index) => ({
        ...item,
        pageNumber: index + 1,
      }));
    });

    setErrorMessage(null);
    e.target.value = '';
  };

  // Remove individual file from the queue and re-index page numbers
  const handleRemoveFile = (idToRemove: string) => {
    setQueuedFiles((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const filtered = prev.filter((item) => item.id !== idToRemove);
      return filtered.map((item, index) => ({
        ...item,
        pageNumber: index + 1,
      }));
    });
  };

  // Reorder queue item up or down
  const handleMoveFile = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queuedFiles.length) return;

    setQueuedFiles((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy.map((item, idx) => ({
        ...item,
        pageNumber: idx + 1,
      }));
    });
  };

  // Clear entire queue
  const handleClearQueue = () => {
    queuedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setQueuedFiles([]);
    setErrorMessage(null);
  };

  // 3. Upload all queued files sequentially to Cloudflare R2 and broadcast with clubAsSingleBill: true
  const handleUploadAllAndSend = async () => {
    if (!sessionId || !storeId) {
      setErrorMessage('Missing session or store ID. Please rescan the QR code.');
      return;
    }
    if (queuedFiles.length === 0) {
      setErrorMessage('Please capture or choose at least one bill page first.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(0);

    const uploadedFiles: UploadedFileItem[] = [];

    try {
      for (let i = 0; i < queuedFiles.length; i++) {
        const item = queuedFiles[i];
        const pageNum = i + 1;
        setUploadStatus(`Uploading Page ${pageNum} of ${queuedFiles.length} to Cloudflare R2...`);

        const { fileKey, publicUrl } = await uploadToR2({
          file: item.file,
          storeId,
          folder: 'purchases',
        });

        uploadedFiles.push({
          name: item.file.name,
          type: item.file.type || 'image/jpeg',
          publicUrl,
          fileKey,
          pageNumber: pageNum,
        });

        setUploadProgress(Math.round(((i + 1) / queuedFiles.length) * 100));
      }

      setUploadStatus('Syncing all pages with desktop in real time...');

      // Broadcast payload to desktop listener
      let channel = realtimeChannelRef.current;
      if (!channel) {
        channel = supabase.channel(`bill-scan-${sessionId}`);
        realtimeChannelRef.current = channel;
      }

      await new Promise<void>((resolve) => {
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });
        setTimeout(resolve, 600);
      });

      await channel.send({
        type: 'broadcast',
        event: 'files-uploaded',
        payload: {
          files: uploadedFiles,
          clubAsSingleBill: true,
        },
      });

      setUploadedCount(uploadedFiles.length);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('[MobileScan] Sequential upload failed:', err);
      setErrorMessage(err?.message || 'Upload failed. Please check connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Reset state to start a fresh bill queue
  const handleStartAnotherQueue = () => {
    handleClearQueue();
    setIsSuccess(false);
    setErrorMessage(null);
    setUploadStatus('');
    setUploadProgress(0);
    setCloseWindowNotice(false);
  };

  // Close window handler with fallback notice
  const handleCloseWindow = () => {
    try {
      window.close();
      // If browser security blocks window.close() (common on mobile browsers)
      setTimeout(() => {
        setCloseWindowNotice(true);
      }, 300);
    } catch {
      setCloseWindowNotice(true);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ================= VIEW A: MISSING SESSION ERROR =================
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
              Session ID or Store ID is missing in this link. Please open Purchase Bills on your
              desktop computer and rescan the QR code.
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

  // ================= VIEW B: SUCCESS CONFIRMATION =================
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-6 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0D9488] mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-[#0F172A]">Sent to Desktop!</h1>
            <p className="text-xs font-bold text-[#0D9488]">
              {uploadedCount} {uploadedCount === 1 ? 'page' : 'pages'} transferred as 1 bill
            </p>
            <p className="text-xs text-slate-500 pt-1 leading-relaxed">
              All pages were uploaded to Cloudflare R2 and synced to your desktop screen in real-time.
            </p>
          </div>

          {closeWindowNotice && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              You can now safely switch apps or close this browser tab.
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            {/* Primary Action: Done (Close Window) */}
            <button
              onClick={handleCloseWindow}
              className="w-full py-3 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] transition-all"
            >
              <span>Done (Close Window)</span>
            </button>

            {/* Secondary Action: Scan Another Multi-Page Bill */}
            <button
              onClick={handleStartAnotherQueue}
              className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#4338CA]" />
              <span>Scan Another Multi-Page Bill</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Store className="w-3.5 h-3.5" />
          <span>Nivo POS • Multi-Page Scanner</span>
        </div>
      </div>
    );
  }

  // ================= VIEW C: MAIN QUEUE & SCANNER INTERFACE =================
  const queueCounterText =
    queuedFiles.length === 1
      ? '1 page queued for 1 bill'
      : `${queuedFiles.length} pages queued for 1 bill`;

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
              <p className="text-[10px] text-slate-500">Multi-Page Bill Scanner</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            <span>Desktop Connected</span>
          </div>
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

        {/* Capture / Select Action Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="text-center pb-1">
            <h2 className="text-sm font-bold text-[#0F172A]">
              {queuedFiles.length === 0
                ? 'Capture Bill Photo (Page 1)'
                : `Add Next Page (Page ${queuedFiles.length + 1})`}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Snap photos of all pages. They will be bundled into a single inward bill.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Primary Action: Camera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition-all"
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>
                {queuedFiles.length === 0
                  ? 'Take Photo of Page 1'
                  : `Take Photo of Page ${queuedFiles.length + 1}`}
              </span>
            </button>

            {/* Secondary Action: File / Gallery */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
            >
              <FileUp className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Choose More Pages from Gallery / PDF</span>
            </button>
          </div>
        </div>

        {/* Queued Bill Pages Section */}
        {queuedFiles.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3.5">
            {/* Queue Counter Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA] font-bold text-xs">
                  <Layers className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#0F172A]">{queueCounterText}</span>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  onClick={handleClearQueue}
                  className="text-[11px] text-rose-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear queue</span>
                </button>
              )}
            </div>

            {/* List of Queued Pages with Reordering & Badges */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
              {queuedFiles.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* Thumbnail Preview */}
                    <div className="relative shrink-0">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={`Page ${item.pageNumber}`}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4338CA]">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-[#4338CA] text-white font-bold text-[9px] shadow-2xs">
                        P{item.pageNumber}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#0F172A] text-xs">
                          Page {item.pageNumber}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ({formatFileSize(item.file.size)})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.file.name}</p>
                    </div>
                  </div>

                  {/* Actions: Reorder up/down & Remove */}
                  {!isUploading && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveFile(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-white transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveFile(idx, 'down')}
                        disabled={idx === queuedFiles.length - 1}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-white transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors ml-0.5"
                        title="Remove Page"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Error notice if any */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Prominent Upload All & Send to Desktop Button */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleUploadAllAndSend}
                disabled={isUploading}
                className="w-full py-4 px-5 rounded-2xl bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100 active:scale-[0.99] transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{uploadStatus || 'Uploading pages to Cloudflare R2...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      Upload All & Send to Desktop ({queuedFiles.length}{' '}
                      {queuedFiles.length === 1 ? 'Page' : 'Pages'})
                    </span>
                  </>
                )}
              </button>

              {isUploading && uploadProgress > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#4338CA] h-2 transition-all duration-300 rounded-full"
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
        nivopos.in • Cloudflare R2 Powered Multi-Page Scan
      </div>
    </div>
  );
};

export default MobileBillScan;
