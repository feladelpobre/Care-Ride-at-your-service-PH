# Care Ride at your service-PH: Product Requirements Document (1 page)

**Owner:** Feladel "Peng" Pobre · **Version:** v1.4 (MVP, revised after user trials) · **Last updated:** 17 Nov 2026

## 1. Problem Statement
Caregivers in Metro Manila arranging hospital and dialysis trips for wheelchair users have no simple way to book a ride **matched to the patient's mobility needs**. Public transport is inaccessible, accessible vans are booked by phone, and caregivers re-explain stairs, wheelchair type and equipment every time; mismatches cause unsafe lifting and missed appointments. In a PGH survey of 413 wheelchair users, **82.3% named accessibility as their top barrier** to follow-up care (Acta Medica Philippina, 2024).

## 2. Target Users
- **Primary: the caregiver-coordinator** (adult child or relative, 35–55, Metro Manila) who needs a safe, correctly equipped ride booked in under 2 minutes, in English or Taglish.
- **Secondary: the accessible-van dispatcher/driver** who needs a complete brief: vehicle, crew, stairs, equipment and pick-up time.

## 3. Core Features (MVP) with Acceptance Criteria
| # | Feature | Acceptance criterion (testable) |
|---|---|---|
| F1 | **AI trip intake:** free text (20–1,500 chars) → pickup, destination, date/time, mobility, floors, equipment | *"Mama uses a wheelchair, dialysis at St. Luke's BGC Tuesday 9am, 3rd floor, no elevator"* → `wheelchair`, `floors = 3`, `09:00`, destination contains "St. Luke's" (AC1, AC10) |
| F2 | **Mobility rules:** deterministic vehicle, crew and checklist | Must stay seated → ramp/lift van; ≥1 floor without elevator → 2 crew; stretcher → blocked (AC3–AC5) |
| F3 | **Step-1 inputs and pick-up time:** pickup (+ optional GPS), destination, mobility, caregiver hours (− / +), appointment, pick-up time; the app suggests the latest safe time | Appointment 09:00 → suggested time worked back from travel, boarding and stairs; a later rider time shows a warning (AC29–AC31) |
| F4 | **System-calculated distance and price:** distance bands, add-ons, 20% Senior/PWD fare discount; the rider never types km | Pasig → St. Luke's BGC ≈ 6.5 km; WAV + 2 crew + 3 floors (5–10 km band) = ₱1,800; Senior/PWD takes −₱240 off a ₱1,200 fare only (AC11–AC13, AC26) |
| F5 | **Safety and trust:** emergency words → "Call 911" before the AI; "I am human" check; required mobile, email and consent; server recomputes every price | "Chest pain" → emergency without calling the AI; a tampered fare is recomputed; booking APIs refuse without the human pass (AC2, AC8, AC18, AC28) |
| F6 | **Confirm, notify, dispatch, feedback:** CR- reference, confirmation and 2-hour reminder emails, admin-only dispatcher board, ratings and complaint tickets | Booking appears as "Pending" on `/dispatch`; the email contains the reference; a safety complaint is marked Urgent (AC17, AC19, AC22–AC24) |

## 4. Out of Scope (v1)
Real payments and insurance claims · live driver tracking and real road routing (v2: maps API, issue #1) · round-trip and waiting-time pricing · driver accounts and SMS/Viber/OTP · emergency transport (always 911) · storing names, diagnoses or medical records (RA 10173) · native apps · **booking the hospital appointment itself** (no common hospital API, schedule-sync and liability risks, and sensitive data).

## 5. Success Metrics (first 30 days)
| Metric | Target | How measured |
|---|---|---|
| Extraction accuracy (10-case golden set) | ≥ 9/10 | `docs/eval-cases.md` (achieved 10/10) |
| Plan-to-request conversion | ≥ 40% | Dispatcher Insights panel |
| Customer satisfaction | ≥ 4.5 / 5; urgent tickets called back the same day | Feedback panel |
| Time to book | Median < 2 minutes | Usability test with 3 caregivers |

## 6. Open Questions
1. Which operators (Lifelifters, Wheelmobile, LGU vans) will accept bookings from a third-party tool, and how (Viber, email, API)?
2. Auto-book weekly dialysis trips, or confirm each week?
3. Fee model: per booking (caregiver pays) or SaaS (operator pays)?
4. Licensing: own LTFRB franchise, or TNC accreditation with partner operators?
