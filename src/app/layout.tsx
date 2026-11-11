import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = localFont({ src: "./fonts/GeistVF.woff", variable: "--font-geist-sans", weight: "100 900" });

export const metadata: Metadata = {
  title: "CareRide PH: wheelchair-safe rides to the hospital",
  description:
    "Describe the trip in plain words. CareRide plans a wheelchair-appropriate ride, pickup time and price estimate for hospital and dialysis visits in Metro Manila.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <div role="note" className="bg-red-700 px-4 py-2 text-center text-sm font-medium text-white">
          For non-emergency trips only. In an emergency, call{" "}
          <a href="tel:911" className="font-bold underline">
            911
          </a>
          .
        </div>
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-teal-900">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-teal-800 text-white">
                ♿
              </span>
              CareRide PH
            </Link>
            <div className="flex gap-1 text-sm">
              <Link href="/" className="rounded-md px-3 py-2 font-medium text-stone-700 hover:bg-stone-100">
                Book a ride
              </Link>
              <Link href="/dispatch" className="rounded-md px-3 py-2 font-medium text-stone-700 hover:bg-stone-100">
                Dispatcher
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-xs text-stone-500">
          Student project (Week 4 Mini Project 4.2). Prices are estimates only; no payments are taken. Demo data only:
          please don&apos;t enter real medical details.
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
