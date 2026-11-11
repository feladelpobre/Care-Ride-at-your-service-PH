import { listBookings, maskName, storageMode } from "@/lib/storage";
import type { Booking } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dispatcher board · CareRide PH" };

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export default async function DispatchPage() {
  let bookings: Booking[] = [];
  let failed = false;
  try {
    bookings = await listBookings(50);
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-teal-950">Dispatcher board</h1>
        <p className="text-sm text-stone-600">
          Latest 50 ride requests. Contact names are masked for privacy.
          {storageMode() === "memory" && " Demo storage: requests reset when the server restarts."}
        </p>
      </div>

      {failed && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          Could not load bookings. Please refresh.
        </div>
      )}

      {!failed && bookings.length === 0 && <div className="card text-stone-600">No ride requests yet.</div>}

      <ul className="space-y-4">
        {bookings.map((b) => (
          <li key={b.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-stone-900">
                  {b.pickupTime ?? "TBC"} pickup · {b.destination ?? "Destination TBC"}
                </p>
                <p className="text-sm text-stone-600">
                  {b.appointmentDate ?? "Date TBC"} · from {b.pickupArea ?? "area TBC"} · {b.distanceKm} km · contact{" "}
                  {maskName(b.contactName)}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-900">{b.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-teal-100 px-3 py-1 font-medium text-teal-900">
                {b.vehicleType === "wav_ramp_van" ? "Wheelchair van" : "Assist sedan"}
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1">Crew {b.crewSize}</span>
              {b.companionHours > 0 && <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-900">Hospital companion {b.companionHours} h</span>}
              {b.recurring && <span className="rounded-full bg-stone-100 px-3 py-1">Recurring</span>}
              <span className="rounded-full bg-stone-100 px-3 py-1">
                Est. {peso(b.fareMin)}–{peso(b.fareMax)}
              </span>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-teal-800">Driver brief</summary>
              <ul className="mt-2 space-y-1 font-mono text-xs text-stone-700">
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
