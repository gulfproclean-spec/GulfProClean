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
- `functions/api/bookings.js`, `functions/api/bookings/[id].js` — create/list/reschedule bookings; sends a confirmation email on both
- `functions/_lib/auth.js`, `functions/_lib/email.js` — shared helpers
- `migrations/*.sql` — schema: `site_content`, `customers`, `sessions`, `bookings`, `schedule_settings`

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
   - `ADMIN_TOKEN` — a long random secret; whoever has it can edit content and hours at `/admin.html`
   - `RESEND_API_KEY` *(optional)* — enables the booking confirmation email. Without it, bookings still work, they just don't email a receipt. See **Email** below.
   - `FROM_EMAIL` *(optional)* — e.g. `Gulf ProClean <hello@gulfproclean.com>`. Defaults to Resend's shared test sender if unset, which only delivers to your own Resend account email — set this once your sending domain is verified.
5. Deploy. The site is live at the `*.pages.dev` URL Cloudflare assigns (a custom domain can be attached afterward in the same project's **Custom domains** tab).

## Editing content

Visit `/admin.html` on the deployed site, paste in the admin token, edit the
JSON for either page, and save. Changes appear on next page load — no
redeploy needed. The same page's **Business hours** section controls which
days/times customers can pick when booking.

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
