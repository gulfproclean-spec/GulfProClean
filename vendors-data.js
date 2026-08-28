// vendors-data.js
// ---------------------------------------------------------------------------
// The trade categories Gulf ProClean subcontracts, and what each one has to
// hold in Florida before it can be dispatched to a customer property.
//
// `authority` is who issues the license and where it gets verified. Verifying
// against the issuing authority — not against a photo of a card — is the whole
// point of the vendor process. DBPR licenses are searchable at
// myfloridalicense.com; FDACS pest control licenses at fdacs.gov.
//
// IMPORTANT: this list is a starting point built from Florida's statewide
// licensing scheme. Counties and municipalities along the Emerald Coast add
// their own local competency licenses and business tax receipts on top. Have
// counsel or your insurance agent confirm the list before it drives a
// purchasing decision.
// ---------------------------------------------------------------------------

window.GPC_VENDOR_CATEGORIES = [
  {
    slug: "plumbing",
    name: "Plumbing",
    licenseRequired: true,
    license: "Certified or Registered Plumbing Contractor",
    authority: "Florida DBPR — Construction Industry Licensing Board",
    statute: "Ch. 489, Part I, Fla. Stat.",
    notes: "Required for any plumbing work. A handyman may not do this, and neither may we.",
  },
  {
    slug: "electrical",
    name: "Electrical",
    licenseRequired: true,
    license: "Certified or Registered Electrical Contractor",
    authority: "Florida DBPR — Electrical Contractors' Licensing Board",
    statute: "Ch. 489, Part II, Fla. Stat.",
    notes: "Includes fixture replacement beyond a like-for-like swap, panel work and any new circuit.",
  },
  {
    slug: "hvac",
    name: "HVAC & air conditioning",
    licenseRequired: true,
    license: "Class A or Class B Air Conditioning Contractor, or Mechanical Contractor",
    authority: "Florida DBPR — Construction Industry Licensing Board",
    statute: "Ch. 489, Part I, Fla. Stat.",
    notes: "Filter changes are in our scope. Anything touching refrigerant, ductwork or the equipment itself is yours.",
  },
  {
    slug: "mold-remediation",
    name: "Mold assessment & remediation",
    licenseRequired: true,
    license: "Mold Assessor or Mold Remediator license",
    authority: "Florida DBPR — Mold-Related Services",
    statute: "Ch. 468, Part XVI, Fla. Stat. · Rule 61-31, F.A.C.",
    notes: "Florida requires at least $1,000,000 in general liability with specific mold coverage for remediators, and $1,000,000 general liability plus errors & omissions for assessors. The same firm may not both assess and remediate the same project.",
  },
  {
    slug: "pest-control",
    name: "Pest control & termite",
    licenseRequired: true,
    license: "Pest Control Business License with a Certified Operator in charge",
    authority: "Florida Dept. of Agriculture & Consumer Services (FDACS)",
    statute: "Ch. 482, Fla. Stat.",
    notes: "Verified with FDACS, not DBPR. The Certified Operator must be identified by name on the license.",
  },
  {
    slug: "pool-spa",
    name: "Pool & spa service",
    licenseRequired: true,
    license: "Swimming Pool/Spa Servicing Contractor (or a broader pool contractor license)",
    authority: "Florida DBPR — Construction Industry Licensing Board",
    statute: "Ch. 489, Part I, Fla. Stat.",
    notes: "Chemical-only service by an unlicensed provider is a common gray area — we require the license either way.",
  },
  {
    slug: "roofing",
    name: "Roofing",
    licenseRequired: true,
    license: "Certified or Registered Roofing Contractor",
    authority: "Florida DBPR — Construction Industry Licensing Board",
    statute: "Ch. 489, Part I, Fla. Stat.",
    notes: "Storm-season demand spikes. We keep more than one roofer on the bench for that reason.",
  },
  {
    slug: "general-contracting",
    name: "General / building / residential contracting",
    licenseRequired: true,
    license: "Certified or Registered General, Building or Residential Contractor",
    authority: "Florida DBPR — Construction Industry Licensing Board",
    statute: "Ch. 489, Part I, Fla. Stat.",
    notes: "For structural repair, remodels and anything beyond cosmetic restoration.",
  },
  {
    slug: "septic",
    name: "Septic & onsite sewage",
    licenseRequired: true,
    license: "Septic Tank Contractor registration",
    authority: "Florida Dept. of Health / DEP onsite sewage program",
    statute: "Ch. 489, Part III, Fla. Stat.",
    notes: "Applies to rural and coastal properties outside a sewer district.",
  },
  {
    slug: "fire-alarm-sprinkler",
    name: "Fire alarm & sprinkler",
    licenseRequired: true,
    license: "Fire Protection Contractor or Fire Alarm System Contractor",
    authority: "Florida State Fire Marshal / DBPR (alarm system contractor)",
    statute: "Ch. 633 and Ch. 489, Part II, Fla. Stat.",
    notes: "Relevant to our commercial accounts, particularly restaurants.",
  },
  {
    slug: "asbestos",
    name: "Asbestos abatement",
    licenseRequired: true,
    license: "Asbestos Consultant or Asbestos Contractor license",
    authority: "Florida DBPR / DEP",
    statute: "Ch. 469, Fla. Stat.",
    notes: "Older Gulf Coast properties. Never touched without a licensed abatement contractor.",
  },
  {
    slug: "pressure-washing",
    name: "Pressure washing & exterior soft wash",
    licenseRequired: false,
    license: "No statewide license — local business tax receipt required",
    authority: "County / municipality",
    statute: "Local ordinance · FDEP stormwater rules",
    notes: "No state license, but we require proof of insurance and a written wash-water containment and disposal practice. Discharging wash water to a storm drain is what gets a property owner cited.",
  },
  {
    slug: "carpet-upholstery",
    name: "Carpet & upholstery restoration",
    licenseRequired: false,
    license: "No statewide license — IICRC certification preferred",
    authority: "County / municipality",
    statute: "Local ordinance",
    notes: "We do routine extraction in house; you get the restoration and water-damage work.",
  },
  {
    slug: "landscaping",
    name: "Landscaping & lawn",
    licenseRequired: false,
    license: "No statewide license for mowing or maintenance — but commercial pesticide or fertilizer application requires FDACS certification",
    authority: "County / municipality · FDACS for applicators",
    statute: "Ch. 482 and Ch. 487, Fla. Stat. for applicators",
    notes: "If you apply any pesticide or fertilizer commercially, send the applicator certification too.",
  },
  {
    slug: "handyman",
    name: "Handyman & general maintenance",
    licenseRequired: false,
    license: "No statewide license — but unlicensed work may not include any licensed trade",
    authority: "County / municipality",
    statute: "Ch. 489, Fla. Stat. limits scope",
    notes: "Cosmetic and minor repair only. If a job turns out to need plumbing, electrical or HVAC work, stop and tell us — we will dispatch a licensed trade instead.",
  },
  {
    slug: "window-glass",
    name: "Window cleaning & glass",
    licenseRequired: false,
    license: "No statewide license — glazing or replacement may require a contractor license",
    authority: "County / municipality · DBPR for glazing",
    statute: "Local ordinance",
    notes: "High-rise and above-ground work requires documented fall-protection compliance.",
  },
  {
    slug: "junk-removal",
    name: "Junk removal & hauling",
    licenseRequired: false,
    license: "No statewide license — local hauling permits may apply",
    authority: "County / municipality",
    statute: "Local ordinance",
    notes: "Post-construction and move-out volumes. Tell us your disposal facility.",
  },
  {
    slug: "restoration",
    name: "Water damage & restoration",
    licenseRequired: false,
    license: "No statewide license for drying — but mold remediation requires the DBPR mold license",
    authority: "DBPR if the job crosses into mold remediation",
    statute: "Ch. 468, Part XVI, Fla. Stat.",
    notes: "IICRC WRT/ASD certification expected. If the job becomes mold remediation, the mold license applies.",
  },
];
