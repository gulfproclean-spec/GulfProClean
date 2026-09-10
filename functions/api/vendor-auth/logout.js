import { neon } from '@neondatabase/serverless';
import { getSessionToken, hashToken, clearSessionCookie } from '../../_lib/auth.js';

export async function onRequestPost({ env, request }) {
  const token = getSessionToken(request, 'vendor_session');
  if (token) {
    const sql = neon(env.DATABASE_URL);
    const tokenHash = await hashToken(token);
    await sql`delete from vendor_sessions where token_hash = ${tokenHash}`;
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie('vendor_session') },
  });
}
