'use client';

import { useMemo, useState } from 'react';
import { uploadToIPFS as uploadToIPFSViaApi } from '@/utils/uploadToIPFS';

type Step = 'upload' | 'pinning' | 'verifying' | 'success' | 'error';

type VerifyRealityModalProps = {
  dareId: string;
  open: boolean;
  onClose: () => void;
  uploadToIPFS?: (file: File) => Promise<string>;
  submitProof?: (dareId: string, cid: string) => Promise<void>;
  onSuccess?: () => void;
};

export default function VerifyRealityModal({
  dareId,
  open,
  onClose,
  uploadToIPFS,
  submitProof,
  onSuccess,
}: VerifyRealityModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stepLabel = useMemo(() => {
    if (step === 'upload') return 'UPLOAD';
    if (step === 'pinning') return 'PINNING';
    if (step === 'verifying') return 'VERIFYING';
    if (step === 'success') return 'CONFIRMED';
    return 'ERROR';
  }, [step]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#060010]/90 backdrop-blur-xl px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black/60 shadow-[0_0_60px_rgba(168,85,247,0.25)] overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">VERIFY REALITY</span>
              <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-[8px] font-mono text-yellow-400 uppercase tracking-wider">
                Beta
              </span>
            </div>
            <span className="text-white font-black uppercase tracking-tight">{stepLabel}</span>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white font-mono text-xs uppercase">
            [ EXIT ]
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'upload' ? (
            <>
              <div className="text-white/70 font-mono text-xs uppercase tracking-widest">
                Upload proof, pin to IPFS, submit to Oracle.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <input
                  type="file"
                  accept="video/*,image/*"
                  className="block w-full text-xs font-mono text-white/60 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white file:uppercase file:tracking-widest hover:file:bg-white/15"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  disabled={!file}
                  className="w-full rounded-xl py-3 font-black uppercase tracking-widest text-xs bg-gradient-to-r from-purple-600 to-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={async () => {
                    if (!file) return;
                    setError(null);
                    setStep('pinning');
                    try {
                      const uploader = uploadToIPFS ?? ((f: File) => uploadToIPFSViaApi(f, dareId));
                      const nextCid = await uploader(file);
                      setCid(nextCid);
                      setStep('verifying');
                      if (submitProof) {
                        await submitProof(dareId, nextCid);
                      }
                      setStep('success');
                      onSuccess?.();
                    } catch (e: any) {
                      setError(typeof e?.message === 'string' ? e.message : 'Verification failed');
                      setStep('error');
                    }
                  }}
                >
                  INITIATE ORACLE SCAN
                </button>
              </div>
            </>
          ) : null}

          {step === 'pinning' || step === 'verifying' ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
                  {step === 'pinning' ? 'Pinning to IPFS...' : 'Beta AI Referee analyzing...'}
                </div>
                {step === 'verifying' && (
                  <div className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-mono text-yellow-400/70 uppercase">
                    Testnet • Mock Verification
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {step === 'success' ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5">
              <div className="text-green-400 font-mono text-xs uppercase tracking-widest">Proof submitted</div>
              {cid ? <div className="text-white/70 font-mono text-xs mt-2 break-all">CID: {cid}</div> : null}
            </div>
          ) : null}

          {step === 'error' ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="text-red-400 font-mono text-xs uppercase tracking-widest">Failed</div>
              {error ? <div className="text-white/70 font-mono text-xs mt-2">{error}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
