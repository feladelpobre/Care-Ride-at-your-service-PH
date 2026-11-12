# Care Ride at your service-PH — Product Requirements Document (v1.0, MVP)

**Owner:** Feladel "Peng" Pobre · **Status:** Approved for build (v1.2: added F6, F7) · **Last updated:** 11 Nov 2026

## 1. Problem Statement
Caregivers in Metro Manila who arrange hospital and dialysis trips for wheelchair users or patients who cannot walk have no simple way to book a ride *matched to the patient's mobility needs*. Public transport is inaccessible, and the few accessible-van services are booked by phone. Each time, the caregiver must re-explain stairs, wheelchair type and equipment, and mismatches lead to unsafe lifting or missed appointments. In a PGH survey of 413 wheelchair users, **82.3% named accessibility as their top barrier to in-person follow-up** (Acta Medica Philippina, 2024).

## 2. Target Users
| User | Need |
|---|---|
| **Primary — caregiver-coordinator** (adult child or relative, 35–55, Metro Manila) | Book a safe, correctly equipped ride in under 2 minutes by describing the trip in their own words (English or Taglish) |
| **Secondary — accessible-van dispatcher/driver** | Receive a clear, complete brief: vehicle type, crew size, stairs, equipment, pickup time |

## 3. Core Features (MVP) with Acceptance Criteria
| # | Feature | Acceptance criterion (testable) |
|---|---|---|
| F1 | **AI trip intake:** the caregiver types a free-text description (20–1,500 characters); AI extracts pickup area, destination, appointment date/time, mobility level, stairs/floors, equipment, companions, and whether the trip repeats | Given the sample *"Mama uses a wheelchair, dialysis at St. Luke's BGC on Tuesday 9am, we're on the 3rd floor, no elevator"*, the response contains `mobility = wheelchair`, `floorsWithoutElevator = 3`, `appointmentTime = "09:00"` and a destination containing "St. Luke's", within 15 s |
| F2 | **Mobility assessment (rules engine):** deterministic rules turn the extraction into a vehicle type, crew size and an assistance checklist | A wheelchair user who must stay seated → `WAV ramp/lift van`; any wheelchair user with ≥1 floor and no elevator → `crew = 2` + "stair assist"; a stretcher-bound patient → booking blocked and "refer to ambulance" shown. Covered by unit tests |
| F3 | **Suggested pickup time:** worked back from the appointment time using travel time + boarding buffer + early arrival | Appointment 09:00, travel 45 min, boarding 10 min, stair assist +15 min, arrive 15 min early → pickup **07:35**. Covered by unit tests |
| F4 | **Safety guardrails:** emergency red flags (e.g., "chest pain", "hindi makahinga" / can't breathe, "unconscious") stop the booking and show a "Call 911" banner; inputs are validated; missing details are listed for the caregiver to complete | Input containing "chest pain" returns `emergency = true` *without calling the AI*, and the Confirm button is not rendered. Input under 20 characters returns HTTP 400 with a friendly message |
| F6 | **Distance-based price estimate + hospital companion add-on:** the fare is estimated from the pickup city to the named (or **nearest**) hospital using distance bands (0–5 / 5–10 / 10–20 / 20–40 / 40+ km); the caregiver can adjust the km and add a hospital companion (₱250/h, min 2 h) who stays inside the hospital until the appointment is done | WAV + 2 crew + 3 floors + 10 km = **₱1,800**; adding a 3 h companion adds **₱750**; with no hospital named, the quote shows "priced to the nearest: …". Covered by unit tests |
| F7 | **Tick-box add-ons + statutory discount + compliance pages:** step 1 shows tick boxes for ☐ Wheelchair (₱150, we bring one), ☐ Hospital companion/caregiver (₱250/h, min 2 h) and ☐ Senior Citizen / PWD (20% off the ride fare, RA 9994 / RA 10754); Privacy Notice and Terms pages; consent names the health information | Ticking Senior/PWD on a ₱1,200 fare shows a −₱240 line and does not discount add-ons; ticking Wheelchair adds ₱150 and "Bring wheelchair" on the dispatcher board; the booking cannot be sent without consent. Covered by unit tests (AC13–AC15) |
| F8 | **Feedback and complaints:** after the trip, the customer rates the service (overall, driver, caregiver), says if pickup was on time, ticks what went wrong, adds when it happened, the driver/caregiver names and details, and can ask for a callback; gets an FB- ticket; dispatchers see feedback sorted by urgency with the average rating | Feedback with a wrong reference/mobile pair is refused; a "Safety concern" ticket is marked Urgent and listed first; the dispatcher panel shows the average rating. Covered by unit tests (AC19) |
| F5 | **Review & confirm → dispatcher board:** the caregiver reviews and edits the plan, enters a contact name and a **required mobile number** (for the confirmation call and to deter fake requests; max 3 requests per number per day), then confirms; the booking appears on `/dispatch` with its driver brief and a ₱ fare *estimate* (no payment) | After confirming, the booking is visible on `/dispatch` with status "Pending" and the same vehicle, crew and pickup time shown on the review screen |

*Feature order: F1 → F2 → F3 → F6 → F7 → F4 → F5 (F6 added in v1.1 and F7 in v1.2 after stakeholder and compliance review; see `docs/03-regulatory-compliance.md`).*

## 4. Out of Scope (v1)
- Real payments, wallets or insurance/PhilHealth claims
- Live driver GPS tracking, maps routing and real traffic data (distance is estimated from city and hospital coordinates; caregivers can edit it)
- Round-trip pricing and waiting-time billing for the van (v2)
- Driver accounts, matching and acceptance workflow; SMS/Viber notifications
- Emergency transport of any kind (the app always redirects to 911)
- Storing patient names, diagnoses or medical records (data minimisation under RA 10173)
- Native mobile apps (responsive web only)
- SMS one-time code (OTP) verification of the mobile number (v1 uses a required number + 3 requests/day cap; OTP planned for v2)
- **Booking the hospital or doctor's appointment itself.** The caregiver books the appointment directly with the hospital and enters its date and time; Care Ride plans the ride around it. Reasons:
  - *No common integration:* most Philippine hospitals have no public booking API; each uses its own portal, phone line or clinic secretary, so every hospital would need a separate arrangement.
  - *Sync risk:* doctors cancel and clinics move schedules by phone; a stale appointment means a van arriving at the wrong time, and two linked bookings (slot + van) must be reconciled when either fails.
  - *Sensitive data:* appointment details (doctor, department, diagnosis, HMO/PhilHealth) are sensitive personal information under RA 10173, needing stronger consent, security and possibly NPC registration; v1 deliberately stores no diagnoses.
  - *Liability and partnerships:* a missed appointment caused by our system becomes a medical consequence, and each hospital would require a data-sharing agreement and security review.
  - *Roadmap:* v2 adds an optional "appointment confirmed?" tick box and a day-before SMS reminder. We will not build our own hospital scheduling.

## 5. Success Metrics
| Metric | Target (first 30 days after launch) | How measured |
|---|---|---|
| **Extraction accuracy** on a 10-case golden set | ≥ 9/10 cases with correct mobility, floors and time | Manual eval script in `docs/eval-cases.md` |
| **Companion add-on attach rate** | ≥ 20% of confirmed bookings include a hospital companion | Insights panel: share of requests with a companion |
| **Customer satisfaction** | Average rating ≥ 4.5 / 5; every urgent ticket called back the same day | Dispatcher feedback panel |
| **Intake-to-confirm conversion** | ≥ 40% of `trip_analyzed` events lead to `booking_confirmed` | Dispatcher **Insights** panel (events stored in Supabase) |
| **Time to book** | Median < 2 minutes from first keystroke to confirm | Usability test with 3 caregivers |

## 6. Open Questions
1. Which accessible-van operators (Lifelifters, Wheelmobile, LGU vans) will accept bookings from a third-party intake tool, and in what format (Viber, email, API)?
2. Should repeating dialysis trips be auto-booked weekly, or confirmed each week by the caregiver?
3. What is the right fee model: per booking (caregiver pays) or SaaS (operator pays)?
4. Do we need explicit consent screens under the Data Privacy Act even when no names or diagnoses are stored?
5. Can a maps API provide reliable Metro Manila travel-time estimates at an acceptable cost for v2?
6. Licensing route: own LTFRB franchise, or TNC accreditation with franchised partner operators? (see compliance plan)
