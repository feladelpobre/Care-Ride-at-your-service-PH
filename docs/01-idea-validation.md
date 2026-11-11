# CareRide PH — Idea Validation Report

**Author:** Feladel "Peng" Pobre · **Course:** Week 4 Graded Mini Project 4.2 · **Date:** 11 Nov 2026

> **One-liner:** CareRide PH helps family caregivers in Metro Manila book a safe, wheelchair-appropriate ride to hospital and dialysis appointments by describing the trip in plain language. AI turns the description into a structured booking, a mobility assessment and a driver brief.

This report follows the 7-step validation framework from Week 4A. Each step states the **hypothesis tested**, the **evidence found** (with sources) and a **verdict**.

---

## Step 1 — Define the Problem

**Hypothesis:** People who cannot walk or who use wheelchairs have a real, recurring and unsolved problem getting to hospital appointments in the Philippines.

**Problem statement:**
Filipino patients who use wheelchairs or cannot walk (and the family members who arrange their care) struggle to get to recurring hospital and dialysis appointments. Public transport is not built for them, and the few accessible vans must be booked by phone with no clear way to communicate the patient's mobility needs. The result is missed appointments, unsafe lifting and high one-off costs.

**Evidence**

| Evidence | Source |
|---|---|
| In a PGH study of 413 wheelchair recipients, the top barriers to in-person follow-up were accessibility issues (82.3%), cost of travel (79.6%) and distance to the hospital (71.7%). | Acta Medica Philippina, Vol. 58 No. 20, Nov 2024 — https://doi.org/10.47895/amp.v58i20.9013 |
| A family describing a PGH outpatient visit wrote that public utility vehicles are not designed to carry persons with physical disabilities. | Inquirer Opinion — https://opinion.inquirer.net/?p=127269 |
| A 2026 column argues the Philippines has had accessibility law for over 40 years but implementation fails, so many wheelchair users cannot commute at all. | Manila Bulletin, 22 May 2026 — https://mb.com.ph/2026/05/22/the-right-to-ride-alone |
| Disabled people's organisations report that inaccessible public transport forces wheelchair users into expensive taxis, or to roll their wheelchair along the street. | Philippine DPO parallel report (2016) — hs-duesseldorf.de case study PDF |
| A wheelchair-travel writer called Manila one of the least accessible cities they had visited and noted that public transport is not wheelchair accessible. | WheelchairTravel.org — https://wheelchairtravel.org/wheelmobile-wheelchair-accessible-taxi-manila-philippines/ |

**Verdict: ✅ Validated.** The pain is specific (getting to medical appointments), frequent (dialysis 2–3×/week) and measured in peer-reviewed data.

---

## Step 2 — Profile the Target Customer

**Hypothesis:** A reachable, identifiable group feels this pain badly enough to pay.

**Primary user persona — "Ate Liza", the caregiver-coordinator**
- **Who:** 35–55, Metro Manila, adult daughter or son (often an OFW-family member or working professional) who books rides for a parent.
- **Patient:** a senior or PWD parent who uses a wheelchair, often on dialysis or rehab 2–3× a week.
- **Goals:** get the parent to the appointment on time, safely, without having to lift them down stairs alone.
- **Frustrations:** calling several providers; explaining the same mobility details every time; drivers arriving in a sedan when a ramp van was needed; no help on stairs.
- **Where they are online:** Facebook groups (PWD support, dialysis patient groups, senior care), Viber family chats.
- **Tools today:** phone calls to Lifelifters / Wheelmobile, Grab with a folded wheelchair, a relative's car, private ambulance for non-emergencies.

**Secondary user:** a small accessible-van operator or dispatcher who receives the booking and needs a clear driver brief.

**Evidence**

| Evidence | Source |
|---|---|
| The PGH study let caregivers respond for patients with impairments, which confirms caregivers are the people coordinating care and travel. | Acta Medica Philippina, 2024 (above) |
| NCDA reports 2.8 million registered PWDs, up from about 1.8 million in mid-2024. | Inquirer, "Where can PWDs seek help?" — https://newsinfo.inquirer.net/2327291/where-can-pwds-seek-help ; Inquirer Opinion — https://opinion.inquirer.net/184049/more-inclusivity-for-pwds/amp |
| 8.7% of Filipinos aged 5+ report at least one functional difficulty, including walking or climbing stairs (2020 Census, cited in a 2025 Quezon City transport study of elderly and persons with reduced mobility). | EASTS Proceedings Vol. 15, 2025 — https://easts.info/on-line/proceedings/vol.15/pdf/G_PP3968.pdf |
| Willingness to pay already exists: Wheelmobile charges about ₱700 for a night-time trip, which is much more than public transport. | WheelchairTravel.org (above) |

**Verdict: ✅ Validated.** The caregiver is identifiable, active in specific online communities and already pays for poor alternatives.

---

## Step 3 — Size the Market

**Hypothesis:** The opportunity is large enough to sustain a business.

**Top-down**
- Global NEMT market: **USD 9.82B in 2025 → USD 16.24B by 2032 (7.41% CAGR)**, with wheelchair transport and dialysis visits as named segments. — ResearchAndMarkets via BusinessWire, 15 Dec 2025: https://www.businesswire.com/news/home/20251215150114/en
- The Philippine dialysis market alone is estimated at **USD 1.74B (2025)**. — Ken Research: https://www.kenresearch.com/industry-reports/philippines-dialysis-market

**Bottom-up (Metro Manila, conservative)**

| Driver | Figure | Source |
|---|---|---|
| Filipinos on dialysis | ~90,000 (DOH 2022 data) | PNA — https://pna.gov.ph/articles/1227535 |
| Sessions per patient | ~2 per week for life | Inquirer Lifestyle — https://lifestyle.inquirer.net/?p=336563 |
| Seniors (60+) | 10.98M in 2025 (9.6% of population), heading to ~11% by 2030 | BusinessWorld citing PSA — https://www.bworldonline.com/opinion/2026/02/23/731997/preparing-for-longer-living-in-the-philippines |

- **TAM** (all PH dialysis round-trips): 90,000 patients × 2 sessions × 52 weeks × 2 legs ≈ **18.7M trips/year**.
- **SAM** (Metro Manila ≈ 13% of population; assume 25% of those patients need wheelchair-level help) ≈ 90,000 × 13% × 25% ≈ 2,900 patients ≈ **605,000 trips/year**.
- **SOM** (year 1: 2% of SAM through partner van operators) ≈ **12,000 trips/year**. At a ₱50 booking/coordination fee, that is ≈ **₱600K/year**. This is enough to validate demand, and the B2B route to dispatch software is the larger prize.

Rehab, oncology and outpatient visits are excluded, so these numbers are a floor.

**Verdict: ✅ Validated** as a meaningful niche with clear growth drivers.

---

## Step 4 — Map the Competition

| Competitor / substitute | What they do well | Where they fall short | Why a user would switch |
|---|---|---|---|
| **Lifelifters Transport** (Metro Manila) | Hydraulic-lift van; the patient stays seated in the wheelchair | A 2018 review says it had a single unit; booking by phone or email; no structured needs intake | Faster booking; needs captured once; reusable driver brief |
| **Wheelmobile** (Circle of Friends Foundation) | First PH transport service for PWDs; clear day and night rates | Phone/email booking; small fleet | Same as above |
| **GrabAssist / GrabAssist Plus** | App booking, trained drivers; Plus uses ramp vans (Singapore) | Drivers cannot leave the vehicle to help (Grab MY policy); availability depends on the country; no stair-assist assessment | CareRide flags stair assist and crew size *before* the trip |
| **Private ambulance (non-emergency use)** | Stretcher, trained staff | Expensive; overkill for stable wheelchair users | Right-sized vehicle and cost |
| **Family car / tricycle** | Free and available | Unsafe transfers; tricycles cannot take a wheelchair user | Safety |
| **US NEMT platforms (Kinetik, Ride Health, MedHaul)** | Digital booking and dispatch | Not in PH; built around US Medicaid billing | Localised for PH caregivers and operators |

Sources: Lifelifters — https://nananadal.ph/lifelifters-uplifting-literally-and-figuratively/ , https://www.wheninmanila.com/?p=104717 ; Wheelmobile — WheelchairTravel.org (above); GrabAssist — https://www.grab.com/my/grabassist , https://grab.com/sg/press/social-impact-safety/grab-launches-grabassist-plus-expanding-its-suite-of-transport-services-for-persons-with-disabilities-in-singapore ; MedHaul — Stanford Biodesign case study (Mar 2026).

**Feature gap matrix**

| Capability | Lifelifters | Wheelmobile | GrabAssist | Ambulance | **CareRide** |
|---|:-:|:-:|:-:|:-:|:-:|
| Online booking | ✗ | ✗ | ✓ | ✗ | ✓ |
| Plain-language (Taglish) trip intake | ✗ | ✗ | ✗ | ✗ | ✓ |
| Automatic mobility assessment (vehicle, stairs, crew) | ✗ | ✗ | ✗ | partial | ✓ |
| Pickup time worked back from the appointment | ✗ | ✗ | ✗ | ✗ | ✓ |
| Pre-trip driver brief | ✗ | ✗ | ✗ | ✗ | ✓ |
| Emergency red-flag redirect to 911 | ✗ | ✗ | ✗ | n/a | ✓ |

**The gap none of them fill:** capturing *what kind of help this patient needs* before the vehicle is dispatched.

**Verdict: ✅ Validated.** There is a clear opening in needs intake and matching.

---

## Step 5 — Define the Edge ("Why now, why us")

**Why now**
1. **Ageing:** PSA counts 10.98M seniors in 2025, and the Philippines is projected to become an "aged society" (over 10% aged 60+) around 2030. — PTV/PNA, https://ptvnews.ph/?p=249299 ; ERIA 2025, https://www.eria.org/uploads/8_Ch_1-Shifting_Demographic.pdf
2. **Dialysis demand is rising fast:** one report shows dialysis patients up 42% from 2022 to 2023; DOH estimates kidney disease cases grow 10–15% a year. — GMA News, https://www.gmanetwork.com/news/topstories/nation/908664/dialysis-patients-increased-by-42-in-2023-from-2022/story
3. **PWD registrations are growing:** from about 1.8M (June 2024) to 2.8M in the latest NCDA count, which means more people are formally identified and reachable. — NCDA via Inquirer (above)
4. **Technology shift:** affordable LLMs with structured (JSON-schema) output can now reliably turn messy, code-switched Taglish messages into structured data for fractions of a centavo per request. Until about 2023 this needed a human dispatcher on the phone.

**Why us**
The founder is a **QA Manager** with a Chemical Engineering background. The product treats trip intake like a quality checklist: every booking has to pass required-field and safety checks (emergency red flags, stretcher cases referred out) before it can be confirmed. Safety-critical decisions (vehicle type, crew size, pickup time) are made by **tested, deterministic rules**, not by the AI alone.

**Verdict: ✅ Clear why-now and why-us.**

---

## Step 6 — Design a Cheap Test

| # | Experiment | Assumption tested | Time | Cost | Success looks like |
|---|---|---|---|---|---|
| 1 | **Concierge test:** post in 3 Facebook dialysis/PWD caregiver groups offering free trip coordination; manually book Lifelifters/Wheelmobile for respondents | Caregivers will hand over trip details to a third party | 1 week | ₱0 | ≥10 requests; ≥5 complete bookings |
| 2 | **Fake-door landing page** (this deployed MVP + "Join waitlist") with ₱1,000 of Facebook ads targeted at caregivers in NCR | Demand at scale; best message | 2 weeks | ₱1,000 | Click-through > 2%; ≥50 trip analyses run |
| 3 | **Operator interview + brief test:** show 5 AI-generated driver briefs to 3 accessible-van operators | Operators find the brief useful and would accept bookings | 1 week | ₱0 | ≥2 of 3 say they would use it; brief accuracy ≥ 4/5 |

The deployed app doubles as the instrument for test #2: Vercel Analytics tracks the `trip_analyzed` and `booking_confirmed` events.

**Pattern used:** concierge MVP before automation (a common IndieHackers/YC validation approach). Price anchor: Wheelmobile's ₱700 per trip shows people already pay a premium for accessibility.

---

## Step 7 — Stress-Test the Idea ("skeptical VC")

| # | Why it could fail | Real-world precedent | Mitigation |
|---|---|---|---|
| 1 | **Supply is too thin:** too few accessible vans to fulfil bookings | Lifelifters reportedly ran a single unit | Start as the booking/intake layer for *existing* operators (marketplace), not a fleet owner |
| 2 | **Unit economics:** margins squeezed by fuel, wages and insurance | ModivCare, the largest US NEMT broker, went through Chapter 11 after costs outpaced reimbursement (elevenflo.com/blog/modivcare-chapter-11-bankruptcy) | Asset-light model; small coordination fee; no reliance on a single payer |
| 3 | **Inconsistent trip volume** | The VAST stretcher service announced its closure, citing difficulty securing consistent trip volume (thenews-gazette.com) | Focus on *recurring* dialysis trips, which are predictable by nature |
| 4 | **Safety/liability:** AI mis-reads mobility needs | Unreliable NEMT led to 10 missed appointments for one wheelchair user (NBC Connecticut, Veyo) | Human confirmation step; deterministic rules for vehicle and crew; emergency keywords block the booking and show 911 |
| 5 | **Privacy:** health data is sensitive under the Data Privacy Act (RA 10173) | — | Data minimisation: the MVP stores no patient names or diagnoses; demo data only; no AI provider training on API data |

**What would change the VC's mind:** ≥5 completed concierge bookings and ≥2 operators willing to accept bookings (tests 1 and 3).

**Verdict:** The risks are known and each has a mitigation. Nothing found is fatal for an intake/coordination MVP.

---

## Summary

| Step | Result |
|---|---|
| 1. Problem | ✅ Accessibility is the #1 barrier for 82.3% of surveyed PGH wheelchair patients |
| 2. Customer | ✅ Caregiver-coordinator; 2.8M registered PWDs; already paying ~₱700/trip |
| 3. Market | ✅ USD 9.8B global NEMT; ~605K accessible dialysis trips/yr SAM in Metro Manila |
| 4. Competition | ✅ No competitor captures mobility needs before dispatch |
| 5. Edge | ✅ Ageing + dialysis growth + structured-output LLMs; QA-style safety rules |
| 6. Cheap test | ✅ 3 experiments designed; the MVP doubles as the fake-door test |
| 7. Stress test | ✅ 5 risks with precedents and mitigations |
