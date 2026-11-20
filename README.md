# Care Ride at your service-PH ♿🚐

[![CI](https://github.com/feladelpobre/Care-Ride-at-your-service-PH/actions/workflows/ci.yml/badge.svg)](https://github.com/feladelpobre/Care-Ride-at-your-service-PH/actions/workflows/ci.yml)

**Wheelchair-safe rides to the hospital, planned in one message.**
A caregiver describes the trip in plain English or Taglish. Care Ride's AI turns it into a structured ride plan: the right vehicle, crew size, pickup time, a distance-based price estimate, an optional hospital companion, and a driver brief.

🔗 **Live app:** https://care-ride-at-your-service-ph.vercel.app · 🎬 **Demo video (2 min):** DEMO_LINK · 📄 **Reflection:** [`docs/reflection.md`](docs/reflection.md) · 🗂️ **Case File:** https://care-ride-at-your-service-ph.vercel.app/case

> **Opening the app:** a quick Cloudflare "I am human" check runs each time the app is opened (it usually passes on its own in a second). Works in incognito.

> Built for Week 4 Graded Mini Project 4.2 (AI-Powered Web Application) by Feladel "Peng" Pobre.

📱 **Scan to open the app:** <br><img src="docs/assets/care-ride-qr.png" alt="QR code that opens the Care Ride app" width="160"><br>How riders will find us (QR posters, hashtags, captions): [`docs/04-launch-plan.md`](docs/04-launch-plan.md)

---

## The problem
In a 2024 PGH study of 413 wheelchair users, **82.3% named accessibility as their top barrier** to hospital follow-ups. Philippine public transport isn't built for wheelchairs, and the few accessible vans are booked by phone, so caregivers re-explain stairs, wheelchair type and equipment every time. Full evidence is in the [Idea Validation Report](docs/01-idea-validation.md).

## What it does
| | Feature |
|---|---|
| 🤖 | **AI trip intake:** free text (English/Filipino/Taglish) → structured trip details via the Vercel AI SDK `generateObject()` + zod schema |
| 🦽 | **Mobility assessment:** deterministic rules pick an assist sedan or a ramp/lift van, 1 or 2 crew, and a stair-assist checklist |
| 📝 | **Everything in step 1, then one tap:** pickup, destination, how the patient moves, caregiver hours, appointment date/time and pick-up time; "Plan my ride" returns the full plan and total cost |
| 📍 | **GPS pickup (optional):** "Use my current location" measures the distance from the phone's position anywhere in the Philippines (rounded to ~100 m, never stored); trips over 60 km are flagged for the dispatcher |
| 💸 | **System-calculated distance and price:** the rider never types km; known hospitals or the destination's area (dash-insensitive); bands 0–5 / 5–10 / 10–20 / 20–40 / 40+ km; itemised quote; the server recalculates on booking |
| ⏰ | **Pick-up time:** the app suggests the latest safe time (early arrival, travel, boarding, stairs); the rider can choose their own and is warned if it's too late |
| 🧑‍⚕️ | **Hospital caregiver hours:** − / + buttons (none, then 2–12 h at ₱250/h); stays with the patient inside the hospital until the appointment is done |
| ☑️ | **Add-ons:** Wheelchair (₱150) · Senior Citizen/PWD 20% fare discount (RA 9994 / RA 10754) · max 1 family companion riding along |
| 🤖🛡️ | **"I am human" check:** Cloudflare Turnstile, confirmed on the server, before the app opens; the booking APIs refuse requests without the pass |
| ⚖️ | **Compliance built in:** Privacy Notice (Data Privacy Act), Terms with complaints/redress (Internet Transactions Act), non-emergency PTV positioning (DOH AO 2018-0001). See the [compliance plan](docs/03-regulatory-compliance.md) |
| ⭐ | **Feedback and complaints:** customers rate the service, driver and caregiver, report what went wrong (with time and names) and get an FB- ticket; safety reports are marked urgent; dispatchers see the average rating |
| 📱 | **Anti-fraud:** a PH mobile number is required for every request (confirmation call), with a limit of 3 requests per number per day |
| 🚨 | **Safety guardrails:** an emergency red-flag check runs *before* the AI and shows "Call 911"; stretcher cases are blocked; the server recomputes all prices |
| 📋 | **Dispatcher board (admin login):** every request shows its reference (e.g. CR-4D718C0B) and the date and time it was requested, with the driver brief; names masked for privacy |
| 📞 | **Call workflow:** a "To call now" bar on the board; one-tap Call buttons (number stays masked); mark rides "Called & confirmed", "Trip done" or "Cancelled", and feedback "Called back" or "Resolved"; urgent callbacks are due in 2 h, others in 24 h, overdue ones turn red |
| ❓ | **FAQ + "Ask a question" helper:** 18 answers on booking, calls, prices, safety and privacy; the AI only picks which FAQ answers the question (English or Filipino) and the app shows that answer word for word, so it can't invent prices; emergencies get "Call 911" first |

## Tech stack
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Vercel AI SDK + OpenAI `gpt-4o-mini` · zod · Supabase (Postgres + RLS) · Vitest · GitHub Actions · Vercel + Vercel Analytics

## Architecture (short)
```
Browser → Turnstile "I am human" → /api/human (server check, 1-h pass)
Browser → /api/plan → validate → emergency gate → AI extract (generateObject) → normalise
        → step-1 fields override AI → geo (GPS or area → hospital km) → rules (vehicle, crew, pickup, quote) → plan
Browser → /api/bookings → validate → RECOMPUTE plan on server → Supabase (RLS) → /dispatch
```
**Design principle: the AI understands language; deterministic, unit-tested rules make every safety and pricing decision.** Details: [`docs/architecture.md`](docs/architecture.md) · Spec: [`spec.md`](spec.md)

## Project documents
| Deliverable | File |
|---|---|
| Idea Validation Report (7 steps) | [`docs/01-idea-validation.md`](docs/01-idea-validation.md) |
| PRD (1 page) | [`docs/02-PRD.md`](docs/02-PRD.md) |
| Regulatory & healthcare compliance plan | [`docs/03-regulatory-compliance.md`](docs/03-regulatory-compliance.md) |
| Launch plan (QR code poster, hashtags, captions, metrics) | [`docs/04-launch-plan.md`](docs/04-launch-plan.md) |
| Spec (inputs, outputs, AI module, acceptance criteria, edge cases, revision log) | [`spec.md`](spec.md) |
| Architecture notes | [`docs/architecture.md`](docs/architecture.md) |
| AI agent rules | [`CLAUDE.md`](CLAUDE.md), [`.cursorrules`](.cursorrules) |
| AI golden-set evaluation (10/10 on the live app) | [`docs/eval-cases.md`](docs/eval-cases.md) |
| Demo script | [`docs/demo-script.md`](docs/demo-script.md) |
| Reflection | [`docs/reflection.md`](docs/reflection.md) |

## Submission checklist (Week 4 Graded Mini Project 4.2)
| Grading criterion | Where to find it |
|---|---|
| **Problem & Validation** | [Idea Validation Report](docs/01-idea-validation.md): all 7 steps, PGH evidence, target user, "why now" (Step 5) |
| **PRD Quality** | [PRD](docs/02-PRD.md): 6 components (problem, users, core features with acceptance criteria, out of scope, success metrics, open questions) |
| **Spec & Architecture** | [`spec.md`](spec.md) (context, inputs/outputs, behaviour rules, constraints, AC1–AC36) · [architecture notes](docs/architecture.md) · [`CLAUDE.md`](CLAUDE.md) · [`.cursorrules`](.cursorrules) |
| **Working Application** | https://care-ride-at-your-service-ph.vercel.app (QR above) · demo video: DEMO_LINK |
| **CI/CD & Engineering Quality** | [GitHub Actions](https://github.com/feladelpobre/Care-Ride-at-your-service-PH/actions) (gitleaks → lint → typecheck → 132 tests → build) · no hardcoded secrets · [commit history](https://github.com/feladelpobre/Care-Ride-at-your-service-PH/commits/main) · this README |
| Reflection (1 page) · v2 issue | [`docs/reflection.md`](docs/reflection.md) · [issue #1](https://github.com/feladelpobre/Care-Ride-at-your-service-PH/issues/1) |

## Run locally
```bash
git clone https://github.com/feladelpobre/Care-Ride-at-your-service-PH.git
cd Care-Ride-at-your-service-PH
npm install
cp .env.example .env.local     # then add your OPENAI_API_KEY
npm run dev                    # http://localhost:3000
```
Without the Supabase variables, bookings are kept in memory (demo mode).

### Environment variables
| Name | Required | Where it is used |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | Server only (`src/lib/ai.ts`). An OpenAI key, or an OpenRouter key (`sk-or-…`), which is routed through OpenRouter automatically |
| `OPENAI_BASE_URL` | optional | Override the OpenAI-compatible endpoint |
| `OPENAI_MODEL` | optional (default `gpt-4o-mini`) | Server only |
| `SUPABASE_URL` | optional | Server only (`src/lib/storage.ts`) |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server only; RLS blocks all public access |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | optional | Booking confirmation and 2-hour reminder emails |
| `CRON_SECRET` | optional | Protects `/api/reminders` (called by Supabase `pg_cron`) |
| `DISPATCH_USER`, `DISPATCH_PASSWORD` | for `/dispatch` | Dispatcher login; the board stays closed without them |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | optional | "I am human" check; the site key is public by design, the secret is server-only |

Secrets are never committed: `.env*` is git-ignored, the only `NEXT_PUBLIC_` value is the public Turnstile site key, and CI runs **gitleaks** over the full history.

### Database (optional)
Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor, then set the two Supabase env vars.

## Tests & CI
```bash
npm test          # 132 Vitest tests: rules, pricing, geo/GPS, validation, emergency gate, human check, API routes (AI mocked)
npm run lint && npm run typecheck && npm run build
```
GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and PR: **gitleaks secret scan → lint → typecheck → tests → build**. Vercel deploys previews for PRs and production from `main`.

Each acceptance criterion in `spec.md` (AC1–AC36) maps to a test file.

## Monitoring
- **Vercel Web Analytics:** visitors, page views, pages, countries, devices
- **Insights panel** on `/dispatch`: trips planned, ride requests, plan-to-request conversion vs the 40% PRD target, 911 redirects and add-on rates (last 30 days). Events are stored in Supabase with non-personal flags only, because Vercel custom events need a Pro plan
- **Health check:** `GET /api/health` → `{ status, ai, storage }` (never exposes secret values)

## Pricing (estimates only, no payments)
| Distance | Assist sedan | Wheelchair van |
|---|---|---|
| Base (incl. first 5 km) | ₱350 | ₱900 |
| 5.1–10 km | +₱150 | +₱300 |
| 10.1–20 km | +₱400 | +₱750 |
| 20.1–40 km | +₱900 | +₱1,600 |
| Over 40 km | +₱900 + ₱30/km | +₱1,600 + ₱50/km |

Add-ons: second crew +₱300 · stair assist ₱100/floor · wheelchair provided ₱150 · hospital companion/caregiver ₱250/h (min 2 h). **Senior Citizen / PWD: 20% off the ride fare** (not the add-ons). Distances are calculated by the system, not typed: phone GPS or the area's centre → hospital, straight line × 1.35 road factor.

## Limitations & roadmap (v2)
See GitHub issue [#1 **"v2: Real road distance & traffic-aware ETA via maps API"**](https://github.com/feladelpobre/Care-Ride-at-your-service-PH/issues/1). Also planned: SMS one-time code (OTP) to verify the mobile number, a public `/share` page so link previews and search work despite the human check, round-trip pricing, individual staff accounts with password reset by email, an acceptance flow, SMS/Viber notifications.

## Privacy
Demo data only. The app asks for a pickup *area* (not a home address) and never asks for diagnoses; the optional GPS position is rounded and used only for the distance, never stored. The dispatcher board at `/dispatch` needs an admin login (`DISPATCH_USER` / `DISPATCH_PASSWORD`) and masks contact names, numbers and emails. Designed with the PH Data Privacy Act (RA 10173) in mind.
