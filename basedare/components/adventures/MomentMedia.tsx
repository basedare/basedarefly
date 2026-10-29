"use client";
import { useEffect, useState } from "react";
import type { AdventurePost } from "@/lib/adventure-sharing";
import { useSocialAction } from "@/hooks/useSocialAction";
import AdventureCover from "./AdventureCover";
import { adventureTemplate } from "@/lib/adventure-sharing";

export default function MomentMedia({
  post,
  privateView = false,
  adminPreview = false,
}: {
  post: AdventurePost;
  privateView?: boolean;
  adminPreview?: boolean;
}) {
  const { wallet, headers } = useSocialAction();
  const [preview, setPreview] = useState<{ scope: string; url: string }>();
  const [error, setError] = useState("");
  const ownerWallet = adminPreview ? null : wallet;
  const scope = `${ownerWallet ?? "admin"}:${post.id}:${post.status}`;
  useEffect(() => {
    if (!privateView || !post.mediaUrl?.startsWith("/api/")) return;
    const controller = new AbortController();
    let url: string | undefined;
    const deadline = setTimeout(() => {
      controller.abort();
      setError("Preview timed out. Reload to retry.");
    }, 15000);
    setError("");
    setPreview(undefined);
    void (async () => {
      try {
        const response = await fetch(
          post.mediaUrl! +
            (ownerWallet ? "?wallet=" + encodeURIComponent(ownerWallet) : ""),
          {
            headers: ownerWallet ? await headers("adventure:read") : {},
            cache: "no-store",
            signal: controller.signal,
          },
        );
        if (!response.ok)
          throw new Error(
            "Preview unavailable. Reopen the queue or sign in again.",
          );
        const blob = await response.blob();
        if (!controller.signal.aborted) {
          url = URL.createObjectURL(blob);
          setPreview({ scope, url });
        }
      } catch {
        if (!controller.signal.aborted)
          setError("Preview unavailable. Reload to retry.");
      } finally {
        clearTimeout(deadline);
      }
    })();
    return () => {
      controller.abort();
      clearTimeout(deadline);
      if (url) URL.revokeObjectURL(url);
    };
    // Headers are requested only for the selected private read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.mediaUrl, privateView, scope, ownerWallet]);
  const activity = adventureTemplate(post.activityId);
  const src =
    privateView && post.mediaUrl?.startsWith("/api/")
      ? preview?.scope === scope
        ? preview.url
        : null
      : post.mediaUrl;
  return (
    <div>
      {post.socialUrl ? (
        <div className="overflow-hidden rounded-2xl bg-black/30">
          {activity ? <AdventureCover activity={activity} /> : null}
          <a
            className="flex min-h-12 items-center justify-between gap-3 p-4 text-sm font-bold text-cyan-100"
            href={post.socialUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open{" "}
            {post.socialPlatform === "TIKTOK"
              ? "TikTok video"
              : post.socialPlatform === "INSTAGRAM"
                ? "Instagram post"
                : "X post"}{" "}
            ↗
          </a>
          <p className="px-4 pb-4 text-xs leading-5 text-white/55">
            Opens on the original platform. The post may have been removed or
            made private.
          </p>
        </div>
      ) : src ? (
        post.mediaType === "VIDEO" ? (
          <video
            src={src}
            controls
            preload="none"
            playsInline
            className="aspect-video w-full rounded-2xl bg-black object-contain"
          />
        ) : (
          // Private blob previews and revocable media must bypass the public image cache.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={post.caption}
            loading="lazy"
            className="aspect-video w-full rounded-2xl bg-black object-contain"
          />
        )
      ) : (
        <p role="status" className="bd-well p-4 text-sm text-amber-100">
          {error || "Loading private preview…"}
        </p>
      )}
    </div>
  );
}
