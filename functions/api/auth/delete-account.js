import { neon } from '@neondatabase/serverless';
import { verifyPassword, clearSessionCookie, isValidEmail } from '../../_lib/auth.js';

// POST /api/auth/delete-account { email, password }
// Required by the App Store (guideline 5.1.1(v)) and Google Play for any app
// that lets people create an account. Deleting removes the login and every
// personal detail on the customer row; paid bookings are kept for
// accounting but detached from the person (customer_id -> null, contact
// fields blanked), so nothing about them can be looked up afterward.
// Re-authentication with email + password is deliberate — a stale session
// on a shared device must not be enough to delete someone's account.
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
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`select id, password_hash, password_salt from customers where lower(email) = ${email}`;
  if (!rows.length) return new Response(JSON.stringify({ error: 'no account with that email' }), { status: 404 });
  const ok = await verifyPassword(password, rows[0].password_hash, rows[0].password_salt);
  if (!ok) return new Response(JSON.stringify({ error: 'incorrect password' }), { status: 401 });
  const id = rows[0].id;

  // Detach paid bookings from the person before the customer row goes
  // (bookings.customer_id cascades on delete — we want the paid records to
  // survive, anonymized, not vanish). Unpaid bookings are just abandoned
  // checkouts and can go with the cascade.
  await sql`
    update bookings
       set customer_id = null,
           first_name = 'Deleted', last_name = 'Customer', phone = '',
           notes = null, billing_name = null, billing_address = null
     where customer_id = ${id} and payment_status = 'paid'
  `;
  await sql`delete from customers where id = ${id}`;

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() },
  });
}
