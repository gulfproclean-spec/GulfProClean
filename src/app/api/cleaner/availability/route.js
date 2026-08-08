import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";

export async function PATCH(request) {
  const session = decodeSession(cookies().get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "CLEANER" || !session.cleanerId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { available } = await request.json();

  const cleaner = await prisma.cleaner.update({
    where: { id: session.cleanerId },
    data: { available: !!available },
  });

  return NextResponse.json({ cleaner });
}
