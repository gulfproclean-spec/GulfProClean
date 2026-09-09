# Getting the apps into the App Store and Google Play

Everything below is prepared; the parts marked **(you)** need your own
accounts, a Mac for iOS, and a card for the store fees. Total budget:
Apple $99/year, Google $25 one-time.

Two apps ship from this repo (see `apps/README.md`):

| | Gulf ProClean (customers) | Gulf ProClean Crew (employees) |
|---|---|---|
| Folder | `apps/customer` | `apps/crew` |
| Bundle / package id | `com.gulfproclean.app` | `com.gulfproclean.crew` |
| Audience | Public | Private — your technicians only |

---

## 0. Before anything else — merge and migrate

1. Merge the PR that added this file. Cloudflare Pages deploys `main`
   automatically.
2. Apply `migrations/030_employee_accounts_and_field_ops.sql` to the Neon
   database (it was applied by Claude at the time of the PR — confirm with
   `psql "$DATABASE_URL" -f test-schema.sql` or by checking that the
   `employee_sessions` table exists).
3. In `/admin.html` → **Crew**, add each technician with an email and an
   app password. Open `/employee.html` on a phone and sign in as one of them
   to confirm the checklist app works end-to-end before wrapping it.
4. If the site will live on a custom domain (e.g. `gulfproclean.com`)
   instead of `gulfproclean.pages.dev`, set that domain up first and change
   `server.url` in both `apps/*/capacitor.config.json`. The apps load the
   live site, so the URL baked into them must be the permanent one.

## 1. Developer accounts **(you)**

**Apple** — https://developer.apple.com/programs/enroll/
- Enroll as an **organization** (needs a D-U-N-S number — free from Dun &
  Bradstreet, takes up to 2 weeks; enrolling as an individual is faster but
  the seller name in the store becomes your personal name).
- $99/year. Use `gulfproclean@gmail.com` as the Apple ID so the account
  stays with the business.
- After approval, sign in at https://appstoreconnect.apple.com and accept
  the Paid Apps agreement (needed even for free apps).

**Google** — https://play.google.com/console/signup
- Organization account, $25 one-time. Google now requires identity
  verification (business document + a phone) and, for new personal
  accounts, a 14-day closed test with 12+ testers before production —
  organization accounts skip the 12-tester rule.

## 2. Build the apps **(you, on a Mac)**

Install Xcode (Mac App Store), Android Studio, Node 20+, then:

```
cd apps/customer && npm install && npx cap add ios && npx cap add android && npm run assets && npx cap sync
cd ../crew     && npm install && npx cap add ios && npx cap add android && npm run assets && npx cap sync
```

`npm run assets` turns `resources/icon.png` + `splash.png` into every size
both stores need. Commit the generated `ios/` and `android/` folders.

### iOS (Xcode)
1. `npm run ios` → in Xcode select the **App** target → *Signing &
   Capabilities* → Team: your Apple team, check *Automatically manage
   signing*. Bundle id is already set.
2. *General* → Version `1.0.0`, Build `1`. Deployment target iOS 14+.
3. Product → Archive → Distribute App → App Store Connect → Upload.

### Android (Android Studio)
1. `npm run android` → Build → Generate Signed Bundle → **Android App
   Bundle** → create a new keystore (**back it up — losing it means you
   can never update the app**) → release.
2. That produces `android/app/release/app-release.aab` to upload.

## 3. Store listings — copy/paste

Screenshots: take them from a real phone or the simulators.
- iPhone: 6.7" (1290×2796) required; 6.5" optional. iPad only if you enable it — leave iPad unchecked.
- Android: phone 1080×1920 minimum, 2–8 images; a 1024×500 feature graphic is required (`assets/app/feature-graphic-1024x500.png`).
- Suggested shots — customer app: account/bookings list, booking calendar, plan selection, confirmation. Crew app: sign in, today's jobs, checklist with items ticked, supply check.

Both stores need: privacy policy URL → `https://<site>/privacy.html`;
support URL → `https://<site>/contact.html`; support email → `gulfproclean@gmail.com`.

### Gulf ProClean (customer app)
- **Subtitle / short description (30/80 chars):** Home & office cleaning, booked in minutes
- **Category:** Lifestyle (Apple) · House & Home (Google)
- **Keywords (Apple, 100 chars):** cleaning,house cleaning,maid,office cleaning,janitorial,Pensacola,Destin,Panama City
- **Description:**

> Gulf ProClean brings professional residential and commercial cleaning to homes and businesses from Pensacola to Panama City Beach — veteran-owned, family-operated, and fully insured.
>
> • Book a one-time deep clean or a recurring plan in minutes
> • Pick the day and time that works for you
> • Choose your tier and add-ons — pricing is shown up front, no surprise fees
> • Manage upcoming visits, reschedule with 24 hours' notice, and review past visits
> • Secure payment through Stripe; we never store your card
>
> Serving Pensacola, Navarre, Fort Walton Beach, Destin, Panama City Beach and everywhere in between.

- **Age rating:** 4+ / Everyone. **Data safety / App Privacy:** collects name, email, phone, physical address, payment info (via Stripe), user-generated content (notes) — linked to the user, used for app functionality; no tracking, no ads, not shared for advertising. Account deletion: in-app link to `/delete-account.html`.

### Gulf ProClean Crew (employee app)
- **Subtitle / short description:** Job checklists for Gulf ProClean technicians
- **Category:** Business (both)
- **Description:**

> For Gulf ProClean employees. Sign in with the credentials from the office to see the jobs assigned to you, work through the residential or commercial checklist step by step, clock in and out, collect a client sign-off, and file your start-of-shift supply check.
>
> This app is for Gulf ProClean staff only. There is no public sign-up — contact the office for access.

- **Distribution — do this instead of a public listing:**
  - Apple: **Unlisted app distribution** (App Store Connect → App
    Information → request unlisted, or via https://developer.apple.com/contact/request/unlisted-app/).
    The app is installed from a private link, never appears in search.
    Alternatively **TestFlight** (up to 10,000 testers, 90-day builds) works
    for a small crew with zero review friction.
  - Google: Play Console → Setup → Advanced settings → **Managed Google Play**
    private app, or a **Closed testing** track with your technicians' Gmail
    addresses.
- **Reviewer demo account:** Apple *will* ask for a working login. Create a
  technician `apple.review@gulfproclean.com` in the Crew panel with a
  password, assign it one test booking, and put the credentials in App
  Review Information → Sign-in required. Same for Google's review notes.
- **Data safety:** collects name, email (employee), work activity (checklist,
  times, notes). No location, no tracking.

## 4. Review gotchas — read before submitting

- **Apple guideline 4.2 (minimum functionality).** Apple sometimes rejects
  apps that are "just a website in a wrapper". These two are real, logged-in
  tools with device-specific behaviour (native splash, status bar, offline
  fallback), which usually passes. If a reviewer pushes back, the fastest
  fix is enabling push notifications for visit reminders (crew) / booking
  confirmations (customer) — say the word and I'll wire `@capacitor/push-notifications`.
- **Apple 5.1.1(v) account deletion** — done: `/delete-account.html` +
  `POST /api/auth/delete-account`. Link it from the customer app's account
  page so reviewers find it (the privacy policy already links it).
- **Apple 3.1.1 payments** — booking a *physical service* (cleaning) may use
  Stripe, not In-App Purchase. That's explicitly allowed. Mention it in the
  review notes: "Payments are for physical cleaning services performed at
  the customer's property, per guideline 3.1.3(e)."
- **Google Play — Login credentials** for review are required for both apps.
- **Export compliance (Apple):** the apps use only HTTPS → answer "No" to
  the encryption question, or set `ITSAppUsesNonExemptEncryption = NO` in
  `Info.plist`.
- **App Tracking Transparency:** not needed — nothing tracks.

## 5. After approval

- Update the site: add "Get the app" links (App Store / Play badges) to
  `index.html`/`account.html`, and give technicians the Crew install link.
- Every future site deploy updates both apps instantly — the shells only
  need a new store build when the icon, name, or `server.url` change.
