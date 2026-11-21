import Link from "next/link";
import { verifyLoginLinkToken } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dispatcher login link · Care Ride at your service-PH", robots: { index: false, follow: false } };

/** Landing page for an emailed login link (AC39): one tap logs the staff member in. */
export default async function LoginLinkPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams.token === "string" ? searchParams.token.slice(0, 500) : "";
  const valid = Boolean(await verifyLoginLinkToken(token));
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-ube-950">Dispatcher login</h1>
      {valid ? (
        <form action="/api/admin/login-link/open" method="post" className="card space-y-4">
          <p className="text-zinc-700">Your login link is ready. Tap the button to open the dispatcher board.</p>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn-primary w-full">
            Log in to the dispatcher board
          </button>
        </form>
      ) : (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">
          <p className="font-bold">This login link has expired or isn&apos;t valid.</p>
          <p className="mt-1 text-sm">Links work for 15 minutes. Ask for a new one on the login page.</p>
          <Link href="/admin/login" className="mt-3 inline-flex min-h-11 items-center font-bold text-ube-800 underline">
            Go to the login page
          </Link>
        </div>
      )}
    </div>
  );
}
