import type { Assessment, TripExtraction } from "./schemas";
import { estimateTravelMinutes } from "./geo";

/**
 * Deterministic, unit-tested rules engine (spec §3.2).
 * The AI only extracts facts; every safety-critical decision is made here.
 */

const VEHICLE_LABEL: Record<Assessment["vehicle"], string> = {
  sedan_assist: "Sedan/MPV with trained assist driver (foldable wheelchair in trunk)",
  wav_ramp_van: "Wheelchair-accessible van with ramp or lift (patient stays seated)",
  not_supported: "Not supported: needs a stretcher/ambulance transport",
};

const isWheelchair = (m: TripExtraction["mobility"]) =>
  m === "wheelchair_can_transfer" || m === "wheelchair_must_stay_seated" || m === "unknown";

export function chooseVehicle(x: Pick<TripExtraction, "mobility" | "equipment">): Assessment["vehicle"] {
  if (x.mobility === "stretcher_bedbound") return "not_supported";
  if (x.mobility === "wheelchair_must_stay_seated" || x.mobility === "unknown") return "wav_ramp_van";
  if (x.equipment.some((e) => e.includes("oxygen"))) return "wav_ramp_van";
  return "sedan_assist";
}

export function chooseCrew(x: Pick<TripExtraction, "mobility" | "floorsWithoutElevator">): 1 | 2 {
  return isWheelchair(x.mobility) && x.floorsWithoutElevator >= 1 ? 2 : 1;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMinutes = (total: number) => {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

export function computePickupTime(args: {
  appointmentTime: string | null;
  travelMinutes: number;
  tripPurpose: TripExtraction["tripPurpose"];
  vehicle: Assessment["vehicle"];
  crewSize: 1 | 2;
}): { pickupTime: string | null; breakdown: string[] } {
  if (!args.appointmentTime) return { pickupTime: null, breakdown: ["Add an appointment time to get a pickup time."] };
  const early = args.tripPurpose === "dialysis" ? 30 : 15;
  const boarding = 10 + (args.vehicle === "wav_ramp_van" ? 10 : 0);
  const stairs = args.crewSize === 2 ? 15 : 0;
  const raw = toMinutes(args.appointmentTime) - early - args.travelMinutes - boarding - stairs;
  const floored = Math.floor(raw / 5) * 5;
  const breakdown = [
    `Appointment ${args.appointmentTime}`,
    `− ${early} min arrive early${args.tripPurpose === "dialysis" ? " (dialysis check-in)" : ""}`,
    `− ${args.travelMinutes} min travel (estimate)`,
    `− ${boarding} min boarding${args.vehicle === "wav_ramp_van" ? " incl. ramp/lift" : ""}`,
    ...(stairs ? [`− ${stairs} min stair assist`] : []),
  ];
  return { pickupTime: fromMinutes(floored), breakdown };
}

/** Distance bands (spec §3.5). Base fare includes the first 5 km. */
export const DISTANCE_BANDS = [
  { upToKm: 5, label: "0–5 km", sedan_assist: 0, wav_ramp_van: 0 },
  { upToKm: 10, label: "5.1–10 km", sedan_assist: 150, wav_ramp_van: 300 },
  { upToKm: 20, label: "10.1–20 km", sedan_assist: 400, wav_ramp_van: 750 },
  { upToKm: 40, label: "20.1–40 km", sedan_assist: 900, wav_ramp_van: 1600 },
] as const;
export const BASE_FARE = { sedan_assist: 350, wav_ramp_van: 900 } as const;
export const OVER_40_PER_KM = { sedan_assist: 30, wav_ramp_van: 50 } as const;
export const SECOND_CREW_FEE = 300;
export const STAIR_FEE_PER_FLOOR = 100;
export const COMPANION_RATE_PER_HOUR = 250;
export const COMPANION_MIN_HOURS = 2;

/** Typical hours a hospital companion is needed, by trip purpose. */
export const DEFAULT_COMPANION_HOURS: Record<TripExtraction["tripPurpose"], number> = {
  dialysis: 5,
  checkup: 3,
  therapy: 2,
  chemotherapy: 6,
  discharge: 3,
  other: 3,
};

export function distanceBand(km: number) {
  return DISTANCE_BANDS.find((b) => km <= b.upToKm) ?? null; // null = over 40 km
}

export function distanceSurcharge(vehicle: "sedan_assist" | "wav_ramp_van", km: number): { label: string; amount: number } {
  const band = distanceBand(km);
  if (band) return { label: band.label, amount: band[vehicle] };
  const last = DISTANCE_BANDS[DISTANCE_BANDS.length - 1];
  return { label: "Over 40 km", amount: last[vehicle] + Math.ceil(km - 40) * OVER_40_PER_KM[vehicle] };
}

/** Billable companion hours: 0 = not requested; otherwise at least the minimum, max 12. */
export function companionHoursBillable(hours: number): number {
  if (!hours || hours <= 0) return 0;
  return Math.min(12, Math.max(COMPANION_MIN_HOURS, Math.ceil(hours)));
}

const round10 = (n: number) => Math.round(n / 10) * 10;

/** One-way price estimate: transport (±15% traffic range) + optional hospital companion (fixed). */
export function priceQuote(args: {
  vehicle: Assessment["vehicle"];
  crewSize: 1 | 2;
  floorsWithoutElevator: number;
  distanceKm: number;
  companionHours: number;
}): Assessment["quote"] {
  if (args.vehicle === "not_supported") {
    return { lines: [], transportSubtotal: 0, companionSubtotal: 0, total: 0, min: 0, max: 0 };
  }
  const v = args.vehicle;
  const dist = distanceSurcharge(v, args.distanceKm);
  const lines: { label: string; amount: number }[] = [
    { label: `Base fare (${v === "wav_ramp_van" ? "wheelchair van" : "assist sedan"}, first 5 km)`, amount: BASE_FARE[v] },
    { label: `Distance ${dist.label} (${args.distanceKm} km)`, amount: dist.amount },
  ];
  if (args.crewSize === 2) {
    lines.push({ label: "Second crew member", amount: SECOND_CREW_FEE });
    lines.push({ label: `Stair assist (${args.floorsWithoutElevator} floor/s)`, amount: STAIR_FEE_PER_FLOOR * args.floorsWithoutElevator });
  }
  const transportSubtotal = lines.reduce((s, l) => s + l.amount, 0);
  const hrs = companionHoursBillable(args.companionHours);
  const companionSubtotal = hrs * COMPANION_RATE_PER_HOUR;
  if (hrs) lines.push({ label: `Hospital companion (${hrs} h × ₱${COMPANION_RATE_PER_HOUR})`, amount: companionSubtotal });
  const total = transportSubtotal + companionSubtotal;
  return {
    lines,
    transportSubtotal,
    companionSubtotal,
    total,
    min: round10((transportSubtotal * 85) / 100) + companionSubtotal,
    max: round10((transportSubtotal * 115) / 100) + companionSubtotal,
  };
}

export function buildChecklist(x: TripExtraction, vehicle: Assessment["vehicle"], crew: 1 | 2): string[] {
  const list: string[] = [];
  if (vehicle === "wav_ramp_van") list.push("Deploy ramp/lift and secure wheelchair with 4-point tie-downs");
  if (vehicle === "sedan_assist") list.push("Assist transfer from wheelchair/walker to seat; fold device into trunk");
  if (crew === 2) list.push(`Stair assist: 2 crew to carry patient down ${x.floorsWithoutElevator} floor(s) (stair chair if available)`);
  for (const e of x.equipment) {
    if (e.includes("oxygen")) list.push("Secure oxygen tank upright; no smoking in vehicle");
    else list.push(`Bring/secure: ${e.replace(/_/g, " ")}`);
  }
  if (x.companions > 0) list.push(`Seat for ${x.companions} companion(s)`);
  if (x.tripPurpose === "dialysis") list.push("Post-dialysis patients may feel weak or dizzy; go slowly on the return trip");
  return list;
}

export type TripOptions = { distanceKm: number; companionHours: number };

export function assess(x: TripExtraction, opts: TripOptions): Assessment {
  const vehicle = chooseVehicle(x);
  const crewSize = chooseCrew(x);
  const travelMinutes = estimateTravelMinutes(opts.distanceKm);
  const { pickupTime, breakdown } = computePickupTime({
    appointmentTime: x.appointmentTime,
    travelMinutes,
    tripPurpose: x.tripPurpose,
    vehicle,
    crewSize,
  });
  let blockReason: string | null = null;
  if (x.emergencySignals) blockReason = "Possible emergency detected. Call 911 instead of booking.";
  else if (vehicle === "not_supported") blockReason = "Bedbound/stretcher patients need an ambulance service. Please contact one directly.";
  const quote = priceQuote({ vehicle, crewSize, floorsWithoutElevator: x.floorsWithoutElevator, distanceKm: opts.distanceKm, companionHours: opts.companionHours });
  const companionHours = companionHoursBillable(opts.companionHours);
  const checklist = buildChecklist(x, vehicle, crewSize);
  if (companionHours) checklist.push(`Hospital companion stays with patient inside the hospital (~${companionHours} h) until the appointment is completed`);

  return {
    vehicle,
    vehicleLabel: VEHICLE_LABEL[vehicle],
    crewSize,
    assistChecklist: checklist,
    travelMinutes,
    pickupTime,
    pickupBreakdown: breakdown,
    companionHours,
    quote,
    fare: { min: quote.min, max: quote.max },
    blocked: blockReason !== null,
    blockReason,
  };
}

const MOBILITY_TEXT: Record<TripExtraction["mobility"], string> = {
  walks_with_assistance: "Walks with assistance",
  wheelchair_can_transfer: "Wheelchair user, can transfer to a seat",
  wheelchair_must_stay_seated: "Wheelchair user, must stay seated",
  stretcher_bedbound: "Bedbound / stretcher",
  unknown: "Mobility not stated: assume wheelchair, confirm on call",
};

export function buildDriverBrief(x: TripExtraction, a: Assessment): string[] {
  return [
    `Pickup ${a.pickupTime ?? "TBC"} · ${x.pickupArea ?? "area TBC"} → ${x.destination ?? "destination TBC"}`,
    `Appointment ${x.appointmentDate ?? "date TBC"} ${x.appointmentTime ?? ""}`.trim(),
    `Vehicle: ${a.vehicleLabel} · Crew: ${a.crewSize}`,
    `Mobility: ${MOBILITY_TEXT[x.mobility]}${x.floorsWithoutElevator ? ` · ${x.floorsWithoutElevator} floor(s), no elevator` : ""}`,
    ...a.assistChecklist.map((c) => `☐ ${c}`),
    ...(x.recurring ? [`Recurring trip${x.recurrenceNote ? `: ${x.recurrenceNote}` : ""}`] : []),
  ];
}
