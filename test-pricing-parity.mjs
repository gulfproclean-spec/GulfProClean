// Parity test: the price the calculator SHOWS must equal the price the server
// CHARGES, for every tier x property x billing plan.
//
// This exists because they once didn't. The calculators moved to the
// pricing-model.js engine and a new discount ladder while functions/_lib/
// pricing.js kept pricing off the sq-ft bands and the old percentages. Nothing
// caught it, because nothing compared them. Now something does.
//
//   node test-pricing-parity.mjs
import { computeBookingPricing } from './functions/_lib/pricing.js';
const MODEL = globalThis.GPC_PRICING;

// Minimal stand-in for the Neon tagged-template client. The only query the
// pricing path still makes is the serviceability lookup.
const BANDS = [
  { max_sqft: 1000 }, { max_sqft: 1500 }, { max_sqft: 2000 }, { max_sqft: 2500 },
  { max_sqft: 3000 }, { max_sqft: 3500 }, { max_sqft: 4000 }, { max_sqft: 5000 },
].map(b => ({ ...b, essential: 0, preferred: 0, premium: 0 }));
const sql = async () => BANDS;

const TIERS = ['Essential', 'Preferred', 'Premium'];
const PLANS = [
  { booking: 'One-time', months: 1 },
  { booking: 'Monthly', months: 0.5 },
  { booking: 'Monthly', months: 1 },
  { booking: 'Monthly', months: 6 },
  { booking: 'Monthly', months: 12 },
];

const RES_HOMES = [
  { label: '1,000 2/1', sqft: 1000, bedrooms: 2, fullBaths: 1, halfBaths: 0, kitchens: 1, livingAreas: 1 },
  { label: '1,800 3/2', sqft: 1800, bedrooms: 3, fullBaths: 2, halfBaths: 1, kitchens: 1, livingAreas: 2 },
  { label: '2,800 4/3', sqft: 2800, bedrooms: 4, fullBaths: 3, halfBaths: 1, kitchens: 1, livingAreas: 3 },
  { label: '4,000 5/4', sqft: 4000, bedrooms: 5, fullBaths: 4, halfBaths: 2, kitchens: 1, livingAreas: 4 },
];
const RES_FACTORS = { pets: 'No pets', condition: 'Average', lastCleaned: '1–3 months',
                      levels: 'Two stories', occupancy: '3–4 people' };

const COM_SITES = [
  { label: 'office 4k',  sqft: 4000,  restrooms: 4, breakRooms: 1, offices: 8,  entrances: 2, areas: 6 },
  { label: 'retail 12k', sqft: 12000, restrooms: 6, breakRooms: 2, offices: 4,  entrances: 3, areas: 9 },
];
const COM_FACTORS = { propertyType: 'Retail / high traffic', occupancy: 'Moderate',
                      hardFloorPct: '51–75%', afterHours: 'After close' };

let checks = 0, failures = [];
const near = (a, b) => Math.abs(a - b) < 0.005;

async function check(page, site, factors, tier, plan, frequency) {
  const modelInput = { ...site, ...factors };
  delete modelInput.label;

  // What the calculator shows the customer.
  const est = MODEL.quote(page, modelInput, tier);
  const shownPerVisit = MODEL.recurringPerVisit(est, plan.booking, plan.months);

  // What the server would charge.
  const server = await computeBookingPricing(sql, {
    page, tier, booking: plan.booking, months: plan.months, frequency,
    ...modelInput, addons: [], extraAddons: [],
  }, false);

  checks++;
  const where = `${page} ${tier} ${site.label} ${plan.booking}/${plan.months}mo`;
  if (!near(server.standardPrice, est.price)) {
    failures.push(`${where}: standard shown $${est.price} vs charged $${server.standardPrice}`);
  }
  if (!near(server.perVisit, shownPerVisit)) {
    failures.push(`${where}: per-visit shown $${shownPerVisit.toFixed(2)} vs charged $${server.perVisit.toFixed(2)}`);
  }
  // Tax: commercial only.
  const expectedTax = page === 'commercial' ? 0.06 : 0;
  if (!near(server.taxRate, expectedTax)) {
    failures.push(`${where}: taxRate ${server.taxRate}, expected ${expectedTax}`);
  }
  // Total must be exactly per-visit x visits (no add-ons here), plus tax.
  const expectedSubtotal = server.perVisit * server.visitsCount;
  if (!near(server.finalTotal, expectedSubtotal * (1 + expectedTax))) {
    failures.push(`${where}: finalTotal $${server.finalTotal.toFixed(2)} != subtotal $${expectedSubtotal.toFixed(2)} + tax`);
  }
}

for (const tier of TIERS) {
  for (const site of RES_HOMES) for (const plan of PLANS) {
    await check('residential', site, RES_FACTORS, tier, plan, '1 visit weekly');
  }
  for (const site of COM_SITES) for (const plan of PLANS) {
    await check('commercial', site, COM_FACTORS, tier, plan, '3 visits weekly');
  }
}

// The ladder is stated in exactly one place.
const LADDER = [[0.5, 0.05], [1, 0.07], [6, 0.15], [12, 0.20]];
for (const [m, pct] of LADDER) {
  checks++;
  if (!near(MODEL.monthlyDiscountFor(m), pct)) {
    failures.push(`ladder: ${m}mo is ${MODEL.monthlyDiscountFor(m)}, expected ${pct}`);
  }
}

// A residential property above the top band must be refused, not priced.
try {
  await computeBookingPricing(sql, {
    page: 'residential', tier: 'Preferred', booking: 'One-time', months: 1,
    frequency: '1 visit weekly', sqft: 7000, bedrooms: 6, fullBaths: 5, halfBaths: 1,
    kitchens: 2, livingAreas: 5, ...RES_FACTORS, addons: [], extraAddons: [],
  }, false);
  failures.push('oversized property was priced instead of refused');
} catch (e) { /* expected */ }
checks++;

console.log(`${checks} checks`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  failures.forEach(f => console.error('  ' + f));
  process.exit(1);
}
console.log('PASS — shown price and charged price agree everywhere');
