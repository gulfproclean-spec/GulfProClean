// The booking summary itemises two discounts (billing plan, first-time
// customer) instead of showing one merged number. That is a PRESENTATION
// change: the money charged must not move, and the two rows must add up to
// exactly what the single row used to say.
//
//   node test-booking-totals.mjs
//
// computeTotals is extracted from book.html itself rather than copied, so
// this tests the code that actually ships.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./book.html', import.meta.url), 'utf8');
const m = html.match(/function computeTotals\(\) \{[\s\S]*?\n\}/);
if (!m) { console.error('FAILED: could not find computeTotals in book.html'); process.exit(1); }

let state, draft;
const computeTotals = new Function('state', 'draft', `${m[0]}; return computeTotals();`)
  .bind(null);

const round2 = n => Math.round(n * 100) / 100;
const near = (a, b) => Math.abs(a - b) < 0.005;

let checks = 0, failures = [];

// Standard price, plan price, visits, add-ons, tax — swept across every
// billing plan and both eligibility states.
const PLANS = [
  { label: 'One-time',               standard: 300, after: 300 },
  { label: 'Biweekly',               standard: 300, after: 285 },   // 5%
  { label: 'Monthly',                standard: 300, after: 279 },   // 7%
  { label: '6-Month Subscription',   standard: 300, after: 270 },   // 10%
  { label: '12-Month Subscription',  standard: 300, after: 255 },   // 15%
  { label: 'Biweekly',               standard: 425, after: 403.75 },
  { label: '12-Month Subscription',  standard: 815, after: 692.75 },
  // Cost-floor case: the engine clamped the plan price above the nominal %.
  { label: '12-Month Subscription',  standard: 300, after: 273 },
];

for (const plan of PLANS)
for (const visits of [1, 2, 4, 8, 24])
for (const isFirstTime of [true, false])
for (const addons of [0, 150])
for (const taxRate of [0, 0.06]) {
  state = { isFirstTime, extraAddons: [] };
  draft = {
    standardPrice: plan.standard, afterBooking: plan.after,
    visitsCount: visits, addonsTotalAmount: addons,
    allAddonPricing: {}, taxRate, bookingLabel: plan.label,
  };
  const t = computeTotals(state, draft);
  const where = `${plan.label} $${plan.standard}->$${plan.after} x${visits} ft=${isFirstTime} addons=${addons} tax=${taxRate}`;

  // 1. The two itemised rows must sum to the combined discount the single
  //    row used to display.
  checks++;
  if (!near(t.planDiscount + t.firstTimeDiscount, t.discount)) {
    failures.push(`${where}: plan $${t.planDiscount.toFixed(2)} + firstTime $${t.firstTimeDiscount.toFixed(2)} != combined $${t.discount.toFixed(2)}`);
  }

  // 2. Per-visit price must be unchanged from the original formula:
  //    afterBooking, then 10% off if first-time.
  checks++;
  const expectedPerVisit = plan.after * (isFirstTime ? 0.90 : 1);
  if (!near(t.perVisit, expectedPerVisit)) {
    failures.push(`${where}: perVisit $${t.perVisit.toFixed(2)}, expected $${expectedPerVisit.toFixed(2)}`);
  }

  // 3. Final total must be unchanged from the original formula.
  checks++;
  const expectedFinal = (expectedPerVisit * visits + addons) * (1 + taxRate);
  if (!near(t.finalTotal, expectedFinal)) {
    failures.push(`${where}: finalTotal $${t.finalTotal.toFixed(2)}, expected $${expectedFinal.toFixed(2)}`);
  }

  // 4. The percentage shown next to the plan row must match its dollars.
  checks++;
  const impliedPlanDollars = plan.standard * t.planDiscountPct * visits;
  if (!near(impliedPlanDollars, t.planDiscount)) {
    failures.push(`${where}: plan pct ${(t.planDiscountPct*100).toFixed(2)}% implies $${impliedPlanDollars.toFixed(2)}, row shows $${t.planDiscount.toFixed(2)}`);
  }

  // 5. A One-time booking has no plan discount, whatever else is true.
  if (plan.label === 'One-time') {
    checks++;
    if (t.planDiscount !== 0) failures.push(`${where}: One-time showed a plan discount of $${t.planDiscount.toFixed(2)}`);
  }

  // 6. The first-time 10% comes off the ALREADY-discounted plan price, and
  //    applies to every booking type including One-time.
  //
  //    NOT rounded to cents. functions/_lib/pricing.js computes the charged
  //    price as afterBooking * 0.90 at full precision and does not round
  //    either, so rounding here would make the shown price differ from the
  //    charged one — which is the exact class of bug this codebase already
  //    had once. A visit priced at $403.75 yields $40.375 of discount, and
  //    that is correct; only the DISPLAY rounds, via money().
  checks++;
  const expectedFirstTime = isFirstTime ? plan.after * 0.10 * visits : 0;
  if (!near(t.firstTimeDiscount, expectedFirstTime)) {
    failures.push(`${where}: firstTime $${t.firstTimeDiscount.toFixed(3)}, expected $${expectedFirstTime.toFixed(3)}`);
  }

  // 7. Because the rows are rounded for display but the arithmetic is not,
  //    the printed rows can sit up to a cent away from the printed subtotal.
  //    That is inherent to showing rounded components of an exact sum, and
  //    the alternative — rounding the arithmetic — would break parity with
  //    the server. Bounded here so it can never grow past a cent unnoticed.
  checks++;
  const printedDrift = Math.abs(
    (round2(t.grossTotal + addons) - round2(t.planDiscount) - round2(t.firstTimeDiscount))
    - round2(t.subtotal)
  );
  if (printedDrift > 0.01) {
    failures.push(`${where}: printed rows drift $${printedDrift.toFixed(4)} from printed subtotal (max 1c)`);
  }

  // 8. Neither discount ever touches add-ons.
  checks++;
  if (!near(t.subtotal - addons, t.perVisit * visits)) {
    failures.push(`${where}: add-ons were discounted`);
  }
}

console.log(`${checks} checks`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  failures.slice(0, 20).forEach(f => console.error('  ' + f));
  process.exit(1);
}
console.log('PASS — itemising the discounts did not move a single dollar');
