import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { matchCleanerToBooking, estimateEtaMinutes } from "@/lib/matching";
import { estimatePrice } from "@/lib/services";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ bookings: [] });

  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    include: { cleaner: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings });
}

export async function POST(request) {
  const body = await request.json();
  const { name, email, phone, serviceType, frequency, address, city, zip, requestedDate, timeWindow, notes } = body;

  if (!name || !email || !serviceType || !address || !city || !zip || !requestedDate) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { name, email, phone, role: "CUSTOMER" } });
  } else if (phone && !user.phone) {
    user = await prisma.user.update({ where: { id: user.id }, data: { phone } });
  }

  const booking = await prisma.booking.create({
    data: {
      customerId: user.id,
      serviceType,
      frequency: frequency || "One-time",
      address,
      city,
      zip,
      requestedDate: new Date(requestedDate),
      timeWindow: timeWindow || "Flexible / Anytime",
      notes,
      estimatedPrice: estimatePrice(serviceType),
      status: "PENDING",
    },
  });

  // Run the matching engine — same pattern as a rideshare dispatch: find the
  // best available provider right now, or gracefully fall back if none.
  const cleaner = await matchCleanerToBooking(zip);

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: cleaner
      ? { status: "MATCHED", cleanerId: cleaner.id, matchedAt: new Date() }
      : { status: "PENDING" },
    include: { cleaner: { include: { user: true } } },
  });

  return NextResponse.json(
    { booking: updated, eta: cleaner ? estimateEtaMinutes() : null },
    { status: 201 }
  );
}
