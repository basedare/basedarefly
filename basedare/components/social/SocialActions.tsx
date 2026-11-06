"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Bookmark, UserPlus, Check } from "lucide-react";
import { useSocialAccount } from "@/hooks/useSocialAccount";
import { type RetentionKind, type SocialTarget } from "@/lib/social-retention";
import { trackClientEvent } from "@/lib/analytics";

type State = {
  target: SocialTarget;
  identified: boolean;
  following: boolean | null;
  saved: boolean | null;
};
type Props = {
  kind: RetentionKind;
  targetKey: string;
  mode?: "follow" | "save" | "both";
};
export default function SocialActions(props: Props) {
  const { wallet } = useSocialAccount();
  return (
    <Actions
      key={`${wallet ?? "guest"}:${props.kind}:${props.targetKey}`}
      {...props}
      wallet={wallet}
    />
  );
}
function Actions({
  kind,
  targetKey,
  mode = "both",
  wallet,
}: Props & { wallet: string | null }) {
  const { headers } = useSocialAccount();
  const [state, setState] = useState<State>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const alive = useRef(true);
  const [retry, setRetry] = useState(0);
  const requestVersion = useRef(0);
  const read = useCallback(
    async (privateState: boolean, prompt: boolean, signal?: AbortSignal) => {
      const query = new URLSearchParams({ kind, key: targetKey });
      if (privateState && wallet) query.set("wallet", wallet);
      const auth = privateState ? await headers("social:read", prompt) : {};
      if (!alive.current) return null;
      const r = await fetch("/api/social?" + query, {
        headers: auth,
        cache: "no-store",
        signal: signal ?? AbortSignal.timeout(10000),
      });
      const b = await r.json();
      if (!r.ok || !b.success) {
        if (r.status === 401) return null;
        throw Error(b.error || "This item could not load.");
      }
      return b.data as State;
    },
    [kind, targetKey, wallet, headers],
  );
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    const load = async () => {
      const version = ++requestVersion.current;
      try {
        let current = await read(Boolean(wallet), false, controller.signal);
        if (!current && wallet) {
          const publicState = await read(false, false, controller.signal);
          current = publicState
            ? { ...publicState, identified: true, following: null, saved: null }
            : null;
        }
        if (
          alive.current &&
          !controller.signal.aborted &&
          requestVersion.current === version &&
          current
        ) {
          setState(current);
          setError("");
        }
      } catch (e) {
        if (
          alive.current &&
          !controller.signal.aborted &&
          requestVersion.current === version
        ) {
          setState(undefined);
          setError(e instanceof Error ? e.message : "Could not load.");
        }
      }
    };
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("basedare:social-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive.current = false;
      controller.abort();
      window.removeEventListener("basedare:social-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [read, wallet, retry]);
  async function act(type: "follow" | "save") {
    if (!wallet) {
      window.dispatchEvent(new Event("basedare:sign-in"));
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    ++requestVersion.current;
    try {
      if (!state || state.following == null || state.saved == null) {
        const current = await read(true, true);
        if (alive.current && current) {
          setState(current);
          setNotice("Account confirmed. Choose Follow or Save.");
        } else if (alive.current)
          setError("Confirm your account and try again.");
        return;
      }
      const wasActive = type === "follow" ? state.following : state.saved;
      const action = wasActive
        ? type === "follow"
          ? "unfollow"
          : "unsave"
        : type;
      const auth = await headers("social:write", true);
      if (!alive.current) return;
      const r = await fetch("/api/social", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          kind: state.target.kind,
          key: state.target.key,
          action,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const b = await r.json();
      if (!r.ok || !b.success || b.data?.active !== !wasActive)
        throw Error(b.error || "This action was not confirmed. Retry.");
      if (!alive.current) return;
      setState({
        ...state,
        [type === "follow" ? "following" : "saved"]: !wasActive,
      });
      setNotice(
        type === "follow"
          ? wasActive
            ? "Unfollowed."
            : "Following. Find their updates in the Pulse."
          : wasActive
            ? "Removed from saved."
            : "Saved. Find it in My activity.",
      );
      trackClientEvent("social_relationship_action", { action, kind });
      window.dispatchEvent(new Event("basedare:social-updated"));
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Could not save. Retry.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const button = "bd-action min-h-11 !px-4 !text-sm disabled:opacity-50";
  return (
    <div className="mt-3 max-w-full" aria-label="Follow and save">
      <div className="flex flex-wrap gap-2">
        {mode !== "save" && state?.target.followable ? (
          <button
            type="button"
            className={button}
            disabled={busy}
            aria-pressed={state.following ?? undefined}
            onClick={() => void act("follow")}
          >
            {state.following ? (
              <Check className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {state.following == null
              ? "Check follow"
              : state.following
                ? "Following"
                : "Follow"}
          </button>
        ) : null}
        {mode !== "follow" && kind !== "PERSON" && state ? (
          <button
            type="button"
            className={button}
            disabled={busy}
            aria-pressed={state.saved ?? undefined}
            onClick={() => void act("save")}
          >
            <Bookmark
              className="h-4 w-4"
              aria-hidden="true"
              fill={state.saved ? "currentColor" : "none"}
            />
            {state.saved == null
              ? "Check saved"
              : state.saved
                ? "Saved"
                : "Save"}
          </button>
        ) : null}
      </div>
      {!state && !error ? (
        <p className="text-sm text-white/55" role="status">
          Loading social actions…
        </p>
      ) : null}
      {notice || error ? (
        <p
          role="status"
          className="mt-2 max-w-md text-sm leading-6 text-amber-100"
        >
          {error || notice}
        </p>
      ) : null}
      {error && !state ? (
        <button
          type="button"
          className={button + " mt-2"}
          onClick={() => setRetry((n) => n + 1)}
        >
          Retry actions
        </button>
      ) : null}
    </div>
  );
}
