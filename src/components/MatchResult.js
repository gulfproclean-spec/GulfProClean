"use client";

import Link from "next/link";
import { findServiceMeta } from "@/lib/services";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function MatchResult({ booking, eta }) {
  const meta = findServiceMeta(booking.serviceType);
  const cleaner = booking.cleaner;

  return (
    <div className="animate-fadeUp rounded-2xl border border-mist bg-sandCard p-7">
      {cleaner ? (
        <>
          <p className="font-mono text-xs uppercase tracking-wide text-shallow">You're matched!</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tide font-display text-lg font-bold text-shallowLight">
              {initials(cleaner.user.name)}
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink">{cleaner.user.name}</p>
              <p className="text-sm text-inkSoft">
                ★ {cleaner.rating.toFixed(1)} · {cleaner.yearsExperience} yrs experience · {cleaner.vehicle}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-sand p-4 sm:grid-cols-4">
            <InfoBlock label="Arriving" value={`~${eta} min window`} />
            <InfoBlock label="Service" value={meta.name} />
            <InfoBlock label="Est. price" value={`$${booking.estimatedPrice}${meta.priceSuffix}`} />
            <InfoBlock label="Date" value={new Date(booking.requestedDate).toLocaleDateString()} />
          </div>

          <p className="mt-5 text-sm text-inkSoft">
            {cleaner.user.name.split(" ")[0]} will arrive at {booking.address}, {booking.city} during your{" "}
            <span className="font-medium text-ink">{booking.timeWindow}</span> window. You'll get a
            confirmation text/email before the visit.
          </p>
        </>
      ) : (
        <>
          <p className="font-mono text-xs uppercase tracking-wide text-coral">You're on the list</p>
          <p className="mt-4 font-display text-lg font-bold text-ink">
            Our crew is fully booked in your area right now
          </p>
          <p className="mt-2 text-sm text-inkSoft">
            Gulf Coast ProClean is a growing two-person crew — we'd rather
            promise you a great clean than overbook. We've saved your request
            and will reach out within 24 hours to confirm a time, or add you
            to our waitlist as we bring on more crew in your area.
          </p>
          <div className="mt-5 rounded-xl bg-sand p-4">
            <InfoBlock label="Service" value={meta.name} />
          </div>
        </>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-full bg-tide px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-tideLight"
        >
          View my bookings
        </Link>
        <Link
          href="/book"
          className="rounded-full border border-mist px-5 py-2.5 font-display text-sm font-semibold text-ink hover:border-shallow"
        >
          Book another service
        </Link>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-inkSoft/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
