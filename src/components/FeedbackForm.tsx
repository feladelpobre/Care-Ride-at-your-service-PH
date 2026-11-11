"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { ISSUE_TYPES, type IssueType } from "@/lib/feedback";
import { formatManilaDateTime } from "@/lib/format";

type Result = { ticket: string; priority: string; createdAt: string };

export default function FeedbackForm({ initialReference }: { initialReference: string }) {
  const [reference, setReference] = useState(initialReference);
  const [phone, setPhone] = useState("");
  const [overall, setOverall] = useState(0);
  const [driver, setDriver] = useState(0);
  const [caregiver, setCaregiver] = useState(0);
  const [onTime, setOnTime] = useState<"yes" | "no" | "unsure" | "">("");
  const [issues, setIssues] = useState<IssueType[]>([]);
  const [incidentAt, setIncidentAt] = useState("");
  const [driverName, setDriverName] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [details, setDetails] = useState("");
  const [callback, setCallback] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!overall) {
      setError("Please choose a star rating for the overall service.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          contactPhone: phone,
          ratingOverall: overall,
          ratingDriver: driver || null,
          ratingCaregiver: caregiver || null,
          onTime: onTime || undefined,
          issueTypes: issues,
          incidentAt: incidentAt || undefined,
          driverName,
          caregiverName,
          details,
          wantsCallback: callback,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send your feedback.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your feedback.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div role="status" className="card space-y-2 border-2 border-ube-200">
        <h2 className="text-2xl font-bold text-ube-950">Thank you. We got your feedback.</h2>
        <p className="text-lg text-zinc-700">
          Ticket <strong className="text-ube-900">{result.ticket}</strong>, sent {formatManilaDateTime(result.createdAt)}.
        </p>
        {result.priority === "urgent" ? (
          <p className="rounded-xl bg-red-50 p-3 font-bold text-red-800">
            We marked this as urgent and will call you as soon as possible. If anyone is in danger right now, call 911.
          </p>
        ) : (
          <p className="text-zinc-700">
            {result.priority === "high" ? "We'll call you within 24 hours." : "If you asked for a call, we'll reach you within 24 hours."} Keep the
            ticket number if you need to follow up.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-6" noValidate>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-bold text-ube-950">Your booking</legend>
        <div>
          <label htmlFor="ref" className="label">
            Booking reference
          </label>
          <input id="ref" className="input uppercase" placeholder="CR-4ED3B086" value={reference} onChange={(e) => setReference(e.target.value)} required />
          <p className="mt-1 text-sm text-zinc-600">Shown when you requested the ride.</p>
        </div>
        <div>
          <label htmlFor="fphone" className="label">
            Mobile number used for the booking
          </label>
          <input id="fphone" className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-bold text-ube-950">Your ratings</legend>
        <Stars label="Overall service" value={overall} onChange={setOverall} required />
        <Stars label="Driver" value={driver} onChange={setDriver} />
        <Stars label="Hospital companion / caregiver (if you had one)" value={caregiver} onChange={setCaregiver} />
        <div>
          <span className="label">Was the pickup on time?</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Was the pickup on time?">
            {(["yes", "no", "unsure"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={onTime === v}
                onClick={() => setOnTime(v)}
                className={`min-h-11 rounded-full border-2 px-5 font-bold ${onTime === v ? "border-ube-700 bg-ube-700 text-white" : "border-zinc-200 bg-white text-ube-900"}`}
              >
                {v === "yes" ? "Yes" : v === "no" ? "No" : "Not sure"}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-lg font-bold text-ube-950">Did anything go wrong? Tick all that apply.</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(ISSUE_TYPES) as IssueType[]).map((k) => {
            const on = issues.includes(k);
            return (
              <label key={k} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 ${on ? "border-ube-600 bg-ube-50" : "border-zinc-200 bg-white"}`}>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-ube-700"
                  checked={on}
                  onChange={(e) => setIssues((cur) => (e.target.checked ? [...cur, k] : cur.filter((x) => x !== k)))}
                />
                <span className="font-bold text-ube-950">{ISSUE_TYPES[k]}</span>
              </label>
            );
          })}
        </div>
        {issues.includes("safety") && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-800">
            If anyone is in danger right now, call 911 first. We will treat this report as urgent.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-bold text-ube-950">Details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="when" className="label">
              When did it happen?
            </label>
            <input id="when" type="datetime-local" className="input" value={incidentAt} onChange={(e) => setIncidentAt(e.target.value)} />
          </div>
          <div className="hidden sm:block" />
          <div>
            <label htmlFor="dname" className="label">
              Driver&apos;s name (if you know it)
            </label>
            <input id="dname" className="input" maxLength={60} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cgname" className="label">
              Caregiver&apos;s name (if you had one)
            </label>
            <input id="cgname" className="input" maxLength={60} value={caregiverName} onChange={(e) => setCaregiverName(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="fdetails" className="label">
            What happened?
          </label>
          <textarea
            id="fdetails"
            rows={4}
            maxLength={1000}
            className="input resize-y"
            placeholder="Tell us in your own words. Please don't include medical details."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <p className="mt-1 text-right text-sm text-zinc-500">{details.length}/1000</p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-ube-700" checked={callback} onChange={(e) => setCallback(e.target.checked)} />
          <span className="text-zinc-700">
            <strong className="text-ube-950">Please call me back</strong> on the mobile number above.
          </span>
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={sending}>
        {sending ? "Sending…" : "Send feedback"}
      </button>
      <p className="text-sm text-zinc-600">
        We use your feedback only to improve the service and follow up with you, as described in our Privacy Notice.
      </p>
    </form>
  );
}

function Stars({ label, value, onChange, required }: { label: string; value: number; onChange: (v: number) => void; required?: boolean }) {
  const words = ["", "Very poor", "Poor", "Okay", "Good", "Excellent"];
  return (
    <div>
      <span className="label" id={`lbl-${label}`}>
        {label}
        {required ? "" : " (optional)"}
      </span>
      <div className="flex items-center gap-1" role="radiogroup" aria-labelledby={`lbl-${label}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}, ${words[n]}`}
            onClick={() => onChange(value === n && !required ? 0 : n)}
            className="grid h-12 w-12 place-items-center rounded-full hover:bg-mango-50"
          >
            <Star size={32} aria-hidden className={n <= value ? "fill-mango-500 text-mango-500" : "text-zinc-300"} />
          </button>
        ))}
        <span className="ml-2 text-[15px] font-bold text-ube-800" aria-live="polite">
          {value ? words[value] : ""}
        </span>
      </div>
    </div>
  );
}
