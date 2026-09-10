import { neon } from '@neondatabase/serverless';
import { verifyPassword, newSessionToken, hashToken, sessionCookie, sessionExpiry, isValidEmail } from '../../_lib/auth.js';
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
    return new Response(JSON.stringify({ error: 'Server is not configured (missing DATABASE_URL). Please contact us to apply.' }), { status: 500 });
  }

  try {
    const sql = neon(env.DATABASE_URL);

    // Basic brute-force guard: at most 10 login attempts per IP per
    // 10-minute window. See functions/_lib/rate-limit.js.
    const allowed = await checkRateLimit(sql, `login:applicant:${clientIp(request)}`, 600, 10);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again in a few minutes.' }), { status: 429 });
    }

    const rows = await sql`select id, password_hash, password_salt from applicant_accounts where email = ${email}`;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'no applicant account with that email' }), { status: 401 });
    }
    const applicant = rows[0];
    const ok = await verifyPassword(password, applicant.password_hash, applicant.password_salt);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'incorrect password' }), { status: 401 });
    }

    // The raw token goes to the browser as the session cookie; only its
    // SHA-256 hash is ever written to the database (see hashToken in
    // functions/_lib/auth.js).
    const token = newSessionToken();
    const tokenHash = await hashToken(token);
    await sql`insert into applicant_sessions (token_hash, applicant_account_id, expires_at) values (${tokenHash}, ${applicant.id}, ${sessionExpiry()})`;

    return new Response(JSON.stringify({ email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token, 'applicant_session') },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Something went wrong logging you in.' }), { status: 500 });
  }
}
