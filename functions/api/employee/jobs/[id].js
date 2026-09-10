import { neon } from '@neondatabase/serverless';
import { getEmployeeFromSession } from '../../../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const PHASES = new Set(['arrival', 'clean', 'finish']);

// PATCH /api/employee/jobs/:id — the assigned technician updating their own
// progress on a booking. Body may carry any of:
//   { checks: {"<phase>::<cat>::<i>": true|false, ...} }   merged, not replaced
//   { note: { phase: 'arrival'|'clean'|'finish', text } }
//   { signoff: { name, confirmed } }
//   { clockIn: true } | { clockOut: true }
// The booking must be assigned to the caller — a technician cannot touch a
// job that was reassigned away from them, even with a stale link.
export async function onRequestPatch({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const emp = await getEmployeeFromSession(sql, request);
  if (!emp) return json({ error: 'not logged in' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const owned = await sql`
    select id from bookings
    where id = ${params.id} and assigned_employee_id = ${emp.id}
      and payment_status = 'paid' and canceled_at is null
  `;
  if (!owned.length) return json({ error: 'job not found or not assigned to you' }, 404);

  await sql`
    insert into job_progress (booking_id, employee_id) values (${params.id}, ${emp.id})
    on conflict (booking_id) do update set employee_id = ${emp.id}
  `;

  if (body.checks && typeof body.checks === 'object' && !Array.isArray(body.checks)) {
    const clean = {};
    for (const [k, v] of Object.entries(body.checks)) {
      if (typeof k === 'string' && k.length < 80 && /^(arrival|clean|finish)::[a-z_]+::\d+$/.test(k)) clean[k] = !!v;
    }
    // jsonb || merges top-level keys; false values are kept so an untick
    // persists rather than vanishing under the merge.
    await sql`update job_progress set checks = checks || ${JSON.stringify(clean)}::jsonb where booking_id = ${params.id}`;
  }
  if (body.note && PHASES.has(body.note.phase)) {
    const text = typeof body.note.text === 'string' ? body.note.text.slice(0, 2000) : '';
    await sql`update job_progress set notes = notes || ${JSON.stringify({ [body.note.phase]: text })}::jsonb where booking_id = ${params.id}`;
  }
  if (body.signoff && typeof body.signoff === 'object') {
    const so = { name: String(body.signoff.name || '').slice(0, 120), confirmed: body.signoff.confirmed === true };
    await sql`update job_progress set signoff = ${JSON.stringify(so)}::jsonb where booking_id = ${params.id}`;
  }
  if (body.clockIn === true) {
    await sql`update job_progress set clock_in = coalesce(clock_in, now()), clock_out = null where booking_id = ${params.id}`;
  }
  if (body.clockOut === true) {
    await sql`update job_progress set clock_out = now(), clock_in = coalesce(clock_in, now()) where booking_id = ${params.id}`;
  }
  await sql`update job_progress set updated_at = now() where booking_id = ${params.id}`;

  const rows = await sql`select checks, notes, signoff, clock_in, clock_out, updated_at from job_progress where booking_id = ${params.id}`;
  return json({ ok: true, progress: rows[0] });
}
