import { neon } from '@neondatabase/serverless';
import { hashPassword, newSessionToken, sessionCookie, sessionExpiry, isValidEmail } from '../../_lib/auth.js';

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
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'enter a valid email address' }), { status: 400 });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ error: 'password must be at least 8 characters' }), { status: 400 });
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
    const existing = await sql`select id from customers where email = ${email}`;
    if (existing.length > 0) {
      return new Response(JSON.stringify({ error: 'an account with that email already exists' }), { status: 409 });
    }

    const { hash, salt } = await hashPassword(password);
    const rows = await sql`
      insert into customers (email, password_hash, password_salt)
      values (${email}, ${hash}, ${salt})
      returning id
    `;
    const customerId = rows[0].id;

    const token = newSessionToken();
    await sql`insert into sessions (token, customer_id, expires_at) values (${token}, ${customerId}, ${sessionExpiry()})`;

    // A brand-new account is otherwise always "first-time," but this is only
    // an estimate — the authoritative check (functions/api/bookings.js) also
    // matches on the service address, so mirror that here for an accurate
    // pre-payment preview.
    let isFirstTime = true;
    if (address) {
      const priorAtAddress = await sql`select 1 from bookings where lower(address) = lower(${address}) limit 1`;
      isFirstTime = priorAtAddress.length === 0;
    }

    return new Response(JSON.stringify({ email, isFirstTime }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Something went wrong creating your account.' }), { status: 500 });
  }
}
