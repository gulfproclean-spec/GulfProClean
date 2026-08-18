import { neon } from '@neondatabase/serverless';
import { verifyPassword, newSessionToken, sessionCookie, sessionExpiry, isValidEmail } from '../../_lib/auth.js';

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

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`select id, password_hash, password_salt from customers where email = ${email}`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'no account with that email' }), { status: 401 });
  }
  const customer = rows[0];
  const ok = await verifyPassword(password, customer.password_hash, customer.password_salt);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'incorrect password' }), { status: 401 });
  }

  // This is only an estimate for the pre-payment preview — the authoritative
  // check (functions/api/bookings.js) also matches on the service address.
  const bookingRows = address
    ? await sql`select 1 from bookings where customer_id = ${customer.id} or lower(address) = lower(${address}) limit 1`
    : await sql`select 1 from bookings where customer_id = ${customer.id} limit 1`;
  const isFirstTime = bookingRows.length === 0;

  const token = newSessionToken();
  await sql`insert into sessions (token, customer_id, expires_at) values (${token}, ${customer.id}, ${sessionExpiry()})`;

  return new Response(JSON.stringify({ email, isFirstTime }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) },
  });
}
