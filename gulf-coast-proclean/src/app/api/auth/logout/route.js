import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
