// pricing-model.js
// ---------------------------------------------------------------------------
// Gulf ProClean's pricing engine, shared by the residential and commercial
// quote calculators. Loaded as a plain script before the JSX modules, so it
// publishes onto window.
//
// HOW A PRICE IS BUILT
//   1. Estimate crew-hours from rooms + floor area.
//   2. Apply the service tier multiplier (Essential / Preferred / Premium).
//   3. Apply condition/complexity factors (pets, buildup, stairs, traffic).
//   4. costFloor  = loaded labor cost / target labor ratio
//        -> the least we can charge and still cover overhead, benefits
//           and target profit. Never price below this.
//   5. marketPrice = market reference for this property x POSITION_FACTOR
//        -> deliberately 5-10% under the local going rate.
//   6. price = max(costFloor, marketPrice)
//        -> undercut the market where we profitably can; hold the line
//           where we can't. `belowFloor` is flagged so the quote can say so
//           instead of silently selling a job at a loss.
// ---------------------------------------------------------------------------

(function (root) {

  // --- (a) COST SIDE -------------------------------------------------------
  // Wages are quoted WITHOUT fringe — fringe is added on top via the burden
  // rates below. The band is the company's stated field-wage range; the
  // per-tier wages sit inside it, because deeper-scope work is assigned to
  // more experienced technicians who sit higher in the band.
  const WAGE_BAND = { min: 18.00, max: 25.00 };

  const TIER_WAGE = {
    Essential: 19.00,   // standard recurring scope
    Preferred: 21.50,   // detail work, trained technicians
    Premium:   23.50,   // deep scope, senior technicians and crew leads
  };
  const BLENDED_WAGE = 21.50;  // used when no tier is specified

  const COST_MODEL = {
    wageBand: WAGE_BAND,
    tierWage: TIER_WAGE,
    blendedWage: BLENDED_WAGE,
    // Fringe / burden, applied on top of the base wage above:
    payrollTaxRate: 0.0910,   // FICA 7.65% + FUTA/SUTA ~1.45%
    workersCompRate: 0.0500,  // non-construction janitorial class, FL
    benefitsRate: 0.0800,     // PTO accrual, bonus pool, equipment, uniforms
    targetLaborRatio: 0.40,   // labor as a share of revenue. The remaining 60%
                              // covers supplies, vehicle/fuel, insurance,
                              // admin, marketing, and profit. Lower this
                              // number to price higher / bank more margin.
    minimumVisit: 129,        // no visit is worth dispatching a crew below this
  };

  // Total burden multiplier — 1.221 at the rates above, i.e. every $1.00 of
  // wage costs $1.22 fully loaded.
  function burdenMultiplier(m = COST_MODEL) {
    return 1 + m.payrollTaxRate + m.workersCompRate + m.benefitsRate;
  }

  // Fully loaded cost of one crew-hour at the given tier.
  //   Essential $19.00 -> $23.20    Preferred $21.50 -> $26.25
  //   Premium   $23.50 -> $28.69    blended   $21.50 -> $26.25
  function loadedHourlyCost(tier, m = COST_MODEL) {
    const wage = (tier && m.tierWage[tier]) || m.blendedWage;
    return wage * burdenMultiplier(m);
  }

  // --- (b) MARKET SIDE -----------------------------------------------------
  // What the market charges for a ONE-TIME standard clean, as a linear
  // function of rooms.
  //
  // CALIBRATED AGAINST PUBLISHED 2026 BENCHMARKS, NOT LOCAL QUOTES:
  //   3BR/2BA ~2,000 sq ft ...... $135-180 typical, $110-320 full range
  //   standard 2-3BR ............ $150-250
  //   Central FL recurring 2-3BR . $120-180/visit
  // These numbers produce ~$187 for a 3BR/2BA/1,800 sq ft home, which sits
  // at the upper-middle of that evidence — appropriate for Destin/30A, a
  // higher-cost coastal market than the national average, but NOT verified
  // against an actual local competitor quote.
  //
  // !! STILL DO THIS: get quotes from three local competitors on the SAME
  // property (a 3BR/2BA, 1,800 sq ft home in Destin is a good test case) and
  // correct these five numbers. If the real local rate is materially higher,
  // you are leaving money on the table; if lower, the "below market" claim
  // shown to customers is not true. Everything downstream is arithmetic and
  // will follow whatever you put here.
  const MARKET_REFERENCE = {
    residential: { base: 55, perBedroom: 22, perFullBath: 26, perHalfBath: 12, perSqft: 0.008 },
    // Commercial is quoted per sq ft far more often than per room.
    commercial:  { base: 60, perSqft: 0.085, perRestroom: 26 },
  };

  // How far under the market reference we aim to land. 0.925 = 7.5% below,
  // the midpoint of the 5-10% target. Raise toward 0.95 to give up less
  // margin; lower toward 0.90 to compete harder on price.
  const POSITION_FACTOR = 0.925;

  // --- RESIDENTIAL LABOR MODEL --------------------------------------------
  // Crew-hours. A two-person crew clears these in about half the wall-clock
  // time, but cost is driven by crew-hours, so that's what we estimate.
  const RES_LABOR = {
    setup: 0.40,              // arrival, setup, walkthrough, load-out
    perBedroom: 0.35,
    perFullBath: 0.50,        // bathrooms are the most labor-dense room there is
    perHalfBath: 0.25,
    perKitchen: 0.60,
    perLivingArea: 0.30,      // living, dining, den, office, bonus room
    hoursPer500Sqft: 0.20,    // floor area drives floors, not much else
  };

  const TIER_MULTIPLIER = { Essential: 1.00, Preferred: 1.28, Premium: 1.60 };

  // Additive complexity factors. Summed, then applied as (1 + total).
  const RES_FACTORS = {
    pets:        { "No pets": 0,        "1 pet": 0.05,      "2+ pets": 0.10 },
    condition:   { "Well kept": 0,      "Average": 0.06,    "Needs attention": 0.15 },
    lastCleaned: { "Within a month": 0, "1–3 months": 0.05, "3+ months or never": 0.12 },
    levels:      { "Single story": 0,   "Two stories": 0.05, "Three+ stories": 0.09 },
    occupancy:   { "1–2 people": 0,     "3–4 people": 0.04, "5+ people": 0.08 },
  };

  function residentialHours(input) {
    const L = RES_LABOR;
    const sqft = Number(input.sqft) || 0;
    return L.setup +
      (Number(input.bedrooms) || 0) * L.perBedroom +
      (Number(input.fullBaths) || 0) * L.perFullBath +
      (Number(input.halfBaths) || 0) * L.perHalfBath +
      (Number(input.kitchens) || 0) * L.perKitchen +
      (Number(input.livingAreas) || 0) * L.perLivingArea +
      (sqft / 500) * L.hoursPer500Sqft;
  }

  function factorTotal(table, input) {
    let sum = 0;
    for (const key in table) {
      const chosen = input[key];
      if (chosen && table[key][chosen] != null) sum += table[key][chosen];
    }
    return sum;
  }

  function residentialMarketReference(input) {
    const M = MARKET_REFERENCE.residential;
    return M.base +
      (Number(input.bedrooms) || 0) * M.perBedroom +
      (Number(input.fullBaths) || 0) * M.perFullBath +
      (Number(input.halfBaths) || 0) * M.perHalfBath +
      (Number(input.sqft) || 0) * M.perSqft;
  }

  // --- COMMERCIAL LABOR MODEL ---------------------------------------------
  // No bedrooms. Restrooms, floor area, and the kind of facility do the work.
  const COM_LABOR = {
    setup: 0.50,
    perRestroom: 0.45,
    perBreakRoom: 0.35,
    perOfficeOrRoom: 0.12,     // individual offices / treatment rooms / suites
    perEntrance: 0.15,         // entryway + glass
    hoursPer1000Sqft: 0.55,    // open floor: vacuum, mop, trash, surfaces
  };

  const COM_FACTORS = {
    propertyType: { "Standard office": 0, "Retail / high traffic": 0.10, "Medical": 0.25, "Restaurant": 0.30 },
    occupancy:    { "Light": 0, "Moderate": 0.05, "Heavy": 0.10, "Very heavy": 0.175 },
    hardFloorPct: { "0–25%": 0, "26–50%": 0.025, "51–75%": 0.05, "76–100%": 0.10 },
    afterHours:   { "During business hours": 0, "After close": 0.05, "Overnight": 0.08 },
  };

  function commercialHours(input) {
    const L = COM_LABOR;
    const sqft = Number(input.sqft) || 0;
    return L.setup +
      (Number(input.restrooms) || 0) * L.perRestroom +
      (Number(input.breakRooms) || 0) * L.perBreakRoom +
      (Number(input.offices) || 0) * L.perOfficeOrRoom +
      (Number(input.entrances) || 0) * L.perEntrance +
      (sqft / 1000) * L.hoursPer1000Sqft;
  }

  function commercialMarketReference(input) {
    const M = MARKET_REFERENCE.commercial;
    return M.base +
      (Number(input.sqft) || 0) * M.perSqft +
      (Number(input.restrooms) || 0) * M.perRestroom;
  }

  // --- THE ENGINE ----------------------------------------------------------
  function quote(side, input, tier) {
    const isRes = side === "residential";
    const rawHours = isRes ? residentialHours(input) : commercialHours(input);
    const tierMult = TIER_MULTIPLIER[tier] || 1;
    const factors = isRes ? factorTotal(RES_FACTORS, input) : factorTotal(COM_FACTORS, input);

    const hours = rawHours * tierMult * (1 + factors);
    const hourlyCost = loadedHourlyCost(tier);
    const laborCost = hours * hourlyCost;
    const costFloor = laborCost / COST_MODEL.targetLaborRatio;

    const marketRef = (isRes ? residentialMarketReference(input) : commercialMarketReference(input)) * tierMult;
    const marketPrice = marketRef * POSITION_FACTOR;

    const belowFloor = marketPrice < costFloor;
    let price = Math.max(costFloor, marketPrice, COST_MODEL.minimumVisit);
    price = Math.round(price / 5) * 5;   // nearest $5 — quotes should look considered

    const vsMarketPct = marketRef > 0 ? (1 - price / marketRef) : 0;

    return {
      price,
      hours: Math.round(hours * 100) / 100,
      hourlyCost: Math.round(hourlyCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      costFloor: Math.round(costFloor),
      marketReference: Math.round(marketRef),
      marketPrice: Math.round(marketPrice),
      belowFloor,          // true = market rate would lose money; we held at the floor
      vsMarketPct,         // how far under the market reference we actually landed
      laborRatio: price > 0 ? laborCost / price : 0,
    };
  }

  root.GPC_PRICING = {
    COST_MODEL, MARKET_REFERENCE, POSITION_FACTOR, WAGE_BAND, TIER_WAGE,
    RES_LABOR, COM_LABOR, TIER_MULTIPLIER, RES_FACTORS, COM_FACTORS,
    burdenMultiplier, loadedHourlyCost, quote,
  };

})(window);
