/** Funnel metrics for the dispatcher Insights panel (PRD §5 success metrics). Pure and unit-tested. */
export type EventName = "trip_analyzed" | "booking_confirmed" | "emergency_redirect" | "feedback_submitted";
export type EventProps = Record<string, string | number | boolean>;

export type Insights = {
  tripsPlanned: number;
  bookings: number;
  emergencies: number;
  conversionPct: number | null;
  companionPct: number | null;
  wheelchairPct: number | null;
  seniorPwdPct: number | null;
  meetsConversionTarget: boolean | null;
};

export const CONVERSION_TARGET_PCT = 40;

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Add-on flags of one saved ride request (no personal data). */
export type BookingFlags = { companion: boolean; wheelchair: boolean; seniorPwd: boolean };

/**
 * `savedBookings` (from the bookings table) is the source of truth for ride requests and
 * add-on rates, so the panel always matches the dispatcher board. Without it, falls back
 * to `booking_confirmed` events.
 */
export function computeInsights(events: { name: EventName; props: EventProps }[], savedBookings?: BookingFlags[]): Insights {
  const trips = events.filter((e) => e.name === "trip_analyzed").length;
  const bookings: BookingFlags[] =
    savedBookings ??
    events
      .filter((e) => e.name === "booking_confirmed")
      .map((e) => ({ companion: e.props.companion === true, wheelchair: e.props.wheelchair === true, seniorPwd: e.props.seniorPwd === true }));
  // Older requests can predate trip_analyzed logging; never report more than 100%.
  const rawConversion = pct(bookings.length, trips);
  const conversionPct = rawConversion === null ? null : Math.min(rawConversion, 100);
  return {
    tripsPlanned: trips,
    bookings: bookings.length,
    emergencies: events.filter((e) => e.name === "emergency_redirect").length,
    conversionPct,
    companionPct: pct(bookings.filter((b) => b.companion).length, bookings.length),
    wheelchairPct: pct(bookings.filter((b) => b.wheelchair).length, bookings.length),
    seniorPwdPct: pct(bookings.filter((b) => b.seniorPwd).length, bookings.length),
    meetsConversionTarget: conversionPct === null ? null : conversionPct >= CONVERSION_TARGET_PCT,
  };
}
