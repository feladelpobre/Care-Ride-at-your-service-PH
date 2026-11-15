"use client";

import { useEffect } from "react";
import { HUMAN_TAB_KEY } from "@/lib/humanTab";

/**
 * Runs the "I am human" check on every new opening of the app (AC28).
 * The server pass (a 1-hour cookie) protects the booking APIs; this per-tab marker makes a new tab,
 * a link or a QR scan go through the check again, while a refresh of the same tab does not.
 */
export default function HumanTabGate({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    try {
      if (sessionStorage.getItem(HUMAN_TAB_KEY)) return;
    } catch {
      return; // storage blocked: never loop; the server pass still protects bookings
    }
    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(`/verify?next=${encodeURIComponent(next)}`);
  }, [enabled]);
  return null;
}
