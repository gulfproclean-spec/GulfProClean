import Link from "next/link";

export default function PricingCard({ tier }) {
  return (
    <div
      className={
        "flex flex-col rounded-2xl border p-7 " +
        (tier.highlight
          ? "border-coral bg-tide text-white shadow-xl shadow-tide/20 md:-translate-y-3"
          : "border-mist bg-sandCard text-ink")
      }
    >
      {tier.highlight && (
        <span className="mb-4 inline-block w-fit rounded-full bg-coral px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-white">
          Most popular
        </span>
      )}
      <p className="font-display text-xl font-bold">{tier.name}</p>
      <p className={"mt-1 text-sm " + (tier.highlight ? "text-mist" : "text-inkSoft")}>{tier.description}</p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold">${tier.price}</span>
        <span className={tier.highlight ? "text-mist" : "text-inkSoft"}>/month</span>
      </div>
      <p className={"mt-1 font-mono text-xs " + (tier.highlight ? "text-shallowLight" : "text-shallow")}>
        {tier.frequency} · ${tier.annualValue}/yr value
      </p>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className={tier.highlight ? "text-shallowLight" : "text-shallow"}>●</span>
            <span className={tier.highlight ? "text-white/90" : "text-inkSoft"}>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={{ pathname: "/book", query: { service: tier.id } }}
        className={
          "mt-7 rounded-full px-5 py-3 text-center font-display text-sm font-semibold transition " +
          (tier.highlight
            ? "bg-coral text-white hover:bg-coralDark"
            : "bg-tide text-white hover:bg-tideLight")
        }
      >
        Subscribe &amp; get matched
      </Link>
    </div>
  );
}
