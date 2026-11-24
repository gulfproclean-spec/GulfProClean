# Gulf ProClean — Client Acquisition Plan

*Drafted 2026-11-24. Covers the next 90 days (Dec 2026 – Feb 2027).*

## 1. Where we actually are (live data, not assumptions)

Pulled from the production database on 2026-11-24:

| Metric | Value |
|---|---|
| Page views since tracking began (2026-09-10) | 543 |
| Page views, last 30 days | 99 |
| Unique IPs, last 30 days | 79 (some are bots — see the bot-filter commits) |
| Customer accounts | **0** |
| Bookings (any status) | **0** |
| Contact-form messages | **0** |

**What this means:** the site works but it gets almost no traffic, and nobody who
visited has converted. At ~80 visitors a month, even a strong 3% conversion rate
gives about 2 leads a month. **Website fixes alone will not produce customers.**
The first 10–25 customers will come from direct, local, person-to-person
channels. The website's job is to close the deal ("they look legit") after
someone already heard of us.

This is the normal pattern for new home-service businesses: the first customers
come through Google Business Profile, referrals, neighborhood groups and
B2B relationships, not organic web search, which takes 6–12 months to build.

## 2. Goals (90 days)

| By | Goal |
|---|---|
| Day 14 | Google Business Profile verified; 5+ reviews; site conversion blockers fixed |
| Day 30 | First 5 paying customers; 2 on recurring plans |
| Day 60 | 15 customers; 1 property-manager or vacation-rental account |
| Day 90 | 25+ customers; 10+ recurring; $4,000+ monthly recurring revenue; 15+ Google reviews |

**Why recurring matters:** a Preferred biweekly home runs about $250 × 2 = ~$500/month
before plan discount, or roughly $5,500–6,000 a year. One recurring client is worth
30+ one-time cleans in lifetime value, so it's worth spending real money and
effort ($100–150) to win each one.

## 3. Fix these on the site first (week 1, small effort)

These are things in the repo that directly cost conversions:

1. **Contradictory copy about the price calculator.** `residential-sections.jsx:54`,
   `commercial-sections.jsx:50` say *"Get your exact price in under a minute — no
   account needed"*, but the calculator is wrapped in `AuthGate`
   (`gulfproclean-shared.jsx:149`) and requires signup. Users who are promised one
   thing and then hit a signup wall leave. Pick one:
   - **Recommended:** let anyone see the exact price, and require an account only at
     "Book". Showing the price first and asking for commitment second is the
     classic foot-in-the-door order, and it converts better than asking up front.
   - Or change the copy to say a free account is required.
2. **Add a "Text us for a quote" / call-back form with 2–3 fields** (name, phone,
   zip). Many cleaning buyers, especially older homeowners and businesses, won't
   create an account but will text. Route it to the owner's phone in under 5 minutes.
3. **Add trust proof above the fold:** "Licensed & insured" (only if true — have the
   certificate ready to send), "Veteran-owned", a satisfaction guarantee
   ("Not happy? We come back and re-clean free within 24 hours"), and real Google
   review stars once you have them. People choosing someone to come into their
   home look for social proof and risk reversal more than anything else.
4. **Real photos of the owner/crew.** Stock-looking photos reduce trust for a
   service that enters homes. One honest photo of the team in branded shirts does more.
5. **Set up conversion tracking** (Google Analytics 4 or Cloudflare Web Analytics +
   a "lead" event on form submit / tap-to-call) so we can tell which channel works.

## 4. Channels, ranked by expected return

### Tier 1 — Do now (free or cheap, highest historical return)

**A. Google Business Profile (GBP)** — the #1 lead source for local cleaners.
- Create and verify it (service-area business; hide the home address).
- Categories: "House cleaning service" (primary), "Commercial cleaning service",
  "Janitorial service". Add every city from the service area.
- Upload 10+ real photos, list services and starting prices, add the booking link.
- Post weekly (before/after, seasonal tip, offer).
- Turn on messaging and answer within minutes.

**B. Reviews engine** — reviews drive local ranking and trust more than anything else.
- Ask every customer in person at the end of the job, then send the direct GBP
  review link by text the same day. Same-day asks get far higher response than
  delayed email asks.
- Start with your personal network: friends/family who you clean for at a
  "founding customer" rate can leave honest reviews of real work. **Never buy or
  fake reviews** — it violates Google and FTC rules and can get the profile suspended.

**C. Warm network blitz (week 1)** — text/call 50 people you know personally.
Script: *"Hey [name], I've launched Gulf ProClean, a veteran-owned cleaning
company here on the coast. I'm taking my first 20 founding customers at 20% off
their first clean. Know anyone who'd want it? I'd really appreciate the referral."*
Asking for *a referral* rather than a sale gets more yes's and less awkwardness.

**D. Nextdoor + local Facebook groups** — Pensacola, Gulf Breeze, Navarre,
Fort Walton, Destin, Niceville, 30A/Santa Rosa Beach, PCB community groups and
military-spouse groups. Post as a neighbor, not an ad: a short intro, owner photo,
veteran story, founding-customer offer. Respond to every "anyone recommend a
cleaner?" thread fast — those are the warmest leads that exist.
Claim a free Nextdoor business page.

### Tier 2 — The niches where you have an unfair advantage

**E. Military PCS move-out cleans** — the area has Eglin AFB, Hurlburt Field,
NAS Pensacola, NAS Whiting Field and Tyndall AFB. Military families move on short
notice and need move-out cleans to pass inspection and get deposits back.
"Veteran-owned" carries real weight with this audience.
- Offer: "PCS Move-Out Clean — inspection-ready, re-clean free if it doesn't pass."
- Get in front of: base spouse Facebook groups, privatized base-housing offices,
  off-base property managers that rent to military, military-friendly realtors.
- Ask whether a military/first-responder discount (e.g., 10%) fits margins —
  it's a strong trust signal with this group.

**F. Vacation-rental turnovers (Destin, Miramar Beach, 30A, PCB, Navarre)** —
huge volume, recurring, every week of the season. Hosts' biggest pain is a
cleaner who doesn't show up on Saturday.
- Target: self-managing Airbnb/VRBO hosts (local host groups on Facebook) and
  small property managers with 10–50 units.
- Pitch reliability, not price: photo checklist after every turnover, damage/
  low-supply report, guaranteed same-day turnover.
- Start Dec–Feb (off-season) so you're their proven cleaner before spring break.
  This is the most important timing decision in this plan.

**G. Realtors and property managers (move-in/move-out)** — one realtor can send
dozens of jobs a year. Visit 20 local brokerages, drop off a card + a "first
listing clean 50% off" so they try you once. Offer to clean before listing photos.

### Tier 3 — Commercial (higher value, slower close)

**H. Door-to-door B2B + follow-up** — small offices, dental/medical offices,
insurance and real-estate offices, gyms, churches, salons within one area at a time.
- Walk in, ask for the office manager, hand a one-page flyer with a free
  walkthrough offer. Follow up in 3 days by phone, then again in a week.
  Most B2B deals close after several touches; most competitors quit after one.
- Join the local chambers (Greater Pensacola, Destin Area, Emerald Coast)
  and a BNI chapter — common, proven referral sources for commercial cleaners.
- Register with the SBA/state as a veteran-owned business (VOSB) and look for
  local government cleaning contracts later.

### Tier 4 — Paid (only after Tier 1 is running and tracking works)

**I. Google Local Services Ads ("Google Guaranteed")** — pay per lead, not per
click, shown above regular ads. Usually the best paid channel for house cleaners.
Requires background check + insurance proof. Start at ~$300–500/month.

**J. Facebook/Instagram ads** — geo-targeted to service zips, homeowners 35–65,
using a real before/after video and the founding-customer offer. Start at
$10–15/day, judge after 2 weeks on cost per booked job, not clicks.

Skip for now: Thumbtack/Angi (expensive shared leads, low margins), print
newspaper ads, billboards.

## 5. The offer

People buy faster when there's a concrete reason to act *now* and no risk.

- **Founding customer offer:** 20% off the first clean for the first 25 customers
  (real limit — say how many spots are left, and honor it). The site already
  advertises 10% for first-time customers; decide one number and make it consistent everywhere.
- **Risk reversal:** 100% satisfaction guarantee — free re-clean within 24 hours.
- **Push recurring at the first clean:** after a great first clean, offer
  "keep it this way" — lock in the biweekly rate today. The customer's satisfaction
  is highest right then.
- **Referral reward:** give $50 off for the referrer and $25 off for the new
  customer, credited after the new customer's first paid clean (prevents abuse).
  Two-sided rewards work better than one-sided ones, because the referrer doesn't feel like they're selling to a friend.

## 6. Speed and follow-up (where most small businesses lose leads)

- Reply to every lead within **5 minutes** during business hours. Research on lead
  response consistently shows contact rates fall off sharply after the first few minutes.
- Follow-up sequence for quotes that didn't book: text day 1, call day 3,
  "still interested?" text day 7, final offer day 14.
- Track every lead in a simple sheet: date, source, name, phone, service,
  quote, status, next step. Without this you can't tell what works.

## 7. 90-day calendar

| Week | Actions |
|---|---|
| 1 | Fix site items §3.1–3.3. Create GBP. Order cards/shirts/door hangers. Warm-network blitz (50 contacts). Set up lead tracking sheet. |
| 2 | GBP verified + photos. First reviews requested. Nextdoor + 10 Facebook group intros. Join 1 chamber. |
| 3–4 | Military PCS push: spouse groups, 5 property managers. 20 realtor drop-ins. First recurring conversions. |
| 5–6 | Vacation-rental host outreach (target 30 hosts/PMs). Start B2B walk-ins: 10 businesses/week in one city. |
| 7–8 | If tracking + 10 reviews are in place: launch Google Local Services Ads. Referral program announcement to all customers. |
| 9–10 | Review numbers; double down on the top 2 channels, drop the bottom 2. Start Facebook ads test. |
| 11–13 | Lock in spring vacation-rental contracts before March. Commercial follow-ups. Plan next quarter. |

## 8. Budget (suggested starting point)

| Item | Cost |
|---|---|
| GBP, Nextdoor page, Facebook groups, reviews | $0 |
| Business cards, flyers, 500 door hangers | ~$150–250 |
| Branded shirts | ~$100 |
| Chamber membership | ~$300–500/yr |
| Google Local Services Ads (from week 7) | ~$300–500/mo |
| Facebook ads test (from week 9) | ~$300/mo |

## 9. Metrics to watch weekly

- Leads by source · lead-to-booked rate · cost per booked customer
- Recurring vs one-time mix · Google review count & rating
- Customer churn (cancellations) · referrals generated

Targets: cost per booked customer under $100 for residential; under $300 for a
recurring commercial account.

## 10. Guardrails

- Only claim what's true and documented (insurance, bonding, licensing, guarantees).
- No fake reviews, no review incentives tied to *positive* reviews (FTC rule).
- Get consent before adding anyone to text/email marketing (TCPA/CAN-SPAM);
  include opt-out on every marketing message.
- Keep customer data (addresses, door codes) out of group chats and shared
  spreadsheets without access control.
