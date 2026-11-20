"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Option = { value: string; label: string };

/** Staff buttons that save a new status for a booking or feedback ticket (AC35), then refresh the board. */
export default function StatusButtons({
  kind,
  id,
  current,
  options,
}: {
  kind: "booking" | "feedback";
  id: string;
  current: string;
  options: Option[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(status: string) {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch("/api/admin/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not save. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Update status">
        {options
          .filter((o) => o.value !== current)
          .map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={busy !== null}
              onClick={() => save(o.value)}
              className="min-h-[44px] rounded-xl border-2 border-ube-300 bg-white px-3 text-sm font-bold text-ube-900 hover:bg-ube-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ube-700 disabled:opacity-50"
            >
              {busy === o.value ? "Saving…" : o.label}
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
