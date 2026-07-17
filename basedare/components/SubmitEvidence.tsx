'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Upload, X, AlertCircle, Loader2, ShieldCheck, ShieldX, RefreshCw, Camera, Video } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAccount, useSignMessage } from 'wagmi';
import { useToast } from '@/components/ui/use-toast';
import ShareWinButton from '@/components/ShareWinButton';
import ReceiptShareCard from '@/components/ReceiptShareCard';
import CosmicButton from '@/components/ui/CosmicButton';
import SafetyWaiver from '@/components/SafetyWaiver';
import CameraCaptureModal, { type CameraCaptureMode } from '@/components/media/CameraCaptureModal';
import { PROOF_SUBMIT_WINDOW_MS, buildProofSubmitMessage } from '@/lib/proof-submit-auth';

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
  existingProofUrl?: string | null;
  /**
   * Whether this dare is proximity-gated (nearby IRL, non-STREAM). Computed by the
   * PARENT from trusted server dare data — only then do we prompt for GPS. For
   * ungated dares we never request location, so STREAM/remote proofs aren't
   * prompted and no coordinates are collected. Default false = never collect.
   */
  gatesLocation?: boolean;
  onVerificationComplete?: (result: { status: string; confidence?: number }) => void;
}

type AssertionTarget = {
  id: string;
  kind: 'OPENING_WINDOW' | 'ITEM_PRICE' | 'PAYMENT_METHOD';
  subjectKey: string;
  valueSchemaVersion: number;
  required: boolean;
  position: number;
  displayConfigJson: Record<string, unknown> | null;
};

type StructuredDraft = Record<string, string | boolean>;

type StoredProofSubmitAuth = {
  walletAddress: string;
  dareId: string;
  issuedAt: string;
  signature: string;
};

const buildProofSubmitStorageKey = (dareId: string) => `basedare:proof-submit-auth:${dareId}`;

export default function SubmitEvidence({
  dareId,
  dareTitle,
  bountyAmount,
  streamerHandle,
  shortId,
  placeName,
  existingProofUrl,
  gatesLocation = false,
  onVerificationComplete,
}: SubmitEvidenceProps) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
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
  const [proofWaiverAccepted, setProofWaiverAccepted] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraCaptureMode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [assertionTargets, setAssertionTargets] = useState<AssertionTarget[]>([]);
  const [structuredDrafts, setStructuredDrafts] = useState<Record<string, StructuredDraft>>({});
  const [targetsLoaded, setTargetsLoaded] = useState(false);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setTargetsLoaded(false);
    setTargetsError(null);
    void fetch(`/api/dares/${encodeURIComponent(dareId)}/assertion-targets`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success?: boolean;
          error?: string;
          data?: { targets?: AssertionTarget[] };
        };
        if (!response.ok || payload.success !== true) {
          throw new Error(payload.error || 'Unable to load mission questions.');
        }
        const targets = payload.data?.targets ?? [];
        setAssertionTargets(targets);
        setStructuredDrafts(
          Object.fromEntries(
            targets.map((target) => {
              const display = target.displayConfigJson ?? {};
              if (target.kind === 'OPENING_WINDOW') {
                return [
                  target.id,
                  {
                    closed: false,
                    opens: '09:00',
                    closes: '17:00',
                    timezone:
                      (typeof display.timezone === 'string' && display.timezone) ||
                      Intl.DateTimeFormat().resolvedOptions().timeZone ||
                      'UTC',
                    note: '',
                  },
                ];
              }
              if (target.kind === 'ITEM_PRICE') {
                return [
                  target.id,
                  {
                    itemLabel:
                      (typeof display.itemLabel === 'string' && display.itemLabel) ||
                      target.subjectKey.replaceAll('_', ' '),
                    amount: '',
                    currency: (typeof display.currency === 'string' && display.currency) || 'PHP',
                    unit: (typeof display.unit === 'string' && display.unit) || '',
                    available: true,
                  },
                ];
              }
              return [
                target.id,
                { methodCode: target.subjectKey, accepted: true, evidenceContext: '' },
              ];
            }),
          ),
        );
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setTargetsError(loadError instanceof Error ? loadError.message : 'Unable to load mission questions.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setTargetsLoaded(true);
      });
    return () => controller.abort();
  }, [dareId]);

  const updateStructuredDraft = (
    targetId: string,
    field: string,
    value: string | boolean,
  ) => {
    setStructuredDrafts((current) => ({
      ...current,
      [targetId]: { ...current[targetId], [field]: value },
    }));
  };

  const buildStructuredAnswersForSubmit = () => {
    if (!targetsLoaded) throw new Error('Mission questions are still loading.');
    if (targetsError) throw new Error(targetsError);
    if (assertionTargets.length === 0) return undefined;

    return assertionTargets.map((target) => {
      const draft = structuredDrafts[target.id] ?? {};
      if (target.kind === 'OPENING_WINDOW') {
        const closed = draft.closed === true;
        const timezone = String(draft.timezone ?? '').trim();
        if (!timezone) throw new Error('Choose a timezone for the opening-hours answer.');
        return {
          targetId: target.id,
          value: {
            closed,
            opens: closed ? null : String(draft.opens ?? ''),
            closes: closed ? null : String(draft.closes ?? ''),
            timezone,
            ...(String(draft.note ?? '').trim() ? { note: String(draft.note).trim() } : {}),
          },
        };
      }
      if (target.kind === 'ITEM_PRICE') {
        const amount = String(draft.amount ?? '').trim();
        const display = target.displayConfigJson ?? {};
        const minorUnitScale =
          typeof display.minorUnitScale === 'number' &&
          Number.isInteger(display.minorUnitScale) &&
          display.minorUnitScale >= 0 &&
          display.minorUnitScale <= 3
            ? display.minorUnitScale
            : 2;
        const amountPattern = minorUnitScale === 0
          ? /^\d+$/
          : new RegExp(`^\\d+(?:\\.\\d{1,${minorUnitScale}})?$`);
        if (!amountPattern.test(amount)) {
          throw new Error(
            minorUnitScale === 0
              ? 'Enter the item price as a whole amount.'
              : `Enter the item price with at most ${minorUnitScale} decimal place${minorUnitScale === 1 ? '' : 's'}.`,
          );
        }
        const [whole, fraction = ''] = amount.split('.');
        const scale = 10 ** minorUnitScale;
        const amountMinor = Number(whole) * scale + Number(fraction.padEnd(minorUnitScale, '0') || '0');
        if (!Number.isSafeInteger(amountMinor)) throw new Error('The item price is too large.');
        return {
          targetId: target.id,
          value: {
            itemLabel: String(draft.itemLabel ?? '').trim(),
            amountMinor,
            currency: String(draft.currency ?? '').trim().toUpperCase(),
            ...(String(draft.unit ?? '').trim() ? { unit: String(draft.unit).trim() } : {}),
            available: draft.available !== false,
          },
        };
      }
      return {
        targetId: target.id,
        value: {
          methodCode: target.subjectKey,
          accepted: draft.accepted === true,
          ...(String(draft.evidenceContext ?? '').trim()
            ? { evidenceContext: String(draft.evidenceContext).trim() }
            : {}),
        },
      };
    });
  };
  const readStoredProofAuth = (walletAddress: string): StoredProofSubmitAuth | null => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.sessionStorage.getItem(buildProofSubmitStorageKey(dareId));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredProofSubmitAuth;
      if (
        !parsed?.walletAddress ||
        !parsed?.issuedAt ||
        !parsed?.signature ||
        !parsed?.dareId ||
        parsed.walletAddress !== walletAddress ||
        parsed.dareId !== dareId
      ) {
        return null;
      }

      const issuedAtMs = Date.parse(parsed.issuedAt);
      if (!Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > PROOF_SUBMIT_WINDOW_MS) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const persistProofAuth = (payload: StoredProofSubmitAuth) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(buildProofSubmitStorageKey(dareId), JSON.stringify(payload));
  };

  const getProofAuthHeaders = async (): Promise<Record<string, string>> => {
    const authToken = (session as { token?: string } | null)?.token;
    const sessionWalletRaw = (session as { walletAddress?: string | null } | null)?.walletAddress;
    const sessionWallet = sessionWalletRaw?.toLowerCase() ?? null;
    const connectedWallet = address?.toLowerCase() ?? null;
    const headers: Record<string, string> = {};

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    if (!connectedWallet || (sessionWallet && sessionWallet === connectedWallet)) {
      return headers;
    }

    const cachedAuth = readStoredProofAuth(connectedWallet);
    const issuedAt = cachedAuth?.issuedAt ?? new Date().toISOString();
    const signature =
      cachedAuth?.signature ??
      (await signMessageAsync({
        message: buildProofSubmitMessage({
          walletAddress: connectedWallet,
          dareId,
          issuedAt,
        }),
      }));

    if (!cachedAuth) {
      persistProofAuth({
        walletAddress: connectedWallet,
        dareId,
        issuedAt,
        signature: String(signature),
      });
    }

    headers['x-basedare-proof-wallet'] = connectedWallet;
    headers['x-basedare-proof-signature'] = String(signature);
    headers['x-basedare-proof-issued-at'] = issuedAt;

    return headers;
  };

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
  const receiptHref = `/dare/${shortId || dareId}`;
  const creatorLabel = streamerHandle ? `@${streamerHandle.replace(/^@/, '')}` : undefined;

  const handleVerifyUploadedProof = async (videoUrl: string, proofAuthHeaders: Record<string, string>) => {
    setStatus('verifying');
    const structuredAnswers = buildStructuredAnswersForSubmit();

    // Capture device location ONLY for proximity-gated (nearby IRL) dares, per
    // trusted parent-supplied metadata — STREAM/remote proofs are never prompted.
    // Best-effort: denial/unavailable → null → the server routes to review, never
    // a silent pass. The server independently drops location for ungated dares.
    let location = null;
    if (gatesLocation) {
      const { captureProofLocation } = await import('@/lib/capture-proof-location');
      location = await captureProofLocation();
    }

    const verifyResponse = await fetch('/api/verify-proof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...proofAuthHeaders,
      },
      body: JSON.stringify({
        dareId,
        proofData: {
          videoUrl,
          timestamp: Date.now(),
        },
        ...(structuredAnswers ? { structuredAnswers } : {}),
        ...(location ? { location } : {}),
      }),
    });

    const verifyData = await parseJsonSafe(verifyResponse);

    if (!verifyResponse.ok || verifyData.success !== true) {
      const verifyCode = typeof verifyData.code === 'string' ? verifyData.code : '';
      if (verifyCode === 'ALREADY_VERIFIED') {
        setStatus('verified');
        setVerificationResult({ reason: 'This dare has already been verified!' });
        return;
      }
      throw new Error(readErrorMessage(verifyData, 'Verification failed. Please try again.'));
    }

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
  };

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
      'video/3gpp',
      'video/3gpp2',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];
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

  const handleCameraCapture = (capturedFile: File) => {
    handleFileSelect(capturedFile);
  };

  const handleUploadAndVerify = async () => {
    if (!file || !dareId) return;

    try {
      buildStructuredAnswersForSubmit();
    } catch (structuredError) {
      setError(getUnknownErrorMessage(structuredError, 'Complete the mission questions first.'));
      return;
    }

    setStatus('uploading');
    setError(null);
    let uploadedVideoUrl: string | null = null;

    try {
      const proofAuthHeaders = await getProofAuthHeaders();
      // Step 1: Upload file to IPFS via Pinata
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dareId', dareId);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: proofAuthHeaders,
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
      uploadedVideoUrl = videoUrl;
      console.log('[EVIDENCE] File uploaded:', videoUrl);

      await handleVerifyUploadedProof(videoUrl, proofAuthHeaders);
    } catch (err: unknown) {
      const defaultError = uploadedVideoUrl
        ? 'Your proof was uploaded safely. Tap submit proof again to retry verification.'
        : 'Failed to upload and verify. Please try again.';
      const errorMessage = getUnknownErrorMessage(err, defaultError);
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

  const handleRetryVerification = async () => {
    if (!existingProofUrl) return;

    setError(null);

    try {
      const proofAuthHeaders = await getProofAuthHeaders();
      await handleVerifyUploadedProof(existingProofUrl, proofAuthHeaders);
    } catch (err: unknown) {
      const errorMessage = getUnknownErrorMessage(
        err,
        'Your proof is already attached. Please try verification again.'
      );
      setError(errorMessage);
      setStatus('idle');
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
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
      const proofAuthHeaders = await getProofAuthHeaders();
      const response = await fetch('/api/verify-proof', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...proofAuthHeaders,
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

  const renderStructuredQuestions = () => {
    if (!targetsLoaded) {
      return (
        <div className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.05] px-4 py-3 text-left text-xs text-cyan-100">
          Loading the place questions…
        </div>
      );
    }
    if (targetsError) {
      return (
        <div className="rounded-2xl border border-red-300/20 bg-red-500/[0.08] px-4 py-3 text-left text-xs text-red-100">
          {targetsError} Refresh before submitting proof.
        </div>
      );
    }
    if (assertionTargets.length === 0) return null;

    return (
      <section
        className="space-y-3 rounded-2xl border border-cyan-300/14 bg-cyan-400/[0.045] p-4 text-left"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
            Answer for the map
          </p>
          <p className="mt-1 text-xs leading-5 text-white/60">
            Give the exact answer you observed. Your media supports it; BaseDare versions it after approval.
          </p>
        </div>
        {assertionTargets.map((target) => {
          const draft = structuredDrafts[target.id] ?? {};
          const display = target.displayConfigJson ?? {};
          const label =
            (typeof display.label === 'string' && display.label) ||
            (target.kind === 'OPENING_WINDOW'
              ? `${target.subjectKey} opening hours`
              : target.kind === 'ITEM_PRICE'
                ? `Price: ${target.subjectKey.replaceAll('_', ' ')}`
                : `Accepts ${target.subjectKey.replaceAll('_', ' ')}?`);
          const helpText = typeof display.helpText === 'string' ? display.helpText : null;

          return (
            <div key={target.id} className="rounded-xl border border-white/8 bg-black/25 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white">{label}</p>
                  {helpText ? <p className="mt-1 text-[11px] leading-4 text-white/45">{helpText}</p> : null}
                </div>
                {target.required ? (
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200">Required</span>
                ) : null}
              </div>

              {target.kind === 'OPENING_WINDOW' ? (
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={draft.closed === true}
                      onChange={(event) => updateStructuredDraft(target.id, 'closed', event.target.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    Closed that day
                  </label>
                  {draft.closed !== true ? (
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Opens
                        <input
                          type="time"
                          value={String(draft.opens ?? '')}
                          onChange={(event) => updateStructuredDraft(target.id, 'opens', event.target.value)}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black px-2 text-sm text-white"
                        />
                      </label>
                      <label className="text-[10px] uppercase tracking-[0.12em] text-white/45">
                        Closes
                        <input
                          type="time"
                          value={String(draft.closes ?? '')}
                          onChange={(event) => updateStructuredDraft(target.id, 'closes', event.target.value)}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black px-2 text-sm text-white"
                        />
                      </label>
                    </div>
                  ) : null}
                  <input
                    value={String(draft.note ?? '')}
                    onChange={(event) => updateStructuredDraft(target.id, 'note', event.target.value)}
                    placeholder="Optional note, e.g. kitchen closes earlier"
                    aria-label={`${label} note`}
                    maxLength={240}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-xs text-white placeholder:text-white/25"
                  />
                </div>
              ) : target.kind === 'ITEM_PRICE' ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px]">
                  <input
                    inputMode="decimal"
                    value={String(draft.amount ?? '')}
                    onChange={(event) => updateStructuredDraft(target.id, 'amount', event.target.value)}
                    placeholder="Observed price"
                    aria-label={`${label} observed price`}
                    className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm text-white placeholder:text-white/25"
                  />
                  <input
                    value={String(draft.currency ?? '')}
                    onChange={(event) => updateStructuredDraft(target.id, 'currency', event.target.value.toUpperCase())}
                    maxLength={3}
                    aria-label="Currency"
                    className="h-10 rounded-lg border border-white/10 bg-black px-3 text-sm uppercase text-white"
                  />
                  <label className="flex items-center gap-2 text-xs text-white/65 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={draft.available !== false}
                      onChange={(event) => updateStructuredDraft(target.id, 'available', event.target.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    Item is available now
                  </label>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateStructuredDraft(target.id, 'accepted', true)}
                      className={`h-10 rounded-lg border text-xs font-bold ${
                        draft.accepted === true
                          ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
                          : 'border-white/10 bg-black text-white/45'
                      }`}
                    >
                      Accepted
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStructuredDraft(target.id, 'accepted', false)}
                      className={`h-10 rounded-lg border text-xs font-bold ${
                        draft.accepted === false
                          ? 'border-amber-300/40 bg-amber-400/15 text-amber-100'
                          : 'border-white/10 bg-black text-white/45'
                      }`}
                    >
                      Not accepted
                    </button>
                  </div>
                  <input
                    value={String(draft.evidenceContext ?? '')}
                    onChange={(event) => updateStructuredDraft(target.id, 'evidenceContext', event.target.value)}
                    placeholder="Optional context — never enter card or account details"
                    aria-label={`${label} evidence context`}
                    maxLength={240}
                    className="h-10 w-full rounded-lg border border-white/10 bg-black px-3 text-xs text-white placeholder:text-white/25"
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
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
          <ReceiptShareCard
            compact
            title={`${activationLabel} proof approved`}
            detail="Verified proof is now a reusable BaseDare receipt for the venue, creator, and payout rail."
            href={receiptHref}
            venueName={placeName}
            actorLabel={creatorLabel}
            tone="gold"
            stats={payoutLabel ? [{ label: 'payout', value: payoutLabel }] : []}
            className="w-full max-w-[340px]"
          />
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
          <ReceiptShareCard
            compact
            title={isReview ? `${activationLabel} proof submitted` : `${activationLabel} payout queued`}
            detail={
              isReview
                ? 'Proof is attached and waiting in the referee review rail.'
                : 'Proof cleared. Settlement is queued and will retry automatically.'
            }
            href={receiptHref}
            venueName={placeName}
            actorLabel={creatorLabel}
            tone={isReview ? 'violet' : 'gold'}
            stats={payoutLabel ? [{ label: 'payout', value: payoutLabel }] : []}
            className="w-full max-w-[340px]"
          />
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
              {renderStructuredQuestions()}
              <SafetyWaiver checked={proofWaiverAccepted} onChange={setProofWaiverAccepted} context="proof" />
              <CosmicButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadAndVerify();
                }}
                disabled={!!error || !proofWaiverAccepted || !targetsLoaded || !!targetsError}
                variant="gold"
                size="md"
                fullWidth
              >
                <Upload className="w-4 h-4" />
                Submit Proof
              </CosmicButton>
            </div>
          </>
        ) : existingProofUrl ? (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-500/12 flex items-center justify-center border border-yellow-400/28">
              <ShieldCheck className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                Proof Already Attached
              </h3>
              <p className="text-xs font-mono text-gray-400 max-w-[260px]">
                Your evidence is already stored for {activationLabel}. If verification did not finish, resume it here without uploading again.
              </p>
            </div>
            <div className="w-full max-w-[280px] rounded-2xl border border-yellow-400/14 bg-yellow-500/[0.06] px-4 py-3 text-left">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-yellow-100">Recovery Path</p>
              <p className="mt-2 text-xs text-gray-200">
                Use the saved proof to re-run verification. Do not upload a second copy unless you want to replace the evidence entirely.
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono max-w-[220px]">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="w-full max-w-[420px]">{renderStructuredQuestions()}</div>
            <div className="w-full max-w-[280px]">
              <CosmicButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleRetryVerification();
                }}
                variant="gold"
                size="md"
                fullWidth
              >
                <>
                  <RefreshCw className="w-4 h-4" />
                  Retry Verification
                </>
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
                  : `Capture or upload one clear photo or short video from ${activationLabel}.`}
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono max-w-[200px]">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div
              className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-3"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setCameraMode('photo')}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-cyan-300/24 bg-cyan-400/[0.09] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-400/[0.14] active:scale-[0.98]"
              >
                <Camera className="h-4 w-4" />
                Take photo
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('video')}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-100 transition hover:bg-fuchsia-400/[0.13] active:scale-[0.98]"
              >
                <Video className="h-4 w-4" />
                Record video
              </button>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.045] px-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/72 transition hover:bg-white/[0.08] active:scale-[0.98]">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                <Upload className="h-4 w-4" />
                Upload existing
              </label>
            </div>
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
      <CameraCaptureModal
        open={cameraMode !== null}
        mode={cameraMode ?? 'photo'}
        title={cameraMode === 'video' ? 'Record proof video' : 'Take proof photo'}
        onClose={() => setCameraMode(null)}
        onCapture={handleCameraCapture}
        onFallbackUpload={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
