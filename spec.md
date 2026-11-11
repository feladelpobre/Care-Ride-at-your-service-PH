# spec.md — Care Ride at your service-PH

**Version:** 1.4 (revised after review; see §8) · **Source PRD:** `docs/02-PRD.md` · **Architecture:** `docs/architecture.md`

---

## 1. Purpose & Scope
A responsive web app where a caregiver describes a hospital or dialysis trip in plain English or Taglish. The system returns a **trip plan**: structured trip details, a mobility assessment (vehicle type, crew size, assist checklist), a suggested pickup time, a fare estimate and a driver brief. The caregiver confirms, and the booking appears on a dispatcher board.

**AI capability type:** *extraction + classification* (unstructured text → schema-validated JSON). It is not a chatbot.

In scope: PRD features F1–F7. Regulatory mapping: `docs/03-regulatory-compliance.md`. Out of scope: everything in PRD §4.

---

## 2. Inputs

### 2.1 `POST /api/plan` — analyse a trip
```json
{ "description": "string, 20–1500 chars", "distanceKm": 10, "companionHours": 3,
  "addons": { "wheelchair": false, "companion": false, "seniorPwd": false } }
```
| Field | Rule |
|---|---|
| `description` | Required. Trimmed. 20–1,500 characters. Control characters stripped. |
| `distanceKm` | Optional number 0.5–150. If omitted, it is **estimated** from the pickup city and hospital (§3.5). |
| `companionHours` | Optional integer 0–12. If omitted: the default for the trip purpose when the companion box is ticked or the message asks for one, otherwise 0. |
| `addons` | Step-1 tick boxes: `wheelchair` (we bring one, ₱150), `companion` (hospital companion/caregiver), `seniorPwd` (20% fare discount). All default `false`. |

### 2.2 `POST /api/bookings` — confirm a booking
```json
{ "contactName": "string 2–60", "contactPhone": "PH mobile, optional", "plan": TripPlan /* incl. options.distanceKm, options.companionHours */ }
```
- `contactPhone`, if given, must match `^(09|\+639)\d{9}$`.
- `plan` is re-validated against the `TripPlan` schema, and the **server recomputes the assessment** from `plan.extraction`. Client-supplied vehicle, crew or fare values are never trusted.

### 2.3 Environment (server-only)
`OPENAI_API_KEY` (required for AI), `OPENAI_MODEL` (default `gpt-4o-mini`), `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (optional; without them an in-memory store is used).

---

## 3. Outputs

### 3.1 `TripExtraction` (produced by the AI, validated with zod)
| Field | Type |
|---|---|
| `pickupArea` | string \| null |
| `destination` | string \| null |
| `appointmentDate` | `YYYY-MM-DD` \| null |
| `appointmentTime` | `HH:mm` (24h) \| null |
| `tripPurpose` | `dialysis \| checkup \| therapy \| chemotherapy \| discharge \| other` |
| `mobility` | `walks_with_assistance \| wheelchair_can_transfer \| wheelchair_must_stay_seated \| stretcher_bedbound \| unknown` |
| `floorsWithoutElevator` | integer 0–20 (clamped) |
| `equipment` | string[] (max 5), e.g. `oxygen_tank`, `walker` |
| `companions` | integer 0–3 (clamped) |
| `recurring` | boolean |
| `recurrenceNote` | string \| null |
| `wantsHospitalCompanion` | boolean: the caregiver asks for someone to stay with the patient inside the hospital |
| `emergencySignals` | boolean |
| `missingInfo` | string[] |
| `caregiverSummary` | string (≤ 280 chars) |

### 3.2 `Assessment` (produced by deterministic rules in `src/lib/rules.ts`)
| Field | Rule |
|---|---|
| `vehicle` | `stretcher_bedbound` → `not_supported`; `wheelchair_must_stay_seated` or `unknown` → `wav_ramp_van`; `wheelchair_can_transfer` / `walks_with_assistance` → `sedan_assist`. Any `oxygen_tank` upgrades a sedan to `wav_ramp_van` |
| `crewSize` | 2 if (any wheelchair mobility AND `floorsWithoutElevator ≥ 1`); otherwise 1 |
| `assistChecklist` | Generated from mobility, floors, equipment and companions |
| `travelMinutes` | `round5(distanceKm × 3.5 + 10)`, clamped 15–180 (Metro Manila average) |
| `pickupTime` | `appointment − earlyArrival − travel − boarding − stairAssist`. `earlyArrival` = 30 for dialysis, otherwise 15; `boarding` = 10 (+10 if `wav_ramp_van`); `stairAssist` = 15 if crew = 2; the result is floored to 5 minutes. `null` if no appointment time |
| `quote` / `fare` | Itemised one-way estimate; see §3.5. **Estimate only, no payment** |
| `companionHours` | Billable hospital-companion hours (0, or 2–12) |
| `blocked` / `blockReason` | `true` if emergency or `not_supported` |

### 3.3 `TripPlan` (response of `/api/plan`)
```json
{ "extraction": TripExtraction, "assessment": Assessment, "driverBrief": ["string"],
  "options": { "distanceKm": 6.5, "distanceSource": "estimated|default|caregiver", "companionHours": 0 },
  "route": { "note": "...", "pickupCity": "Pasig", "hospital": "...", "nearestHospitals": [{ "name": "...", "km": 6.5 }] },
  "emergency": false, "source": "ai" }
```
If the emergency pre-check fires, the response is `{ "emergency": true, "message": "...call 911..." }` and the AI is **not** called.

### 3.5 Distance & Pricing (deterministic, `src/lib/geo.ts`, `src/lib/rules.ts`)
**Distance:** pickup = centroid of the named Metro Manila city/municipality (19 areas); destination = a curated list of 15 major hospitals (approximate coordinates). Road km = straight-line × 1.35, minimum 2 km, rounded to 0.5 km. If no hospital is named, the plan is priced to the **nearest hospital** and the 3 nearest are listed. If the pickup city is unknown, 10 km is used and the caregiver is asked to adjust. The caregiver can always override the km.

**One-way transport fare (base includes the first 5 km):**

| Distance band | Assist sedan | Wheelchair van (WAV) |
|---|---|---|
| Base fare | ₱350 | ₱900 |
| 0–5 km | +₱0 | +₱0 |
| 5.1–10 km | +₱150 | +₱300 |
| 10.1–20 km | +₱400 | +₱750 |
| 20.1–40 km | +₱900 | +₱1,600 |
| Over 40 km | +₱900 + ₱30/km beyond 40 | +₱1,600 + ₱50/km beyond 40 |

Add-ons: second crew member +₱300; stair assist +₱100 per floor (only when crew = 2); **wheelchair provided ₱150 per trip**.
**Senior Citizen / PWD discount:** 20% of the ride fare (base + distance + crew + stairs), rounded to the peso, per RA 9994 and RA 10754; not applied to the wheelchair or companion add-ons. The ID is checked by the driver; the ID number is never stored.
**Hospital companion (optional):** ₱250/hour, minimum 2 h, maximum 12 h. A trained companion stays with the patient inside the hospital (registration, waiting, wheelchair transfers) until the appointment is completed. Default hours when requested: dialysis 5, chemotherapy 6, check-up 3, discharge 3, therapy 2, other 3.
**Range:** transport subtotal ±15% (traffic) rounded to ₱10; the companion fee is fixed. Total = transport + companion.

### 3.4 Errors
| Case | HTTP | Body |
|---|---|---|
| Validation failure | 400 | `{ error: "friendly message", issues: [...] }` |
| Rate limited (> 10 analyses / 10 min / IP) | 429 | `{ error }` |
| `OPENAI_API_KEY` missing | 503 | `{ error: "AI not configured" }` |
| AI/provider failure or invalid AI JSON | 502 | `{ error: "Could not analyse, please try again" }` — no stack traces |

---

## 4. AI Module Design
- **Library:** Vercel AI SDK `generateObject()` with `@ai-sdk/openai`; model from `OPENAI_MODEL` (default `gpt-4o-mini`). The provider is OpenAI directly, or OpenRouter when the key starts with `sk-or-` (same OpenAI model, `openai/gpt-4o-mini`), `temperature: 0`. Timeout 20 s via `AbortSignal`, `maxRetries: 1`.
- **Schema enforcement:** the zod schema is passed to `generateObject`, so the provider returns schema-conformant JSON. The result is then **normalised** (clamping, date/time format checks, de-duplication) by `normalizeExtraction()`.
- **System prompt (summary)**, kept in `src/lib/prompt.ts`:
  1. Role: intake assistant for non-emergency accessible transport in Metro Manila.
  2. Understand English, Filipino and Taglish.
  3. Resolve relative dates ("Tuesday", "bukas") against today's date in Asia/Manila, which is supplied in the prompt.
  4. Never invent facts: use `null`/`unknown` and add an item to `missingInfo` instead.
  5. Set `emergencySignals = true` for any sign of acute illness.
  6. Do not include names, diagnoses or phone numbers in `caregiverSummary`.
- **Division of responsibility:** the AI only *understands language*. All safety-critical decisions (vehicle, crew, pickup time, blocking) are deterministic and unit-tested (§3.2).
- **Defence in depth for emergencies:** a keyword pre-check (`detectEmergency()`, English + Filipino) runs **before** the AI call, and the AI's `emergencySignals` flag is checked after it.

---

## 5. Acceptance Criteria (testable)
| ID | Criterion | Verified by |
|---|---|---|
| AC1 | Description shorter than 20 or longer than 1,500 chars → HTTP 400 with a message | `tests/validation.test.ts` |
| AC2 | Text containing "chest pain" / "hindi makahinga" / "unconscious" → `emergency: true`; the AI is not called | `tests/emergency.test.ts`, `tests/plan-route.test.ts` |
| AC3 | `wheelchair_must_stay_seated` → `wav_ramp_van`; `stretcher_bedbound` → `not_supported` + `blocked` | `tests/rules.test.ts` |
| AC4 | Wheelchair + 3 floors without elevator → `crewSize = 2` and checklist contains "stair assist" | `tests/rules.test.ts` |
| AC5 | 09:00 checkup, 45 min travel, sedan, crew 2 → pickup `07:35`; 09:00 dialysis, WAV, crew 1, 45 min → `07:25` | `tests/rules.test.ts` |
| AC6 | Missing appointment time → `pickupTime = null` and "appointment time" listed in `missingInfo` | `tests/rules.test.ts` |
| AC7 | Out-of-range AI numbers (floors 99, companions −1) are clamped to 20 and 0 | `tests/rules.test.ts` |
| AC8 | `/api/bookings` ignores a client-tampered fare/vehicle and recomputes it | `tests/bookings-route.test.ts` |
| AC9 | No secret values in the repo; `OPENAI_API_KEY` is only read in server code | CI gitleaks step + code review |
| AC10 | Sample F1 input yields the expected fields (live check) | Manual check on the deployed URL (`docs/eval-cases.md`) |
| AC11 | Distance: "Pasig" → "St. Luke's BGC" is estimated between 3 and 12 km; with no hospital named, the nearest is used; an unknown pickup uses 10 km; band boundaries 5 / 5.5 / 20 / 45 km price correctly | `tests/geo.test.ts`, `tests/rules.test.ts` |
| AC13 | Senior/PWD ticked: 20% off the ride fare only (₱1,200 fare → −₱240; wheelchair and companion not discounted); driver checklist includes the ID check | `tests/addons.test.ts` |
| AC14 | Wheelchair ticked: +₱150 line and "Bring a clean, checked wheelchair" first in the checklist | `tests/addons.test.ts` |
| AC15 | Step-1 tick boxes reach `/api/plan` (companion ticked → default hours) and `/api/bookings` stores them, recomputing the discount server-side | `tests/addons.test.ts` |
| AC16 | Insights: 4 plans + 2 requests → 50% conversion, "meets 40% target"; events hold no personal data; no data → "–" | `tests/insights.test.ts` |
| AC12 | Hospital companion: 3 h = ₱750, 1 h is billed as 2 h, 15 h is capped at 12 h; a WAV with 2 crew, 3 floors and 10 km totals ₱1,800; the server recomputes the companion fee on booking | `tests/rules.test.ts`, `tests/bookings-route.test.ts` |

---

## 6. Edge Cases & Error Handling
- Pure Filipino input ("Si lola naka-wheelchair, check-up sa PGH bukas alas-otso") → still extracted; the date is resolved to tomorrow.
- Multiple patients in one message → the AI adds "one patient per booking" to `missingInfo`, and the UI asks the caregiver to split the request.
- Appointment already in the past → shown as a warning; booking still allowed (the caregiver may be planning a recurring trip).
- AI returns malformed output → 502 with a retry message; nothing is stored.
- Supabase down → booking returns 503 "Could not save, try again"; the plan is kept on screen.
- Prompt injection inside the description ("ignore previous instructions…") → harmless, because the output is constrained to the schema and the rules recompute everything safety-related.

---

## 7. Non-Functional & Security Requirements
- No secrets in client bundles: only server routes read env vars; `.env*` files are git-ignored; `.env.example` ships with blank values.
- Supabase: Row Level Security **enabled with no anon policies**; the server writes with the service-role key; the dispatcher board masks contact names (e.g., "L***").
- Data minimisation: no full names, diagnoses or exact home addresses are required (pickup *area* only); Senior/PWD stored as a yes/no flag, never the ID number.
- Consent: the confirm form requires explicit consent that names the health information (mobility needs) and links to `/privacy` (RA 10173) and `/terms` (RA 11967 redress mechanism).
- Monitoring: Vercel Web Analytics for page views and visitors; funnel events (`trip_analyzed`, `booking_confirmed`, `emergency_redirect`) are recorded server-side in Supabase `app_events` (non-personal flags only) and shown in the **Insights** panel on `/dispatch` (last 30 days, conversion vs the 40% target). Vercel custom events need a Pro plan, so this keeps the funnel free. `GET /api/health` returns `{ status, ai, storage }`.
- Accessibility: large tap targets (≥ 44 px), labelled inputs, WCAG AA contrast, works at 360 px width.
- Performance: p95 `/api/plan` < 10 s with `gpt-4o-mini`.

---

## 8. Revision Log
| Version | Change | Reason (from review) |
|---|---|---|
| 1.0 | Initial spec: the AI produced the vehicle type and pickup time directly | — |
| 1.1 | Moved vehicle, crew, pickup-time and fare decisions **out of the AI into deterministic rules** | Review: safety-critical outputs must be testable and repeatable; LLM output can vary |
| 1.1 | Added the keyword emergency pre-check *before* the AI call | Review: don't rely on the model alone for red flags, and don't spend tokens on emergencies |
| 1.1 | Server recomputes the assessment on `/api/bookings` | Review: a client could tamper with the fare or vehicle in the request body |
| 1.1 | Added rate limiting and the 20 s timeout | Review: protect the OpenAI budget and keep the UI responsive |
| 1.1 | Replaced "exact address" with "pickup area"; masked names on the board | Review: Data Privacy Act data-minimisation |
| 1.2 | Replaced the flat fare with **distance-band pricing** plus an itemised quote; added the nearest-hospital estimate | Stakeholder review (founder): customers want to know the cost from their location to the (nearest) hospital |
| 1.2 | Added the optional **hospital companion** service (hourly, until the appointment is completed) | Stakeholder review: a second revenue line, and caregivers often cannot stay at the hospital |
| 1.4 | Funnel events stored in Supabase and shown in a dispatcher **Insights** panel | Vercel custom events are not available on the free Hobby plan |
| 1.3 | Added step-1 **tick boxes** (wheelchair, hospital companion/caregiver, Senior/PWD) | Stakeholder review: choices must be visible up front, not hidden in the text |
| 1.3 | Added the statutory **20% Senior/PWD fare discount**, Privacy Notice, Terms and stronger consent | Compliance review against RA 9994, RA 10754, RA 10173, RA 11967, DOH AO 2018-0001 (see `docs/03-regulatory-compliance.md`) |
| 1.2 | Replaced the `travelMinutes` input with `distanceKm`; travel time is now derived from km | Fewer inputs for caregivers; one number drives both price and pickup time |
