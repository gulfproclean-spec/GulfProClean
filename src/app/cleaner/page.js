import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";
import CleanerDashboard from "@/components/CleanerDashboard";

export const dynamic = "force-dynamic";

export default async function CleanerPortalPage() {
  const session = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "CLEANER") {
    redirect("/cleaner/login");
  }

  const cleaner = await prisma.cleaner.findUnique({
    where: { id: session.cleanerId },
    include: { user: true },
  });

  if (!cleaner) redirect("/cleaner/login");

  const jobs = await prisma.booking.findMany({
    where: { cleanerId: cleaner.id, status: { in: ["MATCHED", "IN_PROGRESS"] } },
    orderBy: { requestedDate: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-shallow">Cleaner portal</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Welcome back, {cleaner.user.name.split(" ")[0]}</h1>
      <div className="mt-8">
        <CleanerDashboard cleaner={cleaner} jobs={jobs} />
      </div>
    </div>
  );
}
