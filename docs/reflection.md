# Reflection: Building Care Ride at your service-PH (1 page)

**Feladel "Peng" Pobre · Week 4 Graded Mini Project 4.2**

## What I built
A live, AI-powered web app that helps caregivers in Metro Manila and across the Philippines book a wheelchair-appropriate ride to the hospital. A caregiver types one message in English or Taglish; the AI (Vercel AI SDK + OpenAI, structured output) extracts the trip details, and tested rules decide the vehicle, crew, pickup time and a distance-based price, with an optional hospital companion. It ships with a PRD, a spec, CI on GitHub Actions and a Vercel deployment.

## Key learnings
1. **Validation before code saves effort.** The 7-step framework narrowed "a transport business" to *capturing the patient's mobility needs before the vehicle is sent*. The PGH study (82.3% cite accessibility as the top barrier) showed intake and matching, not owning vans, was the opening.
2. **A good spec is a contract with the AI coder.** Testable acceptance criteria written first meant every feature had a test waiting for it; CLAUDE.md kept the assistant from moving safety logic into the prompt.
3. **Let the AI understand, let rules decide.** I moved vehicle and pickup-time decisions out of the LLM into deterministic functions. As a QA Manager I see this as process control: a variable step followed by a verified, repeatable one.
4. **Defence in depth.** Emergency keywords are checked before the AI, its emergency flag after it, and the server recomputes every price and distance, so neither a model mistake nor a tampered request creates a wrong booking.

## Challenges
- **Pricing without a maps API:** city centroids, a curated hospital list and a 1.35 road factor, priced in distance bands.
- **Taglish and relative dates:** today's Manila date and an explicit 14-day calendar in the prompt took "Monday" accuracy from 9/10 to 10/10.
- **Deployment surprises:** a 401 from an OpenRouter key (found by logging the status code, never the key) and an empty dispatcher board caused by Next.js caching.
- **Privacy:** data minimisation under the Data Privacy Act: pickup *area* only, no diagnoses, masked names.

## Iteration after user acceptance testing (Nov 12–21)
Testing the live app with friends and on Windows, iOS and Android led to 20 fixes:
- **The system, not the rider, calculates the distance:** a required destination, GPS first (it fills in the barangay and city), then a typed street or landmark found on the map, never a house number.
- **Step 1 is filled in order** with typed dates (MM/DD/YYYY) and − / + caregiver hours; an "I am human" check (Cloudflare Turnstile, confirmed on the server) runs on every new opening.
- **Keeping promises:** the dispatcher board now tracks every "we'll call you" (2 hours for safety, 24 for complaints), staff get an emailed login link if they forget the password, and an FAQ helper answers only from approved text.
- **Lesson:** each fix got an acceptance criterion first (AC25–AC40) and 193 tests guarded the changes. Real phones mattered: auto-capitalised usernames, GPS left on in an open browser and in-app browsers all behaved differently from my laptop.

## What I would improve in v2
Maps-API road distance and traffic-aware ETAs · round-trip and waiting-time pricing for dialysis · SMS one-time codes to verify mobile numbers · individual staff accounts and SMS/Viber confirmations for operators · the golden-set evaluation in CI · usability tests with 3 caregivers and 2 van operators.

## Final thought
Vibe coding made the build fast, but what makes the app trustworthy (the validation evidence, acceptance criteria, safety rules and tests) came from deliberate human decisions. The AI was a strong co-worker; I stayed the human in the loop.
