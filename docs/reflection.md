# Reflection: Building Care Ride at your service-PH (1 page)

**Feladel "Peng" Pobre · Week 4 Graded Mini Project 4.2**

## What I built
Care Ride at your service-PH is a live, AI-powered web app that helps caregivers in Metro Manila book a wheelchair-appropriate ride to the hospital. A caregiver types one message in English or Taglish. The AI (Vercel AI SDK + OpenAI, structured output) extracts the trip details, and tested rules decide the vehicle, crew size, pickup time and a distance-based price, with an optional hospital companion who stays until the appointment is done. It ships with a PRD, a spec, CI on GitHub Actions and a Vercel deployment.

## Key learnings
1. **Validation before code saves effort.** The 7-step framework moved me from "a transport business" to a sharper problem: *capturing the patient's mobility needs before the vehicle is sent*. The PGH study (82.3% cite accessibility as the top barrier) and the competitor gap matrix showed that intake and matching, not owning vans, was the opening.
2. **A good spec is a contract with the AI coder.** Writing inputs, outputs and testable acceptance criteria (AC1–AC12) first meant every feature had a test waiting for it. CLAUDE.md and .cursorrules kept the coding assistant from moving safety logic into the prompt.
3. **Let the AI understand, let rules decide.** My first spec let the LLM choose the vehicle and the pickup time. In review I moved those decisions into deterministic functions, because an AI answer can vary from one call to the next. As a QA Manager I recognised this as process control: the variable step (language understanding) is followed by a verified, repeatable step (rules + tests).
4. **Defence in depth for safety.** Emergency keywords are checked before the AI is called, the AI's own emergency flag is checked after it, and the server recomputes every price, so neither a model mistake nor a tampered request can create an unsafe or wrong booking.

## Challenges
- **Pricing without a maps API.** My stakeholder request (cost from a location to the nearest hospital) arrived mid-build. I solved it offline with city centroids, a curated hospital list and a 1.35 road factor, priced in distance bands customers can understand. (Later I removed the manual km override: see below.)
- **Taglish and relative dates.** "Bukas alas-otso" has to become tomorrow at 08:00. I injected today's Manila date into the prompt and normalised times (e.g., "2:30 pm" → 14:30) in code.
- **A tricky test bug.** A Vitest `beforeEach` that returned a value was treated as a cleanup function and failed a test. Reading the failure carefully, instead of rewriting the test, found the cause.
- **Deployment surprises.** The first live test failed with a 401: the key was an OpenRouter key, not an OpenAI key. Logging the provider's status code (never the key) found it in one step, and I made the AI layer support both providers. Then the dispatcher board showed no bookings even though they were in the database: Next.js was caching the first empty read. I fixed it by turning off caching for database reads.
- **LLM date maths.** In the golden-set test, "Monday" came back as a Saturday. Instead of trusting the model's arithmetic, I now give it an explicit 14-day calendar; the score went from 9/10 to 10/10.
- **Privacy.** Health information is sensitive under the Data Privacy Act. I chose data minimisation: pickup *area* only, no diagnoses, masked names on the dispatcher board.

## Iteration after user testing (Nov 14)
After trying the live app myself, I asked Claude Code for a second round of changes:
- **Destination as its own required field**, and **distance calculated only by the system**. Riders were guessing the km, and that changes the price. The server recalculates it on every booking, so it can't be tampered with. Hospital names now match with or without dashes, and an unknown clinic is read by its area (e.g., "Healthway Clinic, Mandaluyong").
- **Clearer step-1 guidance** (describe the rider, appointment and pick-up date/time), **at most 1 companion** riding along, and an example as the placeholder instead of "Try example" buttons.
- **An "I am human" check** (Cloudflare Turnstile) before the app opens, confirmed on the server, to block fake ride requests. I tried moving it to the booking step so Google could still index the home page, then decided to keep it in front of the app. I accepted the SEO trade-off in favour of stopping bots early.
- **Lessons:** each change got an acceptance criterion (AC25–AC28) and tests first, so 121 tests guarded the refactor. Testing on my own phone mattered: the in-app browser failed the human check (it looks automated), and Google's assistant couldn't open the page, but real Chrome passed. Both were expected bot-protection behaviour, not bugs.

## What I would improve in v2
- Real road distance and traffic-aware ETAs via a maps API (logged as a GitHub issue)
- Round-trip and waiting-time pricing, especially for dialysis
- SMS one-time code (OTP) to verify the mobile number, the strongest protection against fake requests
- Operator accounts with accept/decline, and SMS/Viber confirmations
- Running the golden-set evaluation automatically in CI against a small budget
- Usability testing with 3 real caregivers and 2 van operators (the cheap tests in my validation report)

## Final thought
Vibe coding made the build fast, but the parts that make this app trustworthy (the validation evidence, the acceptance criteria, the safety rules and the tests) came from deliberate human decisions. The AI was a strong co-worker; I stayed the human in the loop.
