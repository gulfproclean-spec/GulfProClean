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
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'enter a valid email address' }), { status: 400 });
  }
  if (password.length < 8) {
    return new Response(JSON.stringify({ error: 'password must be at least 8 characters' }), { status: 400 });
  }
  if (!env.DATABASE_URL) {
    return new Response(JSON.stringify({ error: 'Server is not configured (missing DATABASE_URL). Please contact us to submit your pricing.' }), { status: 500 });
  }

  try {
    const sql = neon(env.DATABASE_URL);
    const existing = await sql`select id from vendor_accounts where email = ${email}`;
    if (existing.length > 0) {
      return new Response(JSON.stringify({ error: 'a vendor account with that email already exists' }), { status: 409 });
    }

    const { hash, salt } = await hashPassword(password);
    const rows = await sql`
      insert into vendor_accounts (email, password_hash, password_salt)
      values (${email}, ${hash}, ${salt})
      returning id
    `;
    const vendorId = rows[0].id;

    const token = newSessionToken();
    await sql`insert into vendor_sessions (token, vendor_account_id, expires_at) values (${token}, ${vendorId}, ${sessionExpiry()})`;

    return new Response(JSON.stringify({ email }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token, 'vendor_session') },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Something went wrong creating your vendor account.' }), { status: 500 });
  }
}
