/**
 * Content for the public Case File page (/case, AC32).
 * Every fact here comes from this repo's own documents: docs/01-idea-validation.md, docs/02-PRD.md,
 * spec.md, docs/eval-cases.md and the UAT report (Nov 12–17, 2026). The worked fare example is not
 * written here: the page computes it with the same rules the app uses (src/lib/plan.ts).
 */
import type { TripExtraction } from "./schemas";

export const REPO = "https://github.com/feladelpobre/Care-Ride-at-your-service-PH";
export const doc = (path: string) => `${REPO}/blob/main/${path}`;

export const VALIDATION: { step: string; title: string; finding: string; source: string }[] = [
  { step: "1", title: "Problem", finding: "82.3% of 413 PGH wheelchair recipients name accessibility as their top barrier to follow-up care; 79.6% cite travel cost.", source: "Acta Medica Philippina, 2024" },
  { step: "2", title: "Customer", finding: "\"Ate Liza\", 35–55, books rides for a parent on dialysis or rehab 2–3× a week; 2.8M registered PWDs; families already pay ~₱700 per accessible trip.", source: "NCDA via Inquirer; WheelchairTravel.org" },
  { step: "3", title: "Market", finding: "Global NEMT USD 9.82B (2025) → 16.24B (2032). Metro Manila SAM ≈ 605,000 accessible dialysis trips a year; SOM year 1 ≈ 12,000 trips.", source: "ResearchAndMarkets; PNA (DOH dialysis data)" },
  { step: "4", title: "Competition", finding: "Lifelifters, Wheelmobile, GrabAssist and private ambulances: none captures the patient's mobility needs before the vehicle is sent.", source: "Feature gap matrix" },
  { step: "5", title: "Why now, why us", finding: "Ageing society by ~2030, dialysis patients +42% (2022→2023), structured-output LLMs read Taglish reliably; a QA Manager founder builds intake like a quality checklist.", source: "PSA; GMA News; ERIA" },
  { step: "6", title: "Cheap test", finding: "Concierge bookings in caregiver Facebook groups, a fake-door test with this live MVP, and driver-brief reviews by 3 operators.", source: "Test plan" },
  { step: "7", title: "Stress test", finding: "5 risks with real precedents (thin supply, NEMT bankruptcies, volume, safety, privacy), each with a mitigation.", source: "Skeptical-VC review" },
];

/** UAT on the live app, Nov 12–17, 2026: what broke, what changed. */
export const UAT: { date: string; found: string; fix: string }[] = [
  { date: "Nov 12", found: "Testers left \"how the patient moves\" blank; the app assumed the costliest van", fix: "Mobility is required and chosen in step 1" },
  { date: "Nov 12", found: "\"How will I know my booking went through?\"", fix: "Confirmation email with the CR- reference, plus a reminder 2 hours before pick-up" },
  { date: "Nov 14", found: "Riders guessed the distance, which changed the price", fix: "The system calculates the distance; riders never type km" },
  { date: "Nov 15", found: "\"Try example\" buttons left the required pickup empty on phones", fix: "Removed; one example is shown as the placeholder" },
  { date: "Nov 15", found: "Caregiver hours box couldn't be changed on a phone", fix: "Big − / + buttons: none, then 2 to 12 hours" },
  { date: "Nov 15", found: "Distance from the city centre wasn't accurate; GPS worked only in Metro Manila", fix: "GPS pickup anywhere in the Philippines; trips over 60 km flagged" },
  { date: "Nov 15", found: "Times and mobility were asked only after \"Plan my ride\"", fix: "Step 1 collects everything; the app suggests a safe pick-up time and warns if late" },
  { date: "Nov 15", found: "No protection against bot bookings", fix: "\"I am human\" check on every new app launch; pass lasts 1 hour" },
  { date: "Nov 17", found: "GPS looked like it needed the area typed first", fix: "GPS fills in the barangay and town by itself" },
  { date: "Nov 17", found: "\"Call 911\" showed only after the whole form was filled", fix: "It appears as soon as emergency words are typed" },
];

export const DEVICES = [
  { device: "Laptop", platform: "Windows", browser: "Chrome (incognito)" },
  { device: "iPhone", platform: "iOS", browser: "Chrome (incognito), via QR code" },
  { device: "Samsung phone", platform: "Android", browser: "Chrome and Samsung Internet, via QR code" },
];

export const PRD_FEATURES: { id: string; feature: string; ac: string }[] = [
  { id: "F1", feature: "AI trip intake in English or Taglish", ac: "AC1, AC10" },
  { id: "F2", feature: "Deterministic vehicle, crew and safety checklist", ac: "AC3–AC5" },
  { id: "F3", feature: "Step-1 inputs, GPS pickup and a safe pick-up time", ac: "AC29–AC31" },
  { id: "F4", feature: "System-calculated distance and itemised price", ac: "AC11–AC13, AC26" },
  { id: "F5", feature: "Emergency gate, human check and server recompute", ac: "AC2, AC8, AC18, AC28" },
  { id: "F6", feature: "Confirm, notify, dispatch and feedback", ac: "AC17, AC19, AC22–AC24" },
];

export const COMPLIANCE: { law: string; what: string; how: string }[] = [
  { law: "RA 10173", what: "Data Privacy Act", how: "Pickup area only, no diagnoses, consent names the health data, masked contacts on the dispatcher board, GPS never stored" },
  { law: "RA 9994 / RA 10754", what: "Senior Citizen and PWD discount", how: "20% off the ride fare (not add-ons); the driver checks the ID; the ID number is never stored" },
  { law: "RA 11967", what: "Internet Transactions Act", how: "Terms with a complaints channel; feedback tickets, urgent safety cases first" },
  { law: "DOH AO 2018-0001", what: "Ambulance service standards", how: "Non-emergency transport only; stretcher patients are referred out; emergencies go to 911" },
];

export const HASHTAGS = ["#CareRidePH", "#WheelchairSupport", "#PWDPhilippines", "#CaregiverPH", "#DialysisPatient", "#AccessibleTransport"];

/** The sample trip used for the worked fare example (Ate Liza's Tuesday). */
export const SAMPLE_TRIP: TripExtraction = {
  pickupArea: "Kapitolyo, Pasig",
  destination: "St. Luke's Medical Center – BGC",
  appointmentDate: null,
  appointmentTime: "09:00",
  tripPurpose: "dialysis",
  mobility: "wheelchair_must_stay_seated",
  floorsWithoutElevator: 3,
  equipment: ["oxygen_tank"],
  companions: 1,
  recurring: true,
  recurrenceNote: "Every Tuesday",
  wantsHospitalCompanion: true,
  emergencySignals: false,
  missingInfo: [],
  caregiverSummary: "Wheelchair user going to dialysis.",
};
export const SAMPLE_OPTIONS = { companionHours: 3, seniorPwdDiscount: true, wheelchairRental: false };
