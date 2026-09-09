import { neon } from '@neondatabase/serverless';
import { getEmployeeFromSession } from '../../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET /api/employee/jobs — the signed-in technician's own assigned, paid,
// non-canceled bookings with their checklist progress, from 30 days back to
// anything upcoming. Only the columns the field app needs: no pricing, no
// billing, no customer email — the crew sees where to go and what to do.
export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const emp = await getEmployeeFromSession(sql, request);
  if (!emp) return json({ error: 'not logged in' }, 401);

  const rows = await sql`
    select b.id, b.page as property_type, b.address, b.tier, b.booking_type, b.frequency,
           b.scheduled_date, b.scheduled_time, b.visit_dates, b.notes as customer_notes,
           b.addons_applied, b.first_name, b.last_name, b.phone,
           p.checks, p.notes, p.signoff, p.clock_in, p.clock_out, p.updated_at as progress_updated_at
      from bookings b
      left join job_progress p on p.booking_id = b.id
     where b.assigned_employee_id = ${emp.id}
       and b.payment_status = 'paid' and b.canceled_at is null
       and (b.scheduled_date is null or b.scheduled_date >= current_date - interval '30 days')
     order by b.scheduled_date asc nulls last, b.scheduled_time asc
     limit 200
  `;
  return json({ jobs: rows });
}
