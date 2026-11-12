"use client";

import { useState } from "react";

export default function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not log in. Please try again.");
      }
      window.location.assign("/dispatch");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in. Please try again.");
      setPassword("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label htmlFor="admin-user" className="label">
          Username
        </label>
        <input
          id="admin-user"
          className="input"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={100}
        />
      </div>
      <div>
        <label htmlFor="admin-pass" className="label">
          Password
        </label>
        <input
          id="admin-pass"
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={busy || !username.trim() || !password}>
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
