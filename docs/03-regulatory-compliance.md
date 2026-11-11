# Regulatory & Healthcare Compliance Plan — Care Ride at your service-PH

**Owner:** Feladel "Peng" Pobre · **Last reviewed:** 11 Nov 2026 · **Status:** prototype (no real rides or payments)

> This plan maps each Philippine law or regulation that applies to the service to (a) what it requires, (b) how Care Ride complies **in the app**, and (c) what must be done **before launch** (operations). It is a planning document, not legal advice; a lawyer should confirm it before real bookings start.

## How the service is classified
Care Ride is a **booking and coordination platform** for **non-emergency** patient transport, plus an optional in-hospital caregiver service. It is **not** an ambulance service. Vehicles without basic/advanced life-support equipment are **Patient Transport Vehicles (PTVs)** under DOH rules; bedridden or stretcher patients and emergencies are always referred to licensed ambulances or 911.

---

## 1. Transport regulation (DOTr / LTFRB / LTO)

| Requirement | Source | In the app (done) | Before launch (operations) |
|---|---|---|---|
| A vehicle carrying passengers **for hire** needs an LTFRB franchise (**Certificate of Public Convenience**); operating without one is "colorum" | Public Service Act; LTFRB MC 98-027 and MC 2004-028 (repeat colorum vehicles banned) | Terms state that only franchised vehicles are used | Partner only with operators holding a valid CPC (e.g., van-for-hire or TNVS); keep franchise copies on file; verify before onboarding |
| An app that pre-arranges rides for compensation must be accredited as a **Transport Network Company (TNC)**; TNCs may only dispatch franchised vehicles | LTFRB MC 2015-015 / 2015-016 | Booking flow ends with a person confirming (no automatic dispatch yet) | Apply for TNC accreditation (business permit, BIR registration, business model with fare rates, complaint mechanism) **before** dispatching rides through the app |
| **Passenger personal accident insurance** and **CTPL** insurance for every public utility vehicle | LTFRB/Insurance Commission PPAI programme | Terms state vehicles carry PPAI + CTPL | Require insurance certificates from every partner vehicle; track expiry dates |
| Professional driver's licence; LTO registration | LTO rules | Driver brief lists vehicle and crew needs | Verify each driver's professional licence |
| **20% fare discount** for Senior Citizens and PWDs, plus VAT exemption, on land transportation fares (TNVS/taxi: full 20% of the fare) | RA 9994 (Expanded Senior Citizens Act); RA 7277 as amended by RA 10754; LTFRB MC 2018-004 | ✅ Step-1 tick box "Senior Citizen / PWD"; 20% off the **ride fare** in the quote; driver checklist says "check OSCA/PWD ID"; **ID numbers are not stored** | Train drivers on ID checks; show discounts on official receipts; confirm VAT treatment with an accountant |

## 2. Healthcare regulation (DOH)

| Requirement | Source | In the app (done) | Before launch |
|---|---|---|---|
| Only DOH-licensed land ambulances may carry the word "AMBULANCE"; other patient vehicles are **Patient Transport Vehicles**, used for non-life-threatening trips (scheduled doctor visits, tests, discharge), labelled "PATIENT TRANSPORT VEHICLE" | DOH AO 2018-0001 | ✅ App never uses the word "ambulance" for our vehicles; emergency gate shows **Call 911**; stretcher/bedridden patients are **blocked** and referred to a licensed ambulance | Register each van with DOH as a PTV (DOH guidelines on PTV registration); label vehicles correctly |
| No medical care in transit without licensed personnel | DOH AO 2018-0001 | ✅ Terms: caregivers give **non-medical** help only; driver brief lists only mobility assistance | Written scope-of-service for caregivers; escalation protocol (call 911) |

## 3. Caregivers (DOLE / TESDA)

| Requirement | Source | In the app (done) | Before launch |
|---|---|---|---|
| Caregivers' employment standards: written contract, fair pay, overtime beyond 8 hours, leave, social security; employers may require a TESDA certificate, medical and police/NBI clearance | RA 11965 (Caregivers' Welfare Act, 2023) and DOLE D.O. 254-25 (IRR) | ✅ Companion service is billed by the hour (min 2 h, max 12 h) so shifts stay within normal hours; Terms state the TESDA NC II + NBI clearance standard | Hire or contract caregivers under RA 11965-compliant contracts; register them with SSS/PhilHealth/Pag-IBIG; check TESDA NC II and NBI clearance |

## 4. Data privacy (NPC)

| Requirement | Source | In the app (done) | Before launch |
|---|---|---|---|
| Health information is **sensitive personal information**; processing generally needs **specific, informed consent** | RA 10173 (Data Privacy Act) and IRR | ✅ Consent checkbox names the health information and links to the **Privacy Notice**; booking cannot be sent without it | — |
| Transparency: tell people what is collected, why, who receives it, how long it is kept, and their rights | RA 10173 §§ 16, 18 | ✅ `/privacy` page: purposes, AI use, sharing (Vercel, Supabase, OpenRouter/OpenAI), cross-border processing, retention, data subject rights, NPC complaint route | Fill in the real DPO contact and company details |
| Data minimisation and security | RA 10173 § 11, 20 | ✅ Pickup **area** only (no home address); no patient name or diagnosis requested; no ID numbers stored; RLS-locked database readable only by the server; names masked on the dispatcher board; HTTPS; gitleaks in CI | Access controls for staff; retention/deletion schedule |
| Appoint a **Data Protection Officer**; register with the NPC when required (e.g., processing sensitive information of 1,000+ people) | RA 10173 IRR; NPC registration circulars | Privacy Notice states the DPO is to be appointed before launch | Appoint DPO; run a Privacy Impact Assessment; register with NPC once thresholds are met |
| Report personal data breaches within **72 hours** | NPC breach rules | ✅ Stated in the Privacy Notice | Write a breach response procedure |

## 5. Online business and consumer protection (DTI / BIR)

| Requirement | Source | In the app (done) | Before launch |
|---|---|---|---|
| Online merchants must identify themselves, give clear consumer information, issue invoices/receipts and keep an **internal redress mechanism**; the online merchant is primarily liable to the consumer | RA 11967 (Internet Transactions Act of 2023) and JAO 24-03 (IRR) | ✅ `/terms`: complaints contact, 24 h acknowledgement / 7-day resolution target, DTI online dispute resolution route; prices are clear estimates with an itemised breakdown | Register the business (DTI or SEC), BIR, mayor's permit; publish registration numbers on the site; register with the DTI E-Commerce Bureau's online business database when required |
| No misleading prices or claims | RA 7394 (Consumer Act) | ✅ Every price is labelled "estimate"; itemised quote; "no payment taken" | Final fare confirmed before the trip; official receipt for every payment |

## 6. Accessibility

| Requirement | Source | In the app (done) |
|---|---|---|
| Equal access for persons with disability | RA 7277 (Magna Carta for Disabled Persons) | ✅ Large tap targets (≥ 44 px), labelled inputs, keyboard focus rings, readable contrast, works on 360 px phones |

---

## What changed in the app because of this review
1. **Step-1 tick boxes** (customer request): ☐ Wheelchair (₱150, we bring one) · ☐ Hospital companion/caregiver (₱250/h, min 2 h) · ☐ Senior Citizen / PWD (20% off the ride fare).
2. **Statutory discount** built into the pricing rules and unit-tested (AC13); applied to the ride fare only, not to add-on services.
3. **Privacy Notice** and **Terms of Service** pages, linked from the footer and from the consent checkbox.
4. **Stronger consent wording** that names the health information and its purpose.
5. **Footer disclosure**: non-emergency only, not an ambulance, prototype status, registrations pending.
6. Dispatcher board flags **"Bring wheelchair"** and **"Senior/PWD: check ID"**.

## Open compliance questions (for a lawyer before launch)
1. Does the business need its **own** LTFRB franchise, or is **TNC accreditation** plus franchised partner operators enough?
2. Does the 20% discount also apply to the wheelchair and caregiver add-ons? (Current design: ride fare only.)
3. Which VAT treatment applies to the discounted fare for a non-VAT-registered startup?
4. When does NPC registration become mandatory for our expected volume of sensitive data?

## Sources
- LTFRB MC 98-027, MC 2004-028 (franchise / colorum): elibrary.judiciary.gov.ph; jur.ph
- LTFRB MC 2015-015 / 2015-016 (TNC accreditation): dev.lawyerly.ph/laws/70877; jur.ph
- LTFRB passenger accident insurance (PPAI) and CTPL: jur.ph; insurance.gov.ph
- RA 10754 and LTFRB MC 2018-004 (PWD 20% fare discount): elibrary.judiciary.gov.ph/thebookshelf/showdocs/10/90039
- RA 9994 (Senior Citizens 20% discount on land transport): jur.ph/law/facts/expanded-senior-citizens-act-of-2010
- DOH AO 2018-0001 (ambulances vs Patient Transport Vehicles): elibrary.judiciary.gov.ph/thebookshelf/showdocs/10/89923
- RA 11965 (Caregivers' Welfare Act) and DOLE D.O. 254-25: lawphil.net/statutes/repacts/ra2023/ra_11965_2023.html; mb.com.ph
- RA 10173 (Data Privacy Act) and IRR: privacy.gov.ph
- RA 11967 (Internet Transactions Act) and IRR: pwc.com/ph; ndvlaw.com
