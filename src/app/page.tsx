import { Accessibility, BadgePercent, HeartHandshake, ShieldCheck } from "lucide-react";
import TripIntake from "@/components/TripIntake";
import { LogoMark } from "@/components/Logo";

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-[2.1rem] font-bold leading-[1.12] tracking-tight text-ube-950 sm:text-5xl">
            Safe rides to the hospital for loved ones who can&apos;t walk far.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-700">
            Tell us about the trip the way you&apos;d text a family member, in English or Taglish. We plan the right vehicle, the crew,
            the pickup time and the price. Add a wheelchair or a caregiver who stays until the check-up is done.
          </p>
          <a href="#book" className="btn-primary mt-6">
            Plan a ride
          </a>
        </div>
        <RouteIllustration />
      </section>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="What you get">
        <Promise icon={<Accessibility aria-hidden size={26} />} title="Wheelchair-ready vans" text="Ramp or lift, and crew for stairs" />
        <Promise icon={<HeartHandshake aria-hidden size={26} />} title="Hospital companion" text="Stays until the appointment is done" />
        <Promise icon={<BadgePercent aria-hidden size={26} />} title="20% Senior / PWD discount" text="On the ride fare, as the law requires" />
        <Promise icon={<ShieldCheck aria-hidden size={26} />} title="Safety first" text="Emergencies go straight to 911" />
      </ul>

      <section id="book" className="scroll-mt-6">
        <TripIntake />
      </section>
    </div>
  );
}

function Promise({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-ube-100">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ube-50 text-ube-700">{icon}</span>
      <span>
        <span className="block font-bold text-ube-950">{title}</span>
        <span className="block text-[15px] leading-snug text-zinc-600">{text}</span>
      </span>
    </li>
  );
}

/** Hero: home → mango road → hospital, with the Care Ride van on the way. Decorative. */
function RouteIllustration() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-ube-100" aria-hidden>
      <svg viewBox="0 0 420 300" className="block h-auto w-full">
        <circle cx="350" cy="52" r="26" fill="#F6CE6E" />
        <path d="M0 230 Q110 205 210 228 T420 220 V300 H0Z" fill="#DACCF1" />
        {/* road */}
        <path d="M40 250 C120 250 120 170 205 170 S300 110 360 108" fill="none" stroke="#E9A31F" strokeWidth="26" strokeLinecap="round" />
        <path d="M40 250 C120 250 120 170 205 170 S300 110 360 108" fill="none" stroke="#FFF9EC" strokeWidth="2.5" strokeDasharray="10 12" />
        {/* home */}
        <g transform="translate(14 176)">
          <rect x="6" y="30" width="58" height="46" rx="4" fill="#FFFFFF" />
          <path d="M0 34 L35 4 L70 34Z" fill="#5B3E96" />
          <rect x="27" y="50" width="16" height="26" rx="2" fill="#9C78D3" />
        </g>
        {/* hospital */}
        <g transform="translate(330 30)">
          <rect x="0" y="22" width="80" height="70" rx="6" fill="#FFFFFF" />
          <rect x="30" y="0" width="20" height="28" rx="3" fill="#FFFFFF" />
          <rect x="36" y="5" width="8" height="18" rx="1.5" fill="#B42318" />
          <rect x="31" y="10" width="18" height="8" rx="1.5" fill="#B42318" />
          <rect x="10" y="38" width="14" height="12" rx="2" fill="#BFA6E5" />
          <rect x="56" y="38" width="14" height="12" rx="2" fill="#BFA6E5" />
          <rect x="30" y="64" width="20" height="28" rx="2" fill="#7A55BB" />
        </g>
        {/* van */}
        <g transform="translate(176 120) rotate(-14)">
          <rect x="0" y="12" width="92" height="40" rx="10" fill="#5B3E96" />
          <path d="M60 12 H78 Q90 12 92 26 V32 H60Z" fill="#BFA6E5" />
          <rect x="8" y="18" width="20" height="14" rx="3" fill="#BFA6E5" />
          <g transform="translate(43 31)">
            <circle r="9" fill="#FFFFFF" />
            <circle r="7" fill="none" stroke="#5B3E96" strokeWidth="1.6" />
            <path d="M0 3.2 C-4 0.6 -3 -4 0 -1.8 C3 -4 4 0.6 0 3.2 Z" fill="#E9A31F" />
          </g>
          <circle cx="20" cy="54" r="9" fill="#2A2146" />
          <circle cx="72" cy="54" r="9" fill="#2A2146" />
          <circle cx="20" cy="54" r="3.5" fill="#F6CE6E" />
          <circle cx="72" cy="54" r="3.5" fill="#F6CE6E" />
        </g>
      </svg>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-4 text-sm font-bold text-ube-900">
        <LogoMark size={28} />
        Door to clinic, with care
      </div>
    </div>
  );
}
