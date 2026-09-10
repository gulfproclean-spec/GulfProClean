import { neon } from '@neondatabase/serverless';
import { timingSafeEqualString } from '../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function requireAdmin(env, request) {
  const auth = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && timingSafeEqualString(auth || '', `Bearer ${env.ADMIN_TOKEN}`);
}

// employees has first_name/last_name, not a single `name` column — every
// query here used to reference `name` directly, which doesn't exist, so the
// whole Crew roster (list, add, and — see [id].js — edit) 500'd. Rather than
// reshape admin.html's single "Name" field into two inputs, the API keeps
// accepting/returning one `name` string and splits/joins it against the real
// columns at the edges.
function splitName(name) {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || parts[0] };
}

// GET /api/employees — admin only. The crew roster auto-assignment picks
// from, and the office manages here (add, deactivate).
export async function onRequestGet({ env, request }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select id, (first_name || ' ' || last_name) as name, email, phone, active, created_at
    from employees order by active desc, first_name asc, last_name asc
  `;
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
  const { firstName, lastName } = splitName(name);
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    insert into employees (first_name, last_name, email, phone)
    values (${firstName}, ${lastName}, ${email}, ${phone})
    returning id, (first_name || ' ' || last_name) as name, email, phone, active, created_at
  `;
  return json({ ok: true, employee: rows[0] }, 201);
}
