import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { stripeRequest } from '../../../_lib/stripe.js';
import { sendSubscriptionCancellationNotificationEmail } from '../../../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// Self-serve cancellation, for no-commitment plans only (Biweekly/0.5mo and
// Monthly/1mo — "No contracts. Cancel anytime."). Cancels at the end of the
// current billing period rather than immediately, so the customer still
// gets the visit(s) already covered by the cycle they paid for; Stripe's
// customer.subscription.deleted webhook (functions/api/stripe/webhook.js)
// finalizes canceled_at once the period actually ends.
//
// 6- and 12-month plans are a commitment with a real discount attached to
// it, so cancelling one isn't self-serve here — it goes through the
// existing refund-request review flow (functions/api/bookings/[id]/refund.js),
// which now also cancels the Stripe subscription itself when it approves a
// cancellation, since letting an already-refunded booking keep billing
// would be a real-money bug.
export async function onRequestPost({ env, request, params }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'Payments are not configured yet. Please contact us.' }, 500);
  }
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) {
    return json({ error: 'not logged in' }, 401);
  }

  const rows = await sql`select * from bookings where id = ${params.id}`;
  if (rows.length === 0) {
    return json({ error: 'booking not found' }, 404);
  }
  const booking = rows[0];
  if (booking.customer_id !== customer.id) {
    return json({ error: 'not your booking' }, 403);
  }
  if (booking.canceled_at) {
    return json({ error: 'This booking is already canceled.' }, 400);
  }
  if (!booking.stripe_subscription_id) {
    return json({ error: 'This booking does not have an active subscription to cancel.' }, 400);
  }
  const months = Number(booking.months);
  if (booking.booking_type !== 'Monthly' || (months !== 0.5 && months !== 1)) {
    return json({ error: 'Your plan has a committed term — please request a refund instead, and our team will review the cancellation.' }, 400);
  }

  try {
    await stripeRequest(env, 'POST', `subscriptions/${booking.stripe_subscription_id}`, {
      cancel_at_period_end: 'true',
    });
  } catch (e) {
    return json({ error: e.message || 'Could not cancel your subscription' }, 502);
  }

  await sql`update bookings set subscription_status = 'canceling' where id = ${booking.id}`;

  // Best-effort — sendGmail never throws, so this can't turn a successful
  // cancellation into a failed response. This is the only place the office
  // finds out about a self-serve cancellation at all right now; the booking
  // otherwise just silently drops off the admin Crew panel once canceled.
  await sendSubscriptionCancellationNotificationEmail(env, {
    customerEmail: customer.email,
    firstName: booking.first_name,
    lastName: booking.last_name,
    phone: booking.phone,
    page: booking.page,
    tier: booking.tier,
    address: booking.address,
    bookingType: booking.booking_type,
    months: booking.months,
    finalTotal: booking.final_total,
  });

  return json({ ok: true });
}
