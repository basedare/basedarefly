"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, MapPin, Share2, X, CheckCircle2, Zap, Send } from "lucide-react";
import { buildXSharePayload } from "@/lib/social-share";
import { useToast } from "@/components/ui/use-toast";

type ShareComposerStatus = "live" | "invite" | "verified";

interface ShareComposerButtonProps {
  title?: string;
  bounty?: string | number | null;
  amountWon?: string | number | null;
  streamerTag?: string | null;
  shortId?: string | null;
  placeName?: string | null;
  inviteUrl?: string | null;
  status: ShareComposerStatus;
  buttonLabel?: string;
  compact?: boolean;
  className?: string;
}

function getShareMeta(status: ShareComposerStatus) {
  if (status === "verified") {
    return {
      badge: "Verified Share",
      heading: "Turn the win into distribution",
      body: "Clean caption, exact deep link, and stronger verified framing. This is the premium version of the old tweet-intent rail.",
      stateLabel: "Verified",
    };
  }

  if (status === "invite") {
    return {
      badge: "Invite Share",
      heading: "Push the claim link out cleanly",
      body: "Give the creator a sharper claim rail with a clean caption and exact BaseDare deep link instead of a rough one-off post.",
      stateLabel: "Awaiting Claim",
    };
  }

  return {
    badge: "Live Share",
    heading: "Push the live dare onto the grid",
    body: "Launch the dare with stronger copy and a precise deep link so the first wave of traffic lands in the right place.",
    stateLabel: "Live",
  };
}

export default function ShareComposerButton({
  title,
  bounty,
  amountWon,
  streamerTag,
  shortId,
  placeName,
  inviteUrl,
  status,
  buttonLabel,
  compact = false,
  className = "",
}: ShareComposerButtonProps) {
  const [open, setOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const compactWrapperRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const meta = getShareMeta(status);

  const payload = useMemo(
    () =>
      buildXSharePayload({
        title: title || (status === "verified" ? "Verified BaseDare completion" : "Live BaseDare challenge"),
        bounty,
        amountWon,
        streamerTag,
        shortId,
        placeName,
        inviteUrl,
        status,
      }),
    [title, bounty, amountWon, streamerTag, shortId, placeName, inviteUrl, status]
  );

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(payload.text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1800);
    toast({
      title: "Caption copied",
      description: "Your BaseDare share caption is ready to paste anywhere.",
      duration: 3000,
    });
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(payload.shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
    toast({
      title: "Link copied",
      description: "Deep link copied. Send people straight back to BaseDare.",
      duration: 3000,
    });
  };

  const handleShareToX = () => {
    window.open(payload.url, "_blank", "width=700,height=620");
  };

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen((current) => !current);
  };

  useEffect(() => {
    if (!compact || !open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!compactWrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [compact, open]);

  const compactPreview = (
    <div
      className="absolute inset-2 z-30 flex max-h-[calc(100%-1rem)] flex-col overflow-hidden rounded-[20px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(12,14,24,0.98)_0%,rgba(8,10,16,0.98)_100%)] shadow-[0_16px_38px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)]"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/8 px-3 py-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {status === "verified" ? <CheckCircle2 className="h-3 w-3" /> : status === "invite" ? <Send className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
            {meta.stateLabel}
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white/88">
            {payload.text}
          </p>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {placeName ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-white/58">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{placeName}</span>
            </span>
          ) : null}

          <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-white/76">
              {payload.text}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await handleCopyText();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/78 transition hover:border-white/18 hover:text-white"
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedText ? "Copied" : "Caption"}
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleShareToX();
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-[14px] border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={compact ? compactWrapperRef : null}
      className={compact ? "inline-flex shrink-0 static" : "inline-flex"}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleOpen}
        className={
          `${compact
            ? "inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
            : "inline-flex items-center justify-center gap-2 rounded-[18px] border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"} ${className}`.trim()
        }
      >
        <Share2 className="h-4 w-4" />
        {buttonLabel || (status === "verified" ? "Share Your Win" : "Share To X")}
      </button>

      {compact && open ? compactPreview : null}

      {!compact && open ? (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_10%,rgba(8,11,22,0.96)_100%)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.52),0_0_28px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-16px_22px_rgba(0,0,0,0.24)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(250,204,21,0.09),transparent_30%)]" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                    {status === "verified" ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === "invite" ? <Send className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                    {meta.badge}
                  </div>
                  <h3 className="mt-4 text-2xl font-black tracking-[-0.03em] text-white">{meta.heading}</h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-white/58">{meta.body}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:border-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,9,18,0.92)_0%,rgba(4,5,10,0.98)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${status === "verified" ? "border-green-400/25 bg-green-400/10 text-green-200" : status === "invite" ? "border-yellow-400/25 bg-yellow-400/10 text-yellow-200" : "border-cyan-400/25 bg-cyan-400/10 text-cyan-100"}`}>
                    {meta.stateLabel}
                  </span>
                  {placeName ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/60">
                      <MapPin className="h-3 w-3" />
                      {placeName}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 whitespace-pre-wrap rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/82">
                  {payload.text}
                </div>

                <div className="mt-4 rounded-[18px] border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/36">Deep Link</p>
                  <p className="mt-2 break-all font-mono text-xs text-cyan-100/80">{payload.shareUrl}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/20 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copiedText ? "Copied" : "Copy Caption"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/20 hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copiedLink ? "Copied" : "Copy Link"}
                </button>

                <button
                  type="button"
                  onClick={handleShareToX}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/16"
                >
                  <ExternalLink className="h-4 w-4" />
                  Share To X
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
