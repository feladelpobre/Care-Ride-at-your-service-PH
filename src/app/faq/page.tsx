import FaqHelper from "@/components/FaqHelper";
import HumanTabGate from "@/components/HumanTabGate";
import { FAQS, type Faq } from "@/lib/faq";
import { isHumanCheckEnabled } from "@/lib/humanCheck";

export const metadata = {
  title: "Questions and answers · Care Ride at your service-PH",
};

const TOPICS: Faq["topic"][] = ["Booking", "Calls", "Prices", "Safety", "Privacy"];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <HumanTabGate enabled={isHumanCheckEnabled()} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ube-950 sm:text-4xl">Questions and answers</h1>
        <p className="mt-2 text-lg text-zinc-700">Ask below, or tap a question to see the answer. Mga tanong at sagot.</p>
      </div>
      <FaqHelper />
      {TOPICS.map((t) => (
        <section key={t} aria-labelledby={`topic-${t}`} className="space-y-2">
          <h2 id={`topic-${t}`} className="text-xl font-bold text-ube-950">
            {t}
          </h2>
          {FAQS.filter((f) => f.topic === t).map((f) => (
            <details key={f.id} id={f.id} className="card group">
              <summary className="flex min-h-[44px] cursor-pointer items-center font-bold text-ube-900">{f.q}</summary>
              <p className="mt-2 text-[15px] text-zinc-800">{f.a}</p>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
