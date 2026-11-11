import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Booking } from "./schemas";

export type NewBooking = Omit<Booking, "id" | "createdAt" | "status">;

let client: SupabaseClient | null = null;
const memory: Booking[] = [];

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
