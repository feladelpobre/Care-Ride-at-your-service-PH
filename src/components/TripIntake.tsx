"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Accessibility, BadgePercent, HeartHandshake } from "lucide-react";
import { track } from "@vercel/analytics";
import type { TripExtraction, TripPlan } from "@/lib/schemas";
import { MOBILITY } from "@/lib/schemas";
import { buildPlan } from "@/lib/plan";
import { formatManilaDateTime } from "@/lib/format";
import { missingRequiredDetails, REQUIRED_LABELS, type RequiredField } from "@/lib/required";
import {
  BASE_FARE,
  COMPANION_MIN_HOURS,
  COMPANION_RATE_PER_HOUR,
  DEFAULT_COMPANION_HOURS,
  DISTANCE_BANDS,
  WHEELCHAIR_RENTAL_FEE,
} from "@/lib/rules";

const SAMPLES = [
  "Mama uses a wheelchair and can't stand. Dialysis at St. Luke's BGC every Tuesday 9am. We live in Kapitolyo, Pasig, 3rd floor, walang elevator. Walang makakasama sa kanya sa ospital.",
  "Si lolo naka-walker, check-up sa PGH bukas alas-otso ng umaga. Taga Sampaloc, Manila kami, ground floor. Sasama ako.",
  "My father uses a foldable wheelchair and can transfer to a car seat. We're in Alabang, Muntinlupa. Needs a hospital for a follow-up on Friday 2pm, may oxygen tank siya.",
];

const MOBILITY_LABEL: Record<TripExtraction["mobility"], string> = {
  walks_with_assistance: "Walks with assistance (walker/cane)",
  wheelchair_can_transfer: "Wheelchair, can transfer to a car seat",
  wheelchair_must_stay_seated: "Wheelchair, must stay seated",
  stretcher_bedbound: "Bedbound / stretcher",
  unknown: "Please choose…",
};

const peso = (n: number) => (n < 0 ? `−₱${Math.abs(n).toLocaleString("en-PH")}` : `₱${n.toLocaleString("en-PH")}`);

type Emergency = { emergency: true; message: string };

export default function TripIntake() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emergency, setEmergency] = useState<Emergency | null>(null);

  // AI result + caregiver edits
  const [extraction, setExtraction] = useState<TripExtraction | null>(null);
  const [aiPlan, setAiPlan] = useState<TripPlan | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [companionHours, setCompanionHours] = useState<number>(0);

  // Step 1 tick boxes
  const [wantWheelchair, setWantWheelchair] = useState(false);
  const [wantCompanion, setWantCompanion] = useState(false);
  const [seniorPwd, setSeniorPwd] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [booking, setBooking] = useState<{ id: string; reference: string; requestedAt: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-price instantly with the same pure rules the server uses
  const plan: TripPlan | null = useMemo(() => {
    if (!extraction || !aiPlan) return null;
    const kmChanged = distanceKm !== null && distanceKm !== aiPlan.options.distanceKm;
    return buildPlan(extraction, {
      distanceKm: kmChanged ? distanceKm! : aiPlan.options.distanceSource === "caregiver" ? aiPlan.options.distanceKm : undefined,
      companionHours,
      wheelchairRental: wantWheelchair,
      seniorPwdDiscount: seniorPwd,
    });
  }, [extraction, aiPlan, distanceKm, companionHours, wantWheelchair, seniorPwd]);

  // Required details (AC20): the request button stays off until these are filled
  const missing: RequiredField[] = extraction ? missingRequiredDetails(extraction) : [];
  const isMissing = (f: RequiredField) => missing.includes(f);

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmergency(null);
    setBooking(null);
    setAiPlan(null);
    setExtraction(null);
    setLoading(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          addons: { wheelchair: wantWheelchair, companion: wantCompanion, seniorPwd },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.emergency) {
        setEmergency(data);
        track("emergency_redirect");
        return;
      }
      const p = data as TripPlan;
      setAiPlan(p);
      setExtraction(p.extraction);
      setDistanceKm(p.options.distanceKm);
      setCompanionHours(p.options.companionHours);
      if (p.options.companionHours > 0) setWantCompanion(true);
      track("trip_analyzed", {
        vehicle: p.assessment.vehicle,
        companion: p.options.companionHours > 0,
        wheelchair: wantWheelchair,
        seniorPwd,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, contactPhone, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the booking.");
      setBooking(data.booking);
      track("booking_confirmed", { vehicle: plan.assessment.vehicle, companion: plan.assessment.companionHours > 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the booking.");
    } finally {
      setSaving(false);
    }
  }

  const update = (patch: Partial<TripExtraction>) => setExtraction((x) => (x ? { ...x, ...patch } : x));

  return (
    <div className="space-y-6">
      {/* Step 1: describe */}
      <form onSubmit={analyse} className="card space-y-3">
        <label htmlFor="desc" className="step-title">
          <span className="step-num" aria-hidden>1</span>
          Tell us about the trip
        </label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={1500}
          className="input resize-y"
          placeholder="e.g., Mama uses a wheelchair, dialysis at St. Luke's BGC Tuesday 9am, we're in Pasig, 3rd floor, no elevator…"
          aria-describedby="desc-help"
        />
        <div id="desc-help" className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span>Include: where from, which hospital, date and time, how the patient moves, stairs, equipment.</span>
          <span>{description.length}/1500</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s, i) => (
            <button key={i} type="button" className="btn-ghost text-xs" onClick={() => setDescription(s)}>
              Try example {i + 1}
            </button>
          ))}
        </div>
        <fieldset className="pt-2">
          <legend className="mb-2 text-base font-bold text-ube-950">What would you like to avail? Tick all that apply.</legend>
          <div className="space-y-2">
            <Tick
              checked={wantWheelchair}
              onChange={setWantWheelchair}
              icon={<Accessibility aria-hidden size={24} />}
              title="Wheelchair"
              detail={`We bring a clean wheelchair for the patient to use during the trip and inside the hospital. ${peso(WHEELCHAIR_RENTAL_FEE)} per trip.`}
            />
            <Tick
              checked={wantCompanion}
              onChange={(v) => {
                setWantCompanion(v);
                if (extraction) setCompanionHours(v ? DEFAULT_COMPANION_HOURS[extraction.tripPurpose] : 0);
              }}
              icon={<HeartHandshake aria-hidden size={24} />}
              title="Hospital companion / caregiver"
              detail={`A trained caregiver stays with the patient inside the hospital (registration, waiting, transfers) until the appointment is done. ${peso(COMPANION_RATE_PER_HOUR)}/hour, minimum ${COMPANION_MIN_HOURS} hours.`}
            />
            <Tick
              checked={seniorPwd}
              onChange={setSeniorPwd}
              icon={<BadgePercent aria-hidden size={24} />}
              title="Patient is a Senior Citizen (60+) or a person with disability (PWD)"
              detail="20% discount on the ride fare, as required by law (RA 9994 and RA 10754). Please show the OSCA or PWD ID to the driver; we don't store the ID number."
            />
          </div>
        </fieldset>
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading || description.trim().length < 20}>
          {loading ? "Analysing trip…" : "Plan my ride"}
        </button>
      </form>

      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {emergency && (
        <div role="alert" className="rounded-2xl border-2 border-red-600 bg-red-50 p-6">
          <h2 className="text-xl font-bold text-red-800">Possible emergency</h2>
          <p className="mt-2 text-red-900">{emergency.message}</p>
          <a href="tel:911" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-red-700 px-6 font-bold text-white">
            Call 911
          </a>
        </div>
      )}

      {plan && extraction && (
        <>
          {/* Step 2: review */}
          <section className="card space-y-5" aria-labelledby="review-title">
            <div>
              <h2 id="review-title" className="step-title">
                <span className="step-num" aria-hidden>2</span>
                Check your ride plan
              </h2>
              <p className="mt-1 text-sm text-zinc-600">{extraction.caregiverSummary}</p>
            </div>

            {missing.length > 0 && (
              <div role="alert" className="rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm text-red-900">
                <strong>Required before you can request this ride:</strong>
                <ul className="mt-1 list-inside list-disc">
                  {missing.map((f) => (
                    <li key={f}>{REQUIRED_LABELS[f]}</li>
                  ))}
                </ul>
                <p className="mt-1">Fill in the fields marked in red below.</p>
              </div>
            )}

            {extraction.missingInfo.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Please check or add:</strong> {extraction.missingInfo.join(" · ")}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pickup area" invalid={isMissing("pickupArea")} value={extraction.pickupArea} onChange={(v) => update({ pickupArea: v || null })} />
              <Field label="Hospital / clinic" invalid={isMissing("destination")} value={extraction.destination} onChange={(v) => update({ destination: v || null })} />
              <Field label="Appointment date" type="date" invalid={isMissing("appointmentDate")} value={extraction.appointmentDate} onChange={(v) => update({ appointmentDate: v || null })} />
              <Field label="Appointment time" type="time" invalid={isMissing("appointmentTime")} value={extraction.appointmentTime} onChange={(v) => update({ appointmentTime: v || null })} />
              <div>
                <label htmlFor="mobility" className="label">
                  How the patient moves{isMissing("mobility") && <span className="font-bold text-red-700"> · required</span>}
                </label>
                <select
                  id="mobility"
                  className={isMissing("mobility") ? "input border-2 border-red-500" : "input"}
                  aria-invalid={isMissing("mobility") || undefined}
                  value={extraction.mobility}
                  onChange={(e) => update({ mobility: e.target.value as TripExtraction["mobility"] })}
                >
                  {MOBILITY.map((m) => (
                    <option key={m} value={m}>
                      {MOBILITY_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="floors" className="label">
                  Floors to go down (no elevator)
                </label>
                <input
                  id="floors"
                  type="number"
                  min={0}
                  max={20}
                  className="input"
                  value={extraction.floorsWithoutElevator}
                  onChange={(e) => update({ floorsWithoutElevator: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })}
                />
              </div>
            </div>

            {plan.assessment.blocked ? (
              <div role="alert" className="rounded-lg border-2 border-red-500 bg-red-50 p-4 font-medium text-red-800">
                {plan.assessment.blockReason}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Vehicle" value={plan.assessment.vehicle === "wav_ramp_van" ? "Wheelchair van" : "Assist sedan"} sub={plan.assessment.vehicleLabel} />
                <Stat label="Crew" value={`${plan.assessment.crewSize} ${plan.assessment.crewSize === 1 ? "person" : "people"}`} sub={plan.assessment.crewSize === 2 ? "Includes stair assist" : "Driver assists boarding"} />
                <Stat label="Pickup time" value={plan.assessment.pickupTime ?? "Add a time"} sub={`${plan.assessment.travelMinutes} min travel estimate`} />
              </div>
            )}

            {!plan.assessment.blocked && plan.assessment.pickupTime && (
              <details className="text-sm text-zinc-600">
                <summary className="cursor-pointer font-medium text-ube-800">How we calculated the pickup time</summary>
                <ul className="mt-2 list-inside list-disc">
                  {plan.assessment.pickupBreakdown.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {/* Step 3: price */}
          {!plan.assessment.blocked && (
            <section className="card space-y-5" aria-labelledby="price-title">
              <h2 id="price-title" className="step-title">
                <span className="step-num" aria-hidden>3</span>
                Price estimate (one way)
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="km" className="label">
                    Distance (km)
                  </label>
                  <input
                    id="km"
                    type="number"
                    min={0.5}
                    max={150}
                    step={0.5}
                    className="input"
                    value={plan.options.distanceKm}
                    onChange={(e) => setDistanceKm(Math.max(0.5, Math.min(150, Number(e.target.value) || 0.5)))}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    {plan.options.distanceSource === "caregiver" ? "Your distance." : aiPlan?.route.note} Approximate; adjust if
                    you know the route.
                  </p>
                </div>
                <div>
                  <span className="label">Nearest hospitals to your area</span>
                  {plan.route.nearestHospitals.length ? (
                    <ul className="space-y-1 text-sm">
                      {plan.route.nearestHospitals.map((h) => (
                        <li key={h.name}>
                          <button
                            type="button"
                            className="text-left text-ube-800 underline-offset-2 hover:underline"
                            onClick={() => {
                              update({ destination: h.name });
                              setDistanceKm(h.km);
                            }}
                          >
                            {h.name} · ~{h.km} km
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500">Add your city (e.g., Pasig, QC) to see the nearest hospitals.</p>
                  )}
                </div>
              </div>

              <fieldset className="rounded-2xl border-2 border-ube-200 bg-ube-50 p-4">
                <legend className="px-1 text-base font-bold text-ube-950">Hospital companion / caregiver</legend>
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-ube-800"
                    checked={companionHours > 0}
                    onChange={(e) => {
                      setWantCompanion(e.target.checked);
                      setCompanionHours(e.target.checked ? DEFAULT_COMPANION_HOURS[extraction.tripPurpose] : 0);
                    }}
                  />
                  <span className="text-sm text-zinc-700">
                    A trained companion stays with the patient <strong>inside the hospital</strong> (registration, waiting,
                    wheelchair transfers) until the appointment is done. {peso(COMPANION_RATE_PER_HOUR)}/hour, minimum{" "}
                    {COMPANION_MIN_HOURS} hours.
                  </span>
                </label>
                {companionHours > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <label htmlFor="hours" className="text-sm font-medium text-zinc-700">
                      Hours
                    </label>
                    <input
                      id="hours"
                      type="number"
                      min={COMPANION_MIN_HOURS}
                      max={12}
                      className="input w-24"
                      value={companionHours}
                      onChange={(e) => setCompanionHours(Math.max(COMPANION_MIN_HOURS, Math.min(12, Math.round(Number(e.target.value) || 0))))}
                    />
                    <span className="text-xs text-zinc-500">Suggested for {extraction.tripPurpose}: {DEFAULT_COMPANION_HOURS[extraction.tripPurpose]} h</span>
                  </div>
                )}
              </fieldset>

              <div className="grid gap-2 sm:grid-cols-2">
                <Tick
                  checked={wantWheelchair}
                  onChange={setWantWheelchair}
                  icon={<Accessibility aria-hidden size={22} />}
                  title="Wheelchair"
                  detail={`We bring one for the trip · ${peso(WHEELCHAIR_RENTAL_FEE)}`}
                />
                <Tick
                  checked={seniorPwd}
                  onChange={setSeniorPwd}
                  icon={<BadgePercent aria-hidden size={22} />}
                  title="Senior Citizen / PWD"
                  detail="20% off the ride fare · show ID to driver"
                />
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {plan.assessment.quote.lines.map((l) => (
                    <tr key={l.label} className="border-b border-zinc-100">
                      <td className="py-2 text-zinc-700">{l.label}</td>
                      <td className="py-2 text-right tabular-nums">{peso(l.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 font-semibold">Estimated total</td>
                    <td className="pt-3 text-right text-lg font-bold tabular-nums text-ube-900">{peso(plan.assessment.quote.total)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="pt-1 text-right text-xs text-zinc-500">
                      Likely range {peso(plan.assessment.quote.min)} – {peso(plan.assessment.quote.max)} depending on traffic. No payment is
                      taken here.
                    </td>
                  </tr>
                </tbody>
              </table>

              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-ube-800">See our distance rates</summary>
                <table className="mt-2 w-full text-left text-xs">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="py-1">Distance</th>
                      <th>Assist sedan</th>
                      <th>Wheelchair van</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="py-1">Base fare (incl. first 5 km)</td>
                      <td>{peso(BASE_FARE.sedan_assist)}</td>
                      <td>{peso(BASE_FARE.wav_ramp_van)}</td>
                    </tr>
                    {DISTANCE_BANDS.slice(1).map((b) => (
                      <tr key={b.label} className="border-t">
                        <td className="py-1">{b.label}</td>
                        <td>+{peso(b.sedan_assist)}</td>
                        <td>+{peso(b.wav_ramp_van)}</td>
                      </tr>
                    ))}
                    <tr className="border-t">
                      <td className="py-1">Over 40 km</td>
                      <td>+₱900 + ₱30/km</td>
                      <td>+₱1,600 + ₱50/km</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-1 text-xs text-zinc-500">Second crew +₱300 · Stair assist +₱100 per floor · Hospital companion ₱250/h (min 2 h)</p>
              </details>
            </section>
          )}

          {/* Step 4: driver brief + confirm */}
          {!plan.assessment.blocked && (
            <section className="card space-y-4" aria-labelledby="confirm-title">
              <h2 id="confirm-title" className="step-title">
                <span className="step-num" aria-hidden>4</span>
                Driver brief and request
              </h2>
              <ul className="space-y-1 rounded-lg bg-zinc-50 p-4 font-mono text-sm text-zinc-800">
                {plan.driverBrief.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              {booking ? (
                <div role="status" className="rounded-lg border border-ube-300 bg-ube-50 p-4 text-ube-900">
                  <p className="font-semibold">Booking request sent ✓</p>
                  <p className="text-sm">
                    Reference <strong>{booking.reference}</strong>, requested on {formatManilaDateTime(booking.requestedAt)}. Keep
                    this reference; a dispatcher will call to confirm.{" "}
                    After the trip, you can{" "}
                    <Link href={`/feedback?ref=${booking.reference}`} className="font-bold underline">
                      rate the service or report a problem
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={confirm} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cname" className="label">
                      Your name (contact person)
                    </label>
                    <input id="cname" className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} required minLength={2} maxLength={60} />
                  </div>
                  <div>
                    <label htmlFor="cphone" className="label">
                      Mobile number
                    </label>
                    <input
                      id="cphone"
                      className="input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0917 123 4567"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                      aria-describedby="cphone-help"
                    />
                    <p id="cphone-help" className="mt-1 text-sm text-zinc-600">
                      Required. We call this number to confirm before any van is sent.
                    </p>
                  </div>
                  <label className="flex items-start gap-3 text-sm text-zinc-700 sm:col-span-2">
                    <input type="checkbox" className="mt-1 h-5 w-5 accent-ube-800" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                    <span>
                      I consent to Care Ride processing these trip details, including the patient&apos;s mobility needs (health
                      information), only to arrange and carry out this ride, as described in the{" "}
                      <Link href="/privacy" className="font-medium text-ube-800 underline">
                        Privacy Notice
                      </Link>
                      . I agree to the{" "}
                      <Link href="/terms" className="font-medium text-ube-800 underline">
                        Terms of Service
                      </Link>
                      . I didn&apos;t include diagnoses or other medical details that aren&apos;t needed.
                    </span>
                  </label>
                  {missing.length > 0 && (
                    <p role="status" className="text-sm font-medium text-red-800 sm:col-span-2">
                      Add the missing details in step 2 first: {missing.map((f) => REQUIRED_LABELS[f]).join(", ")}.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn-primary sm:col-span-2"
                    disabled={saving || missing.length > 0 || !consent || contactName.trim().length < 2 || !isPhMobile(contactPhone)}
                  >
                    {saving ? "Sending…" : `Request this ride · ${peso(plan.assessment.quote.total)} est.`}
                  </button>
                </form>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Client-side hint only; the server validates again. Accepts 09XXXXXXXXX or +639XXXXXXXXX. */
function isPhMobile(v: string): boolean {
  return /^(09|\+639)\d{9}$/.test(v.replace(/[\s-]/g, ""));
}

function Tick(props: { checked: boolean; onChange: (v: boolean) => void; title: string; detail: string; icon?: React.ReactNode }) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border-2 p-3.5 transition-colors ${
        props.checked ? "border-ube-600 bg-ube-50" : "border-zinc-200 bg-white hover:border-ube-300"
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 h-6 w-6 shrink-0 accent-ube-700"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.icon && (
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${props.checked ? "bg-ube-700 text-white" : "bg-ube-50 text-ube-700"}`}>
          {props.icon}
        </span>
      )}
      <span className="text-[15px] leading-snug text-zinc-700">
        <span className="mb-0.5 block text-base font-bold text-ube-950">{props.title}</span>
        {props.detail}
      </span>
    </label>
  );
}

function Field(props: { label: string; value: string | null; onChange: (v: string) => void; type?: string; invalid?: boolean }) {
  const id = props.label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="label">
        {props.label}
        {props.invalid && <span className="font-bold text-red-700"> · required</span>}
      </label>
      <input
        id={id}
        type={props.type ?? "text"}
        className={props.invalid ? "input border-2 border-red-500" : "input"}
        aria-invalid={props.invalid || undefined}
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-ube-50 p-4">
      <div className="mb-1 text-sm font-bold text-ube-700">{label}</div>
      <div className="text-xl font-bold text-ube-950">{value}</div>
      <div className="mt-1 text-xs text-zinc-600">{sub}</div>
    </div>
  );
}
