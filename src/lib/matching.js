import { prisma } from "@/lib/db";

// Matches an incoming booking to the best available cleaner, the same way a
// rideshare app matches a rider to a driver:
//   1. Only consider cleaners who are currently marked "available".
//   2. Prefer cleaners whose service zips include the customer's zip.
//   3. Among candidates, prefer whoever currently has the lightest job load,
//      then the highest customer rating.
//   4. If nobody covers that exact zip yet (realistic for a brand-new, two
//      person crew still building route density), fall back to the least
//      busy available cleaner anywhere on the roster rather than failing —
//      mirroring how a rideshare app widens its search radius.
export async function matchCleanerToBooking(zip) {
  const candidates = await prisma.cleaner.findMany({
    where: { available: true },
    include: {
      user: true,
      jobs: {
        where: { status: { in: ["MATCHED", "IN_PROGRESS"] } },
      },
    },
  });

  if (candidates.length === 0) return null;

  const inZip = candidates.filter((c) =>
    c.zipsServed.split(",").map((z) => z.trim()).includes(zip)
  );

  const pool = inZip.length > 0 ? inZip : candidates;

  pool.sort((a, b) => {
    if (a.jobs.length !== b.jobs.length) return a.jobs.length - b.jobs.length;
    return b.rating - a.rating;
  });

  return pool[0];
}

// A friendly, randomized-but-bounded ETA window, purely for the UI —
// mirrors the "arriving in X minutes" pattern from rideshare apps.
export function estimateEtaMinutes() {
  return 20 + Math.floor(Math.random() * 25); // 20–45 minutes
}
