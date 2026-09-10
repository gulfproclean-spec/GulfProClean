import { neon } from '@neondatabase/serverless';
import { timingSafeEqualString } from '../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET /api/requests — admin only.
//
// Refund requests and plan-change requests are the two things a customer can
// ask for that move money. Neither is executed by this app: both endpoints
// compute an amount, record it, and stop. Before this screen existed the rows
// landed in tables nothing displayed, so a customer could cancel, be told the
// request was received, and have it sit unseen indefinitely.
//
// ?status= filters both lists. Default shows everything.
export async function onRequestGet({ env, request }) {
  const auth = request.headers.get('authorization');
  if (!env.ADMIN_TOKEN || !timingSafeEqualString(auth || '', `Bearer ${env.ADMIN_TOKEN}`)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const status = new URL(request.url).searchParams.get('status');
  const sql = neon(env.DATABASE_URL);

  const refunds = await sql`
    select r.*, b.tier, b.page, b.address, b.booking_type, b.months, b.final_total,
           b.stripe_payment_intent_id, b.canceled_at,
           c.email as customer_email, c.first_name, c.last_name
      from refund_requests r
      join bookings b  on b.id = r.booking_id
      join customers c on c.id = r.customer_id
     where (${status}::text is null or r.status = ${status})
     order by r.requested_at desc
     limit 500
  `;

  const planChanges = await sql`
    select p.*, b.tier, b.page, b.address, b.booking_type, b.final_total,
           b.stripe_payment_intent_id,
           c.email as customer_email, c.first_name, c.last_name
      from plan_change_requests p
      join bookings b  on b.id = p.booking_id
      join customers c on c.id = p.customer_id
     where (${status}::text is null or p.status = ${status})
     order by p.requested_at desc
     limit 500
  `;

  return json({ refunds, planChanges });
}
