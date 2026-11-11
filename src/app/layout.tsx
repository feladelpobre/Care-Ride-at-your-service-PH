import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./globals.css";
import { Wordmark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Care Ride at your service-PH: wheelchair-safe rides to the hospital",
  description:
    "Describe the trip in plain words. Care Ride plans a wheelchair-appropriate ride, pickup time and price estimate for hospital and dialysis visits in Metro Manila.",
};

export const viewport: Viewport = { themeColor: "#5B3E96" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
          Skip to content
        </a>
        <div role="note" className="bg-red-700 px-4 py-2 text-center text-[15px] font-bold text-white">
          Non-emergency trips only. In an emergency, call{" "}
          <a href="tel:911" className="underline underline-offset-2">
            911
          </a>
          .
        </div>
        <header className="border-b border-ube-100 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3" aria-label="Main">
            <Link href="/" aria-label="Care Ride at your service-PH, home">
              <Wordmark />
            </Link>
            <div className="flex shrink-0 gap-1 text-[15px] font-bold">
              <Link href="/" className="hidden rounded-full px-3 py-2 text-ube-800 hover:bg-ube-50 sm:inline-block">
                Book a ride
              </Link>
              <Link href="/dispatch" className="rounded-full px-3 py-2 text-ube-800 hover:bg-ube-50">
                Dispatcher
              </Link>
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-ube-100 bg-white">
          <div className="mx-auto max-w-5xl space-y-3 px-4 py-8 text-sm text-zinc-600">
            <nav className="flex flex-wrap gap-5 font-bold" aria-label="Legal">
              <Link href="/privacy" className="text-ube-800 underline underline-offset-2">
                Privacy Notice
              </Link>
              <Link href="/terms" className="text-ube-800 underline underline-offset-2">
                Terms of Service
              </Link>
            </nav>
            <p className="max-w-3xl">
              Student prototype (Week 4 Mini Project 4.2). Non-emergency patient transport only; not an ambulance service. Prices are
              estimates and no payments are taken. Please use demo data only. Business registration (DTI/BIR), LTFRB accreditation
              and NPC registration will be completed before real bookings.
            </p>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
