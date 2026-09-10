import { neon } from '@neondatabase/serverless';
import { verifyPassword, newSessionToken, hashToken, sessionCookie, sessionExpiry, isValidEmail } from '../../_lib/auth.js';
import { isFirstTimeCustomer } from '../../_lib/first-time.js';
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
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (!isValidEmail(email) || !password) {
    return new Response(JSON.stringify({ error: 'enter your email and password' }), { status: 400 });
  }
  if (!env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: 'Server is not configured (missing DATABASE_URL). Please contact us to complete your booking.' }), { status: 500 });
  }

  // Everything past this point can fail (bad connection string, DB
  // unreachable, etc.) — without this, an uncaught error here returns an
  // empty response body, which shows up client-side as a cryptic
  // "Unexpected end of JSON input" instead of a readable error.
  try {
    const sql = neon(env.DATABASE_URL);

    // Basic brute-force guard: at most 10 login attempts per IP per
    // 10-minute window. See functions/_lib/rate-limit.js for why this is
    // database-backed rather than KV-backed.
    const allowed = await checkRateLimit(sql, `login:customer:${clientIp(request)}`, 600, 10);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again in a few minutes.' }), { status: 429 });
    }

    const rows = await sql`select id, password_hash, password_salt from customers where email = ${email}`;
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'no account with that email' }), { status: 401 });
    }
    const customer = rows[0];
    const ok = await verifyPassword(password, customer.password_hash, customer.password_salt);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'incorrect password' }), { status: 401 });
    }

    // Same helper the authoritative check in functions/api/bookings.js uses,
    // so the price previewed before payment and the price actually charged
    // cannot disagree.
    const isFirstTime = await isFirstTimeCustomer(sql, customer.id, address);

    // The raw token goes to the browser as the session cookie; only its
    // SHA-256 hash is ever written to the database (see hashToken in
    // functions/_lib/auth.js).
    const token = newSessionToken();
    const tokenHash = await hashToken(token);
    await sql`insert into sessions (token_hash, customer_id, expires_at) values (${tokenHash}, ${customer.id}, ${sessionExpiry()})`;

    return new Response(JSON.stringify({ email, isFirstTime }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Something went wrong logging you in.' }), { status: 500 });
  }
}
