import FeedbackForm from "@/components/FeedbackForm";

export const metadata = { title: "How was your ride? · Care Ride at your service-PH" };

export default function FeedbackPage({ searchParams }: { searchParams: { ref?: string } }) {
  const ref = typeof searchParams.ref === "string" ? searchParams.ref.slice(0, 20) : "";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ube-950 sm:text-4xl">How was your ride?</h1>
        <p className="mt-2 text-lg text-zinc-700">
          Your feedback helps us keep every trip safe and kind. If something went wrong, tell us what happened and we&apos;ll follow
          up within 24 hours.
        </p>
      </div>
      <FeedbackForm initialReference={ref} />
    </div>
  );
}
