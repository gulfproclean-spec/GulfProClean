import { neon } from '@neondatabase/serverless';
import { verifyPassword, newSessionToken, sessionCookie, sessionExpiry, isValidEmail } from '../../_lib/auth.js';
import { checkRateLimit, clientIp } from '../../_lib/rate-limit.js';

export async function onRequestPost({ env, request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!isValidEmail(email) || !password) {
    return new Response(JSON.stringify({ error: 'enter your email and password' }), { status: 400 });
  }
  if (!env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: 'Server is not configured (missing DATABASE_URL). Please contact us to submit your pricing.' }), { status: 500 });
  }

  try {
    const sql = neon(env.DATABASE_URL);

    // Basic brute-force guard: at most 10 login attempts per IP per
    // 10-minute window. See functions/_lib/rate-limit.js.
    const allowed = await checkRateLimit(sql, `login:vendor:${clientIp(request)}`, 600, 10);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again in a few minutes.' }), { status: 429 });
    }

    const rows = await sql`select id, password_hash, password_salt from vendor_accounts where email = ${email}`;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'no vendor account with that email' }), { status: 401 });
    }
    const vendor = rows[0];
    const ok = await verifyPassword(password, vendor.password_hash, vendor.password_salt);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'incorrect password' }), { status: 401 });
    }

    const token = newSessionToken();
    await sql`insert into vendor_sessions (token, vendor_account_id, expires_at) values (${token}, ${vendor.id}, ${sessionExpiry()})`;

    return new Response(JSON.stringify({ email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token, 'vendor_session') },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Something went wrong logging you in.' }), { status: 500 });
  }
}
