import { neon } from '@neondatabase/serverless';
import { getEmployeeFromSession, verifyPassword, hashPassword, hashToken } from '../../_lib/auth.js';

// POST /api/employee-auth/password { currentPassword, newPassword }
// A signed-in technician changing their own password (e.g. after the office
// handed them a starter one). Every other session for that employee is
// dropped so a lost phone stays logged out once the password is changed.
export async function onRequestPost({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const emp = await getEmployeeFromSession(sql, request);
  if (!emp) return new Response(JSON.stringify({ error: 'not logged in' }), { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }
  const current = body.currentPassword || '';
  const next = body.newPassword || '';
  if (typeof next !== 'string' || next.length < 8) {
    return new Response(JSON.stringify({ error: 'new password must be at least 8 characters' }), { status: 400 });
  }
  const rows = await sql`select password_hash, password_salt from employees where id = ${emp.id}`;
  const ok = rows[0] && await verifyPassword(current, rows[0].password_hash, rows[0].password_salt);
  if (!ok) return new Response(JSON.stringify({ error: 'current password is incorrect' }), { status: 401 });

  const { hash, salt } = await hashPassword(next);
  await sql`update employees set password_hash = ${hash}, password_salt = ${salt}, updated_at = now() where id = ${emp.id}`;
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)employee_session=([^;]+)/);
  const keepHash = m ? await hashToken(m[1]) : '';
  await sql`delete from employee_sessions where employee_id = ${emp.id} and token_hash <> ${keepHash}`;
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
