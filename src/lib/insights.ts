/** Funnel metrics for the dispatcher Insights panel (PRD §5 success metrics). Pure and unit-tested. */
export type EventName = "trip_analyzed" | "booking_confirmed" | "emergency_redirect";
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

export function computeInsights(events: { name: EventName; props: EventProps }[]): Insights {
  const trips = events.filter((e) => e.name === "trip_analyzed").length;
  const bookings = events.filter((e) => e.name === "booking_confirmed");
  const conversionPct = pct(bookings.length, trips);
  return {
    tripsPlanned: trips,
    bookings: bookings.length,
    emergencies: events.filter((e) => e.name === "emergency_redirect").length,
    conversionPct,
    companionPct: pct(bookings.filter((b) => b.props.companion === true).length, bookings.length),
    wheelchairPct: pct(bookings.filter((b) => b.props.wheelchair === true).length, bookings.length),
    seniorPwdPct: pct(bookings.filter((b) => b.props.seniorPwd === true).length, bookings.length),
    meetsConversionTarget: conversionPct === null ? null : conversionPct >= CONVERSION_TARGET_PCT,
  };
}
