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
    // The button always looks tappable (blue); empty boxes get a message instead of a silent grey button
    if (!username.trim() || !password) {
      setError(!username.trim() ? "Type your username." : "Type your password.");
      return;
    }
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
          maxLength={200}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <button type="submit" className={"min-h-[48px] w-full rounded-xl bg-blue-700 px-5 text-[17px] font-bold text-white shadow-sm hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:bg-blue-500"} disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
