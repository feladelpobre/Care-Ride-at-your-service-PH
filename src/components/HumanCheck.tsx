"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export const HUMAN_CHECK_FAILED =
  "The check didn't pass. Please tick the box again. If it keeps failing, try another browser or turn off your VPN or ad blocker.";

type State = { status: "loading" | "needed" | "ok"; siteKey: string | null };

/**
 * Whether the visitor still has to tick "I am human" before booking or sending feedback (AC28).
 * The pass itself is an HttpOnly cookie, so we ask the server.
 */
export function useHumanCheck() {
  const [state, setState] = useState<State>({ status: "loading", siteKey: null });

  useEffect(() => {
    let alive = true;
    fetch("/api/human", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { enabled?: boolean; verified?: boolean; siteKey?: string | null }) => {
        if (!alive) return;
        setState({ status: d.enabled && !d.verified ? "needed" : "ok", siteKey: d.siteKey ?? null });
      })
      // If we can't tell, let the server decide: it answers 403 and we show the box then
      .catch(() => alive && setState((s) => ({ ...s, status: "ok" })));
    return () => {
      alive = false;
    };
  }, []);

  const markOk = useCallback(() => setState((s) => ({ ...s, status: "ok" })), []);
  /** Call when an API answered 403 (pass missing or expired): shows the box again. */
  const markNeeded = useCallback(() => setState((s) => ({ ...s, status: s.siteKey ? "needed" : s.status })), []);

  return { ...state, markOk, markNeeded };
}

/** Cloudflare Turnstile checkbox: "Verify you are human" (AC28). */
export function HumanCheckbox({ siteKey, onVerified }: { siteKey: string; onVerified: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(typeof window !== "undefined" && Boolean(window.turnstile));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !box.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      theme: "light",
      language: "auto",
      callback: async (token: string) => {
        setChecking(true);
        setError(null);
        try {
          const res = await fetch("/api/human", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? HUMAN_CHECK_FAILED);
          }
          onVerified();
        } catch (err) {
          setError(err instanceof Error ? err.message : HUMAN_CHECK_FAILED);
          window.turnstile?.reset(widgetId.current ?? undefined);
        } finally {
          setChecking(false);
        }
      },
      "error-callback": () => setError(HUMAN_CHECK_FAILED),
      "expired-callback": () => window.turnstile?.reset(widgetId.current ?? undefined),
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [ready, siteKey, onVerified]);

  return (
    <div className="space-y-2">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} />
      <p className="text-sm font-bold text-ube-950">Quick check: tick the box to show you&apos;re a person, not a robot.</p>
      <div ref={box} className="min-h-[65px]" aria-live="polite" />
      {checking && (
        <p role="status" className="text-sm text-zinc-600">
          Confirming…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
