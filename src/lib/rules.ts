import type { Assessment, TripExtraction } from "./schemas";

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

export function estimateFare(args: {
  vehicle: Assessment["vehicle"];
  crewSize: 1 | 2;
  floorsWithoutElevator: number;
}): { min: number; max: number } {
  if (args.vehicle === "not_supported") return { min: 0, max: 0 };
  const base = args.vehicle === "wav_ramp_van" ? 900 : 350;
  const crew = args.crewSize === 2 ? 300 : 0;
  const stairs = args.crewSize === 2 ? 100 * args.floorsWithoutElevator : 0;
  const mid = base + crew + stairs;
  const round10 = (n: number) => Math.round(n / 10) * 10;
  return { min: round10((mid * 85) / 100), max: round10((mid * 115) / 100) };
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

export function assess(x: TripExtraction, travelMinutes: number): Assessment {
  const vehicle = chooseVehicle(x);
  const crewSize = chooseCrew(x);
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

  return {
    vehicle,
    vehicleLabel: VEHICLE_LABEL[vehicle],
    crewSize,
    assistChecklist: buildChecklist(x, vehicle, crewSize),
    pickupTime,
    pickupBreakdown: breakdown,
    fare: estimateFare({ vehicle, crewSize, floorsWithoutElevator: x.floorsWithoutElevator }),
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
