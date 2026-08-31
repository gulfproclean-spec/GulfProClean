// careers-data.js
// ---------------------------------------------------------------------------
// The single source of truth for open roles. careers.html lists them,
// careers-job.html renders one in full, and apply.html uses it to label the
// application. Closing a role is a one-line change: set `open: false`.
//
// PAY NOTE: Florida's minimum wage rises to $15.00/hour on September 30, 2026
// (Fla. Const. art. X, s.24). Every range below already starts above it. These
// are drafts — confirm each against what you actually intend to pay before the
// posting goes live, because a posted range sets an expectation you will be
// held to in the interview.
//
// BENEFITS NOTE: window.GPC_BENEFITS below is the company-wide benefits and
// bonus program, rendered in full on careers.html (#benefits) and summarized
// per role via each job's `benefits` array on careers-job.html.
//
// DELIBERATELY KEPT GENERAL: these describe *categories and eligibility*, not
// dollar amounts, accrual rates, or exact timelines. That detail belongs to
// HR, delivered directly to the employee once hired — not published as a
// standing public offer anyone could point back to. If a specific number
// changes, HR updates it in one conversation instead of this page needing an
// edit. Keep new entries at this same level of generality, and keep the
// disclaimer text intact wherever this data is rendered — it's what keeps
// this page from reading as a contract, consistent with Gulf ProClean's
// at-will employment language everywhere else on the site.
// ---------------------------------------------------------------------------

window.GPC_SERVICE_AREA = "Pensacola · Navarre · Fort Walton Beach · Destin · 30A · Panama City Beach";

window.GPC_JOBS = [
  {
    slug: "residential-cleaning-technician",
    title: "Residential Cleaning Technician",
    open: true,
    type: "Full-time or part-time",
    schedule: "Daytime, Monday–Friday, occasional Saturday",
    location: "Field — customer homes across the Emerald Coast",
    payMin: 16, payMax: 20, payUnit: "hour",
    drives: true,
    summary:
      "You are the person our residential customers actually meet. You clean houses, condos and second homes to a published standard — Essential, Preferred or Premium — and you come back to the same properties, so you learn each one instead of relearning it every visit.",
    responsibilities: [
      "Clean assigned homes to the tier purchased — Essential, Preferred or Premium — using the checklist for that tier",
      "Kitchens, bathrooms, floors, dusting and high-touch surfaces on every visit; baseboards, cabinet fronts, ceiling fans and detailed work on Preferred and above",
      "Complete purchased add-ons for the visit (inside oven, inside refrigerator, interior windows, balcony/patio and similar)",
      "Photograph completed work where the customer's plan calls for photo documentation",
      "Report anything you notice that the homeowner should know about — a slow drip, a full filter, damage, a supply running out",
      "Keep your kit stocked, your vehicle clean, and your supply usage logged",
      "Arrive inside the promised arrival window and tell dispatch immediately if that is at risk",
    ],
    requirements: [
      "18 or older",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Valid driver license, a reliable vehicle, and auto insurance that meets Florida's requirements",
      "Able to pass a criminal background check — you will be working inside people's homes, often alone",
      "Reliable: you show up when you said you would, and you call before you are late, not after",
      "Comfortable with a smartphone for your schedule, checklists and photos",
    ],
    preferred: [
      "Previous residential cleaning, housekeeping or hotel room-attendant experience",
      "Experience with vacation rental turnovers",
      "Conversational Spanish",
    ],
    physical: [
      "On your feet most of the shift; bending, reaching, kneeling and stair climbing throughout",
      "Lift and carry up to 25 lbs routinely and up to 40 lbs occasionally",
      "Work around standard cleaning chemicals, pets and household dust",
    ],
    benefits: [
      "Mileage reimbursement for using your own vehicle",
      "Paid time off for full-time employees",
      "Eligible for the employee referral bonus",
      "Eligible for periodic attendance recognition",
    ],
  },

  {
    slug: "vacation-rental-turnover-specialist",
    title: "Vacation Rental Turnover Specialist",
    open: true,
    type: "Full-time, seasonal peaks",
    schedule: "Turn days — heavy Friday through Monday; hard check-in deadlines",
    location: "Field — vacation rentals from Navarre through 30A and Panama City Beach",
    payMin: 17, payMax: 21, payUnit: "hour",
    drives: true,
    summary:
      "Turnovers are cleaning against a clock. Guests check out at 10, the next ones arrive at 4, and the listing has to look exactly like its photos when they open the door. This is the role for someone who is fast, methodical, and does not need to be told twice.",
    responsibilities: [
      "Complete full guest turnovers between check-out and check-in, to the property's turnover checklist",
      "Strip, launder and reset linens and towels; make beds to the owner's staging standard",
      "Restock consumables — paper, soap, coffee, starter supplies — and log what was used",
      "Photo-document every finished room and upload before you leave the property",
      "Flag damage, missing items, maintenance issues and suspected guest violations the same day",
      "Stage the property to match the listing photos: furniture placement, remotes, welcome materials",
      "Coordinate with dispatch when a check-out runs late so the schedule can be resequenced",
    ],
    requirements: [
      "18 or older",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Valid driver license, reliable vehicle, and Florida-compliant auto insurance",
      "Able to pass a criminal background check",
      "Available on weekends and holidays — turn days do not move",
      "Comfortable working to a deadline without supervision standing over you",
    ],
    preferred: [
      "Vacation rental, Airbnb/VRBO or hotel housekeeping experience",
      "Familiarity with property management software (Guesty, Hostaway, OwnerRez or similar)",
      "Laundry and linen-handling experience at volume",
    ],
    physical: [
      "Fast-paced work on your feet for the full shift",
      "Lift and carry up to 40 lbs (linen loads, supply totes); stairs and multi-level units are routine",
      "Beach-area heat and humidity between properties",
    ],
    benefits: [
      "Mileage reimbursement for using your own vehicle",
      "Eligible for a peak-season bonus during summer and holiday booking windows",
      "Paid time off for full-time employees",
      "Eligible for the employee referral bonus",
    ],
  },

  {
    slug: "commercial-cleaning-technician",
    title: "Commercial Cleaning Technician (Evenings)",
    open: true,
    type: "Full-time or part-time",
    schedule: "Evenings after client close, Monday–Friday; some overnight accounts",
    location: "Field — offices, restaurants, retail and professional suites",
    payMin: 16, payMax: 19, payUnit: "hour",
    drives: true,
    summary:
      "You clean businesses after their people go home. Offices, restaurants, retail floors and professional suites, on a route you run consistently so each account gets the same result every night.",
    responsibilities: [
      "Run an assigned nightly route to each account's service tier and scope",
      "Trash and recycling, restroom sanitize and restock, floors, surface wipe-down, entryways and glass",
      "Preferred and Premium accounts: interior glass and partitions, baseboards, high-touch disinfection, appliance exteriors, detailed restroom fixtures",
      "Lock and alarm each site correctly — you hold keys and codes for accounts on your route",
      "Log completion per account and report anything the client's point of contact needs to know",
      "Keep the janitorial closet organized and flag supply reorders before you run out",
    ],
    requirements: [
      "18 or older",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Valid driver license, reliable vehicle, and Florida-compliant auto insurance",
      "Able to pass a criminal background check — you will hold keys and alarm codes for client property",
      "Available on an evening schedule, consistently",
      "Trustworthy with unsupervised access to client premises",
    ],
    preferred: [
      "Janitorial or commercial cleaning experience",
      "Restaurant or food-service cleaning experience",
      "Familiarity with restroom sanitation standards and dilution ratios",
    ],
    physical: [
      "On your feet the full shift; pushing carts, mopping, reaching overhead",
      "Lift and carry up to 40 lbs",
      "Evening and overnight hours",
    ],
    benefits: [
      "Mileage reimbursement for using your own vehicle",
      "Paid time off for full-time employees",
      "Eligible for the employee referral bonus",
      "Eligible for periodic attendance recognition",
    ],
  },

  {
    slug: "floor-care-technician",
    title: "Floor Care & Deep Clean Technician",
    open: true,
    type: "Full-time",
    schedule: "Scheduled projects — nights and weekends around client operating hours",
    location: "Field — commercial and residential, project-based",
    payMin: 19, payMax: 24, payUnit: "hour",
    drives: true,
    summary:
      "The specialist work: floor scrub and burnish, carpet extraction, tile and grout, kitchen equipment degreasing, post-construction cleanup and pressure washing. Equipment-heavy, project-based, and paid accordingly.",
    responsibilities: [
      "Operate auto-scrubbers, burnishers, carpet extractors and pressure washers safely and correctly",
      "Strip, seal and finish hard floors; scrub and burnish on a maintenance cycle",
      "Hot-water carpet extraction and spot treatment; tile and grout restoration",
      "Kitchen equipment degreasing and back-of-house deep cleans for restaurant accounts",
      "Post-construction cleanup: debris, dust, adhesive and finish protection",
      "Pressure wash entryways, walkways and dumpster pads — capturing and disposing of wash water per local rules",
      "Perform daily equipment checks, report faults, and keep machines maintained rather than run to failure",
    ],
    requirements: [
      "18 or older",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Valid driver license and a clean enough driving record to operate a company truck and trailer",
      "Able to pass a criminal background check",
      "Hands-on experience with at least one of: auto-scrubber, burnisher, carpet extractor, or commercial pressure washer",
      "Chemical safety literacy — you read the SDS and you dilute correctly",
    ],
    preferred: [
      "Experience stripping and refinishing VCT",
      "IICRC certification (carpet or hard surface)",
      "Trailer towing experience",
      "Post-construction cleaning experience",
    ],
    physical: [
      "Operate heavy equipment for extended periods; sustained standing, pushing and pulling",
      "Lift and carry up to 50 lbs; move equipment on and off a trailer",
      "Work in wet conditions, heat, and occasionally at height on a ladder",
    ],
    benefits: [
      "Company truck and trailer provided",
      "Eligible for a safety bonus tied to your equipment-operation record",
      "Paid time off for full-time employees",
      "Eligible for the employee referral bonus",
    ],
  },

  {
    slug: "crew-lead",
    title: "Crew Lead",
    open: true,
    type: "Full-time",
    schedule: "Daytime, Monday–Saturday",
    location: "Field — leads a two to four person crew",
    payMin: 20, payMax: 25, payUnit: "hour",
    drives: true,
    summary:
      "You run a crew and you clean alongside it. You own the quality of everything your crew touches that day, and you are the person the customer talks to when they are standing in the driveway.",
    responsibilities: [
      "Lead a crew of two to four technicians through a full day's route",
      "Assign work at each property, then inspect it before the crew leaves",
      "Clean alongside the crew — this is a working lead role, not a clipboard role",
      "Train new technicians on the tier checklists and on how we handle customer property",
      "Handle on-site customer questions and complaints; escalate anything you cannot resolve the same day",
      "Manage crew supplies, vehicle condition and time records for the day",
      "Report quality issues, coaching needs and no-shows to the field supervisor",
    ],
    requirements: [
      "18 or older",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Valid driver license and a driving record acceptable to our insurer",
      "Able to pass a criminal background check",
      "At least one year of cleaning experience, and some experience directing other people's work",
      "Able to give correction to an adult without making an enemy of them",
    ],
    preferred: [
      "Bilingual English/Spanish — genuinely useful for training on our crews",
      "Prior lead, supervisor or shift-lead experience in cleaning, hospitality or facilities",
    ],
    physical: [
      "Full-shift physical cleaning work in addition to lead duties",
      "Lift and carry up to 40 lbs; stairs and multi-level properties routinely",
    ],
    benefits: [
      "Mileage reimbursement for using your own vehicle",
      "Eligible for a quality bonus tied to your crew's performance",
      "Eligible for the employee referral bonus",
      "Priority consideration for promotion",
    ],
  },

  {
    slug: "field-quality-supervisor",
    title: "Field Quality & Home Watch Supervisor",
    open: true,
    type: "Full-time",
    schedule: "Daytime with on-call rotation during storm season",
    location: "Field — across the full service area",
    payMin: 22, payMax: 28, payUnit: "hour",
    drives: true,
    summary:
      "Two jobs in one: you inspect our work, and you are the eyes on our Home Watch properties between visits. When something at a property needs attention, you are the one who finds it, documents it, and gets the right person there.",
    responsibilities: [
      "Run scheduled quality inspections across residential and commercial accounts and score them against the tier standard",
      "Perform Home Watch property checks: HVAC and filters, plumbing and leaks, appliances, pool equipment, doors and windows, exterior condition, storm readiness",
      "Document every finding with photos and write it up in the customer's account the same day",
      "Coordinate licensed vendors for work outside our scope, verify their license and insurance before they are dispatched, and follow the job to completion",
      "Coach crews and crew leads on findings; re-inspect after corrective work",
      "Own storm-season readiness checks and post-storm property assessments",
      "Handle escalated customer quality complaints in person",
    ],
    requirements: [
      "21 or older (insurance requirement for this role's vehicle use)",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Valid driver license and a clean driving record",
      "Able to pass a criminal background check",
      "Two or more years in cleaning, facilities, property management or the trades",
      "Able to write a clear, factual report that a homeowner and a vendor can both act on",
      "Comfortable telling a customer something they do not want to hear, accurately and kindly",
    ],
    preferred: [
      "Home inspection, property management or facilities maintenance background",
      "Working knowledge of residential HVAC, plumbing and pool systems — enough to describe a problem correctly, not to fix it",
      "Experience managing subcontractors",
    ],
    physical: [
      "Driving across the service area daily",
      "Property walk-throughs including attics, crawl spaces, roofs viewed from ladder height, and exterior grounds",
      "Outdoor work in Gulf Coast heat and humidity",
    ],
    benefits: [
      "Vehicle allowance or mileage reimbursement for daily service-area driving",
      "Eligible for a storm-season on-call differential",
      "Priority for equipment and vehicle upgrades over time",
      "Eligible for the employee referral bonus",
    ],
  },

  {
    slug: "client-care-scheduler",
    title: "Client Care Coordinator / Scheduler",
    open: true,
    type: "Full-time",
    schedule: "Monday–Friday business hours, rotating Saturday morning coverage",
    location: "Office / hybrid — Emerald Coast",
    payMin: 19, payMax: 24, payUnit: "hour",
    drives: false,
    summary:
      "You are the voice of the company on the phone and the person who makes the calendar work. Bookings, reschedules, arrival windows, route sequencing, and the customer who calls because a crew is running twenty minutes late.",
    responsibilities: [
      "Answer inbound calls, texts, website quotes and contact form submissions, and respond same-day",
      "Build and maintain the daily route schedule across residential and commercial crews",
      "Handle reschedules, cancellations and add-on requests, and keep the customer's account accurate",
      "Resequence the day in real time when a turnover runs long or a crew member calls out",
      "Confirm arrival windows with customers the day before",
      "Take first-line service complaints, resolve what you can, and route the rest to the field supervisor",
      "Keep booking, pricing and customer records clean in the system",
    ],
    requirements: [
      "18 or older",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Able to pass a criminal background check — this role has access to customer addresses, access codes and billing records",
      "Strong phone manner and clear written English",
      "Comfortable with scheduling software, spreadsheets and a web dashboard",
      "Calm under a schedule that changes after you have already built it",
    ],
    preferred: [
      "Dispatch, scheduling or route-planning experience",
      "Service-industry customer support experience",
      "Bilingual English/Spanish",
    ],
    physical: [
      "Primarily seated office work at a computer and phone",
    ],
    benefits: [
      "Paid time off for full-time employees",
      "Eligible for the employee referral bonus",
      "Eligible for periodic attendance recognition",
      "Office-based schedule — no personal vehicle use required for this role",
    ],
  },

  {
    slug: "vendor-maintenance-coordinator",
    title: "Vendor & Maintenance Coordinator",
    open: true,
    type: "Full-time",
    schedule: "Monday–Friday business hours",
    location: "Office / hybrid — Emerald Coast",
    payMin: 22, payMax: 27, payUnit: "hour",
    drives: false,
    summary:
      "Our Home Operating System promises customers that when we find something, we can get the right licensed person there. You are how that promise gets kept — you build and manage the vendor bench, and you make sure nobody works on a customer's property without the license and insurance to be there.",
    responsibilities: [
      "Recruit, vet and onboard licensed vendors and subcontractors across trades — plumbing, electrical, HVAC, pool, pest control, mold remediation, pressure washing, landscaping, handyman",
      "Verify every vendor's state license against the issuing authority (DBPR, FDACS or the relevant board) before any work is assigned, and re-verify at renewal",
      "Collect and track certificates of insurance, workers' compensation coverage or a valid exemption, and W-9s; chase expirations before they lapse",
      "Review submitted rate cards, compare pricing across vendors, and maintain the approved price list",
      "Dispatch vendor work orders from field findings, track them to completion, and confirm the customer is satisfied",
      "Reconcile vendor invoices against quoted rates and approve for payment",
      "Maintain the vendor scorecard: responsiveness, quality, callbacks, pricing accuracy",
    ],
    requirements: [
      "18 or older",
      "Legally authorized to work in the United States (Form I-9 completed on your first day)",
      "Able to pass a criminal background check",
      "Two or more years in vendor management, procurement, construction administration, property management or a trades office",
      "Detail discipline — an expired certificate of insurance that slips through is a real liability, and you are the control",
      "Comfortable negotiating price with contractors",
    ],
    preferred: [
      "Familiarity with Florida contractor licensing (DBPR) and pest control licensing (FDACS)",
      "Experience verifying certificates of insurance and workers' compensation exemptions",
      "Property management or general contractor office background",
    ],
    physical: [
      "Primarily seated office work at a computer and phone",
      "Occasional site visits to meet vendors",
    ],
    benefits: [
      "Paid time off for full-time employees",
      "Eligible for the employee referral bonus",
      "Eligible for periodic attendance recognition",
      "Office-based schedule — no personal vehicle use required for this role",
    ],
  },
];

// Company-wide benefits and bonus program. Rendered in full on
// careers.html under #benefits; each job's own `benefits` array above is
// the short, role-specific version shown on careers-job.html.
//
// Categories and eligibility only — no dollar amounts, accrual rates, or
// exact timelines. HR delivers those directly to each new hire once they
// join; this page's job is to describe what exists, not to quote it.
window.GPC_BENEFITS = {
  intro:
    "This is an overview of what's available, by category — not a quote of exact amounts or timing. HR walks every new hire through the specific numbers, accrual rates and eligibility for their role during onboarding.",
  milestones: [
    {
      when: "Day one",
      items: [
        "Uniform, PPE and cleaning equipment provided at no cost to you",
        "Direct deposit payroll",
        "Mileage reimbursement for roles that use your own vehicle",
        "Eligible to refer a friend for the employee referral bonus",
      ],
    },
    {
      when: "After your introductory period",
      items: [
        "Paid time off begins accruing for full-time employees",
        "Eligible for a retention bonus",
        "Eligible for company-issued equipment where the role requires it",
      ],
    },
    {
      when: "As you build tenure",
      items: [
        "PTO accrual increases at set milestones for full-time employees",
        "Eligible for performance and annual bonuses",
        "Priority consideration for internal promotion",
      ],
    },
    {
      when: "Long-term",
      items: [
        "Continued PTO growth for full-time employees",
        "Eligible for long-service recognition",
        "Priority for equipment and vehicle upgrades",
      ],
    },
  ],
  bonuses: [
    { name: "Employee referral bonus", detail: "Refer someone who is hired and stays on, and you become eligible for a bonus." },
    { name: "Retention bonus", detail: "For completing your introductory period with a clean attendance record." },
    { name: "Attendance recognition", detail: "Periodic recognition for a clean attendance record." },
    { name: "Quality bonus", detail: "Crew Leads and Field Supervisors are eligible, tied to inspection scores and customer satisfaction on their accounts." },
    { name: "Peak-season bonus", detail: "Vacation Rental Turnover Specialists are eligible during peak booking windows." },
    { name: "Safety bonus", detail: "Floor Care & Deep Clean Technicians are eligible, tied to an incident-free equipment-operation record." },
    { name: "Annual performance bonus", detail: "Full-time employees with a year or more of service are eligible for a discretionary year-end bonus." },
  ],
  disclaimer:
    "This is an overview of the categories of benefits and bonuses Gulf ProClean offers — not a complete statement of amounts, accrual rates, or eligibility rules. Those specifics are provided by HR directly to each employee, based on role and tenure, once hired. Benefits and bonuses are discretionary, may be changed or discontinued by Gulf ProClean at any time, and do not alter the at-will nature of employment.",
};
