import Link from "next/link";
import { redirect } from "next/navigation";
import HumanCheck from "@/components/HumanCheck";
import { isHumanCheckEnabled, safeNext } from "@/lib/humanCheck";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quick check · Care Ride at your service-PH", robots: { index: false, follow: false } };

/** "I am human" page shown before the app opens (AC28). */
export default function VerifyPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNext(searchParams.next);
  if (!isHumanCheckEnabled()) redirect(next);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ube-950">Quick check before we start</h1>
        <p className="mt-2 text-zinc-700">
          Please confirm you are a person, not a robot. This keeps fake ride requests away from our drivers. You only need to do
          this each time you open the app; it usually passes on its own in a second or two.
        </p>
      </div>

      <HumanCheck siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} next={next} />

      <div role="note" className="rounded-2xl border-2 border-red-600 bg-red-50 p-4 text-red-900">
        <p className="font-bold">Is this an emergency?</p>
        <p className="text-sm">Don&apos;t wait for this page. Call 911 now.</p>
        <a href="tel:911" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-red-700 px-6 font-bold text-white">
          Call 911
        </a>
      </div>

      <p className="text-xs text-zinc-500">
        The check is run by Cloudflare Turnstile. See our{" "}
        <Link href="/privacy" className="underline">
          Privacy Notice
        </Link>
        .
      </p>
    </div>
  );
}
