# Architecture Notes — Care Ride at your service-PH

## 1. Stack (follows the Week 4 recommended stack)
| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 14 (App Router) + Tailwind CSS** | One codebase for UI and API routes; first-class Vercel support |
| AI layer | **Vercel AI SDK (`ai`) + `@ai-sdk/openai`** (`gpt-4o-mini`) | `generateObject()` gives schema-validated JSON; easy to swap providers |
| Validation | **zod** | One schema is shared by the AI output, the API input and the tests |
| Database | **Supabase (Postgres)** with RLS; in-memory fallback | Free tier, SQL, row-level security |
| Deploy / CI | **Vercel + GitHub Actions** | Preview and production deploys; CI runs lint, typecheck, tests, build and a secret scan |
| Monitoring | **Vercel Analytics** + `/api/health` | Page views and custom funnel events; uptime check |

## 2. System Diagram
```
 Caregiver (browser)
   │  1. types trip description
   ▼
 ┌───────────────────────── Next.js on Vercel ─────────────────────────┐
 │  UI  (src/app/page.tsx, TripForm, PlanCard)                         │
 │    │ POST /api/plan                                                 │
 │    ▼                                                                │
 │  API route  /api/plan                                               │
 │    ├─ validate input (zod)            ── 400 on failure            │
 │    ├─ rate limit (per IP)             ── 429                        │
 │    ├─ detectEmergency() keywords      ── emergency=true, STOP       │
 │    ├─ AI module: generateObject() ────────────►  OpenAI API         │
 │    │     (system prompt + zod schema)  ◄──── JSON (TripExtraction)  │
 │    ├─ normalizeExtraction() (clamp, formats)                        │
 │    └─ rules engine: assess() + buildDriverBrief()                   │
 │           → vehicle, crew, pickup time, fare, blocked?              │
 │    ▼                                                                │
 │  UI shows editable plan → caregiver confirms                        │
 │    │ POST /api/bookings                                             │
 │    ▼                                                                │
 │  API route /api/bookings: re-validate + RECOMPUTE assessment        │
 │    └─ storage adapter ──────────────────────────► Supabase (RLS)    │
 │                         (or in-memory if not configured)            │
 │  /dispatch page (server component) ◄── list bookings (masked)       │
 │  <Analytics/> → Vercel Analytics: trip_analyzed, booking_confirmed  │
 └─────────────────────────────────────────────────────────────────────┘
 GitHub repo ──push/PR──► GitHub Actions: lint · typecheck · test · build · gitleaks
          └──────────────► Vercel Git integration: preview + production deploy
```

## 3. Data Flow
1. **Input** → `/api/plan` validates (`planRequestSchema`) and strips control characters.
2. **Emergency gate** → `detectEmergency()` matches English and Filipino red-flag phrases. On a match, the API returns the 911 message without calling the AI.
3. **AI extraction** → `extractTrip()` calls `generateObject({ model, schema: aiExtractionSchema, system, prompt })` with today's Manila date injected.
4. **Normalisation** → `normalizeExtraction()` clamps numbers, checks the `HH:mm` / `YYYY-MM-DD` formats, and adds missing-info hints.
5. **Distance & rules** → `estimateRoute()` estimates km (or picks the nearest hospital); `assess()` makes the deterministic decisions and `priceQuote()` builds the itemised estimate (distance band + crew + stairs + optional hospital companion); `buildDriverBrief()` builds the crew checklist. The UI calls the same pure `buildPlan()` to re-price instantly when the caregiver edits km or companion hours.
6. **Confirm** → `/api/bookings` re-validates, recomputes `assess()` server-side, and stores a minimal record.
7. **Dispatch** → `/dispatch` reads the latest 50 bookings, with names masked.

## 4. Module Map
```
src/
  app/
    page.tsx                 caregiver intake + plan review (client)
    dispatch/page.tsx        dispatcher board (server component)
    api/plan/route.ts        AI analyse endpoint
    api/bookings/route.ts    confirm booking endpoint
    api/health/route.ts      health/monitoring endpoint
    layout.tsx               <Analytics/>, emergency banner
  components/                TripForm, PlanCard, EmergencyNotice
  lib/
    schemas.ts               zod schemas (single source of truth)
    emergency.ts             keyword red-flag detector
    prompt.ts                system prompt builder
    ai.ts                    generateObject wrapper (server-only)
    rules.ts                 assess(), computePickupTime(), priceQuote() (distance bands + companion), buildDriverBrief()
    geo.ts                   offline distance: city centroids + hospital list, nearest-hospital lookup
    plan.ts                  buildPlan(): shared by API routes and UI for instant re-pricing
    normalize.ts             normalizeExtraction()
    storage.ts               Supabase / in-memory adapter (server-only)
    rateLimit.ts             in-memory token bucket
tests/                       vitest unit + route tests (AI mocked)
supabase/schema.sql          table + RLS
.github/workflows/ci.yml     CI pipeline
```

## 5. Database (Supabase)
`public.bookings`: `id uuid pk`, `created_at timestamptz`, `contact_name text`, `contact_phone text null`, `pickup_area text`, `destination text`, `appointment_date date null`, `appointment_time text null`, `pickup_time text null`, `distance_km numeric`, `companion_hours int`, `trip_purpose text`, `mobility text`, `vehicle_type text`, `crew_size int`, `fare_min int`, `fare_max int`, `driver_brief jsonb`, `recurring bool`, `status text default 'pending'`.
RLS is enabled with **no** policies for `anon`/`authenticated`, so only the server's service-role key can read or write.

## 6. Security Design
- Secrets live only in Vercel environment variables and GitHub Actions secrets (none are needed for CI, because the AI is mocked in tests).
- `import "server-only"` in `ai.ts` and `storage.ts` keeps them out of client bundles.
- Inputs are validated at every boundary; the server never trusts client-computed safety or fare fields.
- Rate limiting protects the API budget; the AI has a 20 s timeout.
- `gitleaks` runs in CI on every push.

## 7. Key Trade-offs
| Decision | Alternative | Why |
|---|---|---|
| AI extracts, rules decide | AI decides everything | Safety decisions must be repeatable and unit-testable |
| Caregiver-editable travel time | Google Maps API | Keeps v1 free and simple; maps API planned for v2 |
| In-memory store fallback | Fail without a DB | Lets CI, local dev and graders run the app without Supabase |
| No login for v1 | Clerk / Supabase Auth | Fewer steps for caregivers; no personal accounts means less personal data. Auth is planned for the operator side in v2 |
