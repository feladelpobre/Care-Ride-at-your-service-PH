# CLAUDE.md — Care Ride at your service-PH

Guidance for AI coding agents (Claude Code, Cursor, etc.) working in this repo.

## What this project is
A Next.js 14 web app that turns a caregiver's plain-language trip description into a safe, wheelchair-appropriate ride plan for hospital and dialysis appointments in Metro Manila. Read `spec.md` first; it is the source of truth. The PRD is in `docs/02-PRD.md`, and the architecture is in `docs/architecture.md`.

## Commands
- `npm run dev`: local dev server at http://localhost:3000
- `npm test`: vitest unit and route tests (AI is mocked, no key needed)
- `npm run lint` · `npm run typecheck` · `npm run build`
- Run all of `lint`, `typecheck`, `test` and `build` before every commit. CI runs the same steps.

## Golden rules
1. **The AI understands language; the rules decide.** Vehicle type, crew size, pickup time, fare and blocking live in `src/lib/rules.ts` and must stay deterministic and unit-tested. Never move these decisions into the prompt.
2. **The emergency gate comes first.** `detectEmergency()` must run before any AI call in `/api/plan`. Never remove the 911 message or let a blocked plan be confirmed.
3. **zod is the single source of truth.** Add new fields in `src/lib/schemas.ts` first, then update the prompt, the rules and the tests.
4. **No secrets in code.** Read env vars only in server files (`src/lib/ai.ts`, `src/lib/storage.ts`, API routes). Keep `import "server-only"` there. Never prefix secrets with `NEXT_PUBLIC_`. Update `.env.example` when adding env vars.
5. **Never trust the client.** `/api/bookings` must recompute `assess()` from the extraction.
6. **Data minimisation (PH Data Privacy Act):** don't add fields for full names, diagnoses or exact addresses without updating `spec.md §7`.
7. **Every feature or bugfix needs a test** in `tests/` that maps to an acceptance criterion ID (AC1…AC10) in `spec.md`.

## Code style
- TypeScript strict; no `any` (use `unknown` + zod parsing).
- Server components by default; add `"use client"` only for interactive components.
- Tailwind for styling; accessible markup (labels, ≥ 44 px tap targets, visible focus).
- User-facing copy is short and plain, in English with an optional Filipino hint. Errors are friendly, never stack traces.
- Small, meaningful commits using Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`).

## Where things live
| Need | File |
|---|---|
| Prompt text | `src/lib/prompt.ts` |
| AI call | `src/lib/ai.ts` |
| Safety and pricing rules | `src/lib/rules.ts` |
| Emergency keywords | `src/lib/emergency.ts` |
| DB schema + RLS | `supabase/schema.sql` |
| CI | `.github/workflows/ci.yml` |
