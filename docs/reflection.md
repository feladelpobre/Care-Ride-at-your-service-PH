# Reflection: Building CareRide PH (1 page)

**Feladel "Peng" Pobre · Week 4 Graded Mini Project 4.2**

## What I built
CareRide PH is a live, AI-powered web app that helps caregivers in Metro Manila book a wheelchair-appropriate ride to the hospital. A caregiver types one message in English or Taglish. The AI (Vercel AI SDK + OpenAI, structured output) extracts the trip details, and tested rules decide the vehicle, crew size, pickup time and a distance-based price, with an optional hospital companion who stays until the appointment is done. It ships with a PRD, a spec, CI on GitHub Actions and a Vercel deployment.

## Key learnings
1. **Validation before code saves effort.** The 7-step framework moved me from "a transport business" to a sharper problem: *capturing the patient's mobility needs before the vehicle is sent*. The PGH study (82.3% cite accessibility as the top barrier) and the competitor gap matrix showed that intake and matching, not owning vans, was the opening.
2. **A good spec is a contract with the AI coder.** Writing inputs, outputs and testable acceptance criteria (AC1–AC12) first meant every feature had a test waiting for it. CLAUDE.md and .cursorrules kept the coding assistant from moving safety logic into the prompt.
3. **Let the AI understand, let rules decide.** My first spec let the LLM choose the vehicle and the pickup time. In review I moved those decisions into deterministic functions, because an AI answer can vary from one call to the next. As a QA Manager I recognised this as process control: the variable step (language understanding) is followed by a verified, repeatable step (rules + tests).
4. **Defence in depth for safety.** Emergency keywords are checked before the AI is called, the AI's own emergency flag is checked after it, and the server recomputes every price, so neither a model mistake nor a tampered request can create an unsafe or wrong booking.

## Challenges
- **Pricing without a maps API.** My stakeholder request (cost from a location to the nearest hospital) arrived mid-build. I solved it offline with city centroids, a curated hospital list and a 1.35 road factor, priced in distance bands customers can understand, and let caregivers override the km.
- **Taglish and relative dates.** "Bukas alas-otso" has to become tomorrow at 08:00. I injected today's Manila date into the prompt and normalised times (e.g., "2:30 pm" → 14:30) in code.
- **A tricky test bug.** A Vitest `beforeEach` that returned a value was treated as a cleanup function and failed a test. Reading the failure carefully, instead of rewriting the test, found the cause.
- **Privacy.** Health information is sensitive under the Data Privacy Act. I chose data minimisation: pickup *area* only, no diagnoses, masked names on the dispatcher board.

## What I would improve in v2
- Real road distance and traffic-aware ETAs via a maps API (logged as a GitHub issue)
- Round-trip and waiting-time pricing, especially for dialysis
- Operator accounts with accept/decline, and SMS/Viber confirmations
- Running the golden-set evaluation automatically in CI against a small budget
- Usability testing with 3 real caregivers and 2 van operators (the cheap tests in my validation report)

## Final thought
Vibe coding made the build fast, but the parts that make this app trustworthy (the validation evidence, the acceptance criteria, the safety rules and the tests) came from deliberate human decisions. The AI was a strong co-worker; I stayed the human in the loop.
