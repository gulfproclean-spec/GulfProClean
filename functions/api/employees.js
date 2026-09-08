import { neon } from '@neondatabase/serverless';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function requireAdmin(env, request) {
  const auth = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

// GET /api/employees — admin only. The crew roster auto-assignment picks
// from, and the office manages here (add, deactivate).
export async function onRequestGet({ env, request }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`select id, name, email, phone, active, created_at from employees order by active desc, name asc`;
  return json({ employees: rows });
}

// POST /api/employees — admin only. { name, email?, phone? }
export async function onRequestPost({ env, request }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return json({ error: 'name is required' }, 400);
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    insert into employees (name, email, phone)
    values (${name}, ${email}, ${phone})
    returning id, name, email, phone, active, created_at
  `;
  return json({ ok: true, employee: rows[0] }, 201);
}
