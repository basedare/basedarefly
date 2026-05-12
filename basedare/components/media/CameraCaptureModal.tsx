'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Camera, Loader2, Square, Video, X } from 'lucide-react';

export type CameraCaptureMode = 'photo' | 'video';

type CameraCaptureModalProps = {
  open: boolean;
  mode: CameraCaptureMode;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackUpload?: () => void;
  fallbackLabel?: string;
  maxDurationMs?: number;
};

type CameraPermissionState = PermissionState | 'unsupported' | 'unknown';

const VIDEO_MIME_TYPES = [
  'video/mp4;codecs=h264',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function getSupportedVideoMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  return VIDEO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function getVideoExtension(mimeType: string) {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}

function getCameraPermissionCopy(permission: CameraPermissionState) {
  if (permission === 'granted') return 'Camera allowed';
  if (permission === 'denied') return 'Camera blocked';
  if (permission === 'prompt') return 'Prompt ready';
  if (permission === 'unsupported') return 'Permission unknown';
  return 'Checking camera';
}

function getCameraErrorMessage(error: unknown) {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Camera permission is blocked for this site. Allow Camera in browser settings, then reopen capture. Upload existing still works.';
    }

    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found on this device. Use upload existing instead.';
    }

    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'The camera is busy in another app. Close the other camera app or upload existing.';
    }

    if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      return 'This camera could not satisfy the rear-camera request. Try again or upload existing.';
    }
  }

  if (error instanceof Error && error.message) {
    return `Camera could not open. ${error.message}`;
  }

  return 'Camera could not open. Upload existing still works.';
}

export default function CameraCaptureModal({
  open,
  mode,
  title,
  onClose,
  onCapture,
  onFallbackUpload,
  fallbackLabel = 'Upload existing',
  maxDurationMs = 15000,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const discardRecordingRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionState>('unknown');
  const [streamActive, setStreamActive] = useState(false);

  const supportedVideoMimeType = useMemo(() => getSupportedVideoMimeType(), []);
  const secureContext = typeof window === 'undefined' ? true : window.isSecureContext;
  const hasCameraApi = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  const canRecordVideo = mode === 'photo' || Boolean(supportedVideoMimeType);
  const cameraReady = streamActive && !loading && !error;
  const portalTarget = typeof document === 'undefined' ? null : document.body;

  useEffect(() => {
    if (!open) return undefined;

    setCameraPermission('unknown');

    if (!navigator.permissions?.query) {
      setCameraPermission('unsupported');
      return undefined;
    }

    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permissionStatus = status;
        setCameraPermission(status.state);
        status.onchange = () => setCameraPermission(status.state);
      })
      .catch(() => {
        if (!cancelled) {
          setCameraPermission('unsupported');
        }
      });

    return () => {
      cancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const startCamera = async () => {
      if (!secureContext) {
        setError('Camera requires HTTPS or localhost. Open the secure BaseDare site, then retry. Upload existing still works.');
        return;
      }

      if (!hasCameraApi) {
        setError('This browser does not expose direct camera access here. Use upload existing as a fallback.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setStreamActive(true);
        setCameraPermission('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (cameraError) {
        if (typeof DOMException !== 'undefined' && cameraError instanceof DOMException) {
          if (cameraError.name === 'NotAllowedError' || cameraError.name === 'SecurityError') {
            setCameraPermission('denied');
          }
        }
        setError(getCameraErrorMessage(cameraError));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      discardRecordingRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStreamActive(false);
      chunksRef.current = [];
      setRecording(false);
      setCapturing(false);
    };
  }, [hasCameraApi, open, secureContext]);

  if (!open || !portalTarget) {
    return null;
  }

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('Camera is still warming up. Try again in a second.');
      return;
    }

    setCapturing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas capture is unavailable in this browser.');
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) {
        throw new Error('The camera frame could not be saved.');
      }

      onCapture(new File([blob], `basedare-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      onClose();
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : 'Photo capture failed.';
      setError(message);
    } finally {
      setCapturing(false);
    }
  };

  const stopRecording = () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || !supportedVideoMimeType) {
      setError('Direct video recording is not available in this browser. Use upload existing as a fallback.');
      return;
    }

    try {
      chunksRef.current = [];
      discardRecordingRef.current = false;
      const recorder = new MediaRecorder(stream, { mimeType: supportedVideoMimeType });
      recorderRef.current = recorder;
      setError(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: supportedVideoMimeType });
        chunksRef.current = [];
        recorderRef.current = null;
        setRecording(false);

        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }

        if (blob.size === 0) {
          setError('Recording was empty. Try again with the camera visible.');
          return;
        }

        const extension = getVideoExtension(supportedVideoMimeType);
        onCapture(new File([blob], `basedare-video-${Date.now()}.${extension}`, { type: supportedVideoMimeType }));
        onClose();
      };

      recorder.start();
      setRecording(true);
      stopTimerRef.current = window.setTimeout(stopRecording, maxDurationMs);
    } catch (recordError) {
      const message = recordError instanceof Error ? recordError.message : 'Video recording failed.';
      setError(message);
      setRecording(false);
      recorderRef.current = null;
    }
  };

  const handleFallbackUpload = () => {
    onFallbackUpload?.();
    onClose();
  };

  const statusPills = [
    {
      label: secureContext ? 'Secure site' : 'Needs HTTPS',
      active: secureContext,
    },
    {
      label: getCameraPermissionCopy(cameraPermission),
      active: cameraPermission === 'granted' || cameraPermission === 'prompt' || cameraPermission === 'unsupported',
    },
    {
      label: mode === 'video' ? (supportedVideoMimeType ? 'Video ready' : 'Video fallback') : 'Photo ready',
      active: mode === 'photo' || Boolean(supportedVideoMimeType),
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-end bg-[rgba(1,3,10,0.72)] backdrop-blur-xl sm:items-center sm:justify-center sm:px-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(11,13,25,0.98)_38%,rgba(5,6,14,0.99)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.1)] sm:max-w-lg sm:rounded-[30px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
        <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/62">
              Camera proof
            </p>
            <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.055] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Close camera"
            title="Close camera"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:aspect-video">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_42%,rgba(0,0,0,0.36)_100%)]" />
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-100" />
              </div>
            ) : null}
            {recording ? (
              <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-rose-300/28 bg-rose-500/[0.16] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-rose-100">
                <span className="h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.72)]" />
                Recording
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-[18px] border border-rose-300/22 bg-rose-500/[0.09] px-4 py-3 text-sm leading-6 text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <p className="mt-4 text-xs leading-5 text-white/48">
              Use the rear camera when possible. Keep the venue and proof moment visible in-frame.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {statusPills.map((pill) => (
              <span
                key={pill.label}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] ${
                  pill.active
                    ? 'border-cyan-200/20 bg-cyan-400/[0.08] text-cyan-100'
                    : 'border-amber-300/20 bg-amber-400/[0.08] text-amber-100'
                }`}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
          <div className={`grid gap-2 ${onFallbackUpload ? 'sm:grid-cols-2' : ''}`}>
            {mode === 'photo' ? (
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraReady || capturing}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-cyan-200/28 bg-cyan-400/[0.12] px-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-50 transition hover:bg-cyan-400/[0.17] disabled:cursor-wait disabled:opacity-60"
              >
                {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Snap photo
              </button>
            ) : (
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={!cameraReady || !canRecordVideo}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-fuchsia-200/24 bg-fuchsia-400/[0.12] px-5 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-50 transition hover:bg-fuchsia-400/[0.17] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {recording ? <Square className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                {recording ? 'Stop recording' : 'Start recording'}
              </button>
            )}
            {onFallbackUpload ? (
              <button
                type="button"
                onClick={handleFallbackUpload}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.055] px-5 text-xs font-black uppercase tracking-[0.18em] text-white/76 transition hover:border-white/20 hover:bg-white/[0.085] hover:text-white"
              >
                {fallbackLabel}
              </button>
            ) : null}
          </div>
          {mode === 'video' && !supportedVideoMimeType ? (
            <p className="mt-3 text-center text-[11px] leading-5 text-amber-100/68">
              This browser cannot record video directly here. Upload an existing camera clip instead.
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    portalTarget
  );
}
