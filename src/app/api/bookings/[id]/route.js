import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";

export async function GET(request, { params }) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { cleaner: { include: { user: true } }, customer: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ booking });
}

const ALLOWED_STATUSES = ["PENDING", "MATCHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export async function PATCH(request, { params }) {
  const session = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session || (session.role !== "CLEANER" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.booking.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  if (session.role === "CLEANER" && existing.cleanerId !== session.cleanerId) {
    return NextResponse.json({ error: "This job isn't assigned to you" }, { status: 403 });
  }

  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: { status: body.status },
    include: { cleaner: { include: { user: true } } },
  });

  return NextResponse.json({ booking });
}
