import ServiceCard from "@/components/ServiceCard";
import { SERVICES } from "@/lib/services";

export const metadata = { title: "Services | Gulf Coast ProClean" };

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-shallow">Services</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink">Every job, one dependable roster</h1>
      <p className="mt-4 max-w-2xl text-inkSoft">
        From weekly homes to medical suites, we price at the mid-market
        level — above discount operators, below premium franchises —
        reflecting insured, background-checked staff and modern booking
        technology. Looking for recurring residential care instead? See our{" "}
        <a href="/pricing" className="text-shallow underline">
          subscription plans
        </a>
        .
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>
    </div>
  );
}
