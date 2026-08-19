import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { estimateRefund } from '../../../_lib/refunds.js';
import { monthlyDiscountFor, VALID_MONTHS } from '../../../_lib/pricing.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const PLAN_LABELS = { 0.5: 'Biweekly', 1: 'Monthly', 6: '6-Month Subscription', 12: '12-Month Subscription' };

async function loadOwnedBooking(sql, request, id) {
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) return { error: json({ error: 'not logged in' }, 401) };
  const rows = await sql`select * from bookings where id = ${id}`;
  if (rows.length === 0) return { error: json({ error: 'booking not found' }, 404) };
  const booking = rows[0];
  if (booking.customer_id !== customer.id) return { error: json({ error: 'not your booking' }, 403) };
  return { customer, booking };
}

function eligibilityError(booking) {
  if (booking.payment_status !== 'paid') return 'This booking has not been paid for yet.';
  if (booking.booking_type !== 'Monthly') return 'One-time bookings have no subscription plan to change.';
  if (booking.canceled_at) return 'This booking has been canceled.';
  return null;
}

// after_frequency_price (the One-Time/Standard price) is locked to tier,
// size, and cleaning frequency — none of which change when only the billing
// plan does — so it stays the correct base for the new discount rate.
// is_first_time is reused as originally recorded, not re-checked.
function computeNewPerVisit(booking, newMonths) {
  const standardPrice = Number(booking.after_frequency_price);
  const newDiscountPct = monthlyDiscountFor(newMonths);
  const firstTimeMultiplier = booking.is_first_time ? 0.90 : 1;
  return Math.round(standardPrice * (1 - newDiscountPct) * firstTimeMultiplier * 100) / 100;
}

function computeEstimate(booking, newMonths) {
  const estimate = estimateRefund(booking); // only used for visitsDelivered/visitsRemaining
  const oldPerVisit = Number(booking.per_visit_price);
  const newPerVisit = computeNewPerVisit(booking, newMonths);
  const priceDifference = Math.round((newPerVisit - oldPerVisit) * estimate.visitsRemaining * 100) / 100;
  return {
    currentPlan: PLAN_LABELS[Number(booking.months)] || booking.booking_type,
    newPlan: PLAN_LABELS[newMonths],
    visitsDelivered: estimate.visitsDelivered,
    visitsRemaining: estimate.visitsRemaining,
    oldPerVisit, newPerVisit, priceDifference,
  };
}

// GET ?newMonths=12 — live estimate of switching to a different billing
// plan. Only affects visits not yet delivered; past visits already
// happened at the old rate. Positive priceDifference = customer owes more
// (downgrading to a smaller discount); negative = credit due (upgrading).
export async function onRequestGet({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const { error, booking } = await loadOwnedBooking(sql, request, params.id);
  if (error) return error;
  const ineligible = eligibilityError(booking);
  if (ineligible) return json({ error: ineligible }, 400);

  const newMonths = Number(new URL(request.url).searchParams.get('newMonths'));
  if (!VALID_MONTHS.includes(newMonths)) return json({ error: 'Invalid plan.' }, 400);
  if (newMonths === Number(booking.months)) return json({ error: 'That is already your current plan.' }, 400);

  return json(computeEstimate(booking, newMonths));
}

// POST { newMonths } — records a pending plan-change request for the
// business to review and process manually (adjust visits_count/pricing and
// charge or credit the difference via Stripe as appropriate). Same
// "compute + record, human executes" pattern as refund requests — this
// never auto-charges or auto-credits anything.
export async function onRequestPost({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const { error, customer, booking } = await loadOwnedBooking(sql, request, params.id);
  if (error) return error;
  const ineligible = eligibilityError(booking);
  if (ineligible) return json({ error: ineligible }, 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const newMonths = Number(body.newMonths);
  if (!VALID_MONTHS.includes(newMonths)) return json({ error: 'Invalid plan.' }, 400);
  if (newMonths === Number(booking.months)) return json({ error: 'That is already your current plan.' }, 400);

  const existing = await sql`
    select id from plan_change_requests where booking_id = ${booking.id} and status = 'pending' limit 1
  `;
  if (existing.length > 0) {
    return json({ error: 'A plan change request is already pending for this booking.' }, 400);
  }

  const est = computeEstimate(booking, newMonths);
  const rows = await sql`
    insert into plan_change_requests (
      booking_id, customer_id, old_months, new_months, visits_delivered, visits_remaining,
      old_per_visit_price, new_per_visit_price, price_difference
    ) values (
      ${booking.id}, ${customer.id}, ${booking.months}, ${newMonths}, ${est.visitsDelivered}, ${est.visitsRemaining},
      ${est.oldPerVisit}, ${est.newPerVisit}, ${est.priceDifference}
    )
    returning id, status, requested_at
  `;
  return json({ ok: true, request: rows[0] }, 201);
}
