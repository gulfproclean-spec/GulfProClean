# Gulf Coast ProClean — Web App

A full-stack demo app built from the Gulf Coast ProClean business plan:
a public marketing site (services, subscription pricing, founder story,
service area) plus a working **request → get matched with an available
cleaner** flow, styled after rideshare-app matching (Uber/Lyft), with
customer, cleaner, and admin dashboards.

**Stack:** Next.js 14 (App Router) · React · Tailwind CSS · Prisma ORM ·
SQLite (local) — all in plain JavaScript, no TypeScript build step to fight.

---

## 1. What's inside

| Area | What it does |
|---|---|
| `/` `/services` `/pricing` `/about` `/contact` | Public marketing site built from the business plan's services, subscription tiers, founder profiles, and service-area corridor. |
| `/book` | Multi-step booking wizard. On submit, the server runs a matching algorithm (nearest available cleaner by zip code, like a rideshare dispatch) and the UI shows an animated "finding your pro" screen, then the match. |
| `/dashboard` | Customer view: look up your bookings by email. |
| `/cleaner` (login at `/cleaner/login`) | Cleaner portal: toggle availability on/off, see your job queue, start/complete jobs. |
| `/admin` (login at `/admin/login`) | Admin portal: KPIs, all bookings, cleaner roster (+ add cleaners), leads from the contact form. |

The matching logic lives in `src/lib/matching.js` — it looks for available
cleaners who cover the requested zip code, prefers whoever is least busy,
and falls back to the next-best available cleaner if nobody covers that
exact zip yet (realistic for a brand-new two-person crew still building
route density, per the business plan).

---

## 2. Run it locally

**Prerequisites:** [Node.js 18+](https://nodejs.org) and npm installed.

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment file
cp .env.example .env
# The default DATABASE_URL="file:./dev.db" works out of the box — no
# database server to install for local use.

# 3. Create the database and load demo data
npm run db:push
npm run db:seed

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

### Demo accounts (created by `npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gulfcoastproclean.com` | `admin123` |
| Cleaner | `maria@gulfcoastproclean.com` | `cleaner123` |
| Cleaner | `james@gulfcoastproclean.com` | `cleaner123` |
| Cleaner | `priya@gulfcoastproclean.com` | `cleaner123` |

Customer accounts aren't pre-set — anyone who books through `/book` is
created automatically, and can look themselves up on `/dashboard` with the
same email.

If you ever want to wipe and reload demo data: `npm run db:reset`.

---

## 3. How to test it end-to-end

Walk through this checklist after `npm run dev` is running:

1. **Browse the marketing site** — Home, Services, Pricing, About, Contact.
   Submit the Contact form; it should show a confirmation.
2. **Book a cleaning** — go to `/book`:
   - Pick a service (try a subscription tier and, separately, "Vacation
     Rental Turnover").
   - Pick **Fort Walton Beach** or **Destin** as the city (these are covered
     by seeded cleaners, so you'll see a real match).
   - Fill in a date, contact info, and submit.
   - You should see the animated "Finding your ProClean pro…" screen for a
     couple seconds, then a matched-cleaner card with name, rating, ETA,
     and a price summary.
   - Try booking again with **Panama City Beach** vs. a city with no
     dedicated cleaner zip overlap — matching should still succeed via the
     fallback (least-busy available cleaner), demonstrating the
     rideshare-style "widen the search" behavior.
3. **Check the customer dashboard** — go to `/dashboard`, enter the email
   you just booked with (it's also remembered automatically via
   `localStorage` if you click "View my bookings" right after booking).
   You should see your booking(s) and status.
4. **Log in as a cleaner** — `/cleaner/login` with `maria@gulfcoastproclean.com`
   / `cleaner123`. You should see her job queue, including whatever you just
   booked (if she was the match). Try:
   - Toggling **Available / Offline** — then book a new job in her zip and
     confirm she's skipped while offline (matched to another cleaner or
     falls into "on the list" if none are available).
   - Clicking **Start job**, then **Mark complete** on an assigned job.
5. **Log in as admin** — `/admin/login` with `admin@gulfcoastproclean.com`
   / `admin123`. Check the **Bookings**, **Cleaners**, and **Leads** tabs.
   Try adding a new cleaner from the Cleaners tab, then book a request in
   that cleaner's zip codes to confirm they can be matched.
6. **Log out** from both portals and confirm you're redirected to the
   respective login pages when revisiting `/cleaner` or `/admin`.

### Optional: inspect the database directly

```bash
npx prisma studio
```

This opens a browser GUI at `http://localhost:5555` where you can see and
edit every row in the SQLite database — useful for confirming bookings,
matches, and statuses during testing.

---

## 4. Put it on GitHub

```bash
cd gulf-coast-proclean
git init
git add .
git commit -m "Initial commit: Gulf Coast ProClean app"
```

Then create an empty repository on GitHub (via github.com → **New
repository** — don't initialize it with a README, since you already have
one), and push:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

`.env` and the SQLite database file are already excluded via `.gitignore`,
so secrets and local data won't be committed.

---

## 5. Deploy it live

The easiest path is **Vercel** (made by the Next.js team, generous free
tier). SQLite's local file won't persist on Vercel's serverless
infrastructure, so for a live deployment you'll switch to a free hosted
Postgres database first — this takes about 5 minutes.

### Step 1 — Get a free Postgres database

Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) (both
have generous free tiers) or Vercel's own **Storage → Postgres** tab.
Create a project/database and copy the connection string — it looks like:

```
postgresql://user:password@host/dbname?sslmode=require
```

### Step 2 — Switch Prisma to Postgres

In `prisma/schema.prisma`, change:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

to:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Commit that change:

```bash
git add prisma/schema.prisma
git commit -m "Switch database provider to Postgres for production"
git push
```

### Step 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import
   your GitHub repo.
2. Under **Environment Variables**, add:
   - `DATABASE_URL` = your Postgres connection string from Step 1.
3. Click **Deploy**. Vercel runs `npm run build`, which runs
   `prisma generate && next build` automatically (already wired up in
   `package.json`).
4. Once deployed, push your schema to the live database and seed it. From
   your local machine, temporarily point at the production database and run:
   ```bash
   DATABASE_URL="<your-production-connection-string>" npx prisma db push
   DATABASE_URL="<your-production-connection-string>" npm run db:seed
   ```
   (Or run these from Vercel's built-in terminal / a one-off script — any
   environment that can reach your Postgres database works.)
5. Visit your new `*.vercel.app` URL — you're live.

Every future `git push` to `main` auto-deploys.

### Alternative hosts

Render, Railway, and Fly.io all work similarly: set `DATABASE_URL` as an
environment variable pointing at a Postgres add-on, and use `npm run
build` / `npm run start` as your build/run commands.

---

## 6. Before you use this for real customers

This was built as a functional demo/MVP matching the business plan, with a
few deliberate simplifications worth knowing about:

- **Auth is intentionally minimal.** Cleaner/admin login uses a simple
  cookie session (see `src/lib/session.js`) rather than a hardened auth
  library. Before handling real customer accounts or payments, swap this
  for [NextAuth.js](https://authjs.dev), [Clerk](https://clerk.com), or
  similar.
- **No real payments yet.** Pricing is estimated and displayed, but nothing
  charges a card. The business plan calls out Square/Stripe for payment
  processing — integrating [Stripe Checkout](https://stripe.com/docs/checkout)
  or [Stripe Billing](https://stripe.com/docs/billing) (for the
  subscription tiers) is the natural next step.
- **No SMS/email notifications yet.** The plan calls for automated
  text/email confirmations and reminders — consider
  [Twilio](https://www.twilio.com) (SMS) and
  [Resend](https://resend.com) or [Postmark](https://postmarkapp.com)
  (email) for that.
- **Matching is intentionally simple** (zip-code + availability + job
  load). It's a solid foundation, but doesn't account for real drive times,
  calendar conflicts across days, or skill/certification matching (e.g.,
  medical-office cleaning) — all reasonable Phase 2 additions once you have
  real usage data.

---

## 7. Project structure

```
gulf-coast-proclean/
├── prisma/
│   ├── schema.prisma      # Database models: User, Cleaner, Booking, Lead
│   └── seed.js            # Demo admin/cleaner accounts + sample bookings
├── src/
│   ├── app/                # Next.js App Router pages + API routes
│   │   ├── api/            # bookings, leads, auth, cleaner, admin endpoints
│   │   ├── book/            # Booking + matching wizard
│   │   ├── dashboard/       # Customer bookings lookup
│   │   ├── cleaner/         # Cleaner portal (+ /login)
│   │   ├── admin/           # Admin portal (+ /login)
│   │   └── ...              # Marketing pages
│   ├── components/          # Reusable UI (BookingWizard, MatchResult, etc.)
│   └── lib/
│       ├── db.js            # Prisma client
│       ├── services.js      # Pricing/services data from the business plan
│       ├── matching.js       # The rideshare-style matching algorithm
│       └── session.js        # Cookie session helpers
└── package.json
```
