'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type VerificationStatus = 'idle' | 'uploading' | 'verifying' | 'verified' | 'failed';

interface SubmitEvidenceProps {
  dareId: string;
  onVerificationComplete?: (result: { status: string; confidence?: number }) => void;
}

export default function SubmitEvidence({ dareId, onVerificationComplete }: SubmitEvidenceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    confidence?: number;
    reason?: string;
    appealable?: boolean;
  } | null>(null);
  const [appealText, setAppealText] = useState('');
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload a video (MP4, WebM, MOV) or image (JPEG, PNG, GIF).');
      return;
    }

    const maxSize = 120 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File too large. Maximum size is 120MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setStatus('idle');
    setVerificationResult(null);

    if (selectedFile.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(selectedFile);
      video.onloadedmetadata = () => {
        setPreview(video.src);
      };
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUploadAndVerify = async () => {
    if (!file || !dareId) return;

    setStatus('uploading');
    setError(null);

    try {
      // Step 1: Upload file to IPFS via Pinata
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dareId', dareId);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      const videoUrl = uploadData.url || uploadData.ipfsUrl || uploadData.data?.url;
      console.log('[EVIDENCE] File uploaded:', videoUrl);

      // Step 2: Trigger verification
      setStatus('verifying');

      const verifyResponse = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dareId,
          proofData: {
            videoUrl,
            timestamp: Date.now(),
          },
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok && !verifyData.success) {
        // Handle specific error codes
        if (verifyData.code === 'ALREADY_VERIFIED') {
          setStatus('verified');
          setVerificationResult({ reason: 'This dare has already been verified!' });
          return;
        }
        throw new Error(verifyData.error || 'Verification failed');
      }

      // Handle verification result
      const result = verifyData.data;
      if (result.status === 'VERIFIED') {
        setStatus('verified');
        setVerificationResult({
          confidence: result.verification?.confidence,
          reason: result.verification?.reason,
        });
        onVerificationComplete?.({ status: 'VERIFIED', confidence: result.verification?.confidence });

        // Show success toast
        toast({
          variant: 'success',
          title: 'Dare Verified!',
          description: result.verification?.confidence
            ? `Beta AI Referee verified with ${(result.verification.confidence * 100).toFixed(0)}% confidence. Payout processing.`
            : 'Your proof has been verified. Payout is being processed.',
          duration: 8000,
        });
      } else if (result.status === 'FAILED') {
        setStatus('failed');
        setVerificationResult({
          confidence: result.verification?.confidence,
          reason: result.verification?.reason,
          appealable: result.appealable,
        });
        onVerificationComplete?.({ status: 'FAILED', confidence: result.verification?.confidence });

        // Show failure toast
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: result.verification?.reason || 'The Beta AI Referee could not verify dare completion. You can submit an appeal.',
          duration: 10000,
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload and verify. Please try again.';
      setError(errorMessage);
      setStatus('idle');
      console.error('[EVIDENCE] Error:', err);

      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: errorMessage,
        duration: 6000,
      });
    }
  };

  const handleAppeal = async () => {
    if (!appealText || appealText.length < 10) {
      setError('Please provide a detailed reason for your appeal (at least 10 characters).');
      return;
    }

    try {
      const response = await fetch('/api/verify-proof', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dareId,
          reason: appealText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Appeal submission failed');
      }

      setAppealSubmitted(true);
      setError(null);

      // Show appeal submitted toast
      toast({
        title: 'Appeal Submitted',
        description: 'Your appeal has been submitted for review. You will be notified of the outcome within 24-48 hours.',
        duration: 8000,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit appeal.';
      setError(errorMessage);

      // Show appeal error toast
      toast({
        variant: 'destructive',
        title: 'Appeal Failed',
        description: errorMessage,
        duration: 6000,
      });
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setStatus('idle');
    setError(null);
    setVerificationResult(null);
    setAppealText('');
    setAppealSubmitted(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (status === 'idle' && !file) {
      fileInputRef.current?.click();
    }
  };

  // Render verification status UI
  if (status === 'verified') {
    return (
      <div className="group relative h-full bg-green-500/5 border-2 border-green-500/50 rounded-3xl overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
            <ShieldCheck className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-green-400 uppercase tracking-wider mb-1">Verified!</h3>
            <p className="text-xs font-mono text-gray-400 max-w-[200px]">
              {verificationResult?.confidence
                ? `Confidence: ${(verificationResult.confidence * 100).toFixed(1)}%`
                : 'Your proof has been verified'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="px-3 py-1 rounded bg-green-500/10 border border-green-500/30 text-[10px] font-bold text-green-400 uppercase tracking-widest">
              Payout Processing
            </div>
            <div className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-mono text-yellow-400/80 uppercase tracking-wider">
              Verified by Beta AI Referee
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="group relative h-full bg-red-500/5 border-2 border-red-500/50 rounded-3xl overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
            <ShieldX className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider mb-1">Verification Failed</h3>
            <p className="text-xs font-mono text-gray-400 max-w-[220px]">
              {verificationResult?.reason || 'The AI could not verify dare completion'}
            </p>
          </div>

          {verificationResult?.appealable && !appealSubmitted && (
            <div className="w-full max-w-[240px] space-y-2">
              <textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="Why should this be reconsidered?"
                className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 resize-none h-16"
                maxLength={500}
              />
              <button
                onClick={handleAppeal}
                className="w-full px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400 font-bold text-xs rounded-lg uppercase tracking-wider transition-colors"
              >
                Submit Appeal
              </button>
              {error && (
                <p className="text-[10px] text-red-400">{error}</p>
              )}
            </div>
          )}

          {appealSubmitted && (
            <div className="px-3 py-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-[10px] font-mono text-yellow-400">
              Appeal submitted. Review in 24-48hrs.
            </div>
          )}

          <button
            onClick={handleRemove}
            className="text-[10px] font-mono text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative h-full bg-white/5 border-2 border-dashed transition-all duration-300 overflow-hidden rounded-3xl ${
        isDragging
          ? 'border-cyan-400 bg-cyan-500/10'
          : status === 'uploading' || status === 'verifying'
            ? 'border-purple-500/50 bg-purple-500/5'
            : error
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-white/10 hover:border-cyan-400/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent transition-opacity duration-300 ${
        isDragging || status === 'uploading' || status === 'verifying' ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'
      }`} />

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        {status === 'uploading' || status === 'verifying' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-black text-purple-400 uppercase tracking-wider mb-1">
                {status === 'uploading' ? 'Uploading...' : 'Verifying...'}
              </h3>
              <p className="text-xs font-mono text-gray-400 max-w-[200px]">
                {status === 'uploading'
                  ? 'Uploading to secure storage'
                  : 'AI Referee analyzing proof'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="px-3 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                {status === 'uploading' ? 'IPFS Upload' : 'AI Analysis'}
              </div>
              <div className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-mono text-yellow-400/80 uppercase tracking-wider">
                Beta Referee
              </div>
            </div>
          </>
        ) : preview ? (
          <>
            <div className="relative w-full max-w-xs mb-4">
              {file?.type.startsWith('video/') ? (
                <video
                  src={preview}
                  className="w-full rounded-xl border border-white/10"
                  controls
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full rounded-xl border border-white/10"
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/80 backdrop-blur-sm rounded-full border border-white/10 hover:bg-red-500/20 hover:border-red-500 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="w-full space-y-3">
              <div className="text-left">
                <p className="text-xs font-mono text-gray-400 mb-1">File: {file?.name}</p>
                <p className="text-[10px] font-mono text-gray-500">
                  Size: {(file ? file.size / (1024 * 1024) : 0).toFixed(2)} MB
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadAndVerify();
                }}
                disabled={!!error}
                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-black text-sm rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Submit & Verify
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={`w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border transition-all duration-300 ${
              isDragging
                ? 'scale-110 border-cyan-400 bg-cyan-500/10'
                : 'border-white/10 group-hover:scale-110 group-hover:border-cyan-400'
            }`}>
              <Upload className={`w-6 h-6 transition-colors ${
                isDragging ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-400'
              }`} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                {isDragging ? 'Drop File Here' : 'Submit Evidence'}
              </h3>
              <p className="text-xs font-mono text-gray-500 max-w-[200px]">
                {isDragging
                  ? 'Release to upload'
                  : 'DRAG VIDEO FILE HERE OR CLICK TO BROWSE'}
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono max-w-[200px]">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <div className="px-3 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                AI Referee Ready
              </div>
              <div className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-mono text-yellow-400/80 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                Beta • Testnet
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-white/20" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-white/20" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-white/20" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white/20" />
    </div>
  );
}
