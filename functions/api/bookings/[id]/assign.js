import { neon } from '@neondatabase/serverless';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function requireAdmin(env, request) {
  const auth = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

// PATCH /api/bookings/:id/assign — admin only. { employeeId: string|null }
// The office's override on top of auto-assignment (functions/_lib/assignment.js,
// run once at booking creation). This is the only thing that ever changes an
// assignment after that — always available, at the office's discretion, to
// anyone on the active roster. employeeId: null explicitly unassigns.
export async function onRequestPatch({ env, request, params }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  if (body.employeeId !== null && typeof body.employeeId !== 'string') {
    return json({ error: 'employeeId must be a string id or null' }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const found = await sql`select id from bookings where id = ${params.id}`;
  if (!found.length) return json({ error: 'booking not found' }, 404);

  if (body.employeeId) {
    const emp = await sql`select id from employees where id = ${body.employeeId} and active = true`;
    if (!emp.length) return json({ error: 'employee not found or inactive' }, 400);
  }

  const updated = await sql`
    update bookings
    set assigned_employee_id = ${body.employeeId},
        assigned_at = ${body.employeeId ? new Date().toISOString() : null}
    where id = ${params.id}
    returning id, assigned_employee_id, assigned_at
  `;
  return json({ ok: true, booking: updated[0] });
}
