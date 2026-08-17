// Server-side mirror of the pricing formulas in residential.html and
// commercial.html's Calculator components. This is the source of truth for
// what actually gets charged — client-submitted totals are never trusted,
// only raw selections (property size, tier, frequency, addon picks) are.
// Keep this in sync by hand if those calculators' formulas change.

export class PricingError extends Error {}

const ONE_TIME_SURCHARGE = 0.30;
const monthlyDiscountFor = (m) => (m >= 12 ? 0.15 : m >= 6 ? 0.10 : 0);

const RESIDENTIAL_FREQ_ADJ = {
  "2 visits monthly (Biweekly Cleaning)": 0,
  "4 visits monthly (Weekly Cleaning)": 0,
  "1 visit weekly": 0,
  "3 visits weekly": 0,
  "4 visits weekly": 0,
  "5 visits weekly": 0,
  "6 visits weekly": 0,
  "7 visits weekly": 0,
};

const RESIDENTIAL_ADDON_CATALOG = {
  "Inside refrigerator": 40, "Inside oven": 40, "Refrigerator + oven": 70,
  "Interior windows (package)": 110, "Baseboard detail": 75, "Inside cabinets": 100,
  "Laundry wash/dry/fold": 35, "Bed linen change": 12, "Pet hair surcharge": 37,
  "Heavy sand removal": 55, "Patio / balcony": 47, "Garage sweep": 62,
};

const COMMERCIAL_TYPE_ADJ = { "Standard office": 0, "Retail / high traffic": 0.10, "Medical": 0.25, "Restaurant": 0.30 };
const COMMERCIAL_FREQ_ADJ = { "1 visit weekly": 0, "2 visits weekly": 0, "3 visits weekly": 0, "4 visits weekly": 0, "5 visits weekly": 0, "6 visits weekly": 0, "7 visits weekly": 0 };
const COMMERCIAL_OCCUPANCY_ADJ = { "Light": 0, "Moderate": 0.05, "Heavy": 0.10, "Very heavy": 0.175 };
const COMMERCIAL_RESTROOM_BAND_COUNT = { "1–2": 2, "3–5": 4, "6–10": 8, "11+": 12 };
const COMMERCIAL_HARD_FLOOR_ADJ = { "0–25%": 0, "26–50%": 0.025, "51–75%": 0.05, "76–100%": 0.10 };
const areaAdj = (n) => (n <= 1 ? 0 : n <= 3 ? 0.05 : 0.10);
const highRestroomThreshold = (s) => (s <= 2500 ? 4 : s <= 5000 ? 6 : s <= 10000 ? 10 : s <= 20000 ? 15 : 25);

const COMMERCIAL_ADDON_CATALOG = {
  "Post-construction cleanup": { rate: 0.25, unit: "sqft", min: 750 },
  "Exterior window washing": { rate: 0.75, unit: "sqft", min: 350 },
  "High / low dusting": { rate: 0.08, unit: "sqft", min: 250 },
  "Restroom deep sanitize": { rate: 75, unit: "restrooms", min: 250 },
  "Trash & dumpster area detail": { rate: 175, unit: "areas", min: 175 },
  "Carpet extraction": { rate: 0.35, unit: "sqft", min: 300 },
  "Kitchen equipment degreasing": { rate: 175, unit: "areas", min: 250 },
  "Pressure washing — entryways/dumpster pads": { rate: 0.35, unit: "sqft", min: 300 },
};

function clampOccurrences(n, visitsCount) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 1) return visitsCount;
  return Math.min(Math.round(v), visitsCount);
}

function resolveResidentialAddon(name, occurrences, visitsCount) {
  const unitPrice = RESIDENTIAL_ADDON_CATALOG[name];
  if (unitPrice == null) throw new PricingError(`Unknown add-on: ${name}`);
  const occ = clampOccurrences(occurrences, visitsCount);
  return { name, unitPrice, occurrences: occ, total: unitPrice * occ };
}

function resolveCommercialAddon(name, occurrences, visitsCount, scopeVal) {
  const spec = COMMERCIAL_ADDON_CATALOG[name];
  if (!spec) throw new PricingError(`Unknown add-on: ${name}`);
  const unitPrice = Math.round(Math.max(spec.rate * scopeVal[spec.unit], spec.min));
  const occ = clampOccurrences(occurrences, visitsCount);
  return { name, unitPrice, occurrences: occ, total: unitPrice * occ };
}

async function getResidentialSizeTier(sql, sqft) {
  const rows = await sql`
    select max_sqft, essential, preferred, premium
    from pricing_tiers where page = 'residential' and unavailable = false order by band_order
  `;
  const band = rows.find(r => sqft <= r.max_sqft);
  if (!band) return null;
  return { Essential: Number(band.essential), Preferred: Number(band.preferred), Premium: Number(band.premium) };
}

async function getCommercialBaseMap(sql) {
  const rows = await sql`
    select essential, preferred, premium from pricing_tiers
    where page = 'commercial' and band_order = 1
  `;
  if (rows.length === 0) throw new PricingError('Pricing is not configured.');
  return { Essential: Number(rows[0].essential), Preferred: Number(rows[0].preferred), Premium: Number(rows[0].premium) };
}

function requireTier(tier) {
  if (!['Essential', 'Preferred', 'Premium'].includes(tier)) throw new PricingError('Invalid service tier.');
}

// Computes the full, authoritative price breakdown for a booking from raw
// selections only. `isFirstTime` must come from the server's own DB check,
// never from the client.
export async function computeBookingPricing(sql, input, isFirstTime) {
  const { page, tier, booking, months, frequency, addons, extraAddons } = input;
  requireTier(tier);
  if (booking !== 'One-time' && booking !== 'Monthly') throw new PricingError('Invalid billing type.');
  const monthsVal = booking === 'Monthly' ? Number(months) : 1;
  if (!Number.isFinite(monthsVal) || monthsVal < 1) throw new PricingError('Invalid number of months.');

  let afterSize, afterFrequency, visitsCount, scopeVal;

  if (page === 'residential') {
    const sqft = Number(input.sqft);
    if (!Number.isFinite(sqft) || sqft <= 0) throw new PricingError('Invalid property size.');
    if (!(frequency in RESIDENTIAL_FREQ_ADJ)) throw new PricingError('Invalid cleaning frequency.');
    const sizeTier = await getResidentialSizeTier(sql, sqft);
    if (!sizeTier) throw new PricingError('This property size is priced individually — please request a quote instead.');
    afterSize = sizeTier[tier];
    afterFrequency = booking === 'One-time' ? afterSize : afterSize * (1 + RESIDENTIAL_FREQ_ADJ[frequency]);
    const visitsPerMonth = parseInt(frequency, 10) || 1;
    const isWeeklyCadence = !frequency.toLowerCase().includes('monthly');
    visitsCount = booking === 'One-time' ? 1 : (isWeeklyCadence ? visitsPerMonth * monthsVal * 4 : visitsPerMonth * monthsVal);
    scopeVal = null;
  } else if (page === 'commercial') {
    const sqft = Number(input.sqft);
    const areas = Number(input.areas);
    if (!Number.isFinite(sqft) || sqft <= 0) throw new PricingError('Invalid property size.');
    if (!Number.isFinite(areas) || areas < 0) throw new PricingError('Invalid service area count.');
    if (!(frequency in COMMERCIAL_FREQ_ADJ)) throw new PricingError('Invalid cleaning frequency.');
    if (!(input.propertyType in COMMERCIAL_TYPE_ADJ)) throw new PricingError('Invalid property type.');
    if (!(input.occupancy in COMMERCIAL_OCCUPANCY_ADJ)) throw new PricingError('Invalid occupancy level.');
    if (!(input.restroomBand in COMMERCIAL_RESTROOM_BAND_COUNT)) throw new PricingError('Invalid restroom count.');
    if (!(input.hardFloorPct in COMMERCIAL_HARD_FLOOR_ADJ)) throw new PricingError('Invalid hard floor percentage.');

    const baseMap = await getCommercialBaseMap(sql);
    const restrooms = COMMERCIAL_RESTROOM_BAND_COUNT[input.restroomBand];
    const isHighRestroom = restrooms >= highRestroomThreshold(sqft);
    const complexityMult = 1
      + COMMERCIAL_TYPE_ADJ[input.propertyType]
      + COMMERCIAL_OCCUPANCY_ADJ[input.occupancy]
      + (isHighRestroom ? 0.10 : 0)
      + COMMERCIAL_HARD_FLOOR_ADJ[input.hardFloorPct]
      + areaAdj(areas);
    const afterComplexity = baseMap[tier] * complexityMult;
    afterFrequency = booking === 'One-time' ? afterComplexity : afterComplexity * (1 + COMMERCIAL_FREQ_ADJ[frequency]);
    const visitsPerWeek = parseInt(frequency, 10) || 1;
    visitsCount = booking === 'One-time' ? 1 : visitsPerWeek * monthsVal * 4;
    scopeVal = { sqft, restrooms, areas };
  } else {
    throw new PricingError('Invalid page.');
  }

  const monthlyDiscountPct = booking === 'Monthly' ? monthlyDiscountFor(monthsVal) : 0;
  const bookingAdjValue = booking === 'One-time' ? ONE_TIME_SURCHARGE : -monthlyDiscountPct;
  const afterBooking = afterFrequency * (1 + bookingAdjValue);

  const resolveAddon = page === 'residential'
    ? (name, occ) => resolveResidentialAddon(name, occ, visitsCount)
    : (name, occ) => resolveCommercialAddon(name, occ, visitsCount, scopeVal);

  const resolvedAddons = (Array.isArray(addons) ? addons : []).map(a => resolveAddon(a.name, a.occurrences));
  const addonsTotalAmount = resolvedAddons.reduce((s, a) => s + a.total, 0);

  const purchasedNames = new Set(resolvedAddons.map(a => a.name));
  const resolvedExtraAddons = (Array.isArray(extraAddons) ? extraAddons : []).map(e => {
    if (purchasedNames.has(e.name)) {
      throw new PricingError(`"${e.name}" was already part of your purchase — use the paid add-ons list instead.`);
    }
    return resolveAddon(e.name, 1);
  });
  const extraAddonsTotal = resolvedExtraAddons.reduce((s, a) => s + a.total, 0);

  const perVisit = afterBooking * (isFirstTime ? 0.90 : 1);
  const plannedSubtotal = perVisit * visitsCount + addonsTotalAmount;
  const subtotal = plannedSubtotal + extraAddonsTotal;
  const grossTotal = afterFrequency * visitsCount + addonsTotalAmount;
  const taxRate = page === 'commercial' ? 0.06 : 0;
  const tax = subtotal * taxRate;
  const finalTotal = subtotal + tax;

  return {
    tier, visitsCount, perVisit, addonsTotalAmount,
    resolvedAddons, resolvedExtraAddons, extraAddonsTotal,
    grossTotal, taxRate, tax, finalTotal,
  };
}

// Used by functions/api/bookings/[id]/addons.js to price an add-on added to
// an already-existing booking, from that booking's stored pricing_input.
export function resolveSingleAddonPrice(page, name, pricingInput, visitsCount) {
  if (page === 'residential') {
    const unitPrice = RESIDENTIAL_ADDON_CATALOG[name];
    if (unitPrice == null) return null;
    return unitPrice;
  }
  const spec = COMMERCIAL_ADDON_CATALOG[name];
  if (!spec) return null;
  const scopeVal = {
    sqft: Number(pricingInput.sqft),
    restrooms: COMMERCIAL_RESTROOM_BAND_COUNT[pricingInput.restroomBand],
    areas: Number(pricingInput.areas),
  };
  if (!Number.isFinite(scopeVal.sqft) || !Number.isFinite(scopeVal.restrooms) || !Number.isFinite(scopeVal.areas)) return null;
  return Math.round(Math.max(spec.rate * scopeVal[spec.unit], spec.min));
}
