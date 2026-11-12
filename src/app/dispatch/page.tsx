import { listBookingFlags, listBookings, listEvents, listFeedback, maskName, maskPhone, storageMode } from "@/lib/storage";
import { averageRating, feedbackTicket, ISSUE_TYPES, type FeedbackRecord } from "@/lib/feedback";
import { bookingReference, formatManilaDateTime } from "@/lib/format";
import { computeInsights, CONVERSION_TARGET_PCT, type Insights } from "@/lib/insights";
import type { Booking } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { title: "Dispatcher board · Care Ride at your service-PH" };

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export default async function DispatchPage() {
  let bookings: Booking[] = [];
  let failed = false;
  let insights: Insights | null = null;
  try {
    bookings = await listBookings(50);
  } catch {
    failed = true;
  }
  try {
    const [events, savedBookings] = await Promise.all([listEvents(30), listBookingFlags(30)]);
    insights = computeInsights(events, savedBookings);
  } catch {
    insights = null;
  }
  let feedback: FeedbackRecord[] | null = null;
  try {
    feedback = await listFeedback(50);
  } catch {
    feedback = null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ube-950">Dispatcher board</h1>
        <p className="text-sm text-zinc-600">
          Latest 50 ride requests, newest first. Each shows its reference and the date and time it was requested (Manila time).
          Contact names are masked for privacy.
          {storageMode() === "memory" && " Demo storage: requests reset when the server restarts."}
        </p>
      </div>

      {insights && <InsightsPanel i={insights} />}

      {feedback && <FeedbackPanel items={feedback} />}

      {failed && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          Could not load bookings. Please refresh.
        </div>
      )}

      {!failed && bookings.length === 0 && <div className="card text-zinc-600">No ride requests yet.</div>}

      <ul className="space-y-4">
        {bookings.map((b) => (
          <li key={b.id} className="card">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-lg font-semibold text-zinc-900">
                  {b.pickupTime ?? "TBC"} pickup · {b.destination ?? "Destination TBC"}
                </p>
                <p className="text-sm text-zinc-600">
                  Appointment {b.appointmentDate ?? "date TBC"} · from {b.pickupArea ?? "area TBC"} · {b.distanceKm} km · contact{" "}
                  {maskName(b.contactName)}, {maskPhone(b.contactPhone)}
                </p>
              </div>
              <div className="lg:shrink-0 lg:text-right">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </span>
                <p className="mt-2 text-sm font-bold text-ube-900">{bookingReference(b.id)}</p>
                <p className="text-sm text-zinc-600">
                  Requested <time dateTime={b.createdAt}>{formatManilaDateTime(b.createdAt)}</time>
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-ube-100 px-3 py-1 font-medium text-ube-900">
                {b.vehicleType === "wav_ramp_van" ? "Wheelchair van" : "Assist sedan"}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1">Crew {b.crewSize}</span>
              {b.companionHours > 0 && <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-900">Hospital companion {b.companionHours} h</span>}
              {b.wheelchairRental && <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-900">Bring wheelchair</span>}
              {b.seniorPwdDiscount && <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">Senior/PWD: check ID</span>}
              {b.recurring && <span className="rounded-full bg-zinc-100 px-3 py-1">Recurring</span>}
              <span className="rounded-full bg-zinc-100 px-3 py-1">
                Est. {peso(b.fareMin)}–{peso(b.fareMax)}
              </span>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-ube-800">Driver brief</summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-zinc-700">
                {b.driverBrief.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightsPanel({ i }: { i: Insights }) {
  const show = (v: number | null) => (v === null ? "–" : `${v}%`);
  return (
    <section aria-labelledby="insights-title" className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="insights-title" className="text-xl font-bold text-ube-950">
          Insights, last 30 days
        </h2>
        <p className="text-sm text-zinc-600">Counts only, no personal data</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Trips planned" value={String(i.tripsPlanned)} />
        <Metric label="Ride requests sent" value={String(i.bookings)} />
        <Metric
          label="Plan to request"
          value={show(i.conversionPct)}
          note={
            i.meetsConversionTarget === null
              ? `Target ${CONVERSION_TARGET_PCT}%`
              : i.meetsConversionTarget
                ? `Meets ${CONVERSION_TARGET_PCT}% target`
                : `Below ${CONVERSION_TARGET_PCT}% target`
          }
          good={i.meetsConversionTarget}
        />
        <Metric label="Sent to 911" value={String(i.emergencies)} note="Emergency messages shown" />
      </dl>
      <p className="mt-4 text-[15px] text-zinc-700">
        Of the ride requests: {show(i.companionPct)} added a hospital companion, {show(i.wheelchairPct)} a wheelchair, and{" "}
        {show(i.seniorPwdPct)} used the Senior/PWD discount.
      </p>
    </section>
  );
}

function Metric({ label, value, note, good }: { label: string; value: string; note?: string; good?: boolean | null }) {
  return (
    <div className="rounded-2xl bg-ube-50 p-4">
      <dt className="text-sm font-bold text-ube-700">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums text-ube-950">{value}</dd>
      {note && (
        <dd className={`mt-1 text-sm font-bold ${good === true ? "text-green-800" : good === false ? "text-amber-800" : "text-zinc-600"}`}>{note}</dd>
      )}
    </div>
  );
}

const PRIORITY_STYLE: Record<FeedbackRecord["priority"], string> = {
  urgent: "bg-red-100 text-red-900",
  high: "bg-amber-100 text-amber-900",
  normal: "bg-zinc-100 text-zinc-800",
};

function FeedbackPanel({ items }: { items: FeedbackRecord[] }) {
  const avg = averageRating(items);
  const open = items.filter((f) => f.status !== "resolved");
  const order = { urgent: 0, high: 1, normal: 2 } as const;
  const sorted = [...items].sort((a, b) => order[a.priority] - order[b.priority] || b.createdAt.localeCompare(a.createdAt));
  return (
    <section aria-labelledby="fb-title" className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="fb-title" className="text-xl font-bold text-ube-950">
          Customer feedback
        </h2>
        <p className="text-[15px] font-bold text-ube-800">
          {avg === null ? "No ratings yet" : `Average ${avg} / 5 from ${items.length} review${items.length === 1 ? "" : "s"}`} · {open.length} open
        </p>
      </div>
      {sorted.length === 0 ? (
        <p className="mt-3 text-zinc-600">No feedback yet. Customers can rate a trip or report a problem at /feedback.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {sorted.slice(0, 20).map((f) => (
            <li key={f.id} className="rounded-2xl border-2 border-ube-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ube-950">
                    {"★".repeat(f.ratingOverall)}
                    <span className="text-zinc-300">{"★".repeat(5 - f.ratingOverall)}</span>
                    <span className="ml-2">{feedbackTicket(f.id)}</span>
                    <span className="ml-2 text-sm font-normal text-zinc-600">for {bookingReference(f.bookingId)}</span>
                  </p>
                  <p className="text-sm text-zinc-600">
                    Sent {formatManilaDateTime(f.createdAt)}
                    {f.incidentAt ? ` · Happened ${formatManilaDateTime(f.incidentAt)}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${PRIORITY_STYLE[f.priority]}`}>
                  {f.priority === "urgent" ? "Urgent" : f.priority === "high" ? "High" : "Normal"} · {f.status === "open" ? "Open" : f.status}
                </span>
              </div>
              {f.issueTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {f.issueTypes.map((t) => (
                    <span key={t} className="rounded-full bg-ube-50 px-3 py-1 text-xs font-bold text-ube-900">
                      {ISSUE_TYPES[t]}
                    </span>
                  ))}
                </div>
              )}
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-zinc-700 sm:grid-cols-2">
                {(f.driverName || f.ratingDriver) && (
                  <div>
                    <dt className="inline font-bold">Driver: </dt>
                    <dd className="inline">
                      {f.driverName ?? "name not given"}
                      {f.ratingDriver ? ` (${f.ratingDriver}/5)` : ""}
                    </dd>
                  </div>
                )}
                {(f.caregiverName || f.ratingCaregiver) && (
                  <div>
                    <dt className="inline font-bold">Caregiver: </dt>
                    <dd className="inline">
                      {f.caregiverName ?? "name not given"}
                      {f.ratingCaregiver ? ` (${f.ratingCaregiver}/5)` : ""}
                    </dd>
                  </div>
                )}
                {f.onTime !== null && (
                  <div>
                    <dt className="inline font-bold">On time: </dt>
                    <dd className="inline">{f.onTime ? "Yes" : "No"}</dd>
                  </div>
                )}
                {f.wantsCallback && (
                  <div>
                    <dt className="inline font-bold">Callback: </dt>
                    <dd className="inline">Requested</dd>
                  </div>
                )}
              </dl>
              {f.details && <p className="mt-2 whitespace-pre-line rounded-xl bg-zinc-50 p-3 text-[15px] text-zinc-800">{f.details}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
