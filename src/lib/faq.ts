import { z } from "zod";
import {
  BASE_FARE,
  COMPANION_MIN_HOURS,
  COMPANION_RATE_PER_HOUR,
  SECOND_CREW_FEE,
  SENIOR_PWD_DISCOUNT_RATE,
  STAIR_FEE_PER_FLOOR,
  WHEELCHAIR_RENTAL_FEE,
} from "./rules";
import { CALLBACK_HOURS } from "./callQueue";
import { MAX_RIDE_COMPANIONS } from "./schemas";

/**
 * Frequently asked questions (AC36). The FAQ page and the "Ask a question" helper both read this list,
 * so every answer is written here once. Prices come from rules.ts, so they never drift from the real quote.
 */
export type Faq = {
  id: string;
  topic: "Booking" | "Prices" | "Calls" | "Safety" | "Privacy";
  q: string;
  a: string;
  keywords: string[];
  /** Words that show what the person really wants to know (e.g. "magkano" = price); they outweigh topic words. */
  strong?: string[];
};

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
const pct = Math.round(SENIOR_PWD_DISCOUNT_RATE * 100);

export const FAQS: Faq[] = [
  {
    id: "what-is",
    topic: "Booking",
    q: "What is Care Ride?",
    a: "Care Ride plans safe, wheelchair-friendly rides to hospital, clinic and dialysis appointments, in Metro Manila and anywhere in the Philippines (longer trips are confirmed by the dispatcher). Describe the trip in your own words, and the app suggests the right vehicle, crew, pick-up time and an estimated fare. It is not an ambulance service.",
    keywords: ["care ride", "service", "about", "ano ang"],
  },
  {
    id: "how-book",
    topic: "Booking",
    q: "How do I book a ride?",
    a: "On the home page, fill in step 1 in order: describe the trip, the pick-up area (or tap Use my location), the destination, how the patient moves, the appointment date and time, and your pick-up time. Tap Plan my ride to see the plan and fare, then send the request with your name, mobile number and email. You get a reference like CR-4ED3B086.",
    keywords: ["book", "booking", "request", "reserve", "how", "paano", "mag-book", "schedule"],
  },
  {
    id: "confirm-call",
    topic: "Calls",
    q: "Will someone call me to confirm?",
    a: "Yes. Every ride request goes to a dispatcher, who calls your mobile number to confirm the details and the final fare before any van is sent. Your trip is not final until that call. Keep your phone nearby and your reference number ready.",
    keywords: ["call", "confirm", "dispatcher", "tawag", "phone", "confirmation", "tatawag"],
  },
  {
    id: "callback-feedback",
    topic: "Calls",
    q: "I sent feedback or a complaint. When will you call me?",
    a: `Safety concerns are urgent: we call within ${CALLBACK_HOURS.urgent} hours. Low ratings (1 or 2 stars) and requests for a call are returned within ${CALLBACK_HOURS.high} hours. Keep your FB- ticket number for reference.`,
    keywords: ["feedback", "complaint", "callback", "call back", "reklamo", "ticket", "24 hours"],
  },
  {
    id: "emergency",
    topic: "Safety",
    q: "Can I use Care Ride in an emergency?",
    a: "No. For chest pain, trouble breathing, fainting, heavy bleeding, stroke signs or a seizure, call 911 now. Care Ride is for planned, non-emergency trips only.",
    keywords: ["emergency", "ambulance", "911", "urgent", "chest pain", "stroke", "emerhensiya"],
    strong: ["emergency", "ambulance", "emerhensiya"],
  },
  {
    id: "weather",
    topic: "Safety",
    q: "Do you still pick up during heavy rain, floods or a typhoon?",
    a: "Yes, when it is safe. In heavy rain or flooding, the dispatcher may call to move your pick-up earlier or to reschedule. When a typhoon signal (PAGASA Signal No. 2 or higher) is raised in your area, or roads on the route are flooded, the trip may be postponed for everyone's safety, and we call you first. For dialysis or other treatments that can't wait, tell the dispatcher so we can plan the safest route or time.",
    keywords: ["rain", "flood", "typhoon", "storm", "weather", "signal", "pagasa", "bagyo", "ulan", "baha", "bumabaha"],
    strong: ["typhoon", "flood", "bagyo", "baha", "ulan", "rain"],
  },
  {
    id: "vehicles",
    topic: "Safety",
    q: "What vehicles do you use?",
    a: "An assist sedan for patients who walk with help or can move from a wheelchair to a car seat, and a ramp wheelchair van for patients who must stay seated in their wheelchair. We can't take patients who need a stretcher or medical monitoring; they need a DOH-licensed ambulance.",
    keywords: ["vehicle", "van", "car", "sedan", "ramp", "wheelchair", "stretcher", "bedridden", "sasakyan"],
  },
  {
    id: "fare",
    topic: "Prices",
    q: "How much does a ride cost?",
    a: `The base fare covers the first 5 km: ${peso(BASE_FARE.sedan_assist)} for the assist sedan and ${peso(BASE_FARE.wav_ramp_van)} for the wheelchair van. Longer trips add a distance charge. A second crew member is ${peso(SECOND_CREW_FEE)}, plus ${peso(STAIR_FEE_PER_FLOOR)} per floor of stairs without an elevator. The app shows the estimate before you send a request, and the dispatcher confirms the final fare by phone.`,
    keywords: ["price", "cost", "fare", "how much", "magkano", "bayad", "rate", "estimate"],
    strong: ["magkano", "how much", "price", "cost", "presyo"],
  },
  {
    id: "distance",
    topic: "Prices",
    q: "How is the distance worked out?",
    a: "The app calculates it for you from the pick-up area (or your GPS location) and the destination; you don't have to guess. Trips longer than 60 km get a note that the dispatcher will confirm the route.",
    keywords: ["distance", "km", "kilometer", "gps", "location", "layo"],
  },
  {
    id: "discount",
    topic: "Prices",
    q: "Do Senior Citizens and PWDs get a discount?",
    a: `Yes. Senior Citizens (RA 9994) and persons with disability (RA 10754) get ${pct}% off the ride fare. Tick the Senior/PWD box and show a valid OSCA or PWD ID to the driver. The discount is on the ride fare, not on the caregiver or wheelchair add-ons.`,
    keywords: ["discount", "senior", "pwd", "osca", "20%", "id", "diskwento"],
    strong: ["discount", "diskwento"],
  },
  {
    id: "caregiver",
    topic: "Booking",
    q: "Can a caregiver stay with the patient at the hospital?",
    a: `Yes. Add a hospital caregiver in step 1 (after choosing how the patient moves) with the − and + buttons: at least ${COMPANION_MIN_HOURS} hours, at ${peso(COMPANION_RATE_PER_HOUR)} per hour. Caregivers give non-medical help only.`,
    keywords: ["caregiver", "companion", "bantay", "stay", "hours", "kasama", "alalay"],
  },
  {
    id: "wheelchair",
    topic: "Booking",
    q: "I don't have a wheelchair. Can you bring one?",
    a: `Yes. Tick the "Wheelchair" add-on in step 1 and we bring a clean one for the trip and inside the hospital. It costs ${peso(WHEELCHAIR_RENTAL_FEE)} per trip.`,
    keywords: ["wheelchair", "rent", "bring", "borrow", "walang wheelchair"],
  },
  {
    id: "companions",
    topic: "Booking",
    q: "How many family members can ride along?",
    a: `${MAX_RIDE_COMPANIONS} companion can ride with the patient, so there is room for the wheelchair and crew.`,
    keywords: ["family", "companion", "ride along", "sasama", "passenger", "how many", "kasama"],
  },
  {
    id: "limits",
    topic: "Booking",
    q: "Is there a limit on ride requests?",
    a: "Yes, to stop fake bookings: up to 3 ride requests per mobile number in 24 hours. For more trips, the dispatcher can add them when they call you.",
    keywords: ["limit", "many", "multiple", "3", "more trips", "recurring", "dialysis"],
  },
  {
    id: "reminder",
    topic: "Calls",
    q: "Will I get a reminder?",
    a: "Yes. We email your booking reference right after you send the request, and a reminder about 2 hours before pick-up.",
    keywords: ["reminder", "email", "notification", "paalala"],
  },
  {
    id: "change-cancel",
    topic: "Calls",
    q: "How do I change or cancel a ride?",
    a: "Tell the dispatcher when they call, or send a message through the Feedback page with your reference number as early as possible. The dispatcher marks the trip as cancelled.",
    keywords: ["cancel", "change", "reschedule", "move", "kanselahin", "palitan"],
    strong: ["cancel", "reschedule", "kanselahin"],
  },
  {
    id: "payment",
    topic: "Prices",
    q: "How do I pay?",
    a: "This is a student prototype: no payments are taken and no real rides are sent yet. When the service launches, the dispatcher will confirm the fare by phone and an official receipt will be issued for every paid trip.",
    keywords: ["pay", "payment", "gcash", "cash", "card", "receipt", "bayad"],
  },
  {
    id: "human-check",
    topic: "Privacy",
    q: 'Why do I tick "I am human" every time?',
    a: "It stops bots from sending fake ride requests. The check lasts up to 1 hour and is asked again each time you open the app. It does not collect your name or contact details.",
    keywords: ["human", "robot", "captcha", "check", "verify", "tick"],
  },
  {
    id: "privacy",
    topic: "Privacy",
    q: "What do you do with my personal details?",
    a: "We ask only for what the ride needs: a contact name, mobile number and email, plus the pick-up area (not your exact address). Staff screens show them masked. Trip details are kept only as long as needed, in line with the Data Privacy Act (RA 10173). See the Privacy Notice for details.",
    keywords: ["privacy", "data", "personal", "information", "safe", "secure", "delete"],
  },
];

export const FAQ_IDS = FAQS.map((f) => f.id);

/** What the AI helper must return: one FAQ id, or "none". It never writes the answer itself. */
export const faqMatchSchema = z.object({ faqId: z.enum(["none", ...FAQ_IDS]) });

export const FAQ_FALLBACK =
  "Sorry, I can only answer questions about Care Ride from our FAQ. Try asking about booking, prices, calls or safety, or send us a message on the Feedback page.";

const STOP = new Set([
  "the",
  "and",
  "for",
  "can",
  "you",
  "your",
  "with",
  "what",
  "how",
  "who",
  "does",
  "are",
  "is",
  "do",
  "ang",
  "mga",
  "po",
  "ba",
  "sa",
]);
const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9%\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

/**
 * Keyword search: used when the AI is not set up or fails, and in tests.
 * Returns the best-matching FAQ, or null when nothing matches well enough.
 */
export function searchFaq(question: string): Faq | null {
  const text = ` ${question.toLowerCase()} `;
  const qWords = words(question);
  let best: { f: Faq; score: number } | null = null;
  for (const f of FAQS) {
    let score = 0;
    for (const k of f.strong ?? []) if (k.includes(" ") ? text.includes(k) : qWords.has(k)) score += 6;
    for (const k of f.keywords) {
      if (k.includes(" ") ? text.includes(k) : qWords.has(k) || text.includes(` ${k} `)) score += k.includes(" ") ? 5 : 2; // a phrase like "how much" shows intent more than a single word
    }
    words(f.q).forEach((w) => {
      if (qWords.has(w)) score += 1;
    });
    if (!best || score > best.score) best = { f, score };
  }
  return best && best.score >= 2 ? best.f : null;
}

export function faqById(id: string | null): Faq | null {
  return FAQS.find((f) => f.id === id) ?? null;
}
