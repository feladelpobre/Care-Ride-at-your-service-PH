import type { TripExtraction } from "./schemas";

/** Details a ride request can't go ahead without (spec AC20). */
export type RequiredField = "pickupArea" | "destination" | "appointmentDate" | "appointmentTime" | "mobility";

export const REQUIRED_LABELS: Record<RequiredField, string> = {
  pickupArea: "Pickup area",
  destination: "Hospital / clinic",
  appointmentDate: "Appointment date",
  appointmentTime: "Appointment time",
  mobility: "How the patient moves",
};

const blank = (v: string | null) => v === null || v.trim() === "";

/**
 * Returns the required details still missing, in form order.
 * Mobility "unknown" counts as missing: the crew must know whether the patient
 * walks, transfers or stays seated before a van is sent.
 */
export function missingRequiredDetails(x: TripExtraction): RequiredField[] {
  const missing: RequiredField[] = [];
  if (blank(x.pickupArea)) missing.push("pickupArea");
  if (blank(x.destination)) missing.push("destination");
  if (blank(x.appointmentDate)) missing.push("appointmentDate");
  if (blank(x.appointmentTime)) missing.push("appointmentTime");
  if (x.mobility === "unknown") missing.push("mobility");
  return missing;
}

export function missingDetailsMessage(missing: RequiredField[]): string {
  return `Please add the missing details before requesting the ride: ${missing.map((f) => REQUIRED_LABELS[f]).join(", ")}.`;
}
