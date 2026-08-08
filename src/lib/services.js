// Single source of truth for pricing/service data, pulled directly from the
// Gulf Coast ProClean business plan (Sections 6 & 7).

export const SUBSCRIPTION_TIERS = [
  {
    id: "ESSENTIAL",
    name: "Essential",
    price: 99,
    frequency: "Biweekly",
    annualValue: 1188,
    description: "Small homes, condos & apartments",
    features: [
      "Biweekly recurring visit",
      "Standard 8-point room checklist",
      "Online scheduling & billing",
      "Satisfaction guarantee",
    ],
  },
  {
    id: "PROFESSIONAL",
    name: "Professional",
    price: 179,
    frequency: "Biweekly",
    annualValue: 2148,
    description: "3BR/2BA homes & families",
    features: [
      "Biweekly recurring visit",
      "Full-home deep-clean rotation",
      "Priority scheduling",
      "Free re-clean within 24 hrs",
      "$50 referral credit",
    ],
    highlight: true,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 299,
    frequency: "Weekly",
    annualValue: 3588,
    description: "Large homes & premium households",
    features: [
      "Weekly recurring visit",
      "Full-home deep-clean rotation",
      "Dedicated crew lead",
      "Quarterly quality check-in",
      "10th clean free",
    ],
  },
];

export const SERVICES = [
  {
    id: "DEEP_CLEAN",
    name: "One-Time Deep Clean",
    target: "Homeowners, move-in/out",
    priceLabel: "$250–$350+ per visit",
    frequency: "As needed",
    basePrice: 300,
  },
  {
    id: "MOVE_IN_OUT",
    name: "Move-In / Move-Out",
    target: "Realtors, property managers",
    priceLabel: "$350–$400 per job",
    frequency: "As needed",
    basePrice: 375,
  },
  {
    id: "COMMERCIAL",
    name: "Commercial Office Cleaning",
    target: "Small to medium offices",
    priceLabel: "$450–$1,200/month",
    frequency: "Daily, 3x/week, or weekly",
    basePrice: 650,
  },
  {
    id: "MEDICAL",
    name: "Medical Office Cleaning",
    target: "Dental, medical, healthcare",
    priceLabel: "$1,800+/month",
    frequency: "Daily",
    basePrice: 1800,
  },
  {
    id: "VACATION_RENTAL",
    name: "Vacation Rental Turnover",
    target: "STR owners, property managers",
    priceLabel: "$125–$135 per turnover",
    frequency: "Daily in season",
    basePrice: 130,
  },
  {
    id: "POST_CONSTRUCTION",
    name: "Post-Construction Cleaning",
    target: "Contractors, developers",
    priceLabel: "$0.30–$0.75 per sq ft",
    frequency: "One-time",
    basePrice: 400,
  },
  {
    id: "PRESSURE_WASHING",
    name: "Pressure Washing",
    target: "Homeowners, businesses",
    priceLabel: "$200–$500 per job",
    frequency: "Seasonal",
    basePrice: 350,
  },
];

// Ordered roughly west → east along the Pensacola–Panama City Beach corridor.
export const SERVICE_AREA = [
  { city: "Pensacola", zips: ["32501", "32502", "32503", "32504"], phase: 2 },
  { city: "Navarre", zips: ["32566"], phase: 2 },
  { city: "Fort Walton Beach", zips: ["32547", "32548"], phase: 1 },
  { city: "Destin", zips: ["32541"], phase: 1 },
  { city: "Niceville", zips: ["32578"], phase: 1 },
  { city: "Crestview", zips: ["32536"], phase: 1 },
  { city: "Panama City Beach", zips: ["32407", "32408", "32413"], phase: 3 },
];

export const COMPANY_STATS = [
  { label: "Residents in service corridor", value: "750K+" },
  { label: "Annual visitors to Destin area", value: "7.5–8M" },
  { label: "Length of service corridor", value: "130 mi" },
  { label: "Combined founder experience", value: "30+ yrs" },
];

export const TIME_WINDOWS = [
  "8:00 AM – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 2:00 PM",
  "2:00 PM – 4:00 PM",
  "Flexible / Anytime",
];

export function findServiceMeta(serviceType) {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === serviceType);
  if (tier) {
    return { name: tier.name + " Subscription", price: tier.price, priceSuffix: "/mo" };
  }
  const svc = SERVICES.find((s) => s.id === serviceType);
  if (svc) {
    return { name: svc.name, price: svc.basePrice, priceSuffix: " est." };
  }
  return { name: serviceType, price: 0, priceSuffix: "" };
}

export function estimatePrice(serviceType) {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === serviceType);
  if (tier) return tier.price;
  const svc = SERVICES.find((s) => s.id === serviceType);
  if (svc) return svc.basePrice;
  return 0;
}
