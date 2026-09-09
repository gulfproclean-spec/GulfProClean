import { neon } from '@neondatabase/serverless';
import { getEmployeeFromSession } from '../../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const STATES = new Set(['ok', 'low', 'out']);

// GET /api/employee/supply-check — today's start-of-shift kit check for the
// signed-in technician, if they've done one.
export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const emp = await getEmployeeFromSession(sql, request);
  if (!emp) return json({ error: 'not logged in' }, 401);
  const rows = await sql`
    select check_date, items, notes, submitted_at from supply_checks
    where employee_id = ${emp.id} and check_date = current_date
  `;
  return json({ check: rows[0] || null });
}

// POST /api/employee/supply-check { items: {name: 'ok'|'low'|'out'}, notes? }
// One per technician per day; re-submitting replaces today's.
export async function onRequestPost({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const emp = await getEmployeeFromSession(sql, request);
  if (!emp) return json({ error: 'not logged in' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const items = {};
  if (body.items && typeof body.items === 'object') {
    for (const [k, v] of Object.entries(body.items)) {
      if (typeof k === 'string' && k.length < 80 && STATES.has(v)) items[k] = v;
    }
  }
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null;
  const rows = await sql`
    insert into supply_checks (employee_id, check_date, items, notes)
    values (${emp.id}, current_date, ${JSON.stringify(items)}::jsonb, ${notes})
    on conflict (employee_id, check_date) do update
      set items = excluded.items, notes = excluded.notes, submitted_at = now()
    returning check_date, items, notes, submitted_at
  `;
  return json({ ok: true, check: rows[0] });
}
