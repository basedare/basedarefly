'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, ExternalLink, Loader2, Mail, Share2, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { useSocialWebview } from '@/components/mission-pass/SocialWebviewProvider';

const missionPassEmailEnabled = process.env.NEXT_PUBLIC_MISSION_PASS_EMAIL_ENABLED === 'true';

type MissionPassSheetProps = {
  open: boolean;
  onClose: () => void;
  targetType: 'DARE' | 'MEETUP' | 'DROP' | 'PAGE' | 'ROUTE';
  targetId: string;
  targetHref: string;
  title: string;
  description?: string;
};

type PreparedState = {
  intentId: string;
  continueUrl: string;
};

export function MissionPassSheet({
  open,
  onClose,
  targetType,
  targetId,
  targetHref,
  title,
  description,
}: MissionPassSheetProps) {
  const { isSocialWebview, label } = useSocialWebview();
  const [email, setEmail] = useState('');
  const [prepared, setPrepared] = useState<PreparedState | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPrepared(null);
    setMessage(null);
    setError(null);
  }, [targetHref, targetId, targetType]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  const prepare = useCallback(async () => {
    if (prepared) return prepared;
    setPreparing(true);
    setError(null);
    try {
      const intentResponse = await fetch('/api/attribution/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, targetHref, title }),
      });
      const intentPayload = await intentResponse.json();
      if (!intentResponse.ok || !intentPayload.success) {
        throw new Error(intentPayload.error || 'Unable to save this mission.');
      }

      const passResponse = await fetch('/api/mission-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionIntentId: intentPayload.data.intentId,
          deliveryMethod: 'PORTABLE_LINK',
        }),
      });
      const passPayload = await passResponse.json();
      if (!passResponse.ok || !passPayload.success || !passPayload.data.continueUrl) {
        throw new Error(passPayload.error || 'Unable to prepare your private link.');
      }
      const next = {
        intentId: intentPayload.data.intentId as string,
        continueUrl: passPayload.data.continueUrl as string,
      };
      setPrepared(next);
      return next;
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : 'Unable to prepare your Mission Pass.');
      return null;
    } finally {
      setPreparing(false);
    }
  }, [prepared, targetHref, targetId, targetType, title]);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setError(null);
    void prepare();
  }, [open, prepare]);

  const share = async () => {
    const state = prepared ?? await prepare();
    if (!state) return;
    const shareData = {
      title: `BaseDare · ${title}`,
      text: `My BaseDare Mission Pass: ${title}`,
      url: state.continueUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage('Pass opened in your share sheet.');
      } else {
        await navigator.clipboard.writeText(state.continueUrl);
        setMessage('Private link copied. Open it in Safari or Chrome.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setError('Sharing was blocked. Copy the private link instead.');
    }
  };

  const copy = async () => {
    const state = prepared ?? await prepare();
    if (!state) return;
    try {
      await navigator.clipboard.writeText(state.continueUrl);
      setMessage('Private link copied.');
    } catch {
      setError('Copy was blocked by this browser. Use Send Mission Pass instead.');
    }
  };

  const sendEmail = async (event: FormEvent) => {
    event.preventDefault();
    const state = prepared ?? await prepare();
    if (!state) return;
    setEmailSending(true);
    setError(null);
    try {
      const response = await fetch('/api/mission-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionIntentId: state.intentId,
          deliveryMethod: 'EMAIL',
          email,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Email delivery failed.');
      setMessage('Mission Pass sent. Open it from your email in Safari or Chrome.');
      setEmail('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to email your Mission Pass.');
    } finally {
      setEmailSending(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border border-[#f5c518]/25 bg-[radial-gradient(circle_at_12%_0%,rgba(110,70,180,.25),transparent_34%),linear-gradient(160deg,#15131c,#08090e_65%)] p-5 shadow-[0_-24px_80px_rgba(0,0,0,.65),inset_0_1px_0_rgba(255,255,255,.08)] sm:max-w-lg sm:rounded-[28px] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mission-pass-title"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/35 text-white/60 transition hover:text-white"
              aria-label="Close Mission Pass"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-12">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ffe36a]">Mission Pass</p>
              <h2 id="mission-pass-title" className="mt-2 text-2xl font-black leading-tight text-white">
                Save your place. Keep exploring.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {description ?? `Take “${title}” out of ${isSocialWebview ? label : 'this browser'} and continue when you are ready.`}
              </p>
            </div>

            {isSocialWebview ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-3 text-xs leading-5 text-cyan-50/70">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                Wallet actions are intentionally kept out of {label}. Open the pass in Safari or Chrome before claiming or proving.
              </div>
            ) : null}

            {missionPassEmailEnabled ? (
              <form onSubmit={sendEmail} className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3">
                <label htmlFor="mission-pass-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                  Email me the pass
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="mission-pass-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="min-h-12 flex-1 rounded-xl border border-white/10 bg-[#07080d] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#ffe36a]/45"
                  />
                  <button
                    type="submit"
                    disabled={emailSending || preparing}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f5c518] px-4 text-xs font-black uppercase tracking-[0.14em] text-[#15120c] transition hover:bg-[#ffe36a] disabled:opacity-50"
                  >
                    {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              </form>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={share}
                disabled={preparing}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.1] disabled:opacity-50"
              >
                {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Send pass
              </button>
              <button
                type="button"
                onClick={copy}
                disabled={preparing}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] text-xs font-black uppercase tracking-[0.12em] text-white/75 transition hover:text-white disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
            </div>

            {message ? (
              <p aria-live="polite" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs leading-5 text-emerald-100/80">
                <Check className="mt-0.5 h-4 w-4 shrink-0" /> {message}
              </p>
            ) : null}
            {error ? <p role="alert" className="mt-4 text-xs leading-5 text-red-300">{error}</p> : null}

            <div className="mt-5 flex items-start gap-2 border-t border-white/[0.07] pt-4 text-[11px] leading-5 text-white/35">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              A Mission Pass restores this activity. It never claims a reward, proves identity, or authorizes payment.
            </div>
            <a href="/missions" className="mt-3 inline-block text-xs font-bold text-cyan-200/70 transition hover:text-cyan-100">
              View saved Mission Passes →
            </a>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
