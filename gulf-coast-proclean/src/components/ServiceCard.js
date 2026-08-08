import Link from "next/link";

export default function ServiceCard({ service }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-mist bg-sandCard p-6 transition hover:border-shallow hover:shadow-lg hover:shadow-shallow/5">
      <div>
        <p className="font-display text-lg font-bold text-ink">{service.name}</p>
        <p className="mt-1 text-sm text-inkSoft">{service.target}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-mono text-base font-semibold text-shallow">{service.priceLabel}</span>
        </div>
        <p className="mt-1 text-xs uppercase tracking-wide text-inkSoft/70">{service.frequency}</p>
      </div>
      <Link
        href={{ pathname: "/book", query: { service: service.id } }}
        className="mt-5 inline-block rounded-full border border-tide px-4 py-2 text-center font-mono text-xs uppercase tracking-wide text-tide transition hover:bg-tide hover:text-white"
      >
        Request this service
      </Link>
    </div>
  );
}
