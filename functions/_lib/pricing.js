// What actually gets charged. Client-submitted totals are never trusted —
// only raw selections (property details, tier, frequency, add-on picks).
//
// This file used to be a hand-maintained *mirror* of the calculators' math,
// with its own copy of the price bands and the discount ladder. It drifted:
// the calculators moved to the pricing-model.js engine and a new ladder while
// this file kept pricing off the sq-ft bands and the old percentages, so the
// price a customer was shown and the price Stripe charged were computed by two
// different engines and disagreed by up to 23%.
//
// It is no longer a mirror. It imports the same engine the browser does, so
// there is one definition of price, one discount ladder, and one cost floor.
// pricing_tiers is now used only to decide whether a property size is
// serviceable at all — never to compute a price.
import '../../pricing-model.js';

const MODEL = globalThis.GPC_PRICING;
if (!MODEL) throw new Error('pricing-model.js did not load — GPC_PRICING is undefined');

export class PricingError extends Error {}

export const monthlyDiscountFor = MODEL.monthlyDiscountFor;
export const VALID_MONTHS = MODEL.VALID_MONTHS;

const RESIDENTIAL_FREQ_ADJ = {
  "1 visit weekly": 0,
  "2 visits weekly": 0,
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


// The engine's factor tables are the schema: a value either exists as a key
// or the booking is rejected. Keeps the server from silently scoring an
// unknown value as zero, which would quietly undercharge.
function reqEnum(value, table, label) {
  if (!(value in table)) throw new PricingError(`Invalid ${label}.`);
  return value;
}

function reqCount(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) throw new PricingError(`Invalid ${label}.`);
  return n;
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
  if (booking === 'Monthly' && !VALID_MONTHS.includes(monthsVal)) throw new PricingError('Invalid number of months.');

  let modelInput, visitsCount, scopeVal;

  if (page === 'residential') {
    const sqft = Number(input.sqft);
    if (!Number.isFinite(sqft) || sqft <= 0) throw new PricingError('Invalid property size.');
    // frequency is meaningless for a one-time visit (visitsCount is forced
    // to 1 below regardless of it) — same carve-out as the required-field
    // check in functions/api/bookings.js.
    if (booking !== 'One-time' && !(frequency in RESIDENTIAL_FREQ_ADJ)) throw new PricingError('Invalid cleaning frequency.');
    // pricing_tiers is consulted only for serviceability: the top band is
    // flagged unavailable so oversized homes are quoted by hand rather than
    // by the engine. The band's dollar amounts are ignored.
    const serviceable = await getResidentialSizeTier(sql, sqft);
    if (!serviceable) throw new PricingError('This property size is priced individually — please request a quote instead.');

    modelInput = {
      sqft,
      bedrooms:    reqCount(input.bedrooms, 'bedrooms'),
      fullBaths:   reqCount(input.fullBaths, 'full bathrooms'),
      halfBaths:   reqCount(input.halfBaths, 'half bathrooms'),
      kitchens:    reqCount(input.kitchens, 'kitchens'),
      livingAreas: reqCount(input.livingAreas, 'living areas'),
      pets:        reqEnum(input.pets, MODEL.RES_FACTORS.pets, 'pets'),
      condition:   reqEnum(input.condition, MODEL.RES_FACTORS.condition, 'condition'),
      lastCleaned: reqEnum(input.lastCleaned, MODEL.RES_FACTORS.lastCleaned, 'last cleaned'),
      levels:      reqEnum(input.levels, MODEL.RES_FACTORS.levels, 'levels'),
      occupancy:   reqEnum(input.occupancy, MODEL.RES_FACTORS.occupancy, 'occupancy'),
    };

    const visitsPerMonth = parseInt(frequency, 10) || 1;
    const isWeeklyCadence = !frequency.toLowerCase().includes('monthly');
    visitsCount = booking === 'One-time' ? 1 : (isWeeklyCadence ? visitsPerMonth * monthsVal * 4 : visitsPerMonth * monthsVal);
    scopeVal = null;
  } else if (page === 'commercial') {
    const sqft = Number(input.sqft);
    const areas = Number(input.areas);
    if (!Number.isFinite(sqft) || sqft <= 0) throw new PricingError('Invalid property size.');
    if (!Number.isFinite(areas) || areas < 0) throw new PricingError('Invalid service area count.');
    // Same one-time carve-out as the residential branch above.
    if (booking !== 'One-time' && !(frequency in COMMERCIAL_FREQ_ADJ)) throw new PricingError('Invalid cleaning frequency.');

    const restrooms = reqCount(input.restrooms, 'restrooms');
    modelInput = {
      sqft,
      restrooms,
      breakRooms: reqCount(input.breakRooms, 'break rooms'),
      offices:    reqCount(input.offices, 'offices'),
      entrances:  reqCount(input.entrances, 'entrances'),
      propertyType: reqEnum(input.propertyType, MODEL.COM_FACTORS.propertyType, 'property type'),
      occupancy:    reqEnum(input.occupancy, MODEL.COM_FACTORS.occupancy, 'occupancy'),
      hardFloorPct: reqEnum(input.hardFloorPct, MODEL.COM_FACTORS.hardFloorPct, 'hard floor percentage'),
      afterHours:   reqEnum(input.afterHours, MODEL.COM_FACTORS.afterHours, 'service window'),
    };

    const visitsPerWeek = parseInt(frequency, 10) || 1;
    visitsCount = booking === 'One-time' ? 1 : visitsPerWeek * monthsVal * 4;
    scopeVal = { sqft, restrooms, areas };
  } else {
    throw new PricingError('Invalid page.');
  }

  // One engine, shared with the browser. est.price is the One-Time/Standard
  // Service Price — already positioned against the cost floor and the market
  // reference — and every recurring discount comes off it.
  const est = MODEL.quote(page, modelInput, tier);
  const standardPrice = est.price;

  // recurringPerVisit applies the ladder AND the cost-floor clamp, so the
  // customer is charged exactly the number the calculator showed them. The
  // clamp means the delivered discount can be smaller than the nominal
  // percentage; appliedDiscountPct reports what was actually given.
  const afterBooking = MODEL.recurringPerVisit(est, booking, monthsVal);
  const monthlyDiscountPct = MODEL.appliedDiscountPct(est, booking, monthsVal);

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

  // The first-time-customer discount applies to every booking type,
  // including One-time — eligibility is based on the service address never
  // having been serviced before (see isFirstTime's caller), not on which
  // plan was picked. Never applies to add-ons.
  //
  // It ADDS to the plan discount rather than compounding on top of it: the
  // plan's percentage (monthlyDiscountPct, floor-aware — see
  // recurringPerVisit/appliedDiscountPct above) and the flat 10% first-time
  // percentage are summed into one combined percentage, which comes off the
  // Standard Service Price exactly once. This must match book.html's
  // computeTotals() exactly — that page shows the customer the price this
  // function then charges.
  const firstTimeDiscountPct = isFirstTime ? 0.10 : 0;
  const combinedDiscountPct = monthlyDiscountPct + firstTimeDiscountPct;
  const perVisit = standardPrice * (1 - combinedDiscountPct);
  const plannedSubtotal = perVisit * visitsCount + addonsTotalAmount;
  const subtotal = plannedSubtotal + extraAddonsTotal;
  const grossTotal = standardPrice * visitsCount + addonsTotalAmount;
  const taxRate = page === 'commercial' ? 0.06 : 0;
  const tax = subtotal * taxRate;
  const finalTotal = subtotal + tax;

  return {
    tier, visitsCount, perVisit, standardPrice, addonsTotalAmount,
    // Kept for callers that persist after_frequency_price; it has always
    // stored the One-Time/Standard Service Price, which is now est.price.
    afterFrequency: standardPrice,
    costFloor: est.costFloor, estimatedHours: est.hours, monthlyDiscountPct,
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
    restrooms: Number.isFinite(Number(pricingInput.restrooms))
      ? Number(pricingInput.restrooms)
      : COMMERCIAL_RESTROOM_BAND_COUNT[pricingInput.restroomBand],
    areas: Number(pricingInput.areas),
  };
  if (!Number.isFinite(scopeVal.sqft) || !Number.isFinite(scopeVal.restrooms) || !Number.isFinite(scopeVal.areas)) return null;
  return Math.round(Math.max(spec.rate * scopeVal[spec.unit], spec.min));
}
