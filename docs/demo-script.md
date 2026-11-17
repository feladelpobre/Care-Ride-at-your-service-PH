# 2-Minute Demo Script (record with the phone screen recorder, Loom or OBS)

**Before recording**
- Scan the QR code (or open https://care-ride-at-your-service-ph.vercel.app) in an **incognito** window, so the "I am human" check shows.
- Have a trip ready to type, for example: *"Mama uses a wheelchair and can't stand. Dialysis, 3rd floor walang elevator, may oxygen tank."*
- Use tomorrow's date for the appointment, at 09:00. Use a real mobile number and email you can check.
- Upload as **unlisted** on YouTube, or Loom / Google Drive with "anyone with the link", and paste the link in the README and the Notion page.

| Time | Show | Say (suggested) |
|---|---|---|
| 0:00–0:12 | Scan the QR code → "Quick check" passes → home page | "This is Care Ride at your service-PH. In a PGH study, 82% of wheelchair users said accessibility is their biggest barrier to hospital visits. A caregiver can open the app from a QR poster; a quick 'I am human' check stops fake bookings." |
| 0:12–0:35 | Type the trip in Taglish. Tap **Use my current location (GPS)**, choose **St. Luke's BGC**, **Wheelchair, must stay seated**, tap **+** to 3 caregiver hours, set the appointment date and time | "I describe Mama the way a family would text, in Taglish. Everything the van needs is in one screen: GPS pickup, hospital, how she moves, and how many hours a caregiver stays with her." |
| 0:35–0:45 | Pick-up time: tap **Use 07:50** (or type a later time to show the warning) → tick **Senior/PWD** → **Plan my ride** | "The app suggests the latest safe pick-up time and warns if I choose one that's too late. Then one tap plans the ride." |
| 0:45–1:05 | Step 2: vehicle, crew, pick-up time; open **How we calculated** | "The AI, through the Vercel AI SDK, turns my message into structured data: oxygen tank, third floor, dialysis. But tested rules make the safety decisions: a wheelchair van, 2 crew for the stairs, and the pick-up time." |
| 1:05–1:20 | Step 3: distance "calculated by Care Ride" and the itemised total | "The rider never types the distance; the system measures it from GPS to the hospital. The legal 20% Senior/PWD discount applies to the fare, then the caregiver hours. No payment is taken." |
| 1:20–1:35 | Name, mobile, email, consent → **Request this ride** → reference CR-… (show the email arriving) | "A mobile number and consent under the Data Privacy Act are required. The request gets a CR reference, and a confirmation email arrives, with a reminder 2 hours before pick-up." |
| 1:35–1:45 | Clear the description, type "Tatay has chest pain" | "Safety first: emergency words show Call 911 straight away, before the AI is ever called." |
| 1:45–2:00 | **Dispatcher** (log in): Insights and the booking card. Optional: the GitHub Actions page | "The dispatcher sees each ride with its driver brief, numbers masked, plus funnel insights. GitHub Actions runs 132 tests and a secret scan on every change, and Vercel deploys it. Thank you!" |
