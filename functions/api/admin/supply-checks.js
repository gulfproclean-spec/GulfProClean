import { neon } from '@neondatabase/serverless';
import { timingSafeEqualString } from '../../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET /api/admin/supply-checks — admin only. The last 14 days of
// start-of-shift kit checks across the crew, newest first, for the office
// to see who's checked in and what's flagged low/out.
export async function onRequestGet({ env, request }) {
  const auth = request.headers.get('Authorization') || '';
  if (!timingSafeEqualString(auth, `Bearer ${env.ADMIN_TOKEN}`)) return json({ error: 'unauthorized' }, 401);
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select s.check_date, s.items, s.notes, s.submitted_at,
           s.employee_id, (e.first_name || ' ' || e.last_name) as employee_name
      from supply_checks s join employees e on e.id = s.employee_id
     where s.check_date >= current_date - interval '14 days'
     order by s.check_date desc, s.submitted_at desc
  `;
  return json({ checks: rows });
}
