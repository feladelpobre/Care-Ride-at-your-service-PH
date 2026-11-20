"use client";

import { useState } from "react";

type Reply = {
  emergency: boolean;
  faqId: string | null;
  question: string | null;
  answer: string;
};

/** "Ask a question" box (AC36). Answers come only from the FAQ list; emergencies get the 911 message. */
export default function FaqHelper() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Reply> & {
        error?: string;
      };
      if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
      else setReply(data as Reply);
    } catch {
      setError("No connection. Please try again, or read the questions below.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ask-title" className="card">
      <h2 id="ask-title" className="text-xl font-bold text-ube-950">
        Ask a question
      </h2>
      <form onSubmit={ask} className="mt-3 space-y-3">
        <label htmlFor="faq-q" className="label">
          Type your question in English or Filipino
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="faq-q"
            className="input flex-1"
            placeholder="e.g., Magkano ang wheelchair van?"
            maxLength={300}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-describedby="faq-q-hint"
          />
          <button type="submit" className="btn-primary min-h-[44px]" disabled={busy || question.trim().length < 3}>
            {busy ? "Looking…" : "Ask"}
          </button>
        </div>
        <p id="faq-q-hint" className="text-sm text-zinc-600">
          Answers come from our FAQ only. No medical advice. In an emergency, call 911.
        </p>
      </form>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
            {error}
          </p>
        )}
        {reply && reply.emergency && (
          <div role="alert" className="mt-3 rounded-xl border-2 border-red-400 bg-red-50 p-4 text-red-900">
            <p className="font-bold">{reply.answer}</p>
            <a href="tel:911" className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-red-700 px-5 font-bold text-white">
              Call 911
            </a>
          </div>
        )}
        {reply && !reply.emergency && (
          <div className="mt-3 rounded-xl border-2 border-ube-200 bg-ube-50 p-4">
            {reply.question && <p className="font-bold text-ube-950">{reply.question}</p>}
            <p className="mt-1 text-[15px] text-zinc-800">{reply.answer}</p>
          </div>
        )}
      </div>
    </section>
  );
}
