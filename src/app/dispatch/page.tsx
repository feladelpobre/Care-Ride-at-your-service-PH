import { listBookings, listEvents, maskName, storageMode } from "@/lib/storage";
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
    insights = computeInsights(await listEvents(30));
  } catch {
    insights = null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ube-950">Dispatcher board</h1>
        <p className="text-sm text-zinc-600">
          Latest 50 ride requests. Contact names are masked for privacy.
          {storageMode() === "memory" && " Demo storage: requests reset when the server restarts."}
        </p>
      </div>

      {insights && <InsightsPanel i={insights} />}

      {failed && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          Could not load bookings. Please refresh.
        </div>
      )}

      {!failed && bookings.length === 0 && <div className="card text-zinc-600">No ride requests yet.</div>}

      <ul className="space-y-4">
        {bookings.map((b) => (
          <li key={b.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-zinc-900">
                  {b.pickupTime ?? "TBC"} pickup · {b.destination ?? "Destination TBC"}
                </p>
                <p className="text-sm text-zinc-600">
                  {b.appointmentDate ?? "Date TBC"} · from {b.pickupArea ?? "area TBC"} · {b.distanceKm} km · contact{" "}
                  {maskName(b.contactName)}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-900">{b.status}</span>
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
