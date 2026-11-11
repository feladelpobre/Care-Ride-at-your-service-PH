export const metadata = { title: "Privacy Notice · Care Ride at your service-PH" };

export default function PrivacyPage() {
  return (
    <article className="card space-y-5 text-zinc-800 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ube-950 [&_li]:ml-5 [&_li]:list-disc">
      <header>
        <h1 className="text-2xl font-bold text-ube-950">Privacy Notice</h1>
        <p className="text-sm text-zinc-500">
          Based on the Data Privacy Act of 2012 (RA 10173) and its Implementing Rules. Last updated 11 November 2026.
        </p>
      </header>

      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Care Ride at your service-PH is currently a <strong>student prototype</strong>. Please use demo details only. Before
        real bookings are accepted, the operator will register with the National Privacy Commission (NPC) where required and
        appoint a Data Protection Officer.
      </p>

      <section>
        <h2>1. Who we are</h2>
        <p>
          Care Ride at your service-PH (&quot;Care Ride&quot;, &quot;we&quot;) is the personal information controller for
          ride requests made on this website. Data Protection Officer: <em>to be appointed before launch</em> (contact:
          privacy@careride-at-your-service.ph, placeholder).
        </p>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <ul>
          <li>
            Your name and <strong>mobile number</strong> (required). We use the number only to confirm each request by phone before a
            van is sent, and to prevent fake bookings. Dispatch screens show it partly hidden (e.g. 0917 *** 4567).
          </li>
          <li>Pickup <strong>area</strong> (barangay/city), hospital, appointment date and time. We do not ask for a full home address.</li>
          <li>
            The patient&apos;s <strong>mobility needs</strong> (for example: uses a wheelchair, number of stairs, oxygen tank).
            This is health information, which the law treats as <strong>sensitive personal information</strong>.
          </li>
          <li>Whether the patient is a Senior Citizen or PWD (to apply the legal 20% fare discount). We do not store ID numbers.</li>
          <li>
            If you send feedback: your ratings, what went wrong, when it happened, the names of the driver or caregiver, and your
            comments. We use this only to follow up and improve the service.
          </li>
          <li>Anonymous usage statistics (Vercel Analytics: page views and button events, no cookies).</li>
        </ul>
        <p>We do <strong>not</strong> need, and ask you not to give, names of the patient, diagnoses or medical records.</p>
      </section>

      <section>
        <h2>3. Why we use it (purpose and legal basis)</h2>
        <ul>
          <li>To plan, price and carry out the ride you request, and to send the right vehicle, crew and caregiver (your consent and our contract with you).</li>
          <li>To apply discounts required by law (RA 9994, RA 10754) and keep records the law requires.</li>
          <li>To improve safety and service quality using anonymous statistics.</li>
        </ul>
        <p>Sensitive personal information is processed only with your consent, which you give by ticking the box before confirming. You may withdraw consent at any time.</p>
      </section>

      <section>
        <h2>4. Use of AI</h2>
        <p>
          Your trip description is sent to an AI model (OpenAI&apos;s gpt-4o-mini, via OpenRouter) only to turn it into a ride plan.
          Automated rules then pick the vehicle, crew, pickup time and price, and <strong>a person confirms every booking</strong>.
          You can edit everything the AI filled in before you confirm.
        </p>
      </section>

      <section>
        <h2>5. Who we share it with</h2>
        <ul>
          <li>The assigned driver, crew and hospital companion, and only the details they need for the trip.</li>
          <li>
            Service providers that process data for us under contract: Vercel (hosting), Supabase (database, Singapore region) and
            OpenRouter/OpenAI (AI processing). Some of these process data outside the Philippines; we require them to protect it.
          </li>
          <li>Government authorities when the law requires it.</li>
        </ul>
        <p>We never sell your data.</p>
      </section>

      <section>
        <h2>6. How long we keep it</h2>
        <p>
          Trip details are kept only as long as needed to complete the ride and handle any complaint, then deleted or anonymised,
          except records we must keep longer by law (for example, official receipts and tax records).
        </p>
      </section>

      <section>
        <h2>7. How we protect it</h2>
        <ul>
          <li>Encrypted connections (HTTPS); the database can only be read by our server (row-level security).</li>
          <li>Contact names are masked on the dispatcher screen; staff see only what they need.</li>
          <li>Any personal data breach will be reported to the NPC and affected persons within 72 hours, as the law requires.</li>
        </ul>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p>
          Under the Data Privacy Act you have the right to be informed, to access, to correct, to erase or block, to object, to data
          portability, to file a complaint, and to damages. To use these rights, contact our Data Protection Officer. You may also
          complain to the National Privacy Commission (privacy.gov.ph).
        </p>
      </section>
    </article>
  );
}
