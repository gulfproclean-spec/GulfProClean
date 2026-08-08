import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, encodeSession } from "@/lib/session";

export async function POST(request) {
  const { email, password, role } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password || user.role !== role) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  let cleanerId = null;
  if (role === "CLEANER") {
    const cleaner = await prisma.cleaner.findUnique({ where: { userId: user.id } });
    if (!cleaner) {
      return NextResponse.json({ error: "No cleaner profile found for this account." }, { status: 404 });
    }
    cleanerId = cleaner.id;
  }

  const value = encodeSession({ userId: user.id, role: user.role, cleanerId });
  cookies().set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ ok: true, role: user.role });
}
