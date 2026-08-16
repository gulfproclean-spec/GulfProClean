import { neon } from '@neondatabase/serverless';
import { getSessionToken, clearSessionCookie } from '../../_lib/auth.js';

export async function onRequestPost({ env, request }) {
  const token = getSessionToken(request);
  if (token) {
    const sql = neon(env.DATABASE_URL);
    await sql`delete from sessions where token = ${token}`;
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() },
  });
}
