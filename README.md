# Care Ride at your service-PH ♿🚐

[![CI](https://github.com/feladelpobre/care-ride-at-your-service-ph/actions/workflows/ci.yml/badge.svg)](https://github.com/feladelpobre/care-ride-at-your-service-ph/actions/workflows/ci.yml)

**Wheelchair-safe rides to the hospital, planned in one message.**
A caregiver describes the trip in plain English or Taglish. Care Ride's AI turns it into a structured ride plan: the right vehicle, crew size, pickup time, a distance-based price estimate, an optional hospital companion, and a driver brief.

🔗 **Live app:** https://care-ride-at-your-service-ph.vercel.app · 🎬 **Demo video:** _add link_ · 📄 **Reflection:** [`docs/reflection.md`](docs/reflection.md)

> Built for Week 4 Graded Mini Project 4.2 (AI-Powered Web Application) by Feladel "Peng" Pobre.

---

## The problem
In a 2024 PGH study of 413 wheelchair users, **82.3% named accessibility as their top barrier** to hospital follow-ups. Philippine public transport isn't built for wheelchairs, and the few accessible vans are booked by phone, so caregivers re-explain stairs, wheelchair type and equipment every time. Full evidence is in the [Idea Validation Report](docs/01-idea-validation.md).

## What it does
| | Feature |
|---|---|
| 🤖 | **AI trip intake:** free text (English/Filipino/Taglish) → structured trip details via the Vercel AI SDK `generateObject()` + zod schema |
| 🦽 | **Mobility assessment:** deterministic rules pick an assist sedan or a ramp/lift van, 1 or 2 crew, and a stair-assist checklist |
| ⏰ | **Pickup time:** worked back from the appointment (early arrival, travel, boarding, stairs) |
| 💸 | **Distance-band price estimate:** pickup city → named **or nearest** hospital; bands 0–5 / 5–10 / 10–20 / 20–40 / 40+ km; itemised quote |
| 🧑‍⚕️ | **Hospital companion add-on:** ₱250/h (min 2 h), stays with the patient inside the hospital until the appointment is done |
| 🚨 | **Safety guardrails:** an emergency red-flag check runs *before* the AI and shows "Call 911"; stretcher cases are blocked; the server recomputes all prices |
| 📋 | **Dispatcher board:** confirmed requests with driver briefs; names masked for privacy |

## Tech stack
Next.js 14 (App Router) · TypeScript · Tailwind CSS · Vercel AI SDK + OpenAI `gpt-4o-mini` · zod · Supabase (Postgres + RLS) · Vitest · GitHub Actions · Vercel + Vercel Analytics

## Architecture (short)
```
Browser → /api/plan → validate → emergency gate → AI extract (generateObject) → normalise
        → geo (km to named/nearest hospital) → rules (vehicle, crew, pickup, quote) → plan
Browser → /api/bookings → validate → RECOMPUTE plan on server → Supabase (RLS) → /dispatch
```
**Design principle: the AI understands language; deterministic, unit-tested rules make every safety and pricing decision.** Details: [`docs/architecture.md`](docs/architecture.md) · Spec: [`spec.md`](spec.md)

## Project documents
| Deliverable | File |
|---|---|
| Idea Validation Report (7 steps) | [`docs/01-idea-validation.md`](docs/01-idea-validation.md) |
| PRD (1 page) | [`docs/02-PRD.md`](docs/02-PRD.md) |
| Spec (inputs, outputs, AI module, acceptance criteria, edge cases, revision log) | [`spec.md`](spec.md) |
| Architecture notes | [`docs/architecture.md`](docs/architecture.md) |
| AI agent rules | [`CLAUDE.md`](CLAUDE.md), [`.cursorrules`](.cursorrules) |
| AI golden-set evaluation (10/10 on the live app) | [`docs/eval-cases.md`](docs/eval-cases.md) |
| Demo script | [`docs/demo-script.md`](docs/demo-script.md) |
| Reflection | [`docs/reflection.md`](docs/reflection.md) |

## Run locally
```bash
git clone https://github.com/feladelpobre/care-ride-at-your-service-ph.git
cd care-ride-at-your-service-ph
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

Secrets are never committed: `.env*` is git-ignored, there is no `NEXT_PUBLIC_` secret, and CI runs **gitleaks** over the full history.

### Database (optional)
Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor, then set the two Supabase env vars.

## Tests & CI
```bash
npm test          # 56 Vitest tests: rules, pricing, geo, validation, emergency gate, API routes (AI mocked)
npm run lint && npm run typecheck && npm run build
```
GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and PR: **gitleaks secret scan → lint → typecheck → tests → build**. Vercel deploys previews for PRs and production from `main`.

Each acceptance criterion in `spec.md` (AC1–AC12) maps to a test file.

## Monitoring
- **Vercel Analytics:** page views + custom events `trip_analyzed`, `booking_confirmed`, `emergency_redirect` (funnel for the PRD success metrics)
- **Health check:** `GET /api/health` → `{ status, ai, storage }` (never exposes secret values)

## Pricing (estimates only, no payments)
| Distance | Assist sedan | Wheelchair van |
|---|---|---|
| Base (incl. first 5 km) | ₱350 | ₱900 |
| 5.1–10 km | +₱150 | +₱300 |
| 10.1–20 km | +₱400 | +₱750 |
| 20.1–40 km | +₱900 | +₱1,600 |
| Over 40 km | +₱900 + ₱30/km | +₱1,600 + ₱50/km |

Add-ons: second crew +₱300 · stair assist ₱100/floor · hospital companion ₱250/h (min 2 h). Distances are approximate (city centroid → hospital × 1.35 road factor) and editable.

## Limitations & roadmap (v2)
See the GitHub issue **"v2: Real road distance & traffic-aware ETA via maps API"**. Also planned: round-trip pricing, operator accounts and acceptance flow, SMS/Viber notifications.

## Privacy
Demo data only. The app asks for a pickup *area* (not a home address) and never asks for diagnoses. Dispatcher views mask contact names. Designed with the PH Data Privacy Act (RA 10173) in mind.
