# Gulf ProClean

Marketing site (residential + commercial cleaning) with a Neon-Postgres
backend: a small CMS for page copy, a live quote calculator, real customer
accounts, online booking with a reschedule flow, and admin-configurable
business hours.

## Structure

- `index.html`, `residential.html`, `commercial.html` — the marketing pages and quote calculators
- `book.html` — post-quote flow: create account/log in, pick a day/time (>=24h notice), confirm
- `account.html` — login-gated: view bookings, reschedule (only if the current appointment is still >=24h out), subscription terms table
- `admin.html` — password-gated editor for page content and business hours
- `ds-base.js`, `image-slot.js`, `tweaks-panel.jsx`, `_ds/` — shared design-system assets imported from the Claude Design project
- `functions/api/content/[page].js` — GET (public) / PUT (admin-token-protected) page copy
- `functions/api/schedule.js` — GET (public) / PUT (admin-token-protected) weekly business hours
- `functions/api/auth/{signup,login,logout,me}.js` — password hashing (PBKDF2) + session cookies
- `functions/api/bookings.js`, `functions/api/bookings/[id].js` — create/list/get/reschedule bookings
- `functions/api/bookings/[id]/checkout.js` — creates a Stripe Checkout Session for a booking's total
- `functions/api/bookings/[id]/verify-payment.js` — confirms payment when the browser returns from Stripe (fast-path; the webhook is the source of truth)
- `functions/api/bookings/[id]/addons.js` — adds a paid add-on to an already-confirmed booking
- `functions/api/stripe/webhook.js` — Stripe calls this on `checkout.session.completed`; marks the booking paid and sends the confirmation email
- `functions/api/pricing/[page].js` — GET (public) / PUT (admin-token-protected) tier pricing
- `functions/_lib/auth.js`, `functions/_lib/email.js`, `functions/_lib/stripe.js`, `functions/_lib/payments.js` — shared helpers
- `migrations/*.sql` — schema: `site_content`, `customers`, `sessions`, `bookings`, `schedule_settings`, `pricing_tiers`. **After pulling new migrations, run them against the live database** — paste each new `.sql` file's contents into the Neon console's SQL Editor (console.neon.tech → your project → SQL Editor) and run it once. As of this repo, the latest is `007_stripe_payments.sql`.

## Local preview

```bash
npm install
node serve.js
```

Opens a plain static file server on `http://localhost:8080`. The
`/api/content/*` routes only exist once deployed to Cloudflare Pages, so
locally the pages fall back to their built-in default copy — this is expected.

## Deploying (Cloudflare Pages, connected to GitHub)

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick this repo.
3. Build settings: Framework preset **None**, build command **(empty)**, build output directory **/**.
   Cloudflare runs `npm install` automatically because `package.json` is present, which is what
   makes `@neondatabase/serverless` available to the function bundler. The `functions/` directory
   is auto-detected — no extra config needed.
4. In **Settings → Environment variables**, add for the Production (and Preview) environment:
   - `DATABASE_URL` — the Neon connection string (`postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require`)
   - `ADMIN_TOKEN` — a long random secret; whoever has it can edit content, hours and pricing at `/admin.html`
   - `STRIPE_SECRET_KEY` — **required for bookings to complete.** See **Payments** below.
   - `STRIPE_WEBHOOK_SECRET` — **required.** See **Payments** below.
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` *(optional but recommended)* — send/receive email as `gulfproclean@gmail.com`. Without these, bookings and contact form submissions still work, they just don't send any email. See **Email** below for the one-time Google Cloud setup.
5. Deploy. The site is live at the `*.pages.dev` URL Cloudflare assigns (a custom domain can be attached afterward in the same project's **Custom domains** tab).

## Editing content

Visit `/admin.html` on the deployed site, paste in the admin token, edit the
JSON for either page, and save. Changes appear on next page load — no
redeploy needed. The same page's **Business hours** section controls which
days/times customers can pick when booking.

## Payments (Stripe)

Booking now requires real payment. When a customer confirms a booking, the
site creates the booking row as `unpaid`, opens a **Stripe Checkout
Session** for the total, and redirects them to Stripe's hosted payment
page. On success they're redirected back and the booking is marked `paid`
(see `functions/api/bookings/[id]/verify-payment.js`); a Stripe **webhook**
is the actual source of truth for this (`functions/api/stripe/webhook.js`),
so payment still gets recorded correctly even if the customer closes the
tab right after paying. No card details ever touch this app's servers —
Stripe hosts the entire payment form.

Setup:

1. Create a [Stripe](https://stripe.com) account (test mode is fine to start).
2. **Developers → API keys** → copy the **Secret key** (`sk_test_...` while testing,
   `sk_live_...` once you're ready for real charges) → set it as `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint** → URL: `https://<your-site>/api/stripe/webhook`
   → select the `checkout.session.completed` event → save, then copy the
   **Signing secret** (`whsec_...`) → set it as `STRIPE_WEBHOOK_SECRET`.
4. Redeploy (env var changes need a new deployment to take effect, or restart the Function).

**Without both of these set, "Confirm booking" will fail** with a clear
"Payments are not configured yet" error — there's no fallback that lets a
booking through unpaid.

If a customer starts checkout but doesn't finish it, the booking stays
`unpaid` — it shows up in **My Account** tagged "Unpaid" with a **Pay now**
button that reopens Checkout for the same amount, rather than disappearing
or silently double-booking the slot.

**Pricing integrity:** the amount charged is computed entirely server-side
(`functions/_lib/pricing.js`) from raw selections — property size, tier,
frequency, add-on picks — not from a total the browser sends. The client
never gets to state "the total is $X"; it can only state "I picked this
tier, this frequency, these add-ons," and the server derives the price
from those using the same formulas as the on-page calculator, pulling
current tier pricing from `pricing_tiers` at request time. Tampering with
the page's JavaScript can no longer produce a cheaper Stripe charge.
One inherent limit remains: property size (sq ft) and commercial scope
details (restroom count, etc.) are still self-reported by the customer —
no web form can verify the true size of a building. What's closed off is
independent manipulation of price, discounts, add-on cost, visit count,
or tax once a stated size is given.

## Email (Gmail — contact form, booking confirmations)

`gulfproclean@gmail.com` is the email address for **everything**: every
outbound message is sent *from* it, and every business notification
(contact form submissions, new paid bookings) is sent *to* it. Sending goes
through the **Gmail API** (`functions/_lib/email.js`), authenticated with an
OAuth2 refresh token — not Gmail's SMTP servers, since Cloudflare Pages
Functions can only make HTTPS calls, not raw SMTP connections. The API call
itself needs no per-message setup; only the one-time OAuth authorization
below.

### One-time setup (manual, in Google Cloud Console)

You only need to do this once. It creates three long-lived values
(`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`) that let
the site send mail as `gulfproclean@gmail.com` indefinitely, without
storing the account's actual password anywhere.

1. **Create a Google Cloud project.**
   Go to [console.cloud.google.com](https://console.cloud.google.com),
   signed in as `gulfproclean@gmail.com`. Click the project dropdown (top
   left) → **New Project**. Name it e.g. "Gulf ProClean" → **Create**.

2. **Enable the Gmail API.**
   With that project selected, go to **APIs & Services → Library**, search
   "Gmail API", open it, click **Enable**.

3. **Configure the OAuth consent screen.**
   Go to **APIs & Services → OAuth consent screen**.
   - User type: **External** → Create.
   - Fill in the required fields: App name ("Gulf ProClean"), User support
     email (`gulfproclean@gmail.com`), Developer contact email
     (`gulfproclean@gmail.com`). Save and continue.
   - **Scopes**: click **Add or remove scopes**, manually add
     `https://www.googleapis.com/auth/gmail.send`, then Update → Save and continue.
   - **Test users**: add `gulfproclean@gmail.com` → Save and continue.
   - On the summary screen, go back to the consent screen's overview page
     and click **Publish App** → **Confirm**. This moves it out of
     "Testing" status. (You'll still see an "unverified app" warning when
     authorizing in step 5 below — that's expected and safe to click
     through, since it's your own app requesting access to your own
     account. Publishing without full Google verification just avoids
     Testing mode's refresh tokens expiring every 7 days.)

4. **Create OAuth credentials.**
   Go to **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**.
   - Application type: **Web application**.
   - Name: anything, e.g. "Gulf ProClean site".
   - Under **Authorized redirect URIs**, add:
     `https://developers.google.com/oauthplayground`
   - Create. A dialog shows a **Client ID** and **Client Secret** — copy both.

5. **Get a refresh token via Google's OAuth Playground.**
   Go to [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
   - Click the gear icon (top right) → check **Use your own OAuth
     credentials** → paste in the Client ID and Client Secret from step 4 → Close.
   - In the left panel's scope box, paste
     `https://www.googleapis.com/auth/gmail.send` → click **Authorize APIs**.
   - Sign in as `gulfproclean@gmail.com`. You'll hit the "Google hasn't
     verified this app" screen — click **Advanced** → **Go to Gulf
     ProClean (unsafe)** → **Allow**.
   - Back in the Playground, click **Exchange authorization code for
     tokens**. A **Refresh token** appears in the response — copy it.

6. **Add the three values to Cloudflare Pages.**
   Pages project → **Settings → Environment variables** (Production and
   Preview) → add:
   - `GMAIL_CLIENT_ID` — from step 4
   - `GMAIL_CLIENT_SECRET` — from step 4
   - `GMAIL_REFRESH_TOKEN` — from step 5

7. **Redeploy** (or trigger a new deployment from the Pages dashboard) so
   the functions pick up the new environment variables.

Nothing else needs to change — `functions/_lib/email.js` is a no-op on every
send function until all three `GMAIL_*` variables are set, so the site still
works end-to-end (contact form submits, bookings complete) even before email
is configured; it just won't deliver anything yet.

Gmail's normal sending limits apply (500 messages/day for a regular Gmail
account) — plenty for a small business site's contact form + booking
volume.

### What fires automatically, and where it goes

- **Contact Us form** (`functions/api/contact.js`) — every submission is
  stored in `contact_messages` regardless of email, then
  `sendContactNotificationEmail` sends a notification **to**
  `gulfproclean@gmail.com` **from** `gulfproclean@gmail.com`, with the
  submitter's name, email, phone, page, and message. `Reply-To` is set to
  the submitter's email, so replying in Gmail goes straight back to them.
- **Booking paid** (`functions/_lib/payments.js` → `markBookingPaid`, called
  from both the Stripe webhook and the client-side payment-verification
  fallback, whichever arrives first) — fires two emails, both sent from
  `gulfproclean@gmail.com`:
  - `sendBookingConfirmationEmail` → the **customer's** email: service,
    address, billing plan, scheduled date/time, total paid.
  - `sendBookingNotificationEmail` → `gulfproclean@gmail.com`: everything
    submitted for the booking — customer name, email, phone, service
    address, billing address (if different), tier, billing plan, frequency,
    visit count, scheduled date/time, notes, and total paid.
  Both are idempotent with the booking itself — they only send the first
  time a given booking flips to `paid`, so a webhook/fallback race can't
  double-send.
- **Reschedule** — the existing reschedule flow re-sends the customer
  confirmation with the updated date/time (unchanged by this section).

## Renewal reminders (6- and 12-month subscriptions)

`functions/api/cron/renewal-reminders.js` emails a renewal reminder at
roughly 30 days, 15 days, and on the day a 6- or 12-month subscription's
commitment period ends. It requires the `GMAIL_*` variables (see above) plus a
`CRON_SECRET` environment variable, and expects to be called as:

```
POST /api/cron/renewal-reminders
x-cron-secret: <CRON_SECRET>
```

**This route is not called automatically yet** — Cloudflare Pages Functions
have no built-in cron trigger. Wire up a daily call yourself, e.g. a GitHub
Actions scheduled workflow:

```yaml
# .github/workflows/renewal-reminders.yml
on:
  schedule:
    - cron: '0 14 * * *'  # once daily
jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST https://<your-site>.pages.dev/api/cron/renewal-reminders \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

or a small standalone Cloudflare Worker with its own `[triggers] crons`
entry that does the same `curl`. Either way, set the same `CRON_SECRET`
value on both sides. Until this is wired up, the route can still be called
manually (e.g. from a browser or curl with the header) to send reminders.

## Scheduling and add-ons

- Visit times are offered in 4-hour windows (e.g. 8am/12pm/4pm), based on that day's business hours.
- A booking captures one confirmed visit slot. If the plan recurs (e.g. weekly), the schedule step
  shows an estimated preview of the next few visit dates based on the selected frequency — those
  aren't individually booked yet, just previewed; only the first visit is stored.
- Each add-on selected in the calculator gets its own frequency: "every visit" (charged once per
  visit for the life of the plan) or "one-time" (charged once total). This is priced into the
  quote and carried through to the final charge.
- At scheduling, the customer picks which purchased add-ons apply to that specific visit. The
  API rejects any add-on that wasn't actually part of the purchased quote.
