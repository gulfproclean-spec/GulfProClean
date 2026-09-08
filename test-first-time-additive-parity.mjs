// Additive-stacking parity: book.html's computeTotals() (what the customer
// sees before paying) and functions/_lib/pricing.js's computeBookingPricing
// (what Stripe actually charges) must land on the exact same per-visit price
// and final total for a first-time customer on every billing plan.
//
// This is the specific invariant the "add all eligible percentages, then
// apply once" change depends on: the client only knows the plan discount at
// quote time (afterBooking, from the calculator) and the first-time flag at
// booking time; the server derives both independently from raw inputs. If
// their formulas ever disagree, the price shown and the price charged part
// ways again — which is the exact bug class pricing-model.js was written to
// prevent for the plan discount alone.
//
//   node test-first-time-additive-parity.mjs
import { readFileSync } from 'node:fs';
import { computeBookingPricing } from './functions/_lib/pricing.js';

const MODEL = globalThis.GPC_PRICING;

const html = readFileSync(new URL('./book.html', import.meta.url), 'utf8');
const m = html.match(/function computeTotals\(\) \{[\s\S]*?\n\}/);
if (!m) { console.error('FAILED: could not find computeTotals in book.html'); process.exit(1); }
const computeTotals = new Function('state', 'draft', `${m[0]}; return computeTotals();`);

// Minimal stand-in for the Neon tagged-template client — only the
// serviceability lookup is still queried on this path.
const BANDS = [
  { max_sqft: 1000 }, { max_sqft: 1500 }, { max_sqft: 2000 }, { max_sqft: 2500 },
  { max_sqft: 3000 }, { max_sqft: 3500 }, { max_sqft: 4000 }, { max_sqft: 5000 },
].map(b => ({ ...b, essential: 0, preferred: 0, premium: 0 }));
const sql = async () => BANDS;

const TIERS = ['Essential', 'Preferred', 'Premium'];
const PLANS = [
  { booking: 'One-time', months: 1, label: 'One-time' },
  { booking: 'Monthly', months: 0.5, label: 'Biweekly' },
  { booking: 'Monthly', months: 1, label: 'Monthly' },
  { booking: 'Monthly', months: 6, label: '6-Month Subscription' },
  { booking: 'Monthly', months: 12, label: '12-Month Subscription' },
];

const RES_HOMES = [
  { label: '1,000 2/1', sqft: 1000, bedrooms: 2, fullBaths: 1, halfBaths: 0, kitchens: 1, livingAreas: 1 },
  { label: '2,800 4/3', sqft: 2800, bedrooms: 4, fullBaths: 3, halfBaths: 1, kitchens: 1, livingAreas: 3 },
];
const RES_FACTORS = { pets: 'No pets', condition: 'Average', lastCleaned: '1–3 months',
                      levels: 'Two stories', occupancy: '3–4 people' };
// Harsh factors push the plan price toward the cost floor, so the
// floor-clamped case (planDiscountPct < nominal) is covered too.
const HARSH_RES_FACTORS = { pets: '2+ pets', condition: 'Needs attention', lastCleaned: '3+ months or never',
                             levels: 'Three+ stories', occupancy: '5+ people' };

const COM_SITES = [
  { label: 'office 4k',  sqft: 4000,  restrooms: 4, breakRooms: 1, offices: 8, entrances: 2, areas: 6 },
];
const COM_FACTORS = { propertyType: 'Retail / high traffic', occupancy: 'Moderate',
                      hardFloorPct: '51–75%', afterHours: 'After close' };

let checks = 0, failures = [];
const near = (a, b) => Math.abs(a - b) < 0.005;

async function check(page, site, factors, tier, plan, frequency) {
  const modelInput = { ...site, ...factors };
  delete modelInput.label;

  const est = MODEL.quote(page, modelInput, tier);
  const shownPerVisit = MODEL.recurringPerVisit(est, plan.booking, plan.months);

  for (const isFirstTime of [true, false])
  for (const visitsCount of [1, 4]) {
    const server = await computeBookingPricing(sql, {
      page, tier, booking: plan.booking, months: plan.months, frequency,
      ...modelInput, addons: [], extraAddons: [],
    }, isFirstTime);

    const client = computeTotals(
      { isFirstTime, extraAddons: [] },
      {
        standardPrice: est.price, afterBooking: shownPerVisit,
        // computeTotals doesn't derive visitsCount — feed it the server's
        // own count so the two are compared on equal footing, and also
        // sweep an independent count to prove perVisit doesn't depend on it.
        visitsCount, addonsTotalAmount: 0, allAddonPricing: {},
        taxRate: server.taxRate, bookingLabel: plan.label,
      }
    );

    checks++;
    const where = `${page} ${tier} ${site.label} ${plan.label} ft=${isFirstTime} visits=${visitsCount}`;
    if (!near(server.perVisit, client.perVisit)) {
      failures.push(`${where}: server perVisit $${server.perVisit.toFixed(3)} vs client perVisit $${client.perVisit.toFixed(3)}`);
    }

    checks++;
    const expectedFinal = server.perVisit * visitsCount * (1 + server.taxRate);
    if (!near(client.finalTotal, expectedFinal)) {
      failures.push(`${where}: client finalTotal $${client.finalTotal.toFixed(2)} vs expected $${expectedFinal.toFixed(2)}`);
    }
  }
}

for (const tier of TIERS) {
  for (const site of RES_HOMES) for (const plan of PLANS) {
    await check('residential', site, RES_FACTORS, tier, plan, '1 visit weekly');
    await check('residential', site, HARSH_RES_FACTORS, tier, plan, '1 visit weekly');
  }
  for (const site of COM_SITES) for (const plan of PLANS) {
    await check('commercial', site, COM_FACTORS, tier, plan, '3 visits weekly');
  }
}

console.log(`${checks} checks`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  failures.slice(0, 20).forEach(f => console.error('  ' + f));
  process.exit(1);
}
console.log('PASS — shown price and charged price agree for first-time customers too, additively');
