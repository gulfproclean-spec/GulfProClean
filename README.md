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
   - `RESEND_API_KEY` *(optional)* — enables the booking confirmation email. Without it, bookings still work, they just don't email a receipt. See **Email** below.
   - `FROM_EMAIL` *(optional)* — e.g. `Gulf ProClean <hello@gulfproclean.com>`. Defaults to Resend's shared test sender if unset, which only delivers to your own Resend account email — set this once your sending domain is verified.
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

## Email (booking confirmations)

Confirmation emails (sent on booking and on reschedule) use
[Resend](https://resend.com) — a simple transactional email API. To turn
this on:

1. Create a free Resend account and an API key.
2. Add `RESEND_API_KEY` to Cloudflare's environment variables (step 4 above).
3. For real deliverability, verify your sending domain in Resend and set
   `FROM_EMAIL` to an address on that domain. Until then, emails will only
   land in the inbox tied to the Resend account itself (fine for testing,
   not for real customers).

Nothing else needs to change — `functions/_lib/email.js` is a no-op until
`RESEND_API_KEY` is set, so bookings work either way.

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
