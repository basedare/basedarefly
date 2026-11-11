"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/DiscoveryLink";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import { ChevronDown, Loader2 } from "lucide-react";
import { useDiscovery } from "@/components/DiscoveryProvider";
import type {
  DiscoveryRelations,
  DiscoveryRelationReference,
} from "@/lib/discovery-relations-server";

type Props = { kind: DiscoveryRelationReference["kind"]; targetKey: string };
type SessionIdentity = {
  walletAddress?: string;
  user?: { id?: string; email?: string | null; walletAddress?: string };
};

/** Disclosure starts a bounded read only after a person asks to explore a connection. */
export default function RelatedDiscovery(props: Props) {
  const { area } = useDiscovery();
  const { address } = useAccount();
  const { data: session, status } = useSession();
  const identity = session as SessionIdentity | null;
  const scope = [
    props.kind,
    props.targetKey,
    area.lat,
    area.lng,
    area.radiusKm,
    area.label,
    area.timeZone,
    address?.toLowerCase(),
    identity?.walletAddress?.toLowerCase(),
    identity?.user?.walletAddress?.toLowerCase(),
    identity?.user?.id,
    identity?.user?.email,
    status,
  ].join("|");
  return <RelatedItems key={scope} {...props} />;
}

function RelatedItems({ kind, targetKey }: Props) {
  const contentId = useId();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<DiscoveryRelations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<{
    version: number;
    controller: AbortController | null;
  }>({ version: 0, controller: null });
  useEffect(
    () => () => {
      request.current.version += 1;
      request.current.controller?.abort();
    },
    []
  );

  const load = async () => {
    request.current.controller?.abort();
    const controller = new AbortController();
    const version = ++request.current.version;
    request.current.controller = controller;
    setSnapshot(null);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/discovery/related", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, key: targetKey }),
      });
      const payload = await response.json().catch(() => null);
      if (
        !response.ok ||
        !payload?.success ||
        !payload.data ||
        !Array.isArray(payload.data.nodes)
      ) {
        throw new Error(
          response.status === 404
            ? "This item is unavailable."
            : response.status === 429
            ? "Please wait a moment, then try again."
            : "Related items couldn’t load. Please try again."
        );
      }
      if (!controller.signal.aborted && version === request.current.version)
        setSnapshot(payload.data as DiscoveryRelations);
    } catch (cause) {
      if (!controller.signal.aborted && version === request.current.version)
        setError(
          cause instanceof Error
            ? cause.message
            : "Related items couldn’t load. Please try again."
        );
    } finally {
      if (!controller.signal.aborted && version === request.current.version)
        setLoading(false);
    }
  };

  const toggle = () => {
    if (open) {
      request.current.version += 1;
      request.current.controller?.abort();
      setOpen(false);
      setSnapshot(null);
      setError(null);
      setLoading(false);
    } else {
      setOpen(true);
      void load();
    }
  };

  return (
    <div className="mt-1 border-t border-white/[0.07] pt-1 text-xs">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-bold text-white/60 hover:text-cyan-100"
      >
        Explore connections{" "}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div id={contentId} className="pb-2">
          {loading ? (
            <p
              role="status"
              className="flex items-center gap-2 py-2 text-white/60"
            >
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />{" "}
              Checking current connections…
            </p>
          ) : null}
          {error ? (
            <div role="status" className="text-white/65">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="min-h-11 font-bold text-cyan-100 underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          ) : null}
          {snapshot ? (
            <>
              <p className="mb-2 break-words leading-5 text-white/55">
                Connected with{" "}
                <Link
                  href={snapshot.source.href}
                  prefetch={false}
                  className="font-bold text-cyan-100 underline underline-offset-4"
                >
                  {snapshot.source.title}
                </Link>
              </p>
              {snapshot.nodes.length ? (
                <ul className="grid gap-1.5">
                  {snapshot.nodes.map((node) => (
                    <li
                      key={`${node.kind}:${node.key}`}
                      className="bd-well p-2.5"
                    >
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
                        {node.label}
                      </p>
                      <Link
                        href={node.href}
                        prefetch={false}
                        className="inline-flex min-h-11 items-center break-words font-bold text-cyan-100 underline decoration-cyan-100/25 underline-offset-4"
                      >
                        {node.title}
                      </Link>
                      {node.summary ? (
                        <p className="break-words leading-5 text-white/60">
                          {node.summary}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 leading-5 text-white/55">
                  No public connections to explore yet.
                </p>
              )}
              {snapshot.limited ? (
                <p className="mt-2 leading-5 text-white/50">
                  Showing a small selection of current public connections.
                </p>
              ) : null}
              <p className="mt-2 leading-5 text-white/45">
                A connection provides context; it doesn’t confirm a visit or
                attendance.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
