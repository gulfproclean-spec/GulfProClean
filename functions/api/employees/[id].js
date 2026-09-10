import { neon } from '@neondatabase/serverless';
import { timingSafeEqualString } from '../../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function requireAdmin(env, request) {
  const auth = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && timingSafeEqualString(auth || '', `Bearer ${env.ADMIN_TOKEN}`);
}

// PATCH /api/employees/:id — admin only. { name?, email?, phone?, active? }
// Deactivating (rather than deleting) is deliberate: it drops the person out
// of auto-assignment immediately without touching bookings already assigned
// to them, and without losing the assignment history on past jobs.
export async function onRequestPatch({ env, request, params }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const found = await sql`select id from employees where id = ${params.id}`;
  if (!found.length) return json({ error: 'not found' }, 404);

  // employees has first_name/last_name, not a single `name` column — see
  // functions/api/employees.js for why this endpoint still accepts/returns
  // one `name` string rather than changing admin.html's single input.
  if (typeof body.name === 'string' && body.name.trim()) {
    const parts = body.name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || parts[0];
    await sql`update employees set first_name = ${firstName}, last_name = ${lastName} where id = ${params.id}`;
  }
  if (typeof body.email === 'string') {
    await sql`update employees set email = ${body.email.trim() || null} where id = ${params.id}`;
  }
  if (typeof body.phone === 'string') {
    await sql`update employees set phone = ${body.phone.trim() || null} where id = ${params.id}`;
  }
  if (typeof body.active === 'boolean') {
    await sql`update employees set active = ${body.active} where id = ${params.id}`;
  }

  const rows = await sql`
    select id, (first_name || ' ' || last_name) as name, email, phone, active, created_at
    from employees where id = ${params.id}
  `;
  return json({ ok: true, employee: rows[0] });
}
