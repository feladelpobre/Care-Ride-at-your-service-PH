# spec.md — CareRide PH

**Version:** 1.1 (revised after review; see §8) · **Source PRD:** `docs/02-PRD.md` · **Architecture:** `docs/architecture.md`

---

## 1. Purpose & Scope
A responsive web app where a caregiver describes a hospital or dialysis trip in plain English or Taglish. The system returns a **trip plan**: structured trip details, a mobility assessment (vehicle type, crew size, assist checklist), a suggested pickup time, a fare estimate and a driver brief. The caregiver confirms, and the booking appears on a dispatcher board.

**AI capability type:** *extraction + classification* (unstructured text → schema-validated JSON). It is not a chatbot.

In scope: PRD features F1–F5. Out of scope: everything in PRD §4.

---

## 2. Inputs

### 2.1 `POST /api/plan` — analyse a trip
```json
{ "description": "string, 20–1500 chars", "travelMinutes": 45 }
```
| Field | Rule |
|---|---|
| `description` | Required. Trimmed. 20–1,500 characters. Control characters stripped. |
| `travelMinutes` | Optional integer 10–180; default **45** (typical Metro Manila estimate; caregiver-editable). |

### 2.2 `POST /api/bookings` — confirm a booking
```json
{ "contactName": "string 2–60", "contactPhone": "PH mobile, optional", "plan": TripPlan }
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
| `emergencySignals` | boolean |
| `missingInfo` | string[] |
| `caregiverSummary` | string (≤ 280 chars) |

### 3.2 `Assessment` (produced by deterministic rules in `src/lib/rules.ts`)
| Field | Rule |
|---|---|
| `vehicle` | `stretcher_bedbound` → `not_supported`; `wheelchair_must_stay_seated` or `unknown` → `wav_ramp_van`; `wheelchair_can_transfer` / `walks_with_assistance` → `sedan_assist`. Any `oxygen_tank` upgrades a sedan to `wav_ramp_van` |
| `crewSize` | 2 if (any wheelchair mobility AND `floorsWithoutElevator ≥ 1`); otherwise 1 |
| `assistChecklist` | Generated from mobility, floors, equipment and companions |
| `pickupTime` | `appointment − earlyArrival − travel − boarding − stairAssist`. `earlyArrival` = 30 for dialysis, otherwise 15; `boarding` = 10 (+10 if `wav_ramp_van`); `stairAssist` = 15 if crew = 2; the result is floored to 5 minutes. `null` if no appointment time |
| `fare` | Base ₱350 (sedan) / ₱900 (WAV), +₱300 for a second crew member, +₱100 per floor of stair assist, ±15% range, rounded to ₱10. **Estimate only** |
| `blocked` / `blockReason` | `true` if emergency or `not_supported` |

### 3.3 `TripPlan` (response of `/api/plan`)
```json
{ "extraction": TripExtraction, "assessment": Assessment, "driverBrief": ["string"], "emergency": false, "source": "ai" }
```
If the emergency pre-check fires, the response is `{ "emergency": true, "message": "...call 911..." }` and the AI is **not** called.

### 3.4 Errors
| Case | HTTP | Body |
|---|---|---|
| Validation failure | 400 | `{ error: "friendly message", issues: [...] }` |
| Rate limited (> 10 analyses / 10 min / IP) | 429 | `{ error }` |
| `OPENAI_API_KEY` missing | 503 | `{ error: "AI not configured" }` |
| AI/provider failure or invalid AI JSON | 502 | `{ error: "Could not analyse, please try again" }` — no stack traces |

---

## 4. AI Module Design
- **Library:** Vercel AI SDK `generateObject()` with `@ai-sdk/openai`; model from `OPENAI_MODEL` (default `gpt-4o-mini`), `temperature: 0`. Timeout 20 s via `AbortSignal`, `maxRetries: 1`.
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
- Data minimisation: no full names, diagnoses or exact home addresses are required (pickup *area* only).
- Monitoring: Vercel Analytics (page views + `trip_analyzed`, `booking_confirmed`, `emergency_redirect` events); `GET /api/health` returns `{ status, ai, storage }`.
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
