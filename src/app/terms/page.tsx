export const metadata = { title: "Terms of Service · Care Ride at your service-PH" };

export default function TermsPage() {
  return (
    <article className="card space-y-5 text-zinc-800 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ube-950 [&_li]:ml-5 [&_li]:list-disc">
      <header>
        <h1 className="text-2xl font-bold text-ube-950">Terms of Service</h1>
        <p className="text-sm text-zinc-500">Last updated 11 November 2026.</p>
      </header>

      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <strong>Student prototype.</strong> No real rides are dispatched and no payments are taken. Business registration (DTI/SEC,
        BIR, mayor&apos;s permit), LTFRB accreditation and the other licences below must be completed before launch.
      </p>

      <section>
        <h2>1. Non-emergency service only</h2>
        <p>
          Care Ride arranges <strong>non-emergency</strong> trips to and from hospitals, clinics and dialysis centres. It is not an
          ambulance service. In an emergency, call <a className="font-semibold underline" href="tel:911">911</a>. Patients who are
          bedridden, need a stretcher or need medical monitoring must use a DOH-licensed ambulance.
        </p>
      </section>

      <section>
        <h2>2. Vehicles, drivers and caregivers</h2>
        <ul>
          <li>Rides are provided only by vehicles with a valid LTFRB franchise (Certificate of Public Convenience), with passenger accident insurance and CTPL insurance.</li>
          <li>Vehicles are registered with the DOH as <strong>Patient Transport Vehicles</strong> and are never labelled &quot;ambulance&quot;.</li>
          <li>Drivers hold a professional driver&apos;s licence. Hospital companions are trained caregivers (TESDA NC II Caregiving standard) with NBI clearance. Companions give non-medical help only.</li>
        </ul>
      </section>

      <section>
        <h2>3. Prices, discounts and payment</h2>
        <ul>
          <li>Prices shown are <strong>estimates</strong> in Philippine pesos. The final fare is confirmed by phone before the trip.</li>
          <li>Senior Citizens (RA 9994) and persons with disability (RA 10754) get a <strong>20% discount on the ride fare</strong> on showing a valid OSCA or PWD ID.</li>
          <li>An official receipt is issued for every paid trip.</li>
        </ul>
      </section>

      <section>
        <h2>4. Your responsibilities</h2>
        <ul>
          <li>Give accurate information about the patient&apos;s mobility needs, stairs and equipment, so we send the right vehicle and crew.</li>
          <li>Tell us about changes or cancellations as early as possible.</li>
        </ul>
      </section>

      <section>
        <h2>5. Complaints and redress</h2>
        <p>
          If something goes wrong, contact us at support@careride-at-your-service.ph (placeholder). We acknowledge complaints within 24
          hours and aim to resolve them within 7 days. You may also seek help from the DTI (including its online dispute resolution
          for internet transactions under RA 11967) or the LTFRB.
        </p>
      </section>

      <section>
        <h2>6. Privacy</h2>
        <p>
          How we handle your data is explained in our <a className="font-semibold underline" href="/privacy">Privacy Notice</a>.
        </p>
      </section>
    </article>
  );
}
