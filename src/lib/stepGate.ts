/**
 * Step 1 is filled in order (AC33): each part stays locked until the one before it is done,
 * so a rider can't skip "How the patient moves" and jump to caregiver hours or the times.
 */
export type Step1Fields = {
  description: string;
  pickupLocation: string;
  hasGps: boolean;
  /** The rider has tapped the GPS button (found, refused or failed). Typing the place opens only after that (AC37). */
  gpsTried?: boolean;
  destination: string;
  mobility: string;
  appointmentDate: string;
  appointmentTime: string;
};

export const STEP1_ORDER = [
  { key: "description", label: "the trip description (at least 20 characters)" },
  { key: "pickup", label: "the pickup location (tap the GPS button first)" },
  { key: "destination", label: "the destination" },
  { key: "mobility", label: "how the patient moves" },
  { key: "appointmentDate", label: "the appointment date" },
  { key: "appointmentTime", label: "the appointment time" },
] as const;

export type Step1Key = (typeof STEP1_ORDER)[number]["key"];

/** Which required parts are done, in order. */
export function step1Done(f: Step1Fields): Record<Step1Key, boolean> {
  return {
    description: f.description.trim().length >= 20,
    // GPS first (AC37): a typed place counts only after the GPS button was tried
    pickup: f.hasGps || (Boolean(f.gpsTried) && f.pickupLocation.trim().length >= 3),
    destination: f.destination.trim().length >= 3,
    mobility: f.mobility !== "unknown" && f.mobility !== "",
    appointmentDate: f.appointmentDate !== "",
    appointmentTime: f.appointmentTime !== "",
  };
}

/**
 * The first unfinished part (or null when all are done). Everything after it is locked,
 * even if it was filled in earlier and an earlier part was later cleared.
 */
export function firstUnfinished(f: Step1Fields): (typeof STEP1_ORDER)[number] | null {
  const done = step1Done(f);
  return STEP1_ORDER.find((s) => !done[s.key]) ?? null;
}

/** True when every part before `key` is done, i.e. `key` may be filled in now. */
export function isUnlocked(f: Step1Fields, key: Step1Key | "caregiver" | "pickupTime" | "addons" | "plan"): boolean {
  const done = step1Done(f);
  // Optional extras unlock with the part they follow
  const after: Record<string, Step1Key | null> = {
    description: null,
    pickup: "description",
    destination: "pickup",
    mobility: "destination",
    caregiver: "mobility",
    appointmentDate: "mobility",
    appointmentTime: "appointmentDate",
    pickupTime: "appointmentTime",
    addons: "appointmentTime",
    plan: "appointmentTime",
  };
  const gate = after[key];
  if (!gate) return true;
  const upTo = STEP1_ORDER.findIndex((s) => s.key === gate);
  return STEP1_ORDER.slice(0, upTo + 1).every((s) => done[s.key]);
}
