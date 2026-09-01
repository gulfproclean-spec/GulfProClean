// commercial-sections.jsx
// ---------------------------------------------------------------------------
// The commercial side's own sections. Loaded after gulfproclean-shared.jsx,
// which supplies Nav/Hero/Kicker/Services/PlanList/Quote and the data hooks
// these components rely on.
//
// PRICING: the calculator estimates crew-hours from the actual facility scope
// (restrooms, break rooms, offices/suites, entrances, floor area) and prices
// those hours through window.GPC_PRICING (pricing-model.js), which holds the
// cost floor and market-positioning logic. No bedrooms — this is the
// commercial counterpart to the residential room-count model.
// DEFAULT_PRICING_COMMERCIAL below is retained only as the admin-editable
// reference table; it no longer sets the quote.
//
// est.price from GPC_PRICING.quote() IS ALREADY the one-time standard price
// (cost floor vs. 92.5%-of-market, whichever is higher) — do not multiply it
// by anything further before displaying it as "standardPrice." Recurring
// plans discount off it directly, and that discount is clamped so it can
// never drop below est.costFloor — a plan discount is a margin decision, not
// a license to sell a visit at a loss. See the Calculator component for the
// clamp and monthlyDiscountFor for the current ladder.
// ---------------------------------------------------------------------------

const DEFAULT_PRICING_COMMERCIAL = [
  { band_order: 1, band_label: "1× Weekly", max_sqft: null, essential: 175, preferred: 225, premium: 325, unavailable: false },
  { band_order: 2, band_label: "2× Weekly", max_sqft: null, essential: 161, preferred: 207, premium: 299, unavailable: false },
  { band_order: 3, band_label: "3× Weekly", max_sqft: null, essential: 154, preferred: 198, premium: 286, unavailable: false },
  { band_order: 4, band_label: "5× Weekly", max_sqft: null, essential: 144, preferred: 185, premium: 267, unavailable: false },
];

// A small representative office, used only for "starting at" figures on the
// plans page. Priced through the same engine as a real quote so the headline
// number can never drift from what the calculator actually says.
const COM_STARTER_PROPERTY = { sqft: 1500, restrooms: 2, breakRooms: 1, offices: 4, entrances: 1 };

function ServiceTiers({ navy, gold }) {
  const groups = [
    ["Essential Clean", ["Trash & recycling", "Restroom restock & sanitize", "Floors (vacuum/mop)", "Surface wipe-down", "Entryway & glass doors", "Break room surfaces", "Dusting reachable surfaces"]],
    ["Preferred Clean", ["Interior glass & partitions", "Baseboards", "Detailed restroom fixtures", "High-touch disinfection", "Kitchen/break room appliance exteriors", "Window sills"]],
    ["Premium", ["Floor scrub & burnish", "Interior windows", "Vents & light fixtures", "Upholstery spot clean", "Detailed baseboards & corners", "Behind/under movable furniture", "Restroom grout & fixture detail"]]
  ];
  const tierNames = groups.map(g => g[0]);
  const rows = groups.flatMap(([tier, items]) => items.map(item => ({ item, from: tierNames.indexOf(tier) })));
  return (
    <section id="tiers" style={{ padding: "56px clamp(20px,5vw,56px)", maxWidth: 1200, margin: "0 auto" }}>
      <Kicker gold="#8a6221">Service tiers</Kicker>
      <h1 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 32, color: navy, margin: 0, maxWidth: 640 }}>Choose how deep we go</h1>
      <p style={{ fontSize: 14, color: "#7a746a", marginTop: 10 }}>Every tier includes everything in the tier before it — compare all three at a glance.</p>
      <div style={{ overflowX: "auto", marginTop: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontSize: 13, color: "#7a746a", fontWeight: 500, padding: "0 16px 12px 0", borderBottom: `2px solid ${navy}` }}>Included</th>
              {tierNames.map(name => (
                <th key={name} style={{ textAlign: "center", fontSize: 15, color: navy, fontWeight: 600, padding: "0 16px 12px", borderBottom: `2px solid ${navy}` }}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, from }) => (
              <tr key={item}>
                <td style={{ fontSize: 14, color: navy, padding: "10px 16px 10px 0", borderBottom: "1px solid #e3ded2" }}>{item}</td>
                {tierNames.map((name, i) => (
                  <td key={name} style={{ textAlign: "center", padding: "10px 16px", borderBottom: "1px solid #e3ded2" }}>
                    {i >= from && <span style={{ color: gold, fontWeight: 700 }}>✓</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Plans({ navy, gold, booking, setBooking, onSelectPlan, pricing }) {
  // "Starting at" figures come from the same pricing engine the calculator
  // uses, on a defined starter facility — so this section can never quote a
  // number the calculator would not honor. est.price is already the fully
  // market-positioned one-time price; nothing further is applied to it here.
  const standardPriceFor = (name) => {
    if (!window.GPC_PRICING) return null;
    return GPC_PRICING.quote("commercial", COM_STARTER_PROPERTY, name).price;
  };

  const subs = [
    ["Essential", null, "Small offices · Light traffic", "1 cleaning / week · weekly cadence",
      ["1 cleaning per week", "Ideal for small offices & retail", "Priced by facility scope", "Skip & reschedule anytime", "Cloud-synced schedule"],
      "1 visit weekly"],
    ["Preferred", null, "Restaurants · Multi-tenant · Daily traffic", "3 cleanings / week · standard cadence",
      ["3 cleanings per week", "Best value — most chosen", "Priced by facility scope", "Cloud-synced schedule"],
      "3 visits weekly"],
    ["Premium", "Most popular", "High-traffic sites · Portfolios", "5 cleanings / week · weekly cadence",
      ["5 cleanings per week", "High-traffic & multi-site portfolios", "Priced by facility scope", "Priority arrival windows", "Cloud-synced schedule"],
      "5 visits weekly"]
  ];
  return (
    <section id="plans" style={{ background: CREAM, padding: "56px clamp(20px,5vw,56px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Kicker gold="#8a6221">Booking</Kicker>
        <div style={{ position: "relative", background: `linear-gradient(135deg, ${gold}, #d9a94a)`, color: navy, borderRadius: 6, padding: "16px 26px", marginTop: 8, marginBottom: 28, display: "inline-flex", alignItems: "center", gap: 12, fontSize: 15.5, fontWeight: 700, boxShadow: `0 8px 28px ${gold}55`, border: `1px solid ${navy}22`, letterSpacing: "0.01em" }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>✦</span>
          First-time customers save 10% on any plan — limited time only
          <span style={{ fontSize: 20, lineHeight: 1 }}>✦</span>
        </div>
        <h1 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 36, color: navy, margin: 0, maxWidth: 640 }}>Book once, or let us handle it on repeat</h1>
        <p style={{ fontSize: 14, color: "#7a746a", marginTop: 10 }}>Pricing scales with your facility's scope — <a href="commercial-quote.html" style={{ color: "#8a6221" }}>get your exact quote</a> on the quote page.</p>

        <div onClick={() => setBooking("One-Time")} style={{ border: `1px solid ${booking === "One-Time" ? gold : "#d8d3c8"}`, boxShadow: booking === "One-Time" ? `0 0 0 3px ${gold}22` : "none", borderRadius: 6, padding: "28px 30px", background: "#fff", cursor: "pointer", marginTop: 44 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontFamily: "inherit", fontWeight: 500, fontSize: 22, color: navy, margin: 0 }}>One-time clean</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#3d4a4d", marginTop: 8, maxWidth: "56ch" }}>A single visit — post-construction cleanup, event turnover or a one-off deep clean. No commitment, scheduled around your hours.</p>
            </div>
            <a href="commercial-quote.html" style={{ flex: "none", border: `1px solid ${navy}`, color: navy, fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 3 }}>Get one-time pricing</a>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
            {subs.map(([name]) => {
              const p = standardPriceFor(name);
              return (
                <div key={name}>
                  <p style={{ fontSize: 12.5, color: "#7a746a", margin: 0 }}>{name}</p>
                  <p style={{ fontSize: 18, fontWeight: 600, color: "#8a6221", margin: "2px 0 0" }}>
                    {p ? <>Starting at ${Math.round(p)}<span style={{ fontSize: 12, fontWeight: 400, color: "#7a746a" }}> / visit</span></> : "Get a quote"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p id="recurring-plans" style={{ fontSize: 20, fontWeight: 500, color: navy, marginTop: 56, marginBottom: 0, scrollMarginTop: 90 }}>Recurring plans</p>
        <p style={{ fontSize: 14.5, color: "#7a746a", marginTop: 8, maxWidth: "56ch" }}>Standing coverage for offices, restaurants and multi-site portfolios, billed monthly. No contracts — cancel anytime.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28, marginTop: 28 }} onClick={() => setBooking("Subscription")}>
          {subs.map(([name, badge, audience, cadence, features, calcFrequency]) => (
            <div key={name} style={{ border: `1px solid ${badge ? gold : (booking === "Subscription" ? gold : "#d8d3c8")}`, boxShadow: badge ? `0 0 0 3px ${gold}22` : "none", borderRadius: 6, padding: "30px 26px", background: "#fff", cursor: "pointer", position: "relative" }}>
              {badge && <span style={{ position: "absolute", top: -12, left: 26, background: gold, color: navy, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 20 }}>{badge}</span>}
              <h4 style={{ fontFamily: "inherit", fontWeight: 500, fontSize: 20, color: navy, margin: 0 }}>{name}</h4>
              <p style={{ fontSize: 12.5, color: "#7a746a", margin: "6px 0 0" }}>{audience}</p>
              <p style={{ fontSize: 12.5, color: "#7a746a", margin: "16px 0 0" }}>{cadence}</p>
              <PlanList gold={gold} items={features} />
              <a href={quoteLinkFor("commercial", { tier: name, frequency: calcFrequency })} style={{ display: "inline-block", marginTop: 22, background: gold, color: navy, fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 3, width: "100%", textAlign: "center", boxSizing: "border-box" }}>Choose {name} — get your price</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AddOns({ navy, gold }) {
  return (
    <section id="addons" style={{ background: CREAM, padding: "56px clamp(20px,5vw,56px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Kicker gold="#8a6221">Add-ons</Kicker>
        <h1 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 32, color: navy, margin: 0, maxWidth: 640 }}>Commercial Add-On Services</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#3d4a4d", marginTop: 14, maxWidth: "58ch" }}>Actual cost is calculated from your property's square footage, restroom count and service areas in the estimate below.</p>
        <img src="assets/commercial-addons.jpg" alt="Commercial add-on services: post-construction cleanup, exterior window washing, high/low dusting, restroom deep sanitize, trash and dumpster area detail, carpet extraction, kitchen equipment degreasing, pressure washing entryways and dumpster pads" style={{ width: "100%", display: "block", marginTop: 32, borderRadius: 6 }} />
        <a href="commercial-quote.html" style={{ display: "inline-block", marginTop: 24, background: gold, color: navy, fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 3 }}>Build your estimate</a>
      </div>
    </section>
  );
}

function Calculator({ navy, gold, pricing, preset }) {
  const TIERS = ["Essential", "Preferred", "Premium"];
  const freqAdj = { "1 visit weekly": 0, "2 visits weekly": 0, "3 visits weekly": 0, "4 visits weekly": 0, "5 visits weekly": 0, "6 visits weekly": 0, "7 visits weekly": 0 };
  // Recalibrated against two real competitors (Catalina Cleaning and Two
  // Maids): both discount recurring maintenance visits far more steeply off
  // their one-time/deep-clean rate than the previous 5-15% ladder did.
  // Ordering stays monotonic with commitment length — the same
  // "No-Commitment vs. committed term" structure disclosed in the Service
  // Agreement on book.html. If these numbers change again, book.html's
  // AGREEMENT_SECTIONS (BILLING PLANS / SUBSCRIPTION DISCOUNT sections) must
  // be updated in the same pass — that text is what the customer actually
  // signs, and its refund-reconciliation math is keyed to these percentages.
  const monthlyDiscountFor = (m) => m >= 12 ? 0.28 : m >= 6 ? 0.22 : m >= 1 ? 0.18 : 0.15;
  const BILLING_PLANS = [
    { key: "one-time", label: "One-time (Standard price)", booking: "One-time", months: 1 },
    { key: "biweekly", label: "Biweekly (15% discount)", booking: "Monthly", months: 0.5 },
    { key: "monthly", label: "Monthly (18% discount)", booking: "Monthly", months: 1 },
    { key: "6-month", label: "6-Month Subscription (22% discount)", booking: "Monthly", months: 6 },
    { key: "12-month", label: "12-Month Subscription (28% discount)", booking: "Monthly", months: 12 },
  ];
  const addonPricing = {
    "Post-construction cleanup": { rate: 0.25, unit: "sqft", min: 750 },
    "Exterior window washing": { rate: 0.75, unit: "sqft", min: 350 },
    "High / low dusting": { rate: 0.08, unit: "sqft", min: 250 },
    "Restroom deep sanitize": { rate: 75, unit: "restrooms", min: 250 },
    "Trash & dumpster area detail": { rate: 175, unit: "areas", min: 175 },
    "Carpet extraction": { rate: 0.35, unit: "sqft", min: 300 },
    "Kitchen equipment degreasing": { rate: 175, unit: "areas", min: 250 },
    "Pressure washing — entryways/dumpster pads": { rate: 0.35, unit: "sqft", min: 300 }
  };
  const occupancyDesc = {
    "Light": "Primarily employees, limited visitors",
    "Moderate": "Regular employee and visitor traffic",
    "Heavy": "Frequent customers, visitors, or public traffic",
    "Very heavy": "Continuous or high-volume public traffic"
  };
  const hardFloorDesc = {
    "0–25%": "Mostly carpet — less than 25% hard floor",
    "26–50%": "Mixed — about 25–50% hard floor",
    "51–75%": "Mostly hard floor — about 50–75% hard floor",
    "76–100%": "Almost entirely hard floor — 75%+ hard floor"
  };

  const [sqft, setSqft] = React.useState("");
  const [restrooms, setRestrooms] = React.useState("");
  const [breakRooms, setBreakRooms] = React.useState("");
  const [offices, setOffices] = React.useState("");
  const [entrances, setEntrances] = React.useState("1");
  const [areas, setAreas] = React.useState("");
  const [tier, setTier] = React.useState("");
  const [propertyType, setPropertyType] = React.useState("");
  const [occupancy, setOccupancy] = React.useState("");
  const [hardFloorPct, setHardFloorPct] = React.useState("");
  const [afterHours, setAfterHours] = React.useState("");
  const [frequency, setFrequency] = React.useState("");
  const [addons, setAddons] = React.useState([]);
  const [addonQty, setAddonQty] = React.useState({});
  const [booking, setBooking] = React.useState("");
  const [months, setMonths] = React.useState(1);
  const [presetNotice, setPresetNotice] = React.useState(false);
  React.useEffect(() => {
    if (!preset) return;
    setTier(preset.tier);
    setFrequency(preset.frequency);
    setBooking("Monthly");
    setPresetNotice(true);
  }, [preset]);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [addressLine1, setAddressLine1] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [city, setCity] = React.useState("");
  const stateVal = "FL"; // service area is Florida-only
  const [zip, setZip] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const toggleAddon = (name) => setAddons(a => a.includes(name) ? a.filter(x => x !== name) : [...a, name]);
  const setAddonQtyFor = (name, val) => setAddonQty(q => ({ ...q, [name]: Number(val) }));

  const sqftNum = Number(sqft) || 0;
  const areasNum = Number(areas) || 0;
  const restroomsNum = Number(restrooms) || 0;

  const facilityInput = {
    sqft: sqftNum,
    restrooms: restroomsNum,
    breakRooms: Number(breakRooms) || 0,
    offices: Number(offices) || 0,
    entrances: Number(entrances) || 0,
    propertyType, occupancy, hardFloorPct, afterHours,
  };

  const hasScope = !!tier && sqftNum > 0 && restrooms !== "" && breakRooms !== "" &&
    offices !== "" && areas !== "" && !!propertyType && !!occupancy && !!hardFloorPct;
  const hasAllInputs = hasScope && !!booking && (booking === "One-time" || !!frequency);

  const est = (hasScope && window.GPC_PRICING)
    ? GPC_PRICING.quote("commercial", facilityInput, tier)
    : null;

  const scopeVal = { sqft: sqftNum, restrooms: restroomsNum, areas: areasNum };
  const addonPrice = (name) => { const p = addonPricing[name]; return Math.round(Math.max(p.rate * scopeVal[p.unit], p.min)); };
  // est.price IS the standard one-time price — already positioned against
  // the cost floor and the market reference by pricing-model.js. Nothing
  // further is applied here; recurring plans discount directly off it.
  const standardPrice = est ? est.price : 0;
  const nominalDiscountPct = booking === "Monthly" ? monthlyDiscountFor(months) : 0;
  const nominalAfterBooking = booking === "One-time" ? standardPrice : standardPrice * (1 - nominalDiscountPct);
  // A recurring discount is a margin decision, not a license to sell below
  // cost — clamp so the discounted price never drops under est.costFloor,
  // even if that means the customer receives less than the nominal % above.
  const afterBooking = (est && booking !== "One-time") ? Math.max(nominalAfterBooking, est.costFloor) : nominalAfterBooking;
  const perVisit = afterBooking;
  const discount = Math.max(0, standardPrice - perVisit);
  // What the customer actually receives, in percent — derived from the real
  // dollar discount rather than restated from monthlyDiscountFor, so the
  // displayed number stays honest even when the floor clamp above kicks in.
  const appliedDiscountPct = standardPrice > 0 ? discount / standardPrice : 0;
  const displayFrequency = booking === "One-time" ? "1 visit" : frequency;
  const billingKey = !booking ? "" : booking === "One-time" ? "one-time" : (months >= 12 ? "12-month" : months >= 6 ? "6-month" : months >= 1 ? "monthly" : "biweekly");
  const bookingLabel = !booking ? "" : booking === "One-time" ? "One-time" : (months >= 12 ? "12-Month Subscription" : months >= 6 ? "6-Month Subscription" : months >= 1 ? "Monthly" : "Biweekly");
  const setBillingPlan = (key) => {
    if (!key) { setBooking(""); setMonths(1); return; }
    const plan = BILLING_PLANS.find(p => p.key === key);
    if (!plan) return;
    setBooking(plan.booking);
    setMonths(plan.months);
  };
  const visitsPerWeek = parseInt(frequency, 10) || 1;
  const visitsCount = !booking ? 0 : booking === "One-time" ? 1 : visitsPerWeek * months * 4;
  const addonOccurrences = (name) => { const v = addonQty[name]; return v && v <= visitsCount ? v : visitsCount; };
  const totalAddons = addons.reduce((sum, name) => sum + addonPrice(name) * addonOccurrences(name), 0);
  const grossTotal = standardPrice * visitsCount;
  const finalDiscounted = (perVisit * visitsCount) + totalAddons;
  const totalBeforeDiscount = grossTotal + totalAddons;
  const totalDiscountAmount = discount * visitsCount;
  const FL_TAX_RATE = 0.06;
  const tax = finalDiscounted * FL_TAX_RATE;
  const totalWithTax = finalDiscounted + tax;

  const missingRequired = !firstName.trim() || !lastName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !zip.trim();
  const handleBookIt = () => {
    if (missingRequired) { alert("Please fill in all required fields (name, phone, and full address) to book."); return; }
    if (!hasAllInputs) { alert("Please fill in the facility scope, service tier, frequency, and billing plan to see your price before booking."); return; }
    const fullAddress = [addressLine1.trim(), unit.trim(), `${city.trim()}, ${stateVal} ${zip.trim()}`].filter(Boolean).join(", ");
    sessionStorage.setItem("gpc_booking_draft", JSON.stringify({
      page: "commercial",
      firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(),
      addressLine1: addressLine1.trim(), unit: unit.trim(), city: city.trim(), state: stateVal, zip: zip.trim(),
      address: fullAddress,
      notes: notes.trim(),
      sqft, restrooms, breakRooms, offices, entrances, areas,
      propertyType, occupancy, hardFloorPct, afterHours,
      estimatedHours: est ? est.hours : null,
      tier, booking, months, frequency, displayFrequency, bookingLabel,
      addons: addons.map(name => ({ name, occurrences: addonOccurrences(name), unitPrice: addonPrice(name), total: addonPrice(name) * addonOccurrences(name) })),
      addonsTotalAmount: totalAddons,
      allAddonPricing: Object.fromEntries(Object.keys(addonPricing).map(name => [name, addonPrice(name)])),
      standardPrice, afterBooking, visitsCount, grossTotal,
      taxRate: FL_TAX_RATE,
    }));
    window.location.href = "book.html";
  };

  const money = (n) => {
    const cents = Math.round(n * 100);
    const dollars = cents / 100;
    return cents % 100 === 0
      ? dollars.toLocaleString("en-US")
      : dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const moneyFixed = (n) => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const selStyle = { minHeight: 36, padding: "6px 10px", fontSize: 14, border: "1px solid #d8d3c8", borderRadius: 3, fontFamily: "inherit", background: "#fff", width: "100%" };
  const labelStyle = { display: "block", fontSize: 12.5, color: "#7a746a", marginBottom: 6 };

  return (
    <section id="calculator" style={{ background: navy, padding: "48px clamp(20px,5vw,56px)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ background: `linear-gradient(135deg, ${gold}, #d9a94a)`, color: navy, borderRadius: 6, padding: "16px 26px", marginBottom: 24, textAlign: "center", fontWeight: 700, fontSize: 16 }}>
          ✦ Discounts for first-time customers and subscription plans ✦
        </div>
        <Kicker gold="#d9a94a">Get a quote</Kicker>
        <h1 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 28, color: "#fff", margin: 0, maxWidth: 640 }}>Estimate your commercial price</h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", marginTop: 8, maxWidth: "60ch" }}>Priced from your facility's actual scope — restrooms, break rooms, offices and floor area — not a flat square-footage rate. An estimate; final pricing is confirmed on walkthrough.</p>
        {presetNotice && (
          <div style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${gold}`, borderRadius: 4, padding: "10px 14px", marginTop: 14, maxWidth: "60ch", fontSize: 13, color: "#fff" }}>
            We've pre-filled the {preset.tier} plan below. Fill in your facility scope for an exact quote.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 20, background: "#fff", borderRadius: 8, padding: 20 }}>
          <label><span style={labelStyle}>First name</span>
            <input type="text" placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} style={selStyle} />
          </label>
          <label><span style={labelStyle}>Last name</span>
            <input type="text" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} style={selStyle} />
          </label>
          <label><span style={labelStyle}>Phone</span>
            <input type="tel" placeholder="(850) 555-0123" value={phone} onChange={e => setPhone(e.target.value)} style={selStyle} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}><span style={labelStyle}>Address</span>
            <input type="text" placeholder="123 Main St" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} style={selStyle} />
          </label>
          <label><span style={labelStyle}>Unit / suite # (optional)</span>
            <input type="text" placeholder="Suite 200" value={unit} onChange={e => setUnit(e.target.value)} style={selStyle} />
          </label>
          <label><span style={labelStyle}>City</span>
            <input type="text" placeholder="Destin" value={city} onChange={e => setCity(e.target.value)} style={selStyle} />
          </label>
          <label><span style={labelStyle}>Zip code</span>
            <input type="text" inputMode="numeric" placeholder="32541" value={zip} onChange={e => setZip(e.target.value)} style={selStyle} />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Notes for your cleaning crew (optional)</span>
            <textarea placeholder="Access instructions, alarm codes, areas to avoid, special requests…" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...selStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </div>

        <div style={{ marginTop: 20, background: "#fff", borderRadius: 8, padding: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: navy, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your facility</p>
          <p style={{ fontSize: 12.5, color: "#7a746a", margin: "0 0 18px" }}>Restrooms and break rooms take the longest per room; open floor area drives the rest.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
            <label><span style={labelStyle}>Property size (sq ft)</span>
              <input type="number" min="0" placeholder="e.g. 4000" value={sqft} onChange={e => setSqft(e.target.value)} style={selStyle} />
            </label>
            <label><span style={labelStyle}>Restrooms</span>
              <input type="number" min="0" placeholder="e.g. 4" value={restrooms} onChange={e => setRestrooms(e.target.value)} style={selStyle} />
            </label>
            <label><span style={labelStyle}>Break rooms / kitchens</span>
              <input type="number" min="0" placeholder="e.g. 1" value={breakRooms} onChange={e => setBreakRooms(e.target.value)} style={selStyle} />
            </label>
            <label><span style={labelStyle}>Offices / suites / treatment rooms</span>
              <input type="number" min="0" placeholder="e.g. 8" value={offices} onChange={e => setOffices(e.target.value)} style={selStyle} />
            </label>
            <label><span style={labelStyle}>Entrances / lobbies</span>
              <input type="number" min="0" value={entrances} onChange={e => setEntrances(e.target.value)} style={selStyle} />
            </label>
            <label><span style={labelStyle}>Service areas (trash/kitchen)</span>
              <input type="number" min="0" placeholder="e.g. 2" value={areas} onChange={e => setAreas(e.target.value)} style={selStyle} />
            </label>
            <label><span style={labelStyle}>Property type</span>
              <select style={selStyle} value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.COM_FACTORS.propertyType).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>How busy is the facility?</span>
              <select style={selStyle} value={occupancy} onChange={e => setOccupancy(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.COM_FACTORS.occupancy).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              {occupancy && <p style={{ fontSize: 12, color: "#7a746a", margin: "6px 0 0" }}>{occupancyDesc[occupancy]}</p>}
            </label>
            <label><span style={labelStyle}>Percent hard flooring</span>
              <select style={selStyle} value={hardFloorPct} onChange={e => setHardFloorPct(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.COM_FACTORS.hardFloorPct).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              {hardFloorPct && <p style={{ fontSize: 12, color: "#7a746a", margin: "6px 0 0" }}>{hardFloorDesc[hardFloorPct]}</p>}
            </label>
            <label><span style={labelStyle}>When do we clean?</span>
              <select style={selStyle} value={afterHours} onChange={e => setAfterHours(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.COM_FACTORS.afterHours).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginTop: 20, background: "#fff", borderRadius: 8, padding: 28 }}>
          <label><span style={labelStyle}>Select billing plan</span>
            <select style={selStyle} value={billingKey} onChange={e => setBillingPlan(e.target.value)}>
              <option value="" disabled hidden></option>
              {BILLING_PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <label><span style={labelStyle}>Service tier</span>
            <select style={selStyle} value={tier} onChange={e => setTier(e.target.value)}>
              <option value="" disabled hidden></option>
              {TIERS.map(k => <option key={k} value={k}>{k}{k === "Premium" ? " ⭐ Most Popular" : ""}</option>)}
            </select>
          </label>
          <label><span style={labelStyle}>Cleaning frequency</span>
            {booking === "One-time" ? (
              <div style={{ ...selStyle, display: "flex", alignItems: "center", color: "#7a746a" }}>1 visit</div>
            ) : (
              <select style={selStyle} value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option value="" disabled hidden></option>
                {Object.keys(freqAdj).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            )}
          </label>
        </div>

        <div className="calc-two-col" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(280px,0.9fr)", gap: 20, marginTop: 20, alignItems: "start" }}>
          <label style={{ background: "#fff", borderRadius: 8, padding: 20 }}><span style={labelStyle}>Add-ons</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto", border: "1px solid #d8d3c8", borderRadius: 3, padding: 10 }}>
              {Object.keys(addonPricing).sort((a, b) => a.localeCompare(b)).map(name => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: "1px solid #f0ede5", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: navy }}>
                    <input type="checkbox" checked={addons.includes(name)} onChange={() => toggleAddon(name)} />{name}
                  </label>
                  <span style={{ marginLeft: "auto", color: "#7a746a", fontSize: 13 }}>${money(addonPrice(name))}</span>
                  {addons.includes(name) && (
                    <select value={addonOccurrences(name)} onChange={e => setAddonQtyFor(name, e.target.value)} style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #d8d3c8", borderRadius: 3, fontFamily: "inherit", background: "#faf8f3", flex: "0 0 auto", width: 140 }}>
                      {Array.from({ length: visitsCount }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n === visitsCount ? (visitsCount === 1 ? "1 visit" : `Every visit (${n}×)`) : n === 1 ? "One-time (1×)" : `${n} of ${visitsCount} visits`}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </label>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "24px 28px", color: "#fff", position: "sticky", top: 20 }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Summary</p>

            {!hasAllInputs ? (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>Fill in your facility scope, then pick a service tier, frequency and billing plan to see your price.</p>
              </div>
            ) : (
              <>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2, fontSize: 13.5 }}>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>{tier} · {bookingLabel} · {displayFrequency}</div>
                  {est && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>Estimated {est.hours} crew-hours per visit</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={{ color: "rgba(255,255,255,0.75)" }}>Price per visit</span><span>${money(standardPrice)}</span></div>
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "rgba(255,255,255,0.75)" }}>Add-ons</span><span>${money(totalAddons)}</span></div>
                  {addons.length === 0 ? (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>None selected</p>
                  ) : addons.map(name => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span style={{ color: "rgba(255,255,255,0.55)" }}>+ {name} — {addonOccurrences(name) === visitsCount ? (visitsCount === 1 ? "this visit" : `every visit ×${visitsCount}`) : addonOccurrences(name) === 1 ? "one-time" : `${addonOccurrences(name)} of ${visitsCount} visits`}</span><span style={{ color: "rgba(255,255,255,0.55)" }}>${money(addonPrice(name) * addonOccurrences(name))}</span></div>
                  ))}
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: "rgba(255,255,255,0.75)" }}>Number of visits</span>
                  <span>× {visitsCount}</span>
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600 }}>
                  <span style={{ color: "#fff" }}>Total</span>
                  <span>${money(totalBeforeDiscount)}</span>
                </div>

                {discount > 0 && (
                  <>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>Discount ({Math.round(appliedDiscountPct * 100)}%, visit price only)</span>
                      <span style={{ color: "#9ee6a8" }}>−${money(totalDiscountAmount)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic", margin: "4px 0 0" }}>Applies to the visit price only, never to one-time bookings — add-ons are never discounted.</p>
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                      <span style={{ color: "rgba(255,255,255,0.75)" }}>Subtotal (discounted)</span>
                      <span>${moneyFixed(finalDiscounted)}</span>
                    </div>
                  </>
                )}

                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                  <span style={{ color: "rgba(255,255,255,0.75)" }}>FL Sales Tax (6%)</span>
                  <span>${money(tax)}</span>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 16, paddingTop: 16 }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>Final price — {bookingLabel}, {displayFrequency}</p>
                  <p style={{ fontSize: 40, fontWeight: 600, color: gold, margin: "6px 0 0" }}>${money(totalWithTax)}</p>
                </div>

                {est && est.vsMarketPct > 0.02 && (
                  <p style={{ fontSize: 12, color: "#9ee6a8", margin: "10px 0 0" }}>
                    About {Math.round(est.vsMarketPct * 100)}% below the typical local rate for a facility like yours.
                  </p>
                )}
              </>
            )}
            <button type="button" onClick={handleBookIt} style={{ display: "inline-block", marginTop: 18, background: gold, color: navy, fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 3, border: "none", cursor: "pointer" }}>Book It</button>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 10 }}>You'll create an account and pick a visit time next. First-time discounts are confirmed there.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
