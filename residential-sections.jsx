// residential-sections.jsx
// ---------------------------------------------------------------------------
// The residential side's own sections. Loaded after gulfproclean-shared.jsx,
// which supplies Nav/Hero/Kicker/Services/PlanList/Quote/Reveal and the data
// hooks these components rely on.
//
// PRICING: the calculator no longer prices from square-footage bands alone.
// It estimates crew-hours from the actual room count (bedrooms, bathrooms,
// kitchen, living areas) plus floor area, then prices those hours through
// window.GPC_PRICING (pricing-model.js), which holds the cost floor and the
// market-positioning logic. DEFAULT_PRICING_RESIDENTIAL below is retained
// only as the admin-editable reference table; it no longer sets the quote.
//
// est.price from GPC_PRICING.quote() IS ALREADY the one-time standard price
// (cost floor vs. 92.5%-of-market, whichever is higher) — do not multiply it
// by anything further before displaying it as "standardPrice." An earlier
// version of this file applied an additional 30% "ONE_TIME_SURCHARGE" on top
// of that already-positioned price, which inflated every displayed price —
// including every recurring/subscription price, since those are computed as
// a discount off standardPrice — by roughly 10-30% above the intended
// 5-10%-under-market target. Fixed by removing that second multiplier.
// ---------------------------------------------------------------------------

const DEFAULT_PRICING_RESIDENTIAL = [
  { band_order: 1, band_label: "Up to 1,000 sq ft", max_sqft: 1000, essential: 165, preferred: 200, premium: 285, unavailable: false },
  { band_order: 2, band_label: "1,001–1,500 sq ft", max_sqft: 1500, essential: 205, preferred: 250, premium: 360, unavailable: false },
  { band_order: 3, band_label: "1,501–2,000 sq ft", max_sqft: 2000, essential: 240, preferred: 295, premium: 425, unavailable: false },
  { band_order: 4, band_label: "2,001–2,500 sq ft", max_sqft: 2500, essential: 280, preferred: 345, premium: 495, unavailable: false },
  { band_order: 5, band_label: "2,501–3,000 sq ft", max_sqft: 3000, essential: 315, preferred: 390, premium: 560, unavailable: false },
  { band_order: 6, band_label: "3,001–3,500 sq ft", max_sqft: 3500, essential: 355, preferred: 440, premium: 635, unavailable: false },
  { band_order: 7, band_label: "3,501–4,000 sq ft", max_sqft: 4000, essential: 390, preferred: 485, premium: 700, unavailable: false },
  { band_order: 8, band_label: "4,001–5,000 sq ft", max_sqft: 5000, essential: 455, preferred: 565, premium: 815, unavailable: false },
  { band_order: 9, band_label: "5,001+ sq ft", max_sqft: null, essential: null, preferred: null, premium: null, unavailable: true },
];

// A modest starter home, used only to show "starting at" figures on the
// plans page. Priced through the same engine as a real quote, so the
// headline number can never drift from what the calculator actually says.
const RES_STARTER_PROPERTY = { bedrooms: 1, fullBaths: 1, halfBaths: 0, kitchens: 1, livingAreas: 1, sqft: 700 };

function ServiceTiers({ navy, gold }) {
  const groups = [
    ["Essential Clean", ["Kitchen surfaces", "Bathrooms", "Floors", "Dusting", "Countertops", "Mirrors", "Sinks", "Toilets", "General tidying", "Trash", "High-touch surfaces"]],
    ["Preferred Clean", ["Baseboards", "Doors", "Cabinet fronts", "Ceiling fans", "Detailed dusting", "Under/behind accessible furniture", "Detailed bathroom & kitchen"]],
    ["Premium", ["External kitchen appliances", "Detailed baseboards", "Vents", "Blinds", "Door frames", "Wall spot cleaning", "Heavy buildup", "Detailed fixtures", "Interior cabinets where applicable"]]
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
  // "Starting at" figures are produced by the same pricing engine the
  // calculator uses, on a defined starter property — so this section can
  // never quote a number the calculator would not honor. est.price is
  // already the fully market-positioned one-time price; nothing further
  // is applied to it here.
  const standardPriceFor = (name) => {
    if (!window.GPC_PRICING) return null;
    return GPC_PRICING.quote("residential", RES_STARTER_PROPERTY, name).price;
  };

  const subs = [
    ["Essential", null, "Second homes · Snowbirds · Light-use", "1 cleaning / month · monthly cadence",
      ["1 cleaning per month", "Ideal for second homes & snowbirds", "Priced by rooms and property size", "Skip & reschedule anytime", "Cloud-synced schedule"],
      "1 visit weekly"],
    ["Preferred", null, "Families · Primary residences · Pets", "2 cleanings / month · biweekly cadence",
      ["2 cleanings per month", "Best value — most chosen", "Priced by rooms and property size", "Skip & reschedule anytime", "Cloud-synced schedule"],
      "2 visits weekly"],
    ["Premium", "Most popular", "Luxury homes · Executives · High-use", "4 cleanings / month · weekly cadence",
      ["4 cleanings per month", "Luxury & high-use homes", "Priced by rooms and property size", "Priority arrival windows", "Cloud-synced schedule"],
      "4 visits weekly"]
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
        <p style={{ fontSize: 14, color: "#7a746a", marginTop: 10 }}>Pricing scales with your room count and property size — <a href="residential-quote.html" style={{ color: "#8a6221" }}>get your exact quote</a> on the quote page.</p>

        <div onClick={() => setBooking("One-Time")} style={{ border: `1px solid ${booking === "One-Time" ? gold : "#d8d3c8"}`, boxShadow: booking === "One-Time" ? `0 0 0 3px ${gold}22` : "none", borderRadius: 6, padding: "28px 30px", background: "#fff", cursor: "pointer", marginTop: 44 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontFamily: "inherit", fontWeight: 500, fontSize: 22, color: navy, margin: 0 }}>One-time clean</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#3d4a4d", marginTop: 8, maxWidth: "56ch" }}>A single visit — move-in, move-out, a deep clean before guests or a big event. No commitment, scheduled around your date.</p>
            </div>
            <a href="residential-quote.html" style={{ flex: "none", border: `1px solid ${navy}`, color: navy, fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 3 }}>Get one-time pricing</a>
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
        <p style={{ fontSize: 14.5, color: "#7a746a", marginTop: 8, maxWidth: "56ch" }}>Standing coverage for second homes, primary residences and high-use properties, billed monthly. No contracts — cancel anytime.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28, marginTop: 28 }} onClick={() => setBooking("Subscription")}>
          {subs.map(([name, badge, audience, cadence, features, calcFrequency]) => (
            <div key={name} style={{ border: `1px solid ${badge ? gold : (booking === "Subscription" ? gold : "#d8d3c8")}`, boxShadow: badge ? `0 0 0 3px ${gold}22` : "none", borderRadius: 6, padding: "30px 26px", background: "#fff", cursor: "pointer", position: "relative" }}>
              {badge && <span style={{ position: "absolute", top: -12, left: 26, background: gold, color: navy, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 20 }}>{badge}</span>}
              <h4 style={{ fontFamily: "inherit", fontWeight: 500, fontSize: 20, color: navy, margin: 0 }}>{name}</h4>
              <p style={{ fontSize: 12.5, color: "#7a746a", margin: "6px 0 0" }}>{audience}</p>
              <p style={{ fontSize: 12.5, color: "#7a746a", margin: "16px 0 0" }}>{cadence}</p>
              <PlanList gold={gold} items={features} />
              <a href={quoteLinkFor("residential", { tier: name, frequency: calcFrequency })} style={{ display: "inline-block", marginTop: 22, background: gold, color: navy, fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 3, width: "100%", textAlign: "center", boxSizing: "border-box" }}>Choose {name} — get your price</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AddOns({ navy, gold }) {
  const residential = [
    ["Interior Window Cleaning", "$110"], ["Blinds Dusting", "Ask for quote"], ["Baseboards & Trim Detailing", "$75"],
    ["Light Fixtures & Ceiling Fans", "Ask for quote"], ["Door & Frame Detailing", "Ask for quote"], ["Cabinet Front Detailing", "$100"],
    ["Inside Oven Cleaning", "$40"], ["Inside Refrigerator Cleaning", "$40"], ["Hard Floor Deep Cleaning", "Ask for quote"],
    ["Carpet Deep Cleaning", "Ask for quote"], ["Shower & Tile Deep Cleaning", "Ask for quote"], ["Balcony/Patio Cleaning", "$47"]
  ];
  return (
    <section id="addons" style={{ background: CREAM, padding: "56px clamp(20px,5vw,56px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Kicker gold="#8a6221">Add-ons</Kicker>
        <h1 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 32, color: navy, margin: 0, maxWidth: 640 }}>Customers on the Emerald Coast are accustomed to add-ons</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#3d4a4d", marginTop: 14, maxWidth: "58ch" }}>Add exactly what your space needs, on top of any one-time or subscription visit.</p>
        <img src="assets/residential-addons.jpg" alt="Add-on services: interior window cleaning, blinds dusting, baseboards and trim, light fixtures and ceiling fans, door and frame detailing, cabinet fronts, inside oven, inside refrigerator, hard floor deep cleaning, carpet deep cleaning, shower and tile deep cleaning, balcony and patio cleaning" style={{ width: "100%", display: "block", marginTop: 40, borderRadius: 6 }} />
        <div className="addons-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, marginTop: 1, border: "1px solid #e3ded2", background: "#e3ded2" }}>
          {residential.map(([name, price]) => (
            <div key={name} style={{ background: "#fff", padding: "16px 18px", textAlign: "center" }}>
              <p style={{ fontSize: 13.5, color: navy, margin: 0, fontWeight: 500 }}>{name}</p>
              <p style={{ fontSize: 20, fontWeight: 600, color: "#8a6221", margin: "6px 0 0" }}>{price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Calculator({ navy, gold, pricing, preset }) {
  const TIERS = ["Essential", "Preferred", "Premium"];
  const freqAdj = {
    "1 visit weekly": 0, "2 visits weekly": 0, "3 visits weekly": 0, "4 visits weekly": 0,
    "5 visits weekly": 0, "6 visits weekly": 0, "7 visits weekly": 0,
  };
  const monthlyDiscountFor = (m) => m >= 12 ? 0.15 : m >= 6 ? 0.10 : m >= 1 ? 0.07 : 0.05;
  const BILLING_PLANS = [
    { key: "one-time", label: "One-time (Standard price)", booking: "One-time", months: 1 },
    { key: "biweekly", label: "Biweekly (5% discount)", booking: "Monthly", months: 0.5 },
    { key: "monthly", label: "Monthly (7% discount)", booking: "Monthly", months: 1 },
    { key: "6-month", label: "6-Month Subscription (10% discount)", booking: "Monthly", months: 6 },
    { key: "12-month", label: "12-Month Subscription (15% discount)", booking: "Monthly", months: 12 },
  ];
  const addonPricing = {
    "Inside refrigerator": 40, "Inside oven": 40, "Refrigerator + oven": 70,
    "Interior windows (package)": 110, "Baseboard detail": 75, "Inside cabinets": 100,
    "Laundry wash/dry/fold": 35, "Bed linen change": 12, "Pet hair surcharge": 37,
    "Heavy sand removal": 55, "Patio / balcony": 47, "Garage sweep": 62
  };

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [addressLine1, setAddressLine1] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [city, setCity] = React.useState("");
  const stateVal = "FL"; // service area is Florida-only
  const [zip, setZip] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [tier, setTier] = React.useState("");
  const [sqft, setSqft] = React.useState("");

  // Room counts — these now drive the estimate more than square footage does.
  const [bedrooms, setBedrooms] = React.useState("");
  const [fullBaths, setFullBaths] = React.useState("");
  const [halfBaths, setHalfBaths] = React.useState("0");
  const [kitchens, setKitchens] = React.useState("1");
  const [livingAreas, setLivingAreas] = React.useState("");

  // Condition / complexity
  const [pets, setPets] = React.useState("");
  const [condition, setCondition] = React.useState("");
  const [lastCleaned, setLastCleaned] = React.useState("");
  const [levels, setLevels] = React.useState("");
  const [occupancy, setOccupancy] = React.useState("");

  const [frequency, setFrequency] = React.useState("");
  const [booking, setBooking] = React.useState("");
  const [months, setMonths] = React.useState(1);
  const [addons, setAddons] = React.useState([]);
  const [addonQty, setAddonQty] = React.useState({});
  const [presetNotice, setPresetNotice] = React.useState(false);
  React.useEffect(() => {
    if (!preset) return;
    setTier(preset.tier);
    setFrequency(preset.frequency);
    setBooking("Monthly");
    setPresetNotice(true);
  }, [preset]);
  const toggleAddon = (name) => setAddons(a => a.includes(name) ? a.filter(x => x !== name) : [...a, name]);
  const setAddonQtyFor = (name, val) => setAddonQty(q => ({ ...q, [name]: Number(val) }));

  const propertyInput = {
    sqft: Number(sqft) || 0,
    bedrooms: Number(bedrooms) || 0,
    fullBaths: Number(fullBaths) || 0,
    halfBaths: Number(halfBaths) || 0,
    kitchens: Number(kitchens) || 0,
    livingAreas: Number(livingAreas) || 0,
    pets, condition, lastCleaned, levels, occupancy,
  };

  const hasProperty = !!tier && propertyInput.sqft > 0 && propertyInput.bedrooms >= 0 &&
    fullBaths !== "" && bedrooms !== "" && livingAreas !== "";
  const hasAllInputs = hasProperty && !!booking && (booking === "One-time" || !!frequency);

  const est = (hasProperty && window.GPC_PRICING)
    ? GPC_PRICING.quote("residential", propertyInput, tier)
    : null;

  // est.price IS the standard one-time price — already positioned against
  // the cost floor and the market reference by pricing-model.js. Nothing
  // further is applied here; recurring plans discount directly off it.
  const standardPrice = est ? est.price : 0;
  const monthlyDiscountPct = booking === "Monthly" ? monthlyDiscountFor(months) : 0;
  const afterBooking = booking === "One-time" ? standardPrice : standardPrice * (1 - monthlyDiscountPct);
  const perVisit = afterBooking;
  const discount = Math.max(0, standardPrice - perVisit);
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
  const visitsPerMonth = parseInt(frequency, 10) || 1;
  const isWeeklyCadence = !frequency.toLowerCase().includes("monthly");
  const visitsCount = !booking ? 0 : booking === "One-time" ? 1 : (isWeeklyCadence ? visitsPerMonth * months * 4 : visitsPerMonth * months);
  const addonOccurrences = (name) => { const v = addonQty[name]; return v && v <= visitsCount ? v : visitsCount; };
  const totalAddons = addons.reduce((sum, name) => sum + addonPricing[name] * addonOccurrences(name), 0);
  const grossTotal = standardPrice * visitsCount;
  const finalDiscounted = (perVisit * visitsCount) + totalAddons;
  const totalBeforeDiscount = grossTotal + totalAddons;
  const totalDiscountAmount = discount * visitsCount;

  const missingRequired = !firstName.trim() || !lastName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !zip.trim();
  const handleBookIt = () => {
    if (missingRequired) { alert("Please fill in all required fields (name, phone, and full address) to book."); return; }
    if (!hasAllInputs) { alert("Please complete the property details, service tier, frequency, and billing plan to see your price before booking."); return; }
    const fullAddress = [addressLine1.trim(), unit.trim(), `${city.trim()}, ${stateVal} ${zip.trim()}`].filter(Boolean).join(", ");
    sessionStorage.setItem("gpc_booking_draft", JSON.stringify({
      page: "residential",
      firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(),
      addressLine1: addressLine1.trim(), unit: unit.trim(), city: city.trim(), state: stateVal, zip: zip.trim(),
      address: fullAddress,
      notes: notes.trim(),
      sqft,
      bedrooms, fullBaths, halfBaths, kitchens, livingAreas,
      pets, condition, lastCleaned, levels, occupancy,
      estimatedHours: est ? est.hours : null,
      tier, booking, months, frequency, displayFrequency, bookingLabel,
      addons: addons.map(name => ({ name, occurrences: addonOccurrences(name), unitPrice: addonPricing[name], total: addonPricing[name] * addonOccurrences(name) })),
      addonsTotalAmount: totalAddons,
      allAddonPricing: addonPricing,
      standardPrice, afterBooking, visitsCount, grossTotal,
      taxRate: 0,
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
  const selStyle = { minHeight: 36, padding: "6px 10px", fontSize: 14, border: "1px solid #d8d3c8", borderRadius: 3, fontFamily: "inherit", background: "#fff", width: "100%" };
  const labelStyle = { display: "block", fontSize: 12.5, color: "#7a746a", marginBottom: 6 };
  const countOptions = (max, from = 0) => Array.from({ length: max - from + 1 }, (_, i) => i + from);

  return (
    <section id="calculator" style={{ background: navy, padding: "48px clamp(20px,5vw,56px)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ background: `linear-gradient(135deg, ${gold}, #d9a94a)`, color: navy, borderRadius: 6, padding: "16px 26px", marginBottom: 24, textAlign: "center", fontWeight: 700, fontSize: 16 }}>
          ✦ Discounts for first-time customers and subscription plans ✦
        </div>
        <Kicker gold="#d9a94a">Get a quote</Kicker>
        <h1 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 28, color: "#fff", margin: 0, maxWidth: 640 }}>Estimate your residential price</h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", marginTop: 8, maxWidth: "60ch" }}>Priced from your actual room count and property size, not a flat square-footage band — so a 3-bedroom, 2-bath home is not charged like a studio of the same size. An estimate; final pricing is confirmed on walkthrough.</p>
        {presetNotice && (
          <div style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${gold}`, borderRadius: 4, padding: "10px 14px", marginTop: 14, maxWidth: "60ch", fontSize: 13, color: "#fff" }}>
            We've pre-filled the {preset.tier} plan below. Fill in your rooms and square footage for an exact quote.
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
            <input type="text" placeholder="Apt 4B" value={unit} onChange={e => setUnit(e.target.value)} style={selStyle} />
          </label>
          <label><span style={labelStyle}>City</span>
            <input type="text" placeholder="Destin" value={city} onChange={e => setCity(e.target.value)} style={selStyle} />
          </label>
          <label><span style={labelStyle}>Zip code</span>
            <input type="text" inputMode="numeric" placeholder="32541" value={zip} onChange={e => setZip(e.target.value)} style={selStyle} />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Notes for your cleaner (optional)</span>
            <textarea placeholder="Gate code, pets, areas to avoid, special requests…" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...selStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </div>

        <div style={{ marginTop: 20, background: "#fff", borderRadius: 8, padding: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: navy, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Your home</p>
          <p style={{ fontSize: 12.5, color: "#7a746a", margin: "0 0 18px" }}>Room counts drive most of the work — bathrooms and kitchens take the longest per room.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            <label><span style={labelStyle}>Bedrooms</span>
              <select style={selStyle} value={bedrooms} onChange={e => setBedrooms(e.target.value)}>
                <option value="" disabled hidden></option>
                {countOptions(8, 0).map(n => <option key={n} value={n}>{n === 0 ? "Studio / none" : n}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Full bathrooms</span>
              <select style={selStyle} value={fullBaths} onChange={e => setFullBaths(e.target.value)}>
                <option value="" disabled hidden></option>
                {countOptions(8, 0).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Half baths</span>
              <select style={selStyle} value={halfBaths} onChange={e => setHalfBaths(e.target.value)}>
                {countOptions(4, 0).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Kitchens</span>
              <select style={selStyle} value={kitchens} onChange={e => setKitchens(e.target.value)}>
                {countOptions(3, 0).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Living / dining / office areas</span>
              <select style={selStyle} value={livingAreas} onChange={e => setLivingAreas(e.target.value)}>
                <option value="" disabled hidden></option>
                {countOptions(8, 0).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Property size (sq ft)</span>
              <input type="number" min="0" placeholder="e.g. 1800" value={sqft} onChange={e => setSqft(e.target.value)} style={selStyle} />
            </label>
            <label><span style={labelStyle}>Levels</span>
              <select style={selStyle} value={levels} onChange={e => setLevels(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.RES_FACTORS.levels).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Pets</span>
              <select style={selStyle} value={pets} onChange={e => setPets(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.RES_FACTORS.pets).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>People in the home</span>
              <select style={selStyle} value={occupancy} onChange={e => setOccupancy(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.RES_FACTORS.occupancy).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Current condition</span>
              <select style={selStyle} value={condition} onChange={e => setCondition(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.RES_FACTORS.condition).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label><span style={labelStyle}>Last professionally cleaned</span>
              <select style={selStyle} value={lastCleaned} onChange={e => setLastCleaned(e.target.value)}>
                <option value="">Select</option>
                {Object.keys(GPC_PRICING.RES_FACTORS.lastCleaned).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 20, background: "#fff", borderRadius: 8, padding: 28 }}>
          <label style={{ gridColumn: "span 2" }}><span style={labelStyle}>Select billing plan</span>
            <select style={selStyle} value={billingKey} onChange={e => setBillingPlan(e.target.value)}>
              <option value="" disabled hidden></option>
              {BILLING_PLANS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
          <label style={{ gridColumn: "span 2" }}><span style={labelStyle}>Service tier</span>
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
                  <span style={{ marginLeft: "auto", color: "#7a746a", fontSize: 13 }}>${addonPricing[name]}</span>
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
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>Fill in your bedrooms, bathrooms, living areas and square footage, then pick a service tier, frequency and billing plan to see your price.</p>
              </div>
            ) : (
              <>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2, fontSize: 13.5 }}>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>{tier} · {bookingLabel} · {displayFrequency}</div>
                  {est && (
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>
                      Estimated {est.hours} crew-hours per visit
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={{ color: "rgba(255,255,255,0.75)" }}>Price per visit</span><span>${money(standardPrice)}</span></div>
                </div>

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "rgba(255,255,255,0.75)" }}>Add-ons</span><span>${money(totalAddons)}</span></div>
                  {addons.length === 0 ? (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>None selected</p>
                  ) : addons.map(name => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span style={{ color: "rgba(255,255,255,0.55)" }}>+ {name} — {addonOccurrences(name) === visitsCount ? (visitsCount === 1 ? "this visit" : `every visit ×${visitsCount}`) : addonOccurrences(name) === 1 ? "one-time" : `${addonOccurrences(name)} of ${visitsCount} visits`}</span><span style={{ color: "rgba(255,255,255,0.55)" }}>${money(addonPricing[name] * addonOccurrences(name))}</span></div>
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
                      <span style={{ color: "rgba(255,255,255,0.55)" }}>Discount ({Math.round(monthlyDiscountPct * 100)}%, visit price only)</span>
                      <span style={{ color: "#9ee6a8" }}>−${money(totalDiscountAmount)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontStyle: "italic", margin: "4px 0 0" }}>Applies to the visit price only, never to one-time bookings — add-ons are never discounted.</p>
                  </>
                )}

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", marginTop: 16, paddingTop: 16 }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>Final price — {bookingLabel}, {displayFrequency}</p>
                  <p style={{ fontSize: 40, fontWeight: 600, color: gold, margin: "6px 0 0" }}>${money(finalDiscounted)}</p>
                </div>

                {est && est.vsMarketPct > 0.02 && (
                  <p style={{ fontSize: 12, color: "#9ee6a8", margin: "10px 0 0" }}>
                    About {Math.round(est.vsMarketPct * 100)}% below the typical local rate for a home like yours.
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

function WhatWeWatch({ navy, gold }) {
  const items = ["Cleaning & Quality", "HVAC & Filters", "Plumbing & Leaks", "Appliances", "Pool & Equipment", "Supplies", "Doors & Windows", "Exterior", "Storm Readiness", "Maintenance", "Vendors & Repairs", "Upcoming Projects"];
  return (
    <section style={{ background: "#fff", padding: "56px clamp(20px,5vw,56px)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Reveal>
          <Kicker gold="#8a6221">What we watch</Kicker>
          <h2 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 32, color: navy, margin: 0, maxWidth: 640 }}>We Keep An Eye On Your Home</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#3d4a4d", marginTop: 14, maxWidth: "60ch" }}>Every visit creates another layer of visibility into your property. When we find something that needs attention, you know about it—and we can help coordinate the next step.</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 36 }}>
          {items.map((label, i) => (
            <Reveal key={label} delay={(i % 4) * 0.05}>
              <div style={{ background: CREAM, border: "1px solid #e3ded2", borderRadius: 8, padding: "18px 20px", fontSize: 14, color: navy, fontWeight: 500 }}>{label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CareProgression({ navy, gold }) {
  const steps = [
    ["01", "Cleaning", "Your home is serviced regularly."],
    ["02", "Home Watch", "We notice what's happening between visits."],
    ["03", "Maintenance", "Issues are identified before they become bigger problems."],
    ["04", "Coordination", "We coordinate qualified vendors when work is needed."],
    ["05", "Home Operating System", "Everything is visible in one place."],
  ];
  return (
    <section style={{ background: navy, padding: "56px clamp(20px,5vw,56px)", color: "#fff" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Reveal>
          <Kicker gold="#d9a94a">The path</Kicker>
          <h2 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: 32, margin: 0 }}>From Cleaning to Complete Home Care</h2>
        </Reveal>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column" }}>
          {steps.map(([num, title, body], i) => (
            <React.Fragment key={num}>
              <Reveal delay={i * 0.08}>
                <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#d9a94a", minWidth: 28 }}>{num}</span>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{title}</p>
                    <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.7)", margin: "6px 0 0" }}>{body}</p>
                  </div>
                </div>
              </Reveal>
              {i < steps.length - 1 && <div style={{ marginLeft: 13, width: 1, height: 32, background: "rgba(255,255,255,0.2)" }} />}
            </React.Fragment>
          ))}
        </div>
        <Reveal delay={0.4}>
          <p style={{ fontSize: 22, fontWeight: 300, fontStyle: "italic", marginTop: 56, maxWidth: "34ch" }}>We're not just cleaning your home. We're helping you operate it.</p>
        </Reveal>
      </div>
    </section>
  );
}

function HomeOSIntro({ navy, gold }) {
  return (
    <section style={{ background: CREAM, padding: "56px clamp(20px,5vw,56px) 0" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", textAlign: "center" }}>
        <Reveal>
          <Kicker gold="#8a6221">The Real Secret</Kicker>
          <h1 style={{ fontFamily: "inherit", fontWeight: 300, fontSize: "clamp(28px,4vw,42px)", color: navy, margin: 0, lineHeight: 1.2 }}>Your Home Runs Better When Everything Is Connected.</h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.7, color: "#3d4a4d", marginTop: 20, maxWidth: "62ch", marginLeft: "auto", marginRight: "auto" }}>Your home is more than a cleaning appointment. Our Home Operating System keeps track of the condition, cleaning, maintenance, supplies, upcoming services, and projects happening at your property—all from one account.</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
            <a href="account.html" style={{ background: gold, color: navy, fontWeight: 600, fontSize: 15, padding: "14px 28px", borderRadius: 3 }}>See My Home</a>
            <a href="residential-quote.html" style={{ border: `1px solid ${navy}`, color: navy, fontWeight: 600, fontSize: 15, padding: "14px 28px", borderRadius: 3 }}>Explore Membership</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HomeOperatingSystem({ navy, gold }) {
  return (
    <>
      <HomeOSIntro navy={navy} gold={gold} />
      <WhatWeWatch navy={navy} gold={gold} />
      <CareProgression navy={navy} gold={gold} />
    </>
  );
}
