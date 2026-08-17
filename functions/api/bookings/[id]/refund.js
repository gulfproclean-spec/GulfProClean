import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { estimateRefund } from '../../../_lib/refunds.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

async function loadOwnedBooking(sql, request, id) {
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) return { error: json({ error: 'not logged in' }, 401) };
  const rows = await sql`select * from bookings where id = ${id}`;
  if (rows.length === 0) return { error: json({ error: 'booking not found' }, 404) };
  const booking = rows[0];
  if (booking.customer_id !== customer.id) return { error: json({ error: 'not your booking' }, 403) };
  return { customer, booking };
}

// GET: live-computed refund estimate for this booking, plus whether a
// request already exists for it.
export async function onRequestGet({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const { error, booking } = await loadOwnedBooking(sql, request, params.id);
  if (error) return error;
  if (booking.payment_status !== 'paid') {
    return json({ error: 'This booking has not been paid for yet.' }, 400);
  }

  const existing = await sql`
    select id, amount, status, requested_at from refund_requests
    where booking_id = ${booking.id} order by requested_at desc limit 1
  `;
  const estimate = estimateRefund(booking);
  return json({ estimate, existingRequest: existing[0] || null });
}

// POST: create a refund request at the current computed amount. This does
// NOT move any money — it records the request (amount, visit breakdown) for
// the business to review and process manually (e.g. via the Stripe
// dashboard). Auto-issuing a real refund on request, with no human review,
// was deliberately left out given that's real money moving on a brand-new
// calculation.
export async function onRequestPost({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const { error, customer, booking } = await loadOwnedBooking(sql, request, params.id);
  if (error) return error;
  if (booking.payment_status !== 'paid') {
    return json({ error: 'This booking has not been paid for yet.' }, 400);
  }

  const existing = await sql`
    select id, status from refund_requests
    where booking_id = ${booking.id} and status = 'pending' limit 1
  `;
  if (existing.length > 0) {
    return json({ error: 'A refund request is already pending for this booking.' }, 400);
  }

  const estimate = estimateRefund(booking);
  if (estimate.refundAmount <= 0) {
    return json({ error: 'No refund is owed for this booking — all paid visits have been delivered.' }, 400);
  }

  const rows = await sql`
    insert into refund_requests (booking_id, customer_id, amount, visits_delivered, visits_remaining)
    values (${booking.id}, ${customer.id}, ${estimate.refundAmount}, ${estimate.visitsDelivered}, ${estimate.visitsRemaining})
    returning id, amount, status, requested_at
  `;
  return json({ ok: true, request: rows[0] }, 201);
}
