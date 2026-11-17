import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Code2, Cpu, FileText, ShieldCheck, Smartphone } from "lucide-react";
import { buildPlan } from "@/lib/plan";
import {
  COMPLIANCE,
  DEVICES,
  HASHTAGS,
  PRD_FEATURES,
  REPO,
  SAMPLE_OPTIONS,
  SAMPLE_TRIP,
  UAT,
  VALIDATION,
  doc,
} from "@/lib/caseFile";
import qr from "../../../docs/assets/care-ride-qr.png";

export const metadata: Metadata = {
  title: "Case File · Care Ride at your service-PH",
  description:
    "How Care Ride was validated, specified, built, tested on real phones and shipped: evidence, PRD, safety architecture, a worked fare, live-test fixes and compliance.",
  openGraph: {
    title: "Care Ride at your service-PH: Case File",
    description: "Wheelchair-safe rides to the hospital, planned in one message. The full story from problem to production.",
  },
};

const peso = (n: number) => (n < 0 ? `−₱${Math.abs(n).toLocaleString("en-PH")}` : `₱${n.toLocaleString("en-PH")}`);

const SECTIONS = [
  ["tuesday", "Ate Liza's Tuesday"],
  ["validation", "Validation"],
  ["live-tests", "Live tests"],
  ["prd", "PRD"],
  ["safety", "Architecture"],
  ["fare", "Worked fare"],
  ["compliance", "Compliance"],
  ["quality", "Quality"],
  ["launch", "Launch"],
  ["grading", "Grading"],
] as const;

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-4" aria-labelledby={`${id}-title`}>
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-mango-700">{kicker}</p>
        <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight text-ube-950 sm:text-3xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** Public, crawlable Case File (AC32): not behind the "I am human" check. */
export default function CaseFilePage() {
  const fare = buildPlan(SAMPLE_TRIP, SAMPLE_OPTIONS);
  const a = fare.assessment;

  return (
    <article className="space-y-14">
      {/* Cover */}
      <header className="space-y-5">
        <p className="text-sm font-bold uppercase tracking-wider text-mango-700">Case File · Week 4 Graded Mini Project 4.2</p>
        <h1 className="text-[2.1rem] font-bold leading-[1.12] tracking-tight text-ube-950 sm:text-5xl">
          From a 9:00 dialysis slot to a van that fits.
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-zinc-700">
          Care Ride at your service-PH plans wheelchair-safe rides to the hospital from one plain-language message. This page is the
          whole story: the evidence, the requirements, how safety is engineered, a worked fare, what broke during live testing and
          how it was fixed. By Feladel &quot;Peng&quot; Pobre.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">
            Open the app
          </Link>
          <a href={REPO} className="btn-ghost inline-flex items-center gap-2">
            <Code2 aria-hidden size={18} /> GitHub
          </a>
          <a href={doc("README.md")} className="btn-ghost inline-flex items-center gap-2">
            <FileText aria-hidden size={18} /> README
          </a>
        </div>
        <nav aria-label="On this page" className="flex flex-wrap gap-2 pt-2">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full bg-ube-50 px-3 py-1.5 text-sm font-bold text-ube-800 hover:bg-ube-100">
              {label}
            </a>
          ))}
        </nav>
      </header>

      {/* 1. Story */}
      <Section id="tuesday" kicker="01 · The problem, lived" title="Ate Liza's Tuesday">
        <div className="card space-y-3 text-[17px] leading-relaxed text-zinc-800">
          <p>
            6:30 a.m., Kapitolyo, Pasig. Mama has dialysis at 9:00 in BGC. She uses a wheelchair, can&apos;t stand, needs her oxygen
            tank, and they live on the 3rd floor with no elevator.
          </p>
          <p>
            Ate Liza calls one van service: no answer. The second can come, but sends a sedan and one driver, who can&apos;t carry
            Mama down three flights. She explains the stairs, the tank and the wheelchair again, on every call, every week.
          </p>
          <p className="font-bold text-ube-900">
            With Care Ride she types it once, the way she&apos;d text a sibling. The app plans a ramp van, two crew for the stairs, a
            pick-up time that still makes the 9:00 slot, and the price before she confirms.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat value="82.3%" label="of 413 PGH wheelchair patients name accessibility as their top barrier" />
          <Stat value="2–3×" label="dialysis trips a week, for life" />
          <Stat value="₱700" label="what families already pay for one accessible trip" />
        </div>
      </Section>

      {/* 2. Validation */}
      <Section id="validation" kicker="02 · Idea validation" title="Seven steps, each with evidence">
        <ol className="grid gap-3 sm:grid-cols-2">
          {VALIDATION.map((v) => (
            <li key={v.step} className="card flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ube-700 font-bold text-white">{v.step}</span>
              <div>
                <p className="font-bold text-ube-950">{v.title}</p>
                <p className="text-sm text-zinc-700">{v.finding}</p>
                <p className="mt-1 text-xs text-zinc-500">{v.source}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm">
          Full report with sources: <a className="font-bold text-ube-800 underline" href={doc("docs/01-idea-validation.md")}>docs/01-idea-validation.md</a>
        </p>
      </Section>

      {/* 3. Live tests */}
      <Section id="live-tests" kicker="03 · User acceptance testing, Nov 12–17" title="What broke on real phones, and what changed">
        <ol className="grid gap-3 sm:grid-cols-2">
          {UAT.map((u) => (
            <li key={u.found} className="card space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-mango-700">{u.date}</p>
              <p className="text-sm text-zinc-700">
                <span className="font-bold text-ube-950">Found: </span>
                {u.found}
              </p>
              <p className="flex items-start gap-1.5 text-sm text-zinc-800">
                <CheckCircle2 aria-hidden size={16} className="mt-0.5 shrink-0 text-ube-700" />
                <span>
                  <span className="font-bold text-ube-950">Fixed: </span>
                  {u.fix}
                </span>
              </p>
            </li>
          ))}
        </ol>
        <div className="grid gap-3 sm:grid-cols-3">
          {DEVICES.map((d) => (
            <div key={d.device} className="card flex items-start gap-3">
              <Smartphone aria-hidden className="mt-0.5 shrink-0 text-ube-700" size={22} />
              <div>
                <p className="font-bold text-ube-950">
                  {d.device} · {d.platform}
                </p>
                <p className="text-sm text-zinc-700">{d.browser}</p>
                <p className="text-sm font-bold text-ube-800">Passed</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. PRD */}
      <Section id="prd" kicker="04 · Product requirements" title="Six components, every feature testable">
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniCard title="Problem" text="No simple way to book a ride matched to the patient's mobility needs." />
          <MiniCard title="Users" text="Caregiver-coordinators (primary); van dispatchers and drivers (secondary)." />
          <MiniCard title="Out of scope" text="Payments, live tracking, booking the hospital appointment, emergency transport." />
        </div>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-ube-100">
          <table className="w-full bg-white text-left text-sm">
            <thead className="bg-ube-50 text-ube-900">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Core feature</th>
                <th className="p-3">Acceptance criteria (each with tests)</th>
              </tr>
            </thead>
            <tbody>
              {PRD_FEATURES.map((f) => (
                <tr key={f.id} className="border-t border-ube-100">
                  <td className="p-3 font-bold text-ube-900">{f.id}</td>
                  <td className="p-3 text-zinc-800">{f.feature}</td>
                  <td className="p-3 font-mono text-xs text-zinc-700">{f.ac}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniCard title="Success metrics" text="≥ 9/10 AI extraction accuracy (achieved 10/10) · ≥ 40% plan-to-request conversion · ≥ 4.5/5 rating · booking in under 2 minutes." />
          <MiniCard title="Open questions" text="Which operators accept third-party bookings · weekly dialysis auto-booking · fee model · LTFRB franchise or TNC route." />
        </div>
        <p className="text-sm">
          One-page PRD: <a className="font-bold text-ube-800 underline" href={doc("docs/02-PRD.md")}>docs/02-PRD.md</a> · Spec with AC1–AC32:{" "}
          <a className="font-bold text-ube-800 underline" href={doc("spec.md")}>spec.md</a>
        </p>
      </Section>

      {/* 5. Architecture */}
      <Section id="safety" kicker="05 · Architecture" title="The AI understands; the rules decide">
        <ol className="grid gap-2 sm:grid-cols-6" aria-label="Request flow">
          {[
            ["Human check", "Cloudflare Turnstile, confirmed on the server", ShieldCheck],
            ["Emergency gate", "Red-flag words → Call 911, before any AI call", AlertTriangle],
            ["AI extraction", "Vercel AI SDK + OpenAI, zod-validated JSON", Cpu],
            ["Rider's fields win", "Step-1 inputs replace the AI's guesses", CheckCircle2],
            ["Rules engine", "Vehicle, crew, pick-up time, distance, price: deterministic and tested", CheckCircle2],
            ["Server recompute", "Every booking is re-priced on the server", ShieldCheck],
          ].map(([t, d, Icon], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <li key={t as string} className="card relative space-y-1 p-4">
                <span className="text-xs font-bold text-mango-700">{String(i + 1).padStart(2, "0")}</span>
                <I aria-hidden size={20} className="text-ube-700" />
                <p className="font-bold leading-tight text-ube-950">{t as string}</p>
                <p className="text-xs text-zinc-600">{d as string}</p>
              </li>
            );
          })}
        </ol>
        <p className="max-w-3xl text-zinc-700">
          An AI answer can vary between calls, so it never decides anything safety-critical. It turns Taglish into structured fields;
          unit-tested functions make every decision. As a QA Manager, I treat this as process control: a variable step followed by a
          verified, repeatable one. Details: <a className="font-bold text-ube-800 underline" href={doc("docs/architecture.md")}>docs/architecture.md</a>
        </p>
      </Section>

      {/* 6. Worked fare */}
      <Section id="fare" kicker="06 · Worked example, computed live by the app's own rules" title="Ate Liza's fare, line by line">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="card space-y-2 text-sm text-zinc-700">
            <p className="font-bold text-ube-950">The trip</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Kapitolyo, Pasig → St. Luke&apos;s BGC · {fare.options.distanceKm} km (system-calculated)</li>
              <li>Wheelchair, must stay seated · oxygen tank · 3rd floor, no elevator</li>
              <li>Dialysis at 09:00 · caregiver stays {a.companionHours} hours · Senior Citizen</li>
            </ul>
            <p className="pt-2 font-bold text-ube-950">What the rules decided</p>
            <ul className="list-inside list-disc space-y-1">
              <li>{a.vehicleLabel}</li>
              <li>Crew of {a.crewSize}, including stair assist</li>
              <li>
                Pick-up {a.pickupTime} ({a.travelMinutes} min travel, 30 min early for dialysis check-in)
              </li>
            </ul>
          </div>
          <table className="card w-full text-sm">
            <tbody>
              {a.quote.lines.map((l) => (
                <tr key={l.label} className="border-b border-zinc-100">
                  <td className="py-2 pr-3 text-zinc-700">{l.label}</td>
                  <td className="py-2 text-right tabular-nums">{peso(l.amount)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-bold">Estimated total</td>
                <td className="pt-3 text-right text-xl font-bold tabular-nums text-ube-900">{peso(a.quote.total)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="pt-1 text-right text-xs text-zinc-500">
                  Traffic range {peso(a.quote.min)}–{peso(a.quote.max)} · the 20% discount applies to the ride fare only · no payment taken
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* 7. Compliance */}
      <Section id="compliance" kicker="07 · Philippine regulations" title="Compliance built into the product">
        <div className="grid gap-3 sm:grid-cols-2">
          {COMPLIANCE.map((c) => (
            <div key={c.law} className="card">
              <p className="font-mono text-sm font-bold text-mango-700">{c.law}</p>
              <p className="font-bold text-ube-950">{c.what}</p>
              <p className="text-sm text-zinc-700">{c.how}</p>
            </div>
          ))}
        </div>
        <p className="text-sm">
          Full plan: <a className="font-bold text-ube-800 underline" href={doc("docs/03-regulatory-compliance.md")}>docs/03-regulatory-compliance.md</a>
        </p>
      </Section>

      {/* 8. Quality */}
      <Section id="quality" kicker="08 · Engineering quality" title="Every change goes through the same gate">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat value="130+" label="automated tests, each tied to an acceptance criterion" />
          <Stat value="10/10" label="AI golden-set accuracy on the live app" />
          <Stat value="70+" label="meaningful commits on GitHub" />
          <Stat value="0" label="secrets in the code (gitleaks scans every push)" />
        </div>
        <p className="card text-sm text-zinc-700">
          <strong className="text-ube-950">GitHub Actions on every push:</strong> secret scan → lint → typecheck → tests → build → Vercel
          deploys from <code>main</code>. Monitoring: Vercel Analytics, a funnel Insights panel and <code>/api/health</code>.{" "}
          <a className="font-bold text-ube-800 underline" href={`${REPO}/actions`}>See the CI runs</a>
        </p>
      </Section>

      {/* 9. Launch */}
      <Section id="launch" kicker="09 · Go to market" title="How riders will find Care Ride">
        <div className="card flex flex-col items-center gap-5 sm:flex-row">
          <Image src={qr} alt="QR code that opens the Care Ride app" width={150} height={150} className="rounded-lg" />
          <div className="space-y-2 text-sm text-zinc-700">
            <p>
              QR posters at dialysis centres, hospital desks, barangay health centres and OSCA/PWD offices, plus Facebook, Instagram
              and TikTok posts with the link.
            </p>
            <p className="flex flex-wrap gap-2">
              {HASHTAGS.map((h) => (
                <span key={h} className="rounded-full bg-mango-100 px-2.5 py-1 font-bold text-mango-900">
                  {h}
                </span>
              ))}
            </p>
            <a className="font-bold text-ube-800 underline" href={doc("docs/04-launch-plan.md")}>
              Launch plan
            </a>
          </div>
        </div>
      </Section>

      {/* 10. Grading */}
      <Section id="grading" kicker="10 · For the grader" title="Where to find each criterion">
        <div className="overflow-x-auto rounded-2xl ring-1 ring-ube-100">
          <table className="w-full bg-white text-left text-sm">
            <tbody>
              {[
                ["Problem & Validation", "docs/01-idea-validation.md|Validation report", "7 steps, real evidence, specific user, why now"],
                ["PRD Quality", "docs/02-PRD.md|PRD", "6 components, testable acceptance criteria"],
                ["Spec & Architecture", "spec.md|spec.md", "5 spec elements, AC1–AC32, CLAUDE.md, .cursorrules"],
                ["Working Application", "README.md|README", "Live app, tested on Windows, iOS and Android"],
                ["CI/CD & Engineering", ".github/workflows/ci.yml|CI workflow", "GitHub Actions, no secrets, commit history, README"],
              ].map(([c, path, what]) => (
                <tr key={c} className="border-t border-ube-100 first:border-t-0">
                  <td className="p-3 font-bold text-ube-950">{c}</td>
                  <td className="p-3">
                    <a className="font-bold text-ube-800 underline" href={doc(path.split("|")[0])}>
                      {path.split("|")[1]}
                    </a>
                  </td>
                  <td className="p-3 text-zinc-700">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border-2 border-red-600 bg-red-50 p-4 text-sm text-red-900">
          <strong>Non-emergency trips only.</strong> Care Ride is not an ambulance service. In an emergency, call{" "}
          <a href="tel:911" className="font-bold underline">
            911
          </a>
          .
        </div>
      </Section>
    </article>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-ube-50 p-4">
      <div className="text-3xl font-bold tabular-nums text-ube-900">{value}</div>
      <div className="mt-1 text-sm text-zinc-700">{label}</div>
    </div>
  );
}

function MiniCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="card">
      <p className="font-bold text-ube-950">{title}</p>
      <p className="text-sm text-zinc-700">{text}</p>
    </div>
  );
}
