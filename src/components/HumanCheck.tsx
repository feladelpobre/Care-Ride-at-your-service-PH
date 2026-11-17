"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { HUMAN_TAB_KEY } from "@/lib/humanTab";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const FAILED = "The check didn't pass. Please tick the box again.";
const STUCK_TIP = "Still stuck? Open this page in Chrome or Safari (not inside another app), or turn off your VPN or ad blocker, then reload.";

/** Cloudflare retries on its own; only show the red message after this many failures in a row. */
const SHOW_ERROR_AFTER = 2;

/** Cloudflare Turnstile checkbox: "Verify you are human" (AC28). */
export default function HumanCheck({ siteKey, next }: { siteKey: string; next: string }) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const failures = useRef(0);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "retrying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !box.current || !window.turnstile || widgetId.current) return;

    // A failure: stay calm while Cloudflare retries, explain only if it keeps failing
    const fail = (message: string) => {
      failures.current += 1;
      if (failures.current < SHOW_ERROR_AFTER) {
        setStatus("retrying");
        setError(null);
      } else {
        setStatus("error");
        setError(message);
      }
    };

    widgetId.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      theme: "light",
      language: "auto",
      retry: "auto",
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
            throw new Error(data.error ?? FAILED);
          }
          // Remember the pass for this tab only, so a new opening asks again (AC28)
          try {
            sessionStorage.setItem(HUMAN_TAB_KEY, String(Date.now()));
          } catch {
            /* storage blocked: the server pass still protects bookings */
          }
          failures.current = 0;
          window.location.replace(next);
        } catch (err) {
          fail(err instanceof Error ? err.message : FAILED);
          window.turnstile?.reset(widgetId.current ?? undefined);
        }
      },
      // Returning true tells Turnstile we handled it; it keeps retrying on its own
      "error-callback": () => {
        fail(FAILED);
        return true;
      },
      "unsupported-callback": () => {
        failures.current = SHOW_ERROR_AFTER;
        setStatus("error");
        setError("This browser can't run the check.");
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
      {status === "retrying" && (
        <p role="status" className="text-sm text-zinc-600">
          Checking again… this can take a few seconds.
        </p>
      )}
      {status === "error" && error && (
        <div role="alert" className="space-y-1 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">{error}</p>
          <p>{STUCK_TIP}</p>
        </div>
      )}
    </div>
  );
}
