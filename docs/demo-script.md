# 2-Minute Demo Script (record with Loom, OBS or the phone screen recorder)

**Before recording:** open the live URL in an incognito window and zoom the browser to 110%. Keep the web app walkthrough PDF open as a cue sheet.

| Time | Show | Say (suggested) |
|---|---|---|
| 0:00–0:12 | Home page | "This is Care Ride at your service-PH. 82% of wheelchair users in a PGH study said accessibility is their biggest barrier to hospital visits. A caregiver books a safe ride by describing the trip in one message." |
| 0:12–0:32 | Type the Taglish trip, then tick **Wheelchair**, **Hospital companion** and **Senior/PWD** → **Plan my ride** | "I type it the way a Filipino family would text, in Taglish, and tick what we need. The AI, through the Vercel AI SDK, turns the message into structured data: wheelchair, must stay seated, 3rd floor with no elevator, dialysis Tuesday 9am." |
| 0:32–0:50 | Plan card: vehicle, crew, pickup time; open **How we calculated** | "The safety decisions aren't left to the AI. Tested rules choose a wheelchair van, 2 crew for the stairs, and work back a 7:20 pickup from the appointment." |
| 0:50–1:08 | Itemised price | "The price uses distance bands to the named hospital, or the nearest one. The legal 20% Senior/PWD discount applies to the ride fare, then the wheelchair and 5 hours of caregiver. ₱2,840, no payment taken." |
| 1:08–1:20 | Mobile number + consent → **Request this ride** → reference CR-… | "A mobile number is required to stop fake bookings, and we ask consent under the Data Privacy Act. The request gets a traceable reference and date." |
| 1:20–1:30 | Type "Tatay has chest pain" → Plan | "Safety first: emergency words are caught *before* the AI, and we show Call 911 instead of booking." |
| 1:30–1:45 | **Feedback**: stars, Late pickup, driver/caregiver names, callback → ticket FB-… | "After the trip, the family rates the driver and caregiver and reports issues. A callback request becomes a High-priority ticket." |
| 1:45–2:00 | **Dispatcher**: Insights, Feedback panel, booking card | "The dispatcher sees the funnel insights, open feedback and each ride with its driver brief, with phone numbers masked. GitHub Actions runs tests and a secret scan on every change, and it deploys on Vercel. Thank you!" |
