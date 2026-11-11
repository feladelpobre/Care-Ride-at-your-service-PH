import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Booking } from "./schemas";
import type { EventName, EventProps } from "./insights";
import { referenceToIdRange, type FeedbackRecord, type FeedbackRequest } from "./feedback";

export type NewBooking = Omit<Booking, "id" | "createdAt" | "status">;

let client: SupabaseClient | null = null;
const memory: Booking[] = [];
const memoryFeedback: FeedbackRecord[] = [];
const memoryEvents: { name: EventName; props: EventProps; createdAt: number }[] = [];

export function storageMode(): "supabase" | "memory" {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "memory";
}

function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
      // Never let Next.js cache database reads: bookings change constantly
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
  }
  return client;
}

type Row = {
  id: string;
  created_at: string;
  contact_name: string;
  contact_phone: string | null;
  pickup_area: string | null;
  destination: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  pickup_time: string | null;
  distance_km: number;
  companion_hours: number;
  wheelchair_rental: boolean;
  senior_pwd_discount: boolean;
  trip_purpose: string;
  mobility: string;
  vehicle_type: string;
  crew_size: number;
  fare_min: number;
  fare_max: number;
  driver_brief: string[];
  recurring: boolean;
  status: string;
};

const fromRow = (r: Row): Booking => ({
  id: r.id,
  createdAt: r.created_at,
  contactName: r.contact_name,
  contactPhone: r.contact_phone,
  pickupArea: r.pickup_area,
  destination: r.destination,
  appointmentDate: r.appointment_date,
  appointmentTime: r.appointment_time,
  pickupTime: r.pickup_time,
  distanceKm: Number(r.distance_km),
  companionHours: r.companion_hours,
  wheelchairRental: r.wheelchair_rental,
  seniorPwdDiscount: r.senior_pwd_discount,
  tripPurpose: r.trip_purpose,
  mobility: r.mobility,
  vehicleType: r.vehicle_type,
  crewSize: r.crew_size,
  fareMin: r.fare_min,
  fareMax: r.fare_max,
  driverBrief: r.driver_brief,
  recurring: r.recurring,
  status: r.status,
});

export async function saveBooking(b: NewBooking): Promise<Booking> {
  if (storageMode() === "memory") {
    const booking: Booking = { ...b, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "pending" };
    memory.unshift(booking);
    memory.splice(50);
    return booking;
  }
  const { data, error } = await db()
    .from("bookings")
    .insert({
      contact_name: b.contactName,
      contact_phone: b.contactPhone,
      pickup_area: b.pickupArea,
      destination: b.destination,
      appointment_date: b.appointmentDate,
      appointment_time: b.appointmentTime,
      pickup_time: b.pickupTime,
      distance_km: b.distanceKm,
      companion_hours: b.companionHours,
      wheelchair_rental: b.wheelchairRental,
      senior_pwd_discount: b.seniorPwdDiscount,
      trip_purpose: b.tripPurpose,
      mobility: b.mobility,
      vehicle_type: b.vehicleType,
      crew_size: b.crewSize,
      fare_min: b.fareMin,
      fare_max: b.fareMax,
      driver_brief: b.driverBrief,
      recurring: b.recurring,
    })
    .select()
    .single();
  if (error) throw new Error(`storage insert failed: ${error.code ?? "unknown"}`);
  return fromRow(data as Row);
}

/** Anti-fraud: how many requests this mobile number made in the last `hours` hours. */
export async function countRecentBookingsByPhone(phone: string, hours = 24): Promise<number> {
  noStore();
  const since = Date.now() - hours * 3_600_000;
  if (storageMode() === "memory") {
    return memory.filter((b) => b.contactPhone === phone && Date.parse(b.createdAt) >= since).length;
  }
  const { count, error } = await db()
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("contact_phone", phone)
    .gte("created_at", new Date(since).toISOString());
  if (error) throw new Error(`storage count failed: ${error.code ?? "unknown"}`);
  return count ?? 0;
}

/** "09171234567" -> "0917 *** 4567" for screens that don't need the full number. */
export function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 8) return "not given";
  return `${phone.slice(0, 4)} *** ${phone.slice(-4)}`;
}

export async function listBookings(limit = 50): Promise<Booking[]> {
  noStore();
  if (storageMode() === "memory") return memory.slice(0, limit);
  const { data, error } = await db().from("bookings").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`storage list failed: ${error.code ?? "unknown"}`);
  return (data as Row[]).map(fromRow);
}

/** "Liza Santos" -> "L*** S***" (spec §7 privacy masking). */
export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => `${p[0].toUpperCase()}***`)
    .join(" ");
}

/**
 * Records a funnel event. Never throws: analytics must not break a booking.
 * Props must contain only non-personal flags.
 */
export async function recordEvent(name: EventName, props: EventProps = {}): Promise<void> {
  try {
    if (storageMode() === "memory") {
      memoryEvents.push({ name, props, createdAt: Date.now() });
      if (memoryEvents.length > 5000) memoryEvents.splice(0, 1000);
      return;
    }
    const { error } = await db().from("app_events").insert({ name, props });
    if (error) console.error("events: insert failed", error.code ?? "unknown");
  } catch {
    console.error("events: insert threw");
  }
}

/** Events from the last `days` days (default 30). */
export async function listEvents(days = 30): Promise<{ name: EventName; props: EventProps }[]> {
  noStore();
  const since = Date.now() - days * 86_400_000;
  if (storageMode() === "memory") return memoryEvents.filter((e) => e.createdAt >= since);
  const { data, error } = await db()
    .from("app_events")
    .select("name, props")
    .gte("created_at", new Date(since).toISOString())
    .limit(10000);
  if (error) throw new Error(`events list failed: ${error.code ?? "unknown"}`);
  return data as { name: EventName; props: EventProps }[];
}

/** Finds a booking by its CR- reference AND the mobile number used (both must match). */
export async function findBookingForFeedback(reference: string, phone: string): Promise<Booking | null> {
  noStore();
  const { from, to } = referenceToIdRange(reference);
  if (storageMode() === "memory") {
    return memory.find((b) => b.id >= from && b.id <= to && b.contactPhone === phone) ?? null;
  }
  const { data, error } = await db()
    .from("bookings")
    .select("*")
    .gte("id", from)
    .lte("id", to)
    .eq("contact_phone", phone)
    .limit(1);
  if (error) throw new Error(`storage lookup failed: ${error.code ?? "unknown"}`);
  return data && data.length ? fromRow(data[0] as Row) : null;
}

export async function countFeedbackForBooking(bookingId: string): Promise<number> {
  noStore();
  if (storageMode() === "memory") return memoryFeedback.filter((f) => f.bookingId === bookingId).length;
  const { count, error } = await db().from("feedback").select("id", { count: "exact", head: true }).eq("booking_id", bookingId);
  if (error) throw new Error(`storage count failed: ${error.code ?? "unknown"}`);
  return count ?? 0;
}

type FeedbackRow = {
  id: string;
  created_at: string;
  booking_id: string;
  rating_overall: number;
  rating_driver: number | null;
  rating_caregiver: number | null;
  on_time: boolean | null;
  issue_types: FeedbackRecord["issueTypes"];
  incident_at: string | null;
  driver_name: string | null;
  caregiver_name: string | null;
  details: string | null;
  wants_callback: boolean;
  priority: FeedbackRecord["priority"];
  status: string;
};

const fromFeedbackRow = (r: FeedbackRow): FeedbackRecord => ({
  id: r.id,
  createdAt: r.created_at,
  bookingId: r.booking_id,
  ratingOverall: r.rating_overall,
  ratingDriver: r.rating_driver,
  ratingCaregiver: r.rating_caregiver,
  onTime: r.on_time,
  issueTypes: r.issue_types ?? [],
  incidentAt: r.incident_at,
  driverName: r.driver_name,
  caregiverName: r.caregiver_name,
  details: r.details,
  wantsCallback: r.wants_callback,
  priority: r.priority,
  status: r.status,
});

export async function saveFeedback(
  bookingId: string,
  f: Omit<FeedbackRequest, "reference" | "contactPhone">,
  priority: FeedbackRecord["priority"],
): Promise<FeedbackRecord> {
  const incidentAt = f.incidentAt ? new Date(f.incidentAt).toISOString() : null;
  if (storageMode() === "memory") {
    const rec: FeedbackRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      bookingId,
      ratingOverall: f.ratingOverall,
      ratingDriver: f.ratingDriver,
      ratingCaregiver: f.ratingCaregiver,
      onTime: f.onTime,
      issueTypes: f.issueTypes,
      incidentAt,
      driverName: f.driverName,
      caregiverName: f.caregiverName,
      details: f.details,
      wantsCallback: f.wantsCallback,
      priority,
      status: "open",
    };
    memoryFeedback.unshift(rec);
    return rec;
  }
  const { data, error } = await db()
    .from("feedback")
    .insert({
      booking_id: bookingId,
      rating_overall: f.ratingOverall,
      rating_driver: f.ratingDriver,
      rating_caregiver: f.ratingCaregiver,
      on_time: f.onTime,
      issue_types: f.issueTypes,
      incident_at: incidentAt,
      driver_name: f.driverName,
      caregiver_name: f.caregiverName,
      details: f.details,
      wants_callback: f.wantsCallback,
      priority,
    })
    .select()
    .single();
  if (error) throw new Error(`feedback insert failed: ${error.code ?? "unknown"}`);
  return fromFeedbackRow(data as FeedbackRow);
}

export async function listFeedback(limit = 50): Promise<FeedbackRecord[]> {
  noStore();
  if (storageMode() === "memory") return memoryFeedback.slice(0, limit);
  const { data, error } = await db().from("feedback").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`feedback list failed: ${error.code ?? "unknown"}`);
  return (data as FeedbackRow[]).map(fromFeedbackRow);
}
