import TripIntake from "@/components/TripIntake";

export default function Home() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-teal-950 sm:text-4xl">
          A safe ride to the hospital, planned in one message.
        </h1>
        <p className="mt-2 max-w-2xl text-stone-600">
          Tell us about the trip the way you&apos;d text a relative, in English or Taglish. We&apos;ll work out the right
          vehicle, how many crew are needed, when to pick up, and an estimated price. You can also add a hospital
          companion who stays with the patient until the appointment is done.
        </p>
      </section>
      <TripIntake />
    </div>
  );
}
