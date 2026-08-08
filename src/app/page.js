import Link from "next/link";
import CorridorMap from "@/components/CorridorMap";
import StatBadge from "@/components/StatBadge";
import ServiceCard from "@/components/ServiceCard";
import PricingCard from "@/components/PricingCard";
import { COMPANY_STATS, SERVICES, SUBSCRIPTION_TIERS, SERVICE_AREA } from "@/lib/services";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-shallow">
              Pensacola → Fort Walton Beach → Destin → Panama City Beach
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
              The Gulf Coast, <span className="text-shallow">cleaned right</span> —
              and matched to your door.
            </h1>
            <p className="mt-5 max-w-lg text-base text-inkSoft sm:text-lg">
              Tell us what you need and where. We match you with an
              available, background-checked ProClean pro along the
              Panhandle corridor — the same way a rideshare app finds your
              next ride.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/book"
                className="rounded-full bg-coral px-7 py-3.5 font-display text-sm font-semibold text-white transition hover:bg-coralDark"
              >
                Request a cleaning →
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-mist px-7 py-3.5 font-display text-sm font-semibold text-ink transition hover:border-shallow"
              >
                See subscription plans
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-mist bg-sandCard p-5">
            <CorridorMap variant="hero" className="h-40 w-full sm:h-44" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {COMPANY_STATS.map((s) => (
            <StatBadge key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-mist bg-tide">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 text-center font-mono text-xs uppercase tracking-wide text-shallowLight">
          <span>Licensed & Insured LLC</span>
          <span>Background-checked crew</span>
          <span>24-hr re-clean guarantee</span>
          <span>Serving military, STR & retiree households</span>
        </div>
      </section>

      {/* How matching works */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-shallow">How it works</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink">Booked and matched in three steps</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Request your service",
              body: "Choose a subscription or a one-time clean, tell us your address and preferred time — takes under a minute.",
            },
            {
              n: "02",
              title: "We match you instantly",
              body: "Our system finds the nearest available, background-checked cleaner on our roster and confirms your window in real time.",
            },
            {
              n: "03",
              title: "Enjoy a sparkling space",
              body: "Your pro arrives, works an ISSA-standard checklist, and you rate the visit — every job backed by a satisfaction guarantee.",
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-mist bg-sandCard p-6">
              <p className="font-mono text-sm text-coral">{s.n}</p>
              <p className="mt-3 font-display text-lg font-bold text-ink">{s.title}</p>
              <p className="mt-2 text-sm text-inkSoft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-white/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-shallow">Services</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-ink">One roster, every job on the coast</h2>
            </div>
            <Link href="/services" className="font-mono text-xs uppercase tracking-wide text-tide hover:text-shallow">
              View all services →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.slice(0, 4).map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        </div>
      </section>

      {/* Subscriptions */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-shallow">Subscriptions</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-ink">
          Recurring care costs less per visit, and never needs re-booking
        </h2>
        <p className="mt-3 max-w-2xl text-inkSoft">
          A one-time customer paying $120/visit spends about $720/year across
          six visits. The same household on our $99/month plan gets biweekly
          service worth $1,188/year — with nothing to schedule twice.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {SUBSCRIPTION_TIERS.map((t) => (
            <PricingCard key={t.id} tier={t} />
          ))}
        </div>
      </section>

      {/* Service area */}
      <section className="bg-tide py-20 text-sand">
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-mono text-xs uppercase tracking-widest text-shallowLight">Service area</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Rolling out along the Panhandle, one corridor at a time</h2>
          <p className="mt-3 max-w-2xl text-mist">
            We launched in the Fort Walton Beach–Destin core to build real
            route density before expanding — the same discipline a good
            dispatcher uses to keep every crew efficient.
          </p>
          <CorridorMap variant="hero" className="mt-10 h-44 w-full" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SERVICE_AREA.map((c) => (
              <div key={c.city} className="rounded-xl border border-white/10 p-4">
                <p className="font-display font-bold">{c.city}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-shallowLight">
                  {c.phase === 1 ? "Live now" : `Phase ${c.phase}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders credibility */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="rounded-2xl border border-mist bg-sandCard p-8 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-widest text-shallow">Built differently</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
            Run by finance, HR, and real-estate professionals — not just cleaners
          </h2>
          <p className="mt-4 max-w-3xl text-inkSoft">
            Our two founders bring 30+ years of combined experience in
            accounting, human resources, MBA-level financial management, and
            real estate — the disciplines that keep a cleaning business
            profitable, well-staffed, and well-referred, in an industry where
            most operators excel at cleaning but not at running a business.
          </p>
          <Link href="/about" className="mt-6 inline-block font-mono text-xs uppercase tracking-wide text-tide hover:text-shallow">
            Meet the founders →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-2xl bg-coral px-8 py-14 text-center text-white">
          <h2 className="font-display text-3xl font-bold">Ready for a spotless space?</h2>
          <p className="mt-3 text-white/90">Get matched with your ProClean pro in minutes.</p>
          <Link
            href="/book"
            className="mt-7 inline-block rounded-full bg-white px-7 py-3.5 font-display text-sm font-semibold text-coral transition hover:bg-sand"
          >
            Request a cleaning →
          </Link>
        </div>
      </section>
    </div>
  );
}
