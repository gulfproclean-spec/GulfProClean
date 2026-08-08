import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";

export async function POST(request) {
  const session = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { name, email, password, zipsServed } = await request.json();
  if (!name || !email || !password || !zipsServed) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "CLEANER" },
  });

  const cleaner = await prisma.cleaner.create({
    data: {
      userId: user.id,
      zipsServed: zipsServed.replace(/\s/g, ""),
      available: true,
    },
    include: { user: true, jobs: true },
  });

  return NextResponse.json({ cleaner }, { status: 201 });
}
