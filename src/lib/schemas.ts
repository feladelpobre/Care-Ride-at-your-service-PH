import { z } from "zod";

/** Allowed mobility levels (spec §3.1). */
export const MOBILITY = [
  "walks_with_assistance",
  "wheelchair_can_transfer",
  "wheelchair_must_stay_seated",
  "stretcher_bedbound",
  "unknown",
] as const;

/** Only one companion (family member) may ride along with the patient (spec AC27). */
export const MAX_RIDE_COMPANIONS = 1;

export const TRIP_PURPOSE = ["dialysis", "checkup", "therapy", "chemotherapy", "discharge", "other"] as const;

export const VEHICLE = ["sedan_assist", "wav_ramp_van", "not_supported"] as const;

/**
 * Schema given to the AI. It is deliberately loose (no numeric bounds) so it
 * works with OpenAI structured outputs; normalizeExtraction() applies the strict rules.
 */
export const aiExtractionSchema = z.object({
  pickupArea: z.string().nullable().describe("Barangay/city/area of pickup, or null"),
  destination: z.string().nullable().describe("Hospital or clinic name, or null"),
  appointmentDate: z.string().nullable().describe("YYYY-MM-DD, or null if unknown"),
  appointmentTime: z.string().nullable().describe("24h HH:mm, or null if unknown"),
  tripPurpose: z.enum(TRIP_PURPOSE),
  mobility: z.enum(MOBILITY),
  floorsWithoutElevator: z.number().describe("Floors the patient must be carried down; 0 if ground floor or elevator"),
  equipment: z.array(z.string()).describe("snake_case items e.g. oxygen_tank, walker, foldable_wheelchair"),
  companions: z.number().describe("Number of companions riding along, excluding patient (we allow at most 1)"),
  recurring: z.boolean(),
  recurrenceNote: z.string().nullable(),
  wantsHospitalCompanion: z
    .boolean()
    .describe("true if the caregiver asks for someone to stay with/assist the patient inside the hospital (e.g., 'walang makakasama', 'need someone to stay with her')"),
  emergencySignals: z.boolean().describe("true if any sign of acute illness or emergency"),
  missingInfo: z.array(z.string()).describe("Details the caregiver still needs to provide"),
  caregiverSummary: z.string().describe("1-2 sentence neutral summary without names or diagnoses"),
});
export type AiExtraction = z.infer<typeof aiExtractionSchema>;

const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
const ymd = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Phone GPS position for the pickup (AC29). Used only to calculate the distance:
 * rounded to 3 decimals (~110 m), never stored or logged (spec §7).
 */
const round3 = (n: number) => Math.round(n * 1000) / 1000;
export const gpsSchema = z.object({
  lat: z.number().min(-90).max(90).transform(round3),
  lng: z.number().min(-180).max(180).transform(round3),
});
export type Gps = z.infer<typeof gpsSchema>;

/** Strict, normalised extraction used by the rest of the app. */
export const tripExtractionSchema = z.object({
  pickupArea: z.string().max(120).nullable(),
  destination: z.string().max(120).nullable(),
  appointmentDate: z.string().regex(ymd).nullable(),
  appointmentTime: z.string().regex(hhmm).nullable(),
  tripPurpose: z.enum(TRIP_PURPOSE),
  mobility: z.enum(MOBILITY),
  floorsWithoutElevator: z.number().int().min(0).max(20),
  equipment: z.array(z.string().max(40)).max(5),
  companions: z.number().int().min(0).max(MAX_RIDE_COMPANIONS),
  recurring: z.boolean(),
  recurrenceNote: z.string().max(120).nullable(),
  wantsHospitalCompanion: z.boolean(),
  emergencySignals: z.boolean(),
  missingInfo: z.array(z.string().max(120)).max(8),
  caregiverSummary: z.string().max(280),
});
export type TripExtraction = z.infer<typeof tripExtractionSchema>;

export const assessmentSchema = z.object({
  vehicle: z.enum(VEHICLE),
  vehicleLabel: z.string(),
  crewSize: z.union([z.literal(1), z.literal(2)]),
  assistChecklist: z.array(z.string()),
  travelMinutes: z.number().int(),
  /** The rider's pick-up time when given, otherwise the suggested one (AC31). */
  pickupTime: z.string().regex(hhmm).nullable(),
  /** The latest safe pick-up time worked back from the appointment. */
  suggestedPickupTime: z.string().regex(hhmm).nullable(),
  /** Shown when the rider's pick-up time is later than the suggested one. */
  pickupWarning: z.string().nullable(),
  pickupBreakdown: z.array(z.string()),
  companionHours: z.number().int().min(0).max(12),
  quote: z.object({
    lines: z.array(z.object({ label: z.string(), amount: z.number() })),
    transportSubtotal: z.number(),
    companionSubtotal: z.number(),
    discount: z.number(),
    total: z.number(),
    min: z.number(),
    max: z.number(),
  }),
  fare: z.object({ min: z.number(), max: z.number() }),
  blocked: z.boolean(),
  blockReason: z.string().nullable(),
});
export type Assessment = z.infer<typeof assessmentSchema>;

export const tripOptionsSchema = z.object({
  /** Always calculated by the system from pickup + destination (spec §3.5); never typed by the caregiver. */
  distanceKm: z.coerce.number().min(0.5).max(150),
  distanceSource: z.enum(["estimated", "default"]),
  companionHours: z.coerce.number().int().min(0).max(12),
  wheelchairRental: z.boolean().default(false),
  seniorPwdDiscount: z.boolean().default(false),
  /** Phone GPS pickup position, only for the distance (AC29); null when typed. */
  pickupGps: gpsSchema.nullable().default(null),
  /** The rider's preferred pick-up time (AC31); null to use the suggested one. */
  requestedPickupTime: z.string().regex(hhmm).nullable().default(null),
});
export type TripOptionsInput = z.infer<typeof tripOptionsSchema>;

export const tripPlanSchema = z.object({
  extraction: tripExtractionSchema,
  assessment: assessmentSchema,
  driverBrief: z.array(z.string()),
  options: tripOptionsSchema,
  route: z.object({
    note: z.string(),
    pickupCity: z.string().nullable(),
    hospital: z.string().nullable(),
    nearestHospitals: z.array(z.object({ name: z.string(), km: z.number() })),
  }),
  emergency: z.literal(false),
  source: z.literal("ai"),
});
export type TripPlan = z.infer<typeof tripPlanSchema>;

/** Remove control characters (keep newlines and tabs). */
export function sanitizeText(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export const planRequestSchema = z.object({
  description: z
    .string({ required_error: "Please describe the trip." })
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(20, "Please add a bit more detail (at least 20 characters).")
        .max(1500, "That's too long. Please keep it under 1,500 characters."),
    ),
  /**
   * Step 1 required field: where the patient is picked up (overrides the AI's guess).
   * Optional at schema level so an emergency message is still caught first;
   * /api/plan requires it right after the emergency gate (AC21).
   */
  pickupLocation: z.string().transform(sanitizeText).pipe(z.string().max(120)).optional(),
  /**
   * Step 1 required field: the planned destination (hospital/clinic). Replaces the AI's guess
   * and drives the system distance calculation. Required by /api/plan after the emergency gate (AC25).
   */
  destination: z.string().transform(sanitizeText).pipe(z.string().max(120)).optional(),
  /** Step-1 fields filled in by the caregiver; they replace the AI's guesses (AC30). */
  mobility: z.enum(MOBILITY).optional(),
  appointmentDate: z.string().regex(ymd, "Please choose the appointment date.").optional(),
  appointmentTime: z.string().regex(hhmm, "Please choose the appointment time.").optional(),
  /** Preferred pick-up time (AC31). */
  pickupTime: z.string().regex(hhmm, "Please choose a valid pick-up time.").optional(),
  pickupGps: gpsSchema.optional(),
  companionHours: z.coerce.number().int().min(0).max(12).optional(),
  /** Tick boxes in step 1 */
  addons: z
    .object({
      wheelchair: z.boolean().default(false),
      companion: z.boolean().default(false),
      seniorPwd: z.boolean().default(false),
    })
    .default({}),
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

export const bookingRequestSchema = z.object({
  contactName: z.string().transform(sanitizeText).pipe(z.string().min(2, "Please enter a contact name.").max(60)),
  /** Required: used to verify and confirm every request (deters fake bookings). Stored as 09XXXXXXXXX. */
  contactPhone: z
    .string({ required_error: "Please enter a mobile number so we can confirm the ride." })
    .transform((s) => s.replace(/[\s-]/g, "").replace(/^\+63/, "0"))
    .pipe(
      z
        .string()
        .min(1, "Please enter a mobile number so we can confirm the ride.")
        .regex(/^09\d{9}$/, "Use a PH mobile number like 0917 123 4567."),
    ),
  /** Required: the booking confirmation and the 2-hour reminder are sent here (AC22). */
  contactEmail: z
    .string({ required_error: "Please enter an email address so we can send your booking reference." })
    .trim()
    .toLowerCase()
    .pipe(z.string().min(1, "Please enter an email address so we can send your booking reference.").max(254).email("Please enter a valid email address, like name@gmail.com.")),
  plan: tripPlanSchema,
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export type Booking = {
  id: string;
  createdAt: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  pickupArea: string | null;
  destination: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  pickupTime: string | null;
  distanceKm: number;
  companionHours: number;
  wheelchairRental: boolean;
  seniorPwdDiscount: boolean;
  tripPurpose: string;
  mobility: string;
  vehicleType: string;
  crewSize: number;
  fareMin: number;
  fareMax: number;
  driverBrief: string[];
  recurring: boolean;
  status: string;
};
