"use client";

import { useState } from "react";

/** "Email me a login link" for staff who forgot the password (AC39). */
export default function StaffLinkForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/login-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) setError(data.error ?? "Could not send the link. Please try again.");
      else setMessage(data.message ?? "Check your email.");
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <label htmlFor="staff-email" className="block font-bold">
        Email me a login link
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="staff-email"
          type="email"
          className="input flex-1"
          autoComplete="email"
          placeholder="Your staff email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          required
        />
        <button type="submit" className="btn-primary min-h-[44px]" disabled={busy || !email.includes("@")}>
          {busy ? "Sending…" : "Send link"}
        </button>
      </div>
      <div aria-live="polite">
        {message && <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-900">{message}</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
