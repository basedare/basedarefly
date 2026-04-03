'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle, Loader2, ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/use-toast';
import ShareWinButton from '@/components/ShareWinButton';
import CosmicButton from '@/components/ui/CosmicButton';

type VerificationStatus =
  | 'idle'
  | 'uploading'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'pending_review'
  | 'pending_payout';

interface SubmitEvidenceProps {
  dareId: string;
  dareTitle?: string;
  bountyAmount?: number | string;
  streamerHandle?: string;
  shortId?: string;
  placeName?: string | null;
  onVerificationComplete?: (result: { status: string; confidence?: number }) => void;
}

export default function SubmitEvidence({
  dareId,
  dareTitle,
  bountyAmount,
  streamerHandle,
  shortId,
  placeName,
  onVerificationComplete,
}: SubmitEvidenceProps) {
  const { data: session } = useSession();
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
  const parseJsonSafe = async (response: Response): Promise<Record<string, unknown>> => {
    try {
      return (await response.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const readErrorMessage = (payload: Record<string, unknown>, fallback: string): string =>
    typeof payload.error === 'string' ? payload.error : fallback;

  const getUnknownErrorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

  const activationLabel = placeName || dareTitle || 'this activation';
  const payoutLabel =
    typeof bountyAmount === 'number' || typeof bountyAmount === 'string'
      ? `$${bountyAmount}`
      : null;
  const fileTypeLabel = file?.type.startsWith('video/') ? 'video' : file?.type.startsWith('image/') ? 'photo' : 'file';

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
      const authToken = (session as { token?: string } | null)?.token;
      // Step 1: Upload file to IPFS via Pinata
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dareId', dareId);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: formData,
      });

      const uploadData = await parseJsonSafe(uploadResponse);

      if (!uploadResponse.ok) {
        throw new Error(readErrorMessage(uploadData, 'We could not upload your evidence. Please try again.'));
      }

      const uploadPayload = uploadData as {
        url?: unknown;
        ipfsUrl?: unknown;
        data?: { url?: unknown };
      };
      const videoUrl =
        (typeof uploadPayload.url === 'string' && uploadPayload.url) ||
        (typeof uploadPayload.ipfsUrl === 'string' && uploadPayload.ipfsUrl) ||
        (typeof uploadPayload.data?.url === 'string' && uploadPayload.data.url) ||
        null;

      if (!videoUrl) {
        throw new Error('Upload succeeded but no file URL was returned. Please retry.');
      }
      console.log('[EVIDENCE] File uploaded:', videoUrl);

      // Step 2: Trigger verification
      setStatus('verifying');

      const verifyResponse = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          dareId,
          proofData: {
            videoUrl,
            timestamp: Date.now(),
          },
        }),
      });

      const verifyData = await parseJsonSafe(verifyResponse);

      if (!verifyResponse.ok || verifyData.success !== true) {
        const verifyCode = typeof verifyData.code === 'string' ? verifyData.code : '';
        // Handle specific error codes
        if (verifyCode === 'ALREADY_VERIFIED') {
          setStatus('verified');
          setVerificationResult({ reason: 'This dare has already been verified!' });
          return;
        }
        throw new Error(readErrorMessage(verifyData, 'Verification failed. Please try again.'));
      }

      // Handle verification result
      const result = verifyData.data as
        | {
            status?: string;
            verification?: { confidence?: number; reason?: string };
            appealable?: boolean;
            message?: string;
          }
        | undefined;

      if (!result?.status) {
        throw new Error('Verification service returned an invalid response. Please try again.');
      }

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
      } else if (result.status === 'PENDING_REVIEW') {
        setStatus('pending_review');
        setVerificationResult({
          confidence: result.verification?.confidence,
          reason:
            result.verification?.reason ||
            result.message ||
            'Your proof is valid and is now under manual review.',
        });
        onVerificationComplete?.({ status: 'PENDING_REVIEW', confidence: result.verification?.confidence });

        toast({
          title: 'Proof Submitted',
          description: 'Your proof is safely in review. Expect an answer within about 24 hours.',
          duration: 9000,
        });
      } else if (result.status === 'PENDING_PAYOUT') {
        setStatus('pending_payout');
        setVerificationResult({
          confidence: result.verification?.confidence,
          reason:
            result.verification?.reason ||
            result.message ||
            'Proof verified. Payout is queued and will retry automatically.',
        });
        onVerificationComplete?.({ status: 'PENDING_PAYOUT', confidence: result.verification?.confidence });

        toast({
          title: 'Payout Queued',
          description: 'Proof cleared. Payout retry is active and will keep running automatically.',
          duration: 9000,
        });
      } else {
        throw new Error('Unexpected verification status received. Please refresh and check again.');
      }
    } catch (err: unknown) {
      const errorMessage = getUnknownErrorMessage(err, 'Failed to upload and verify. Please try again.');
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
      const authToken = (session as { token?: string } | null)?.token;
      const response = await fetch('/api/verify-proof', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          dareId,
          reason: appealText,
        }),
      });

      const data = await parseJsonSafe(response);

      if (!response.ok || data.success !== true) {
        throw new Error(readErrorMessage(data, 'Appeal submission failed'));
      }

      setAppealSubmitted(true);
      setError(null);

      // Show appeal submitted toast
      toast({
        title: 'Appeal Submitted',
        description: 'Your appeal has been submitted for review. You will be notified of the outcome within 24-48 hours.',
        duration: 8000,
      });
    } catch (err: unknown) {
      const errorMessage = getUnknownErrorMessage(err, 'Failed to submit appeal.');
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
            <h3 className="text-xl font-black text-green-400 uppercase tracking-wider mb-1">Proof Approved</h3>
            <p className="text-xs font-mono text-gray-300 max-w-[240px]">
              {verificationResult?.confidence
                ? `${activationLabel} cleared at ${(verificationResult.confidence * 100).toFixed(0)}% confidence.`
                : `${activationLabel} has been verified and locked in.`}
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
          <div className="rounded-2xl border border-green-400/16 bg-green-500/[0.06] px-4 py-3 text-left">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-green-200">What Happens Now</p>
            <p className="mt-2 text-xs text-gray-200">
              Your payout is processing now. Once settlement clears, this win strengthens the venue memory layer automatically.
            </p>
          </div>
          <div className="pt-2">
            <ShareWinButton
              dare={dareTitle}
              amount={bountyAmount}
              streamer={streamerHandle}
              shortId={shortId}
              placeName={placeName}
            />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending_review' || status === 'pending_payout') {
    const isReview = status === 'pending_review';
    return (
      <div className="group relative h-full bg-yellow-500/5 border-2 border-yellow-500/50 rounded-3xl overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50">
            <RefreshCw className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-yellow-400 uppercase tracking-wider mb-1">
              {isReview ? 'Proof Submitted' : 'Payout Queued'}
            </h3>
            <p className="text-xs font-mono text-gray-300 max-w-[250px]">
              {verificationResult?.reason ||
                (isReview
                  ? `${activationLabel} is waiting for manual review.`
                  : 'Your payout is queued and will retry automatically.')}
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-400/16 bg-yellow-500/[0.06] px-4 py-3 text-left">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-yellow-100">
              {isReview ? 'Review Rail Active' : 'Retry Rail Active'}
            </p>
            <p className="mt-2 text-xs text-gray-200">
              {isReview
                ? 'Your proof is safely attached. Expect a decision within about 24 hours. We will notify you as soon as it clears.'
                : 'Your proof already cleared. The payout rail will keep retrying automatically until settlement lands.'}
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="text-[10px] font-mono text-gray-400 hover:text-white uppercase tracking-wider transition-colors"
          >
            Replace Proof
          </button>
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
            <p className="text-xs font-mono text-gray-300 max-w-[240px]">
              {verificationResult?.reason || `We could not verify ${activationLabel} from this proof.`}
            </p>
          </div>
          <div className="w-full max-w-[260px] rounded-2xl border border-red-400/14 bg-red-500/[0.06] px-4 py-3 text-left">
            <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-red-200">Best Retry</p>
            <p className="mt-2 text-xs text-gray-200">
              Retake the proof with the venue and the completed challenge action clearly visible in one shot. Shorter, cleaner clips usually verify faster.
            </p>
          </div>

          {verificationResult?.appealable && !appealSubmitted && (
            <div className="w-full max-w-[240px] space-y-2">
              <textarea
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="Explain why this proof should be reconsidered, or what the referee missed."
                className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 resize-none h-16"
                maxLength={500}
              />
              <CosmicButton
                onClick={handleAppeal}
                variant="gold"
                size="sm"
                fullWidth
              >
                Submit Appeal
              </CosmicButton>
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
                {status === 'uploading' ? 'Uploading Proof' : 'Checking Proof'}
              </h3>
              <p className="text-xs font-mono text-gray-300 max-w-[220px]">
                {status === 'uploading'
                  ? 'Step 1 of 2. Sending your file to secure storage.'
                  : 'Step 2 of 2. Referee is checking completion and routing the next state.'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="px-3 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                {status === 'uploading' ? 'Step 1 / Upload' : 'Step 2 / Review'}
              </div>
              <div className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-mono text-yellow-400/80 uppercase tracking-wider">
                Beta Referee
              </div>
            </div>
            <p className="max-w-[240px] text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
              Keep this tab open. You will land in review, payout, or retry next.
            </p>
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
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left">
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-200">Ready To Submit</p>
                <p className="mt-2 text-xs text-gray-300">
                  Your {fileTypeLabel} is attached. Make sure it clearly shows {activationLabel} and the completed challenge moment.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                  <span>Venue visible</span>
                  <span>Challenge action visible</span>
                  <span>No heavy edits</span>
                  <span>Max 120MB</span>
                  {payoutLabel ? <span>{payoutLabel} on clear approval</span> : null}
                </div>
              </div>
              <div className="rounded-2xl border border-purple-300/12 bg-purple-500/[0.05] px-4 py-3 text-left">
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-purple-100">After Submit</p>
                <p className="mt-2 text-xs text-gray-300">
                  Lower-value clears can verify fast. Bigger payouts may pause in review first, but you will keep your place in the rail either way.
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <CosmicButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadAndVerify();
                }}
                disabled={!!error}
                variant="gold"
                size="md"
                fullWidth
              >
                <Upload className="w-4 h-4" />
                Submit Proof
              </CosmicButton>
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
                {isDragging ? 'Drop File Here' : 'Submit Proof'}
              </h3>
              <p className="text-xs font-mono text-gray-400 max-w-[240px]">
                {isDragging
                  ? 'Release to upload'
                  : `Upload one clear photo or short video from ${activationLabel}.`}
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono max-w-[200px]">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/45">
                <span>Venue visible</span>
                <span>Challenge action visible</span>
                <span>Short & clear wins</span>
                <span>Max 120MB</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-left max-w-[280px]">
                <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-200">Best Proof</p>
                <p className="mt-2 text-xs text-gray-300">
                  Show the venue, the action, and one clean moment that proves the dare happened. If the clip is messy, dark, or overcut, it is more likely to go to retry.
                </p>
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
