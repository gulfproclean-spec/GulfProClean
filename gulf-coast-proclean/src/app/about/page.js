import CorridorMap from "@/components/CorridorMap";

export const metadata = { title: "About | Gulf Coast ProClean" };

const PILLARS = [
  {
    title: "Financial discipline",
    body: "Job-cost tracking from day one — labor hours, supplies, and drive time on every job — so pricing stays accurate and routes stay profitable.",
  },
  {
    title: "HR-driven workforce",
    body: "Structured hiring, ISSA-standard onboarding, and competitive pay in an industry with 30–50% annual turnover, so quality stays consistent.",
  },
  {
    title: "Real-estate referral network",
    body: "Direct relationships with realtors, property managers, and mortgage brokers — a built-in pipeline for move-in/out and turnover cleaning.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-shallow">About</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">
          A cleaning company run like a business, not just a crew
        </h1>
        <p className="mt-5 max-w-2xl text-inkSoft">
          Gulf Coast ProClean LLC is a Florida-based residential and
          commercial cleaning company headquartered in Fort Walton Beach,
          serving the Panhandle corridor from Pensacola to Panama City
          Beach. The company is founded by two professionals whose combined
          30+ years span accounting, human resources, MBA-level financial
          management, and real estate — a rare mix in an industry where
          fewer than 6% of the market is controlled by any single operator.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-mist bg-sandCard p-6">
              <p className="font-display text-lg font-bold text-ink">{p.title}</p>
              <p className="mt-2 text-sm text-inkSoft">{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-mono text-xs uppercase tracking-widest text-shallow">Founders</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink">Complementary expertise, equal ownership</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <FounderCard
              role="Co-Founder — Accounting & Human Resources"
              body="13+ years in HR: payroll, onboarding, labor-law compliance, benefits administration, and financial record-keeping. Leads hiring, training, quality assurance, and bookkeeping."
            />
            <FounderCard
              role="Co-Founder — MBA, Finance & Real Estate"
              body="MBA with 15+ years in cost management, financial analysis, and real estate/mortgages. Leads business development, commercial contracts, and the realtor/property-manager referral network."
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-widest text-shallow">Where we operate</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink">Pensacola to Panama City Beach</h2>
        <p className="mt-3 max-w-2xl text-inkSoft">
          We launched with route density in the Fort Walton Beach–Destin
          core, then phase in Pensacola, Navarre, and Panama City Beach as
          our crew grows — a 130-mile corridor serving 750,000+ residents
          plus 7.5–8 million annual visitors to the Destin area alone.
        </p>
        <CorridorMap variant="hero" className="mt-8 h-44 w-full" />
      </div>
    </div>
  );
}

function FounderCard({ role, body }) {
  return (
    <div className="rounded-2xl border border-mist bg-sandCard p-6">
      <p className="font-display font-bold text-ink">{role}</p>
      <p className="mt-3 text-sm text-inkSoft">{body}</p>
    </div>
  );
}
