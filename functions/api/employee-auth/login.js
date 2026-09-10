import { neon } from '@neondatabase/serverless';
import { verifyPassword, newSessionToken, hashToken, sessionCookie, sessionExpiry, isValidEmail } from '../../_lib/auth.js';

// POST /api/employee-auth/login { email, password }
// Employees never self-register — the office creates them and sets the
// password in admin.html's Crew panel. So "no account" and "no password set
// yet" both come back as the same generic 401 to keep the roster private.
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
    return new Response(JSON.stringify({ error: 'Server is not configured (missing DATABASE_URL).' }), { status: 500 });
  }

  try {
    const sql = neon(env.DATABASE_URL);
    const rows = await sql`
      select id, first_name, last_name, password_hash, password_salt, active
      from employees where lower(email) = ${email}
    `;
    const emp = rows[0];
    if (!emp || !emp.password_hash || !emp.password_salt) {
      return new Response(JSON.stringify({ error: 'incorrect email or password' }), { status: 401 });
    }
    if (!emp.active) {
      return new Response(JSON.stringify({ error: 'this account is inactive — contact the office' }), { status: 403 });
    }
    const ok = await verifyPassword(password, emp.password_hash, emp.password_salt);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'incorrect email or password' }), { status: 401 });
    }

    const token = newSessionToken();
    const tokenHash = await hashToken(token);
    await sql`insert into employee_sessions (token_hash, employee_id, expires_at) values (${tokenHash}, ${emp.id}, ${sessionExpiry()})`;

    return new Response(JSON.stringify({ email, name: `${emp.first_name} ${emp.last_name}`.trim() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token, 'employee_session') },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Something went wrong logging you in.' }), { status: 500 });
  }
}
