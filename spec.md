# spec.md — Care Ride at your service-PH

**Version:** 1.7 (revised after review; see §8) · **Source PRD:** `docs/02-PRD.md` · **Architecture:** `docs/architecture.md`

---

## 1. Purpose & Scope
A responsive web app where a caregiver describes a hospital or dialysis trip in plain English or Taglish. The system returns a **trip plan**: structured trip details, a mobility assessment (vehicle type, crew size, assist checklist), a suggested pickup time, a fare estimate and a driver brief. The caregiver confirms, and the booking appears on a dispatcher board.

**AI capability type:** *extraction + classification* (unstructured text → schema-validated JSON). It is not a chatbot.

In scope: PRD features F1–F7. Regulatory mapping: `docs/03-regulatory-compliance.md`. Out of scope: everything in PRD §4.

---

## 2. Inputs

### 2.1 `POST /api/plan` — analyse a trip
```json
{ "description": "string, 20–1500 chars", "pickupLocation": "Kapitolyo, Pasig",
  "destination": "St. Luke's Medical Center – BGC", "companionHours": 3,
  "addons": { "wheelchair": false, "companion": false, "seniorPwd": false } }
```
| Field | Rule |
|---|---|
| `description` | Required. Trimmed. 20–1,500 characters. Control characters stripped. |
| `pickupLocation` | Required (after the emergency gate). Barangay and city; replaces the AI's guess (AC21). |
| `destination` | Required (after the emergency gate). Hospital or clinic; replaces the AI's guess (AC25). |
| `distanceKm` | **Not accepted.** The distance is always calculated by the system from pickup and destination (§3.5, AC26); a value sent by the client is dropped. |
| `companionHours` | Optional integer 0–12. If omitted: the default for the trip purpose when the companion box is ticked or the message asks for one, otherwise 0. |
| `addons` | Step-1 tick boxes: `wheelchair` (we bring one, ₱150), `companion` (hospital companion/caregiver), `seniorPwd` (20% fare discount). All default `false`. |

### 2.2 `POST /api/bookings` — confirm a booking
```json
{ "contactName": "string 2–60", "contactPhone": "PH mobile, required", "plan": TripPlan /* incl. options.distanceKm, options.companionHours */ }
```
- `contactPhone` is **required** (anti-fraud and confirmation call). Accepts `09XXXXXXXXX` or `+639XXXXXXXXX` (spaces/dashes allowed) and is stored as `09XXXXXXXXX`.
- **Anti-fraud cap:** at most 3 ride requests per mobile number in 24 hours; the 4th returns HTTP 429. SMS one-time-code (OTP) verification is planned for v2.
- `plan` is re-validated against the `TripPlan` schema, and the **server recomputes the assessment** from `plan.extraction`. Client-supplied vehicle, crew or fare values are never trusted.

### 2.3 Environment (server-only)
`OPENAI_API_KEY` (required for AI), `OPENAI_MODEL` (default `gpt-4o-mini`), `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (optional; without them an in-memory store is used). Email: `SMTP_HOST` (default `smtp.gmail.com`), `SMTP_PORT` (default 465), `SMTP_USER`, `SMTP_PASS` (a Gmail **app password**, never the account password), `MAIL_FROM`; without `SMTP_USER`/`SMTP_PASS` emails are skipped and the booking still succeeds. `CRON_SECRET` protects `/api/reminders`. `DISPATCH_USER` and `DISPATCH_PASSWORD` protect `/dispatch` (admin login; if unset, the board is closed).

### 2.4 `GET|POST /api/reminders` (scheduled)
Called every 10 minutes by a Supabase `pg_cron` job (Vercel Hobby cron can only run once a day) with `Authorization: Bearer <CRON_SECRET>`. Emails each pending booking whose pickup (appointment date + pickup time, Manila) is within the next 2 hours, once (`reminder_sent_at`).

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
| `companions` | integer 0–1 (clamped): **maximum of 1 companion** rides along; if the message asks for more, "only 1 companion can ride along with the patient" is added to `missingInfo` (AC27) |
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
  "options": { "distanceKm": 6.5, "distanceSource": "estimated|default", "companionHours": 0 },
  "route": { "note": "...", "pickupCity": "Pasig", "hospital": "...", "nearestHospitals": [{ "name": "...", "km": 6.5 }] },
  "emergency": false, "source": "ai" }
```
If the emergency pre-check fires, the response is `{ "emergency": true, "message": "...call 911..." }` and the AI is **not** called.

### 3.5 Distance & Pricing (deterministic, `src/lib/geo.ts`, `src/lib/rules.ts`)
**Distance:** pickup = the phone's GPS position when the caregiver taps "Use my current location" (AC29), otherwise the centroid of the named Metro Manila city/municipality (19 areas); destination = a curated list of 15 major hospitals (approximate coordinates). Road km = straight-line × 1.35, minimum 2 km, rounded to 0.5 km. If no hospital is named, the plan is priced to the **nearest hospital** and the 3 nearest are listed. If the hospital is not on the list, the **area written in the destination** (city or a known barangay/district, e.g., "Healthway Clinic, Mandaluyong") is used instead. If neither the pickup area nor the destination's hospital or area can be found, 10 km is used and the dispatcher confirms the distance on the confirmation call. **The caregiver never types the distance**: it is recalculated whenever the pickup area or hospital changes, and `/api/bookings` recalculates it again on the server (AC26). Hospital names are matched ignoring case, accents, dashes and extra spaces.

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
| AC2 | Text containing "chest pain" / "hindi makahinga" / "unconscious" → `emergency: true`; the AI is not called. In step 1 the "Call 911" message appears as soon as such words are typed, before any other field is required | `tests/emergency.test.ts`, `tests/plan-route.test.ts` |
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
| AC19 | Feedback at `/feedback`: needs a matching booking reference + mobile number (else 404); returns an `FB-` ticket; safety → urgent, ≤2 stars or callback → high; max 3 per booking; incident time can't be in the future or before the ride was requested (400); shown on `/dispatch` with ratings, issue types, incident time, driver/caregiver names | `tests/feedback.test.ts` |
| AC20 | A ride request needs pickup area, hospital/clinic, appointment date, appointment time and how the patient moves ("unknown" doesn't count). Missing ones are listed in red in step 2, their fields are marked, and the request button stays off; the server also refuses (400) and names them | `tests/required.test.ts` |
| AC21 | Step 1 has a required **Pickup location** field; it replaces the AI's guess for `pickupArea`; an empty field returns 400 "Please enter the pickup location", but only *after* the emergency gate (an emergency message still gets 911) | `tests/plan-route.test.ts` |
| AC22 | A booking needs a valid **email** (400 otherwise, saved lower-case); right after saving, a confirmation email with the `CR-` reference, trip details and the 911 note is sent; if email fails the booking is still saved and the page asks for a screenshot; the dispatcher shows the email masked (`gi***@gmail.com`) | `tests/notifications.test.ts` |
| AC23 | `/api/reminders` refuses calls without the cron secret (401); emails a reminder when pickup is within the next 2 hours (not before, not after pickup), and only once per booking | `tests/notifications.test.ts` |
| AC24 | `/dispatch` is admin-only: visitors without a valid session are sent to `/admin/login`; the login checks `DISPATCH_USER`/`DISPATCH_PASSWORD` (wrong → 401, 5 tries per 15 min → 429, not set up → 503) and sets an HttpOnly, SameSite=Strict cookie signed with HMAC-SHA256, valid 12 h; changing the password logs everyone out; **Log out** clears it; the board is `noindex` and not cached; the menu shows Book a ride · Feedback · 🔒 Dispatcher; the Dispatcher link leads non-staff to the login page | `tests/admin-auth.test.ts` |
| AC25 | Step 1 has a required **Destination (hospital or clinic)** field with a list of known hospitals; it replaces the AI's guess for `destination`; an empty field returns 400 "Please enter the destination", but only *after* the emergency gate. The trip box shows an example as its placeholder; there are no "Try example" buttons | `tests/plan-route.test.ts` |
| AC26 | The **distance is calculated by the system**, never typed: step 3 shows it read-only; a `distanceKm` sent to `/api/plan` is ignored; `/api/bookings` recalculates it from pickup + destination and ignores a tampered `options.distanceKm`; "St. Luke's Medical Center BGC" (no dash) matches St. Luke's BGC; a destination not on the hospital list is read by its area ("Healthway Clinic - Las-Pinas" = "Healthway Clinic, Las Pinas"), and 10 km is used only when neither is known | `tests/plan-route.test.ts`, `tests/bookings-route.test.ts`, `tests/validation.test.ts`, `tests/geo.test.ts` |
| AC27 | Step 1's hint asks the caregiver to describe the rider (stairs, equipment, reason for the trip, who rides along) and says a maximum of 1 companion can ride along; places and times have their own fields (AC30); companions are clamped to 0–1 and asking for more adds a note; a booking plan with 2 companions is rejected | `tests/rules.test.ts` |
| AC28 | **"I am human" check** before the app opens: when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set, `/` and `/feedback` send visitors without a valid `cr_human` cookie to `/verify?next=…` (local paths only), and `/api/plan`, `/api/bookings`, `/api/feedback` return 403. `/api/human` confirms the Cloudflare Turnstile token on the server (failed → 403 "The check didn't pass…", 20 tries per 10 min) and sets an HttpOnly, SameSite=Lax cookie signed with HMAC-SHA256, valid 1 h. The check also runs again on **every new opening** of the app (new tab, link or QR scan) via a per-tab sessionStorage marker; refreshing the same tab doesn't ask again. Without both keys the check is off. `/verify` always shows the Call 911 button | `tests/human-check.test.ts` |
| AC29 | **GPS pickup**: "Use my current location" works even with the pickup field empty and fills in the town and province (e.g. "Santa Rosa, Laguna (GPS)", or "Pasig, Metro Manila"); it sends the phone position rounded to 3 decimals (~110 m); the distance is measured from it instead of the city centre (Kapitolyo GPS → St. Luke's BGC = 3 km vs 6.5 km from the Pasig centre); works anywhere in the Philippines (positions outside the country are ignored); trips over 60 km get a note that they're outside the usual Greater Manila area and the dispatcher confirms the price; the booking recalculates from it; the position is never stored | `tests/step1-inputs.test.ts`, `tests/place-name.test.ts` |
| AC30 | **Step 1 collects everything before "Plan my ride"**: pickup (+GPS), destination, how the patient moves, caregiver hours, appointment date and time, pick-up time; these replace the AI's guesses and their reminders. Caregiver hours use − / + buttons: none → 2 (minimum) → … → 12, and down from 2 to none | `tests/step1-inputs.test.ts` |
| AC31 | **Rider's pick-up time**: used when given; the app also shows the suggested (latest safe) time; if the rider's time is later, a warning offers the suggested time ("at or after the appointment" when it is); the price doesn't change | `tests/step1-inputs.test.ts` |
| AC32 | **Public Case File** at `/case`: not behind the human check (readable by search engines and link previews); tells the story (problem, 7 validation steps, live-test fixes, PRD, architecture, worked fare, compliance, quality, launch, grading map); the worked fare is computed by the same rules as the app; every acceptance criterion it cites exists in this spec | `tests/case-file.test.ts` |
| AC33 | **Step 1 is filled in order**: description (≥ 20 characters) → pickup (typed or GPS) → destination → how the patient moves → caregiver hours and appointment date → appointment time → pick-up time, add-ons and "Plan my ride". Each later part is locked (disabled, greyed with a dashed outline and a "🔒 Locked: fill in … first" label at the top) until the earlier ones are done; the part to fill in now is outlined in red with "👉 Next: fill this in (required)", and re-locks if an earlier one is cleared; a "Next: fill in …" line names the next part. The "Call 911" warning still appears at once | `tests/step-gate.test.ts` |
| AC34 | **Typed date and time** in step 1 instead of scrolling wheels: the date box takes MM/DD/YYYY (slashes added while typing; impossible dates like 02/30 and past dates are refused with a red hint); the time boxes take hh:mm AM/PM ("9:00 AM", "9am", "2:30pm") or 24-hour ("14:30"); "9:00" without AM/PM is refused as ambiguous. Each box shows the pattern as a guide; times are shown back as hh:mm AM/PM. The feedback form's "When did it happen?" uses the same typed date (no future dates) and time boxes | `tests/date-text.test.ts` |
| AC35 | **Dispatcher call workflow** (keeps the "we'll call you" promises): a "To call now" bar counts ride requests still to confirm by phone, promised feedback callbacks (urgent within 2 h, high priority within 24 h) and overdue ones (red, "call first"). Each pending ride request shows a staff-only "📞 Call 0917 *** 4567" button (dials the full number; the screen stays masked) and buttons to mark it "Called & confirmed", "Trip done" or "Cancelled"; feedback tickets owed a call show "Call back by …" and "Called back" / "Resolved". `POST /api/admin/status` checks the admin login cookie (401 without it), refuses other sites (403), accepts only the database's status values (booking: pending, confirmed, completed, cancelled; feedback: open, in_progress, resolved) and returns 404 for unknown ids. Confirmed trips still get the reminder email. The login page explains "Forgot the password? Ask the Care Ride admin to reset it" (one shared staff login; staff can also log in by email link (AC39); individual accounts with their own passwords are planned for v2) | `tests/call-workflow.test.ts` |
| AC36 | **FAQ page and "Ask a question" helper** at `/faq` (behind the "I am human" check, like `/feedback`), linked in the menu and footer: 19 questions on booking, calls, prices, safety (incl. rain, floods and typhoons) and privacy; prices are read from the pricing rules. `POST /api/faq` checks for emergencies first (911 message, the AI is never called), allows 20 questions per device per 10 minutes, then the AI only **chooses which FAQ entry** answers the question (English, Filipino or Taglish) or "none"; the reply is that entry's stored answer word for word, or "Sorry, I can only answer questions about Care Ride from our FAQ…". If the AI is off or fails, keyword search answers instead | `tests/faq.test.ts` |
| AC37 | **GPS first for the pickup location, and towns outside Metro Manila**: in step 1 the pickup box opens with a main "Use my current location (GPS)" button; the typed box stays locked ("Tap the GPS button first") until GPS has been tried. GPS fills in barangay, city and province (BigDataCloud, with the barangay from OpenStreetMap when BigDataCloud lacks it; some spots have no mapped barangay); if that isn't the pick-up place, the rider types the correct barangay and city, which replaces the GPS position for the distance. If location is refused, unavailable or outside the Philippines, typing opens with a message. The distance map adds nearby provinces (Rizal, Cavite, Laguna, Bulacan, Pampanga, Batangas) and major cities (Baguio, Cebu, Mandaue, Lapu-Lapu, Iloilo, Bacolod, Cagayan de Oro, Davao, General Santos, Zamboanga), so typed towns there are measured instead of the 10 km default; "nearest hospitals" lists only hospitals within 60 km | `tests/step-gate.test.ts`, `tests/geo.test.ts` |
| AC38 | **Typed pick-up spot is a street or landmark, found on the map**: when GPS isn't the pick-up place (or isn't available), the box asks for "the street or a nearby landmark, barangay and city (no house number)". Leaving the box, or tapping "Find this spot on the map", looks it up on OpenStreetMap's Nominatim, with Photon (Komoot) as a backup, Philippines only, never while typing, waiting 10 s per service and trying shorter versions of the text ("Nuvali, Canlubang, Calamba" → "Nuvali, Calamba" → "Nuvali, Canlubang"; "near" and "(GPS)" dropped), at most 1 search per second; if found, the distance is measured from that spot (rounded to ~110 m, never stored) and the screen says "Found on the map: …"; if not, it falls back to the barangay/city with a hint to try a landmark. House, block/lot and unit numbers ("123 Rizal St", "#45", "Blk 3 Lot 12", "Unit 5B") get a request to leave them out; the driver calls for the gate | `tests/place-name.test.ts` |
| AC39 | **Staff login by email link** (when the username or password is forgotten and the admin is away): under "Forgot the username or password?" on `/admin/login`, staff enter their work email. If it is on `DISPATCH_STAFF_EMAILS` (set in Vercel; case and spaces ignored), `POST /api/admin/login-link` emails a link to `/admin/link?token=…` valid **15 minutes**, signed with the session key (a changed password or an email removed from the list kills it). Everyone gets the same answer ("If this email is on the Care Ride staff list, we've sent a login link…"), so staff emails can't be probed; 5 requests per device and 3 links per email per 15 minutes; the link always points to the real site, never the request's Host. The link page's "Log in" button posts the token from our own site (email scanners opening the link can't log in), sets the 12-hour admin cookie and opens `/dispatch`; an expired or fake link returns to the login page with "That login link has expired". The email address is never logged | `tests/staff-login-link.test.ts` |
| AC40 | **New-request alert to the app's mailbox**: after every saved ride request, besides the rider's confirmation, an email "New ride request CR-… · date time" goes to `DISPATCH_NOTIFY_EMAIL`, or the app's own mailbox (`SMTP_USER`) if that isn't set. It lists the trip, vehicle, price range and add-ons, asks the dispatcher to call before any van is sent, links to `/dispatch`, and shows the contact masked (name "G***", phone "0929 *** 0701"; no email address). A failed alert never loses the booking; no mailbox set → no alert | `tests/notifications.test.ts` |
| AC18 | Booking without a mobile number (or empty) → 400 "Please enter a mobile number…"; the 4th request from the same number within 24 h → 429; dispatcher shows the number masked (0917 *** 4567) | `tests/bookings-route.test.ts`, `tests/validation.test.ts` |
| AC17 | Every confirmed request gets a reference (`CR-` + 8 characters) and its request date/time; both appear on the confirmation and on the dispatcher card (Manila time) | `tests/bookings-route.test.ts` |
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
- Supabase: Row Level Security **enabled with no anon policies**; the server writes with the service-role key; the dispatcher board masks contact names (e.g., "L***") and numbers; the staff-only Call button dials the full number without showing it (AC35).
- Data minimisation: no full names, diagnoses or exact home addresses are required (pickup *area* only); Senior/PWD stored as a yes/no flag, never the ID number. The optional GPS pickup position is rounded to ~110 m, used only to compute the distance and to look up the barangay and town (BigDataCloud's and OpenStreetMap Nominatim's free client-side reverse geocoding receive only the rounded position; one lookup per GPS tap; a typed street or landmark is looked up once on OpenStreetMap only when the rider leaves the box or taps "Find this spot on the map", and house numbers are discouraged), and never stored or logged (AC29).
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
| 1.31 | New-request alert email to the app's mailbox (AC40); the staff email list ignores quotes, <>, "mailto:" (AC39) | Founder test: the app's main mailbox got nothing when riders booked; a typed staff email wasn't recognised (log: onList=no) |
| 1.30 | Login help reads "Forgot the username or password?": the email link needs neither (AC39) | Founder question: what if a dispatcher forgets the username? |
| 1.29 | Dispatcher username ignores capital letters, and the phone no longer auto-capitalises it (the password stays exact) (AC24) | Founder iPhone test: the username box became "Peng-admin", so the login failed and locked for 15 minutes |
| 1.28 | Staff can log in with an emailed 15-minute link when they forget the password (AC39) | Founder review: if the only admin is on leave abroad, nobody else could reset the shared password |
| 1.27 | Spot search made sturdier: backup service (Photon), 10 s wait, shorter retries | Founder phone test: "Nuvali, Canlubang, Calamba" showed "we couldn't find that spot", though the map has it (the phone's request failed) |
| 1.26 | The correction box asks for a street or nearby landmark (no house number) and finds it on OpenStreetMap to measure the distance (AC38); data minimisation kept: still no house numbers | Founder phone test: barangay and city are too wide to locate the pick-up |
| 1.25 | GPS is the main, required first step for the pickup; typing only corrects it (AC37). Distance map covers nearby provinces and major PH cities | Founder review: riders from outside Metro Manila typed towns the app didn't know (priced at a default 10 km); GPS gives the barangay and city automatically |
| 1.24 | Trip-intake AI instructions say riders may be anywhere in the Philippines and keep the city or province they name | Founder review: don't limit riders to Metro Manila |
| 1.23 | FAQ adds "Do you still pick up during heavy rain, floods or a typhoon?"; FAQ wording no longer limits riders to Metro Manila | Founder review: riders will ask about bad weather, and riders can come from anywhere in the Philippines |
| 1.22 | Dispatcher call workflow (AC35), forgot-password note on the login page, and FAQ page with an AI helper that answers only from the FAQ (AC36). Urgent feedback promise changed from "as soon as possible" to "within 2 hours" so the board can track it | Founder review: riders are promised a call after booking and after feedback, but the board had no way to call, track or close those calls; staff had no "forgot password" help; riders need quick answers |
| 1.21 | Feedback "When did it happen?" uses the typed date and time boxes instead of the phone's date-time picker | Founder test on iPhone: the picker always showed the current time and couldn't be edited |
| 1.20 | Date and time are typed (MM/DD/YYYY, hh:mm AM/PM) instead of picked from scrolling wheels | Founder mobile test: adjusting the date and time wheels step by step took too long |
| 1.19 | Step 1 locks each part until the previous one is filled (not just "required") | Founder test: "how the patient moves" was skipped, yet caregiver hours could still be set |
| 1.18 | Public **Case File** page (`/case`) with the full project story and a fare computed live by the app's rules; also delivers the v2 "public share page" idea for link previews | Founder: wanted a detailed, original presentation of the project for graders |
| 1.17 | GPS fills in the pickup area by itself ("Santa Rosa, Laguna (GPS)") even when the field is empty; the button sits above the field; specific help when location is blocked, with a retry using a quicker fix | Founder test: outside Metro Manila GPS only showed "Current location (GPS)" and seemed not to work |
| 1.16 | "I am human" check runs on every new opening of the app; the pass lasts 1 hour instead of 24 | Founder: riders shouldn't need to know about incognito mode to be checked again |
| 1.15 | GPS pickup works anywhere in the Philippines; trips over 60 km are flagged for the dispatcher to confirm the price | Founder test: GPS didn't work outside Metro Manila |
| 1.14 | Step 1 now collects all inputs before "Plan my ride" (mobility, caregiver hours with − / + buttons, appointment date/time, pick-up time); optional **GPS** pickup for a more accurate distance; rider's pick-up time with a late warning | Founder mobile test: distance from the city centre was inaccurate, the hours box couldn't be changed on a phone, and the cost should be ready after one tap |
| 1.13 | "I am human" error now says "The check didn't pass… try another browser or turn off your VPN or ad blocker" | Founder test: the old text blamed the internet connection when Cloudflare simply didn't pass the browser |
| 1.12 | **"I am human" check** (Cloudflare Turnstile checkbox) before the app opens, confirmed on the server, remembered 24 h | Founder review: block bots and fake ride requests, like other booking apps (Turnstile / reCAPTCHA / hCaptcha) |
| 1.11 | Ride-along companions capped at **1**; step-1 hint rewritten (rider, appointment date/time, pick-up date/time) | Founder review: seats and crew planning assume one family companion |
| 1.10 | Required **destination** field in step 1; the **distance is calculated by the system only** (the km box was removed) and recalculated on the server; example 1 is the trip box placeholder | Founder review: riders were guessing the distance, which changes the price |
| 1.9 | Dispatcher board made **admin-only** with a login page (`/admin/login`, signed session cookie checked in `src/middleware.ts`), removed from the public menu; the browser pop-up login was replaced because in-app browsers don't show it | Privacy review: customers could open `/dispatch` and see other families' trips and feedback (RA 10173) |
| 1.8 | Required **pickup location** field in step 1; required details (pickup, hospital, date, time, mobility) block the request and are listed in red | User trial (4 testers): 2 didn't say how the patient moves, and the app silently chose the costliest van |
| 1.8 | Required **email**: confirmation with the `CR-` reference, and a reminder 2 hours before pickup (Supabase `pg_cron`, since Vercel Hobby cron is daily only) | User trial: a tester asked how she would know her request went through; no notification was sent |
| 1.7 | **Feedback system**: ratings (overall, driver, caregiver), on-time, issue types, incident date/time, driver/caregiver names, details, callback; urgent triage; dispatcher panel with average rating | Stakeholder review: customers need a way to rate service and report problems (also RA 11967 redress) |
| 1.6 | Mobile number made **required**; max 3 requests per number per 24 h; masked number on the dispatcher board | Stakeholder review: prevent fraudulent/fake requests and allow a confirmation call |
| 1.5 | Request date/time and `CR-` reference shown on confirmation and dispatcher cards | Stakeholder review: applications must be traceable by date |
| 1.4 | Funnel events stored in Supabase and shown in a dispatcher **Insights** panel | Vercel custom events are not available on the free Hobby plan |
| 1.3 | Added step-1 **tick boxes** (wheelchair, hospital companion/caregiver, Senior/PWD) | Stakeholder review: choices must be visible up front, not hidden in the text |
| 1.3 | Added the statutory **20% Senior/PWD fare discount**, Privacy Notice, Terms and stronger consent | Compliance review against RA 9994, RA 10754, RA 10173, RA 11967, DOH AO 2018-0001 (see `docs/03-regulatory-compliance.md`) |
| 1.2 | Replaced the `travelMinutes` input with `distanceKm`; travel time is now derived from km | Fewer inputs for caregivers; one number drives both price and pickup time |
