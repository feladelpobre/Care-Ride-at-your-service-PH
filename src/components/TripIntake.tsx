"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Accessibility, BadgePercent, HeartHandshake, LocateFixed, Minus, Plus } from "lucide-react";
import { track } from "@vercel/analytics";
import type { TripExtraction, TripPlan } from "@/lib/schemas";
import { MOBILITY } from "@/lib/schemas";
import { buildPlan } from "@/lib/plan";
import { HOSPITALS, gpsPlaceName, isInServiceArea } from "@/lib/geo";
import { lookupPlace } from "@/lib/placeName";
import { firstUnfinished, isUnlocked, type Step1Fields } from "@/lib/stepGate";
import { formatManilaDateTime } from "@/lib/format";
import { detectEmergency, EMERGENCY_MESSAGE } from "@/lib/emergency";
import { missingRequiredDetails, REQUIRED_LABELS, type RequiredField } from "@/lib/required";
import {
  BASE_FARE,
  COMPANION_MIN_HOURS,
  COMPANION_RATE_PER_HOUR,
  DEFAULT_COMPANION_HOURS,
  DISTANCE_BANDS,
  WHEELCHAIR_RENTAL_FEE,
  nextCompanionHours,
} from "@/lib/rules";

/** Shown in grey inside the trip box as a guide (AC25); there are no "Try example" buttons. */
const PLACEHOLDER_EXAMPLE =
  "Mama uses a wheelchair and can't stand. Dialysis at St. Luke's BGC every Tuesday 9am. We live in Kapitolyo, Pasig, 3rd floor, walang elevator. Walang makakasama sa kanya sa ospital.";

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
  const [pickupLocation, setPickupLocation] = useState("");
  const [destination, setDestination] = useState("");
  // Step-1 fields that replace the AI's guesses (AC30, AC31)
  const [mobility, setMobility] = useState<TripExtraction["mobility"]>("unknown");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  // Phone GPS for the pickup (AC29): rounded, used only for the distance, never stored
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emergency, setEmergency] = useState<Emergency | null>(null);

  // AI result + caregiver edits
  const [extraction, setExtraction] = useState<TripExtraction | null>(null);
  const [aiPlan, setAiPlan] = useState<TripPlan | null>(null);
  const [companionHours, setCompanionHours] = useState<number>(0);

  // Step 1 tick boxes
  const [wantWheelchair, setWantWheelchair] = useState(false);
  const [seniorPwd, setSeniorPwd] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [booking, setBooking] = useState<{ id: string; reference: string; requestedAt: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-price instantly with the same pure rules the server uses.
  // The distance is recalculated by the system from pickup + destination (AC26).
  const plan: TripPlan | null = useMemo(() => {
    if (!extraction || !aiPlan) return null;
    return buildPlan(extraction, {
      pickupGps: gps,
      requestedPickupTime: pickupTime || null,
      companionHours,
      wheelchairRental: wantWheelchair,
      seniorPwdDiscount: seniorPwd,
    });
  }, [extraction, aiPlan, gps, pickupTime, companionHours, wantWheelchair, seniorPwd]);

  // Live suggestion for the pick-up time while step 1 is being filled in (AC31)
  const suggestedPickup: string | null = useMemo(() => {
    if (!appointmentTime || mobility === "unknown" || destination.trim().length < 3 || (!gps && pickupLocation.trim().length < 3)) return null;
    const draft: TripExtraction = {
      pickupArea: pickupLocation,
      destination,
      appointmentDate: appointmentDate || null,
      appointmentTime,
      tripPurpose: "other",
      mobility,
      floorsWithoutElevator: 0,
      equipment: [],
      companions: 0,
      recurring: false,
      recurrenceNote: null,
      wantsHospitalCompanion: false,
      emergencySignals: false,
      missingInfo: [],
      caregiverSummary: "",
    };
    return buildPlan(draft, { pickupGps: gps }).assessment.suggestedPickupTime;
  }, [appointmentTime, appointmentDate, mobility, destination, pickupLocation, gps]);

  // Each GPS tap gets a number, so a slow place lookup can't overwrite a newer tap or typing
  const gpsRequest = useRef(0);

  /** Fills the pickup area from the phone's GPS, even when the field is empty (AC29). */
  function locateMe() {
    if (!("geolocation" in navigator)) {
      setGpsStatus({ busy: false, message: "This phone or browser can't share its location. Please type the barangay and city." });
      return;
    }
    const request = ++gpsRequest.current;
    setGpsStatus({ busy: true, message: null });

    const onFound = async (pos: GeolocationPosition) => {
      const g = { lat: Math.round(pos.coords.latitude * 1000) / 1000, lng: Math.round(pos.coords.longitude * 1000) / 1000 };
      if (!isInServiceArea(g)) {
        setGps(null);
        setGpsStatus({ busy: false, message: "Your location looks outside the Philippines. Please type the pickup barangay and city." });
        return;
      }
      setGps(g);
      // Show something right away, then the real town/province name once it's looked up
      const near = gpsPlaceName(g).replace("your GPS location", "").replace(/[()]/g, "").trim();
      setPickupLocation(near ? `${near[0].toUpperCase()}${near.slice(1)} (GPS)` : "Current location (GPS)");
      setGpsStatus({ busy: true, message: "Location found. Finding the town name…" });
      const name = await lookupPlace(g);
      if (request !== gpsRequest.current) return; // a newer tap or typing took over
      if (name) setPickupLocation(`${name} (GPS)`);
      setGpsStatus({
        busy: false,
        message: name
          ? "Location found. Check the area above; we measure the distance from here and don't save your exact location."
          : "Location found. We couldn't look up the town name, so please add the barangay and city if you can. The distance still uses your GPS.",
      });
    };

    const onError = (err: GeolocationPositionError, triedHighAccuracy: boolean) => {
      if (request !== gpsRequest.current) return;
      // Indoors, a precise fix can time out: try once more with a quicker, rougher fix
      if (triedHighAccuracy && err.code !== err.PERMISSION_DENIED) {
        navigator.geolocation.getCurrentPosition(onFound, (e) => onError(e, false), { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
        return;
      }
      setGpsStatus({
        busy: false,
        message:
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for this browser. On iPhone: Settings → Privacy & Security → Location Services → Chrome (or Safari Websites) → While Using the App, then tap the button again. Or type the barangay and city."
            : "We couldn't get your location right now. Move near a window or turn on Wi-Fi and try again, or type the barangay and city.",
      });
    };

    navigator.geolocation.getCurrentPosition(onFound, (e) => onError(e, true), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

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
          pickupLocation,
          destination,
          mobility,
          appointmentDate: appointmentDate || undefined,
          appointmentTime: appointmentTime || undefined,
          pickupTime: pickupTime || undefined,
          pickupGps: gps ?? undefined,
          companionHours,
          addons: { wheelchair: wantWheelchair, companion: companionHours > 0, seniorPwd },
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
      setCompanionHours(p.options.companionHours);
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
        body: JSON.stringify({ contactName, contactPhone, contactEmail, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the booking.");
      setBooking(data.booking);
      setEmailSent(Boolean(data.emailSent));
      track("booking_confirmed", { vehicle: plan.assessment.vehicle, companion: plan.assessment.companionHours > 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the booking.");
    } finally {
      setSaving(false);
    }
  }

  const update = (patch: Partial<TripExtraction>) => setExtraction((x) => (x ? { ...x, ...patch } : x));

  // Step 1 is filled in order (AC33): later parts stay locked until earlier ones are done
  const step1: Step1Fields = { description, pickupLocation, hasGps: Boolean(gps), destination, mobility, appointmentDate, appointmentTime };
  const nextUp = firstUnfinished(step1);
  const open = (key: Parameters<typeof isUnlocked>[1]) => isUnlocked(step1, key);

  return (
    <div className="space-y-6">
      {/* Step 1: describe */}
      <form onSubmit={analyse} className="card space-y-3">
        <label htmlFor="desc" className="step-title">
          <span className="step-num" aria-hidden>1</span>
          Tell us about the trip
        </label>
        {nextUp?.key === "description" && <NextLabel />}
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={1500}
          className={`input resize-y ${nextUp?.key === "description" ? "border-red-500 ring-2 ring-red-500" : ""}`}
          placeholder={`e.g., ${PLACEHOLDER_EXAMPLE}`}
          aria-describedby="desc-help"
        />
        <div id="desc-help" className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
          <span>
            Describe the rider: stairs or floors without an elevator, equipment (oxygen, walker), the reason for the trip
            (dialysis, check-up) and who rides along (maximum of 1 companion). You&apos;ll add the places and times below.
          </span>
          <span>{description.length}/1500</span>
        </div>
        {/* Emergency words show the 911 message right away, before any other field is needed (AC2) */}
        {detectEmergency(description).emergency && (
          <div role="alert" className="rounded-2xl border-2 border-red-600 bg-red-50 p-4">
            <p className="font-bold text-red-800">Possible emergency</p>
            <p className="mt-1 text-sm text-red-900">{EMERGENCY_MESSAGE}</p>
            <a href="tel:911" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-red-700 px-6 font-bold text-white">
              Call 911
            </a>
          </div>
        )}
        <Gate open={open("pickup")} current={nextUp?.key === "pickup"} needs="the trip description (at least 20 characters)">
          <label htmlFor="pickup" className="label">
            Pickup location <span className="font-normal text-zinc-600">(required)</span>
          </label>
          <button
            type="button"
            className="btn-ghost mb-2 inline-flex min-h-11 items-center gap-2 text-sm"
            onClick={locateMe}
            disabled={gpsStatus.busy}
          >
            <LocateFixed aria-hidden size={18} />
            {gpsStatus.busy ? "Finding your location…" : gps ? "Update my location" : "Use my current location (GPS)"}
          </button>
          {!gps && !gpsStatus.busy && !pickupLocation && (
            <p className="mb-2 text-sm text-zinc-600">Tap the button to fill this in automatically, or type the barangay and city below.</p>
          )}
          <input
            id="pickup"
            className="input"
            value={pickupLocation}
            onChange={(e) => {
              setPickupLocation(e.target.value);
              gpsRequest.current++;
              if (gps || gpsStatus.busy) {
                setGps(null);
                setGpsStatus({ busy: false, message: null });
              }
            }}
            maxLength={120}
            autoComplete="address-level3"
            placeholder="Barangay and city, e.g., Kapitolyo, Pasig"
            required
            aria-describedby="pickup-help"
          />
          {gpsStatus.message && (
            <p role="status" className={`mt-1 text-sm ${gps ? "text-ube-800" : "text-amber-800"}`}>
              {gpsStatus.message}
            </p>
          )}
          <p id="pickup-help" className="mt-1 text-sm text-zinc-600">
            Where should the van pick up the patient? Use GPS if you&apos;re there now, or type the barangay and city; the driver calls you
            for the exact address.
          </p>
        </Gate>
        <Gate open={open("destination")} current={nextUp?.key === "destination"} needs="the pickup location">
          <label htmlFor="destination" className="label">
            Destination: hospital or clinic <span className="font-normal text-zinc-600">(required)</span>
          </label>
          <input
            id="destination"
            className="input"
            list="hospital-list"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder="e.g., St. Luke's Medical Center – BGC"
            required
            aria-describedby="destination-help"
          />
          <datalist id="hospital-list">
            {HOSPITALS.map((h) => (
              <option key={h.name} value={h.name} />
            ))}
          </datalist>
          <p id="destination-help" className="mt-1 text-sm text-zinc-600">
            Where is the appointment? Pick from the list, or type the clinic name and its area (e.g., Healthway Clinic,
            Mandaluyong). We calculate the distance for you.
          </p>
        </Gate>
        <Gate open={open("mobility")} current={nextUp?.key === "mobility"} needs="the destination">
          <label htmlFor="mobility1" className="label">
            How the patient moves <span className="font-normal text-zinc-600">(required)</span>
          </label>
          <select id="mobility1" className="input" value={mobility} onChange={(e) => setMobility(e.target.value as TripExtraction["mobility"])} required>
            {MOBILITY.map((m) => (
              <option key={m} value={m} disabled={m === "unknown"}>
                {MOBILITY_LABEL[m]}
              </option>
            ))}
          </select>
        </Gate>
        <Gate open={open("caregiver")} needs="how the patient moves" className="rounded-2xl border-2 border-ube-200 bg-ube-50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-ube-700">
              <HeartHandshake aria-hidden size={24} />
            </span>
            <div>
              <p id="caregiver-label" className="text-base font-bold text-ube-950">
                Hospital caregiver: how many hours?
              </p>
              <p className="text-sm text-zinc-700">
                A trained caregiver stays with the patient inside the hospital (registration, waiting, transfers) until the appointment is
                done. {peso(COMPANION_RATE_PER_HOUR)}/hour, minimum {COMPANION_MIN_HOURS} hours. Choose &quot;None&quot; if a family member stays.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <HoursStepper value={companionHours} onChange={setCompanionHours} labelledBy="caregiver-label" />
          </div>
        </Gate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Gate open={open("appointmentDate")} current={nextUp?.key === "appointmentDate"} needs="how the patient moves">
            <label htmlFor="apptDate" className="label">
              Appointment date <span className="font-normal text-zinc-600">(required)</span>
            </label>
            <input id="apptDate" type="date" className="input" value={appointmentDate} min={todayManila()} onChange={(e) => setAppointmentDate(e.target.value)} required />
          </Gate>
          <Gate open={open("appointmentTime")} current={nextUp?.key === "appointmentTime"} needs="the appointment date">
            <label htmlFor="apptTime" className="label">
              Appointment time <span className="font-normal text-zinc-600">(required)</span>
            </label>
            <input id="apptTime" type="time" className="input" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} required />
          </Gate>
          <Gate open={open("pickupTime")} needs="the appointment time" className="sm:col-span-2">
            <label htmlFor="pickTime" className="label">
              Pick-up time <span className="font-normal text-zinc-600">(same day as the appointment)</span>
            </label>
            <input
              id="pickTime"
              type="time"
              className="input sm:max-w-[50%]"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              aria-describedby="pickTime-help"
            />
            <p id="pickTime-help" className="mt-1 text-sm text-zinc-600">
              {suggestedPickup ? (
                <>
                  We suggest <strong>{suggestedPickup}</strong> or earlier so the patient arrives on time.{" "}
                  {!pickupTime && (
                    <button type="button" className="font-bold text-ube-800 underline" onClick={() => setPickupTime(suggestedPickup)}>
                      Use {suggestedPickup}
                    </button>
                  )}
                </>
              ) : (
                "Leave it blank and we'll suggest a time once the places, mobility and appointment time are filled in."
              )}
            </p>
            {pickupTime && suggestedPickup && pickupTime > suggestedPickup && (
              <p role="alert" className="mt-1 text-sm font-medium text-amber-800">
                {pickupTime} may be too late. We suggest {suggestedPickup} or earlier.
              </p>
            )}
          </Gate>
        </div>
        <fieldset className={`pt-2 ${open("addons") ? "" : "opacity-50"}`} disabled={!open("addons")}>
          <legend className="mb-2 text-base font-bold text-ube-950">Also add (tick all that apply)</legend>
          <div className="space-y-2">
            <Tick
              checked={wantWheelchair}
              onChange={setWantWheelchair}
              icon={<Accessibility aria-hidden size={24} />}
              title="Wheelchair"
              detail={`We bring a clean wheelchair for the patient to use during the trip and inside the hospital. ${peso(WHEELCHAIR_RENTAL_FEE)} per trip.`}
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
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={
            loading ||
            description.trim().length < 20 ||
            pickupLocation.trim().length < 3 ||
            destination.trim().length < 3 ||
            mobility === "unknown" ||
            !appointmentDate ||
            !appointmentTime
          }
        >
          {loading ? "Analysing trip…" : "Plan my ride"}
        </button>
        {nextUp && !loading && (
          <p role="status" className="text-sm font-medium text-ube-800">
            Next: fill in {nextUp.label}.
          </p>
        )}
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
                <Stat
                  label="Pickup time"
                  value={plan.assessment.pickupTime ?? "Add a time"}
                  sub={
                    plan.options.requestedPickupTime
                      ? `Your time · we suggest ${plan.assessment.suggestedPickupTime ?? "–"} · ${plan.assessment.travelMinutes} min travel`
                      : `Suggested · ${plan.assessment.travelMinutes} min travel estimate`
                  }
                />
              </div>
            )}

            {!plan.assessment.blocked && plan.assessment.pickupWarning && (
              <div role="alert" className="rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                {plan.assessment.pickupWarning}{" "}
                {plan.assessment.suggestedPickupTime && (
                  <button type="button" className="font-bold underline" onClick={() => setPickupTime(plan.assessment.suggestedPickupTime!)}>
                    Use {plan.assessment.suggestedPickupTime}
                  </button>
                )}
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
                  <span className="label">Distance (calculated by Care Ride)</span>
                  <p className="text-2xl font-bold tabular-nums text-ube-950" aria-live="polite">
                    {plan.options.distanceKm} km
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {plan.route.note.replace(/\.$/, "")}. To change it, edit the pickup area or hospital in step 2.
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
                            onClick={() => update({ destination: h.name })}
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
                <legend id="caregiver-label-3" className="px-1 text-base font-bold text-ube-950">
                  Hospital caregiver hours
                </legend>
                <p className="text-sm text-zinc-700">
                  Stays with the patient <strong>inside the hospital</strong> until the appointment is done.{" "}
                  {peso(COMPANION_RATE_PER_HOUR)}/hour, minimum {COMPANION_MIN_HOURS} hours. Usual for {extraction.tripPurpose}:{" "}
                  {DEFAULT_COMPANION_HOURS[extraction.tripPurpose]} h.
                </p>
                <div className="mt-3">
                  <HoursStepper value={companionHours} onChange={setCompanionHours} labelledBy="caregiver-label-3" />
                </div>
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
                  <p className="mt-2 text-sm">
                    {emailSent ? (
                      <>
                        We emailed the reference and trip details to <strong>{contactEmail.trim().toLowerCase()}</strong>, and we&apos;ll
                        email a reminder about 2 hours before pickup. Please check your spam folder too.
                      </>
                    ) : (
                      <>We couldn&apos;t send the confirmation email right now, so please take a screenshot of this reference.</>
                    )}
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
                  <div className="sm:col-span-2">
                    <label htmlFor="cemail" className="label">
                      Email address
                    </label>
                    <input
                      id="cemail"
                      className="input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@gmail.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                      maxLength={254}
                      aria-describedby="cemail-help"
                    />
                    <p id="cemail-help" className="mt-1 text-sm text-zinc-600">
                      Required. We email your booking reference right away and a reminder about 2 hours before pickup.
                    </p>
                  </div>
                  <label className="flex items-start gap-3 text-sm text-zinc-700 sm:col-span-2">
                    <input type="checkbox" className="mt-1 h-5 w-5 accent-ube-800" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                    <span>
                      I consent to Care Ride processing these trip details, including the patient&apos;s mobility needs (health
                      information) and my email address, only to arrange and carry out this ride and send its confirmation and reminder, as described in the{" "}
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
                    disabled={
                      saving ||
                      missing.length > 0 ||
                      !consent ||
                      contactName.trim().length < 2 ||
                      !isPhMobile(contactPhone) ||
                      !isEmail(contactEmail)
                    }
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

/** Light client-side check; the server validates properly (AC22). */
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Caregiver hours as big − / + buttons (AC30). The old number box clamped on every keystroke,
 * so on phones the value jumped back and couldn't be changed.
 */
function HoursStepper({ value, onChange, labelledBy }: { value: number; onChange: (v: number) => void; labelledBy: string }) {
  const shown = value > 0 ? `${value} hour${value === 1 ? "" : "s"}` : "None";
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex items-center gap-3">
      <button
        type="button"
        className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ube-300 bg-white text-ube-800 disabled:opacity-40"
        onClick={() => onChange(nextCompanionHours(value, -1))}
        disabled={value === 0}
        aria-label="One hour less"
      >
        <Minus aria-hidden size={22} />
      </button>
      <output aria-live="polite" className="min-w-[6.5rem] text-center text-lg font-bold tabular-nums text-ube-950">
        {shown}
      </output>
      <button
        type="button"
        className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ube-300 bg-white text-ube-800 disabled:opacity-40"
        onClick={() => onChange(nextCompanionHours(value, 1))}
        disabled={value >= 12}
        aria-label="One hour more"
      >
        <Plus aria-hidden size={22} />
      </button>
      {value > 0 && <span className="text-sm text-zinc-700">{peso(value * COMPANION_RATE_PER_HOUR)}</span>}
    </div>
  );
}

/** Today's date in Manila as YYYY-MM-DD (the earliest appointment date). */
function todayManila(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** The "fill this in now" label shown on the current part of step 1 (AC33). */
function NextLabel() {
  return (
    <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">
      👉 Next: fill this in (required)
    </p>
  );
}

/**
 * Locks part of step 1 until the part before it is filled in (AC33). Uses a native disabled
 * fieldset, so every input, select and button inside is locked for touch, mouse and keyboard.
 * Locked parts are clearly greyed with a dashed outline and a label at the top (not faded);
 * the part to fill in now gets a coloured outline and a "Next" label.
 */
function Gate({
  open,
  current = false,
  needs,
  className = "",
  children,
}: {
  open: boolean;
  current?: boolean;
  needs: string;
  className?: string;
  children: React.ReactNode;
}) {
  const frame = !open
    ? "rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-100 p-3"
    : current
      ? "rounded-2xl bg-red-50 p-3 ring-2 ring-red-500"
      : "";
  // While locked, the grey frame replaces the box's own border and background
  const own = open ? className : className.split(/\s+/).filter((c) => !/^(border|bg-)/.test(c)).join(" ");
  return (
    <div className={`min-w-0 ${own} ${frame}`}>
      {!open && (
        <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-zinc-700 px-3 py-1 text-sm font-bold text-white">
          🔒 Locked: fill in {needs} first
        </p>
      )}
      {open && current && <NextLabel />}
      <fieldset disabled={!open} className={`min-w-0 ${open ? "" : "pointer-events-none select-none opacity-40 grayscale"}`}>
        {children}
      </fieldset>
    </div>
  );
}
