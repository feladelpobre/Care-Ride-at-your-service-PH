import { z } from "zod";
import { sanitizeText } from "./schemas";

/** Issue categories a customer can tick. "safety" makes the ticket urgent. */
export const ISSUE_TYPES = {
  late: "Late pickup or arrival",
  driver_conduct: "Driver behaviour",
  caregiver_conduct: "Caregiver behaviour",
  vehicle: "Vehicle not clean or not suitable",
  wheelchair_assist: "Wheelchair or stair help not given",
  billing: "Wrong price or discount",
  safety: "Safety concern",
  other: "Something else",
} as const;
export type IssueType = keyof typeof ISSUE_TYPES;

const rating = z.coerce.number().int().min(1, "Choose 1 to 5 stars.").max(5);
const optionalRating = z.union([rating, z.literal("").transform(() => null), z.null()]).optional().transform((v) => v ?? null);
const optionalText = (max: number) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(max))
    .optional()
    .transform((v) => (v ? v : null));

export const feedbackRequestSchema = z.object({
  reference: z
    .string({ required_error: "Enter your booking reference." })
    .transform((s) => s.trim().toUpperCase().replace(/\s/g, ""))
    .pipe(z.string().regex(/^CR-[0-9A-F]{8}$/, "The reference looks like CR-4ED3B086.")),
  contactPhone: z
    .string({ required_error: "Enter the mobile number used for the booking." })
    .transform((s) => s.replace(/[\s-]/g, "").replace(/^\+63/, "0"))
    .pipe(z.string().regex(/^09\d{9}$/, "Use the mobile number from your booking, like 0917 123 4567.")),
  ratingOverall: rating,
  ratingDriver: optionalRating,
  ratingCaregiver: optionalRating,
  onTime: z.enum(["yes", "no", "unsure"]).optional().transform((v) => (v === "yes" ? true : v === "no" ? false : null)),
  issueTypes: z.array(z.enum(Object.keys(ISSUE_TYPES) as [IssueType, ...IssueType[]])).max(8).default([]),
  /** From <input type="datetime-local"> (no timezone): treated as Philippine time (UTC+8). */
  incidentAt: z
    .string()
    .optional()
    .transform((v) => (v ? manilaLocalToIso(v) : null))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Enter a valid date and time."),
  driverName: optionalText(60),
  caregiverName: optionalText(60),
  details: optionalText(1000),
  wantsCallback: z.boolean().default(false),
});
/** "2026-11-12T07:40" (no offset) -> "2026-11-12T07:40+08:00"; strings that already carry Z/offset are kept. */
export function manilaLocalToIso(v: string): string {
  const t = v.trim();
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(t) ? t : `${t.length === 16 ? `${t}:00` : t}+08:00`;
}

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

/** Safety concerns are urgent; 1–2 star ratings or a callback request are high priority. */
export function feedbackPriority(f: Pick<FeedbackRequest, "issueTypes" | "ratingOverall" | "wantsCallback">): "normal" | "high" | "urgent" {
  if (f.issueTypes.includes("safety")) return "urgent";
  if (f.ratingOverall <= 2 || f.wantsCallback) return "high";
  return "normal";
}

/** "FB-" + first 8 hex characters of the feedback id. */
export function feedbackTicket(id: string): string {
  return `FB-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** CR-4ED3B086 -> uuid range covering ids that start with 4ed3b086. */
export function referenceToIdRange(reference: string): { from: string; to: string } {
  const hex = reference.slice(3).toLowerCase();
  return { from: `${hex}-0000-0000-0000-000000000000`, to: `${hex}-ffff-ffff-ffff-ffffffffffff` };
}

export type FeedbackRecord = {
  id: string;
  createdAt: string;
  bookingId: string;
  ratingOverall: number;
  ratingDriver: number | null;
  ratingCaregiver: number | null;
  onTime: boolean | null;
  issueTypes: IssueType[];
  incidentAt: string | null;
  driverName: string | null;
  caregiverName: string | null;
  details: string | null;
  wantsCallback: boolean;
  priority: "normal" | "high" | "urgent";
  status: string;
};

export function averageRating(items: { ratingOverall: number }[]): number | null {
  if (!items.length) return null;
  return Math.round((items.reduce((s, f) => s + f.ratingOverall, 0) / items.length) * 10) / 10;
}
