"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/** Cloudflare Turnstile checkbox: "Verify you are human" (AC28). */
export default function HumanCheck({ siteKey, next }: { siteKey: string; next: string }) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !box.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      theme: "light",
      language: "auto",
      callback: async (token: string) => {
        setStatus("checking");
        setError(null);
        try {
          const res = await fetch("/api/human", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "We couldn't confirm the check. Please tick the box again.");
          }
          window.location.replace(next);
        } catch (err) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "We couldn't confirm the check. Please tick the box again.");
          window.turnstile?.reset(widgetId.current ?? undefined);
        }
      },
      "error-callback": () => {
        setStatus("error");
        setError("The check didn't load. Please check your internet connection and reload the page.");
      },
      "expired-callback": () => window.turnstile?.reset(widgetId.current ?? undefined),
    });
  }, [ready, siteKey, next]);

  return (
    <div className="card space-y-4">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} />
      <p className="text-base font-bold text-ube-950">Tick the box to continue</p>
      <div ref={box} className="min-h-[65px]" aria-live="polite" />
      {status === "checking" && (
        <p role="status" className="text-sm text-zinc-600">
          Confirming… opening the app.
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
