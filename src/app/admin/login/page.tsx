import AdminLoginForm from "@/components/AdminLoginForm";
import StaffLinkForm from "@/components/StaffLinkForm";

export const metadata = { title: "Dispatcher login · Care Ride at your service-PH", robots: { index: false, follow: false } };

export default function AdminLoginPage({ searchParams }: { searchParams: { out?: string; link?: string } }) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ube-950">Dispatcher login</h1>
        <p className="mt-2 text-zinc-700">For Care Ride staff only: log in to see ride requests, customer feedback and insights. Customers can book a ride or send feedback from the menu above.</p>
      </div>
      {searchParams.out === "1" && (
        <p role="status" className="rounded-lg border border-ube-300 bg-ube-50 p-3 text-sm text-ube-900">
          You&apos;re logged out.
        </p>
      )}
      {searchParams.link === "expired" && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
          That login link has expired or isn&apos;t valid. Ask for a new one below.
        </p>
      )}
      <AdminLoginForm />
      <section aria-labelledby="forgot-title" className="rounded-xl border-2 border-ube-100 bg-ube-50 p-4 text-sm text-ube-950">
        <h2 id="forgot-title" className="font-bold">
          Forgot the username or password?
        </h2>
        <p className="mt-1">
          Staff on the Care Ride list can log in with a link sent to their work email; no username or password needed. Or ask the Care Ride admin to
          reset the password. After 5 wrong tries, wait 15 minutes before trying again.
        </p>
        <StaffLinkForm />
      </section>
    </div>
  );
}
