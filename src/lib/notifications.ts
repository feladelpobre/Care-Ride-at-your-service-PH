import type { Booking } from "./schemas";
import { bookingReference } from "./format";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://care-ride-at-your-service-ph.vercel.app";
const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function tripLines(b: Booking): string[] {
  return [
    `Reference: ${bookingReference(b.id)}`,
    `Pickup: ${b.pickupTime ?? "to be confirmed"} on ${b.appointmentDate ?? "date to be confirmed"} · ${b.pickupArea ?? "-"}`,
    `Going to: ${b.destination ?? "-"} (appointment ${b.appointmentTime ?? "-"})`,
    `Vehicle: ${b.vehicleType === "wav_ramp_van" ? "Wheelchair van" : "Assist sedan"} · crew of ${b.crewSize}`,
    `Estimated price: ${peso(b.fareMin)}–${peso(b.fareMax)} (pay the driver; no online payment)`,
  ];
}

function html(title: string, intro: string, lines: string[], outro: string): string {
  return `<div style="font-family:Arial,sans-serif;font-size:16px;color:#2A2146;max-width:560px">
<h2 style="color:#5B3E96">${esc(title)}</h2><p>${esc(intro)}</p>
<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p>${esc(outro)}</p>
<p style="color:#b91c1c"><strong>In an emergency, call 911.</strong> Care Ride is for non-emergency trips only.</p>
<p style="color:#71717a;font-size:13px">Care Ride at your service-PH · ${esc(SITE)}</p></div>`;
}

/** Sent right after a ride request is saved (AC22). */
export function confirmationEmail(b: Booking) {
  const ref = bookingReference(b.id);
  const intro = `Hi ${b.contactName}, we received your ride request. A dispatcher will call ${b.contactPhone ?? "you"} to confirm before any van is sent.`;
  const outro = `After the trip, you can rate the service at ${SITE}/feedback?ref=${ref}.`;
  const lines = tripLines(b);
  return {
    subject: `Ride request received · ${ref}`,
    text: [intro, "", ...lines, "", outro, "", "In an emergency, call 911."].join("\n"),
    html: html("Ride request received", intro, lines, outro),
  };
}

/** Sent about 2 hours before pickup (AC23). */
export function reminderEmail(b: Booking) {
  const ref = bookingReference(b.id);
  const intro = `Hi ${b.contactName}, this is a reminder: your Care Ride pickup is in about 2 hours, at ${b.pickupTime}.`;
  const outro = "Please have the patient ready, plus the Senior Citizen or PWD ID if a discount applies. To change or cancel, reply to this email.";
  const lines = tripLines(b);
  return {
    subject: `Pickup reminder ${b.pickupTime} today · ${ref}`,
    text: [intro, "", ...lines, "", outro, "", "In an emergency, call 911."].join("\n"),
    html: html("Your pickup is in about 2 hours", intro, lines, outro),
  };
}

/** "maria.delacruz@gmail.com" -> "ma***@gmail.com" for the dispatcher board. */
export function maskEmail(email: string | null): string {
  if (!email) return "no email";
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

/** Manila pickup instant (UTC+8, no DST) for a booking, or null if date/time are missing. */
export function pickupInstant(b: Pick<Booking, "appointmentDate" | "pickupTime">): number | null {
  if (!b.appointmentDate || !b.pickupTime) return null;
  const t = Date.parse(`${b.appointmentDate}T${b.pickupTime}:00+08:00`);
  return Number.isNaN(t) ? null : t;
}

/**
 * Reminder rule (AC23): send once when pickup is between now and 2 h from now.
 * Pickups already in the past are skipped.
 */
export function isReminderDue(b: Pick<Booking, "appointmentDate" | "pickupTime">, now = Date.now()): boolean {
  const at = pickupInstant(b);
  return at !== null && at > now && at - now <= 2 * 3_600_000;
}
