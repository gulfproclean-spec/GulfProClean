import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPortalPage() {
  const session = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const [bookings, cleaners, leads] = await Promise.all([
    prisma.booking.findMany({
      include: { customer: true, cleaner: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cleaner.findMany({
      include: { user: true, jobs: { where: { status: { in: ["MATCHED", "IN_PROGRESS"] } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const activeSubscribers = bookings.filter(
    (b) => ["ESSENTIAL", "PROFESSIONAL", "PREMIUM"].includes(b.serviceType) && b.status !== "CANCELLED"
  ).length;

  const pipelineValue = bookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.estimatedPrice, 0);

  const stats = {
    totalBookings: bookings.length,
    activeSubscribers,
    pipelineValue,
    availableCleaners: cleaners.filter((c) => c.available).length,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-shallow">Admin portal</p>
      <div className="mt-2">
        <AdminDashboard initial={{ stats, bookings, cleaners, leads }} />
      </div>
    </div>
  );
}
