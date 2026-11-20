import { z } from "zod";

/**
 * Dispatcher call workflow (AC35). Keeps the promises the rider sees:
 * - Booking: "a dispatcher will call to confirm" -> every pending request is on the "to call" list.
 * - Feedback: urgent (safety) -> call within 2 hours; high (1–2 stars or callback asked) -> within 24 hours.
 * Uses only the status values the database already allows (supabase/schema.sql).
 */
export const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"] as const;
export const FEEDBACK_STATUSES = ["open", "in_progress", "resolved"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "To call",
  confirmed: "Called & confirmed",
  completed: "Trip done",
  cancelled: "Cancelled",
};
export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: "To call back",
  in_progress: "Called back",
  resolved: "Resolved",
};

/** Hours the rider was promised a call within, by feedback priority. Normal feedback needs no call. */
export const CALLBACK_HOURS = { urgent: 2, high: 24 } as const;

export const statusUpdateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("booking"),
    id: z.string().uuid(),
    status: z.enum(BOOKING_STATUSES),
  }),
  z.object({
    kind: z.literal("feedback"),
    id: z.string().uuid(),
    status: z.enum(FEEDBACK_STATUSES),
  }),
]);
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;

/** When the promised callback is due, or null when no call is owed (normal priority or already called). */
export function feedbackCallDue(f: { priority: "normal" | "high" | "urgent"; status: string; createdAt: string }): number | null {
  if (f.status !== "open" || f.priority === "normal") return null;
  return Date.parse(f.createdAt) + CALLBACK_HOURS[f.priority] * 3_600_000;
}

export function isOverdue(due: number | null, now = Date.now()): boolean {
  return due !== null && now > due;
}

/** Counts for the "To call" bar at the top of the dispatcher board. */
export function callSummary(
  bookings: { status: string }[],
  feedback: {
    priority: "normal" | "high" | "urgent";
    status: string;
    createdAt: string;
  }[],
  now = Date.now(),
): { bookingsToCall: number; callbacksDue: number; overdue: number } {
  const dues = feedback.map(feedbackCallDue).filter((d): d is number => d !== null);
  return {
    bookingsToCall: bookings.filter((b) => b.status === "pending").length,
    callbacksDue: dues.length,
    overdue: dues.filter((d) => isOverdue(d, now)).length,
  };
}

/** "09171234567" -> "tel:+639171234567" so a staff phone can dial it in one tap. */
export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `tel:+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `tel:+${digits}`;
  return null;
}
