import { type AiExtraction, type TripExtraction, tripExtractionSchema } from "./schemas";

const clampInt = (n: unknown, min: number, max: number): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0;
  return Math.min(max, Math.max(min, v));
};

const cut = (s: string | null | undefined, max: number): string | null => {
  if (s == null) return null;
  const t = s.trim();
  return t ? t.slice(0, max) : null;
};

/** Accepts "9:00", "09:00", "9:00 AM" and returns HH:mm or null. */
export function normalizeTime(input: string | null): string | null {
  if (!input) return null;
  const m = input.trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizeDate(input: string | null): string | null {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  return Number.isNaN(Date.parse(`${input}T00:00:00Z`)) ? null : input;
}

/** Clamp, format-check and de-duplicate the AI output (spec §4, AC6, AC7). */
export function normalizeExtraction(ai: AiExtraction): TripExtraction {
  const missing = new Set(ai.missingInfo.map((s) => s.trim()).filter(Boolean));
  const appointmentTime = normalizeTime(ai.appointmentTime);
  const appointmentDate = normalizeDate(ai.appointmentDate);
  const destination = cut(ai.destination, 120);
  const pickupArea = cut(ai.pickupArea, 120);

  if (!appointmentTime) missing.add("appointment time");
  if (!appointmentDate) missing.add("appointment date");
  if (!destination) missing.add("hospital or clinic name");
  if (!pickupArea) missing.add("pickup area (barangay/city)");
  if (ai.mobility === "unknown") missing.add("how the patient moves (wheelchair, walker, bedbound)");

  return tripExtractionSchema.parse({
    pickupArea,
    destination,
    appointmentDate,
    appointmentTime,
    tripPurpose: ai.tripPurpose,
    mobility: ai.mobility,
    floorsWithoutElevator: clampInt(ai.floorsWithoutElevator, 0, 20),
    equipment: Array.from(new Set(ai.equipment.map((e) => e.trim().toLowerCase().slice(0, 40)).filter(Boolean))).slice(0, 5),
    companions: clampInt(ai.companions, 0, 3),
    recurring: ai.recurring,
    recurrenceNote: cut(ai.recurrenceNote, 120),
    emergencySignals: ai.emergencySignals,
    missingInfo: Array.from(missing).map((s) => s.slice(0, 120)).slice(0, 8),
    caregiverSummary: (ai.caregiverSummary ?? "").trim().slice(0, 280),
  });
}
