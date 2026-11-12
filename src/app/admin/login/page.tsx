import AdminLoginForm from "@/components/AdminLoginForm";

export const metadata = { title: "Dispatcher login · Care Ride at your service-PH", robots: { index: false, follow: false } };

export default function AdminLoginPage({ searchParams }: { searchParams: { out?: string } }) {
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
      <AdminLoginForm />
    </div>
  );
}
