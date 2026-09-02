import { neon } from '@neondatabase/serverless';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET /api/admin/bookings — admin only. Every paid, non-canceled booking
// with its current assignment, soonest first — the office's crew-assignment
// view, and what admin.html's Crew panel reassigns from.
export async function onRequestGet({ env, request }) {
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: 'unauthorized' }, 401);

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select b.id, b.page, b.address, b.tier, b.booking_type, b.frequency,
           b.scheduled_date, b.scheduled_time, b.payment_status, b.canceled_at,
           b.first_name, b.last_name, b.phone,
           b.assigned_employee_id, e.name as assigned_employee_name
      from bookings b
      left join employees e on e.id = b.assigned_employee_id
     where b.payment_status = 'paid' and b.canceled_at is null
     order by b.scheduled_date asc nulls last, b.scheduled_time asc
     limit 500
  `;
  return json({ bookings: rows });
}
