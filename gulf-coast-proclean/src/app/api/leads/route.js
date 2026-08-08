import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request) {
  const body = await request.json();
  const { name, email, phone, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: { name, email, phone, message },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
