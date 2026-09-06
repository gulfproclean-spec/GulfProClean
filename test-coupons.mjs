// Coupon pricing rules. The stacking rule is the one that moves money in the
// wrong direction if it's wrong, so it's tested explicitly.
//
//   node test-coupons.mjs
import { computeBookingPricing } from './functions/_lib/pricing.js';

const BANDS = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000]
  .map(max_sqft => ({ max_sqft, essential: 0, preferred: 0, premium: 0 }));
const sql = async () => BANDS;

const HOME = {
  sqft: 1800, bedrooms: 3, fullBaths: 2, halfBaths: 1, kitchens: 1, livingAreas: 2,
  pets: 'No pets', condition: 'Average', lastCleaned: '1–3 months',
  levels: 'Two stories', occupancy: '3–4 people',
};
const BASE = { page: 'residential', tier: 'Preferred', frequency: '1 visit weekly',
               addons: [], extraAddons: [], ...HOME };

const coupon20 = { id: 'c1', code: 'NEXT20', percent_off: 20 };
const coupon5  = { id: 'c2', code: 'SMALL5', percent_off: 5 };

let fails = [], n = 0;
const near = (a, b) => Math.abs(a - b) < 0.01;
function check(name, cond, detail = '') {
  n++;
  if (!cond) fails.push(`${name}${detail ? ' — ' + detail : ''}`);
}

const price = (opts, isFirstTime, coupon) =>
  computeBookingPricing(sql, { ...BASE, ...opts }, isFirstTime, coupon);

// --- one-time, returning customer -----------------------------------------
const plain   = await price({ booking: 'One-time', months: 1 }, false, null);
const with20  = await price({ booking: 'One-time', months: 1 }, false, coupon20);

check('20% coupon takes 20% off the standard price',
  near(with20.perVisit, plain.perVisit * 0.80),
  `$${plain.perVisit.toFixed(2)} -> $${with20.perVisit.toFixed(2)}`);
check('coupon is reported as applied', with20.couponApplied === true);
check('coupon code is reported', with20.couponCode === 'NEXT20');

// The whole point: unlike the recurring ladder, a coupon is NOT clamped at
// the cost floor. If this ever starts passing at 0% the coupon is worthless.
check('coupon is allowed below the cost floor',
  with20.perVisit < with20.costFloor,
  `perVisit $${with20.perVisit.toFixed(2)} vs floor $${with20.costFloor}`);

// --- stacking with the first-time discount ---------------------------------
const firstOnly    = await price({ booking: 'One-time', months: 1 }, true, null);
const firstPlus20  = await price({ booking: 'One-time', months: 1 }, true, coupon20);
const firstPlus5   = await price({ booking: 'One-time', months: 1 }, true, coupon5);

check('first-time alone is 10% off', near(firstOnly.perVisit, plain.perVisit * 0.90));
check('20% coupon beats the 10% first-time discount, and does not compound',
  near(firstPlus20.perVisit, plain.perVisit * 0.80),
  `got $${firstPlus20.perVisit.toFixed(2)}, compounded would be $${(plain.perVisit * 0.9 * 0.8).toFixed(2)}`);
check('5% coupon loses to the 10% first-time discount',
  near(firstPlus5.perVisit, plain.perVisit * 0.90),
  `got $${firstPlus5.perVisit.toFixed(2)}`);
check('a losing coupon is NOT marked applied (so it is not spent)',
  firstPlus5.couponApplied === false && firstPlus5.couponCode === null);

// --- add-ons are never discounted -----------------------------------------
const addonName = 'Inside oven';
const noCoupAddon = await price({ booking: 'One-time', months: 1, addons: [{ name: addonName, occurrences: 1 }] }, false, null);
const coupAddon   = await price({ booking: 'One-time', months: 1, addons: [{ name: addonName, occurrences: 1 }] }, false, coupon20);
check('add-on price is unchanged by a coupon',
  near(noCoupAddon.addonsTotalAmount, coupAddon.addonsTotalAmount),
  `${noCoupAddon.addonsTotalAmount} vs ${coupAddon.addonsTotalAmount}`);
check('coupon discounts service but not the add-on in the total',
  near(coupAddon.finalTotal, coupAddon.perVisit * coupAddon.visitsCount + coupAddon.addonsTotalAmount));

// --- recurring: coupon applies on top of the (clamped) recurring price -----
const rec    = await price({ booking: 'Monthly', months: 12 }, false, null);
const rec20  = await price({ booking: 'Monthly', months: 12 }, false, coupon20);
check('coupon applies to every visit of a recurring plan',
  near(rec20.perVisit, rec.perVisit * 0.80),
  `$${rec.perVisit.toFixed(2)} -> $${rec20.perVisit.toFixed(2)}`);
check('discountAmount covers the whole plan, not one visit',
  near(rec20.discountAmount, (rec.perVisit - rec20.perVisit) * rec20.visitsCount),
  `$${rec20.discountAmount}`);

// --- commercial tax still applies to the discounted subtotal ---------------
const com = await computeBookingPricing(sql, {
  page: 'commercial', tier: 'Preferred', booking: 'One-time', months: 1,
  frequency: '3 visits weekly', sqft: 4000, restrooms: 4, breakRooms: 1,
  offices: 8, entrances: 2, areas: 6, propertyType: 'Standard office',
  occupancy: 'Moderate', hardFloorPct: '0–25%', afterHours: 'After close',
  addons: [], extraAddons: [],
}, false, coupon20);
check('commercial tax is 6% of the discounted subtotal',
  near(com.tax, com.perVisit * com.visitsCount * 0.06),
  `tax $${com.tax.toFixed(2)}`);

console.log(`${n} checks`);
if (fails.length) { console.error(`\nFAILED (${fails.length}):`); fails.forEach(f => console.error('  ' + f)); process.exit(1); }
console.log('PASS — coupon rules hold');
