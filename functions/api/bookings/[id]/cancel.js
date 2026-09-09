import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { estimateRefund } from '../../../_lib/refunds.js';
import { stripeRequest } from '../../../_lib/stripe.js';
import { sendCancellationNotificationEmail } from '../../../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// Self-serve cancellation, for every booking type. Replaces two former
// endpoints: cancel-subscription.js (no-commitment Monthly plans only) and
// refund.js (which doubled as the only cancel path for One-time bookings
// and committed 6/12-month plans, and — before this change — computed and
// let the customer submit a specific refund request). Customers no longer
// see or request a dollar figure here; cancelling only cancels. A refund
// estimate (existing functions/_lib/refunds.js policy math, unchanged) is
// still included in the staff notification below as a starting point, but
// nothing is refunded automatically — staff decide and, if warranted, issue
// it directly in the Stripe dashboard, exactly as before this change.
export async function onRequestPost({ env, request, params }) {
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
  if (booking.payment_status !== 'paid') {
    return json({ error: 'This booking has not been paid for yet.' }, 400);
  }
  if (booking.canceled_at) {
    return json({ error: 'This booking is already canceled.' }, 400);
  }

  const months = Number(booking.months);
  const noCommitment = booking.booking_type === 'Monthly' && (months === 0.5 || months === 1);
  let immediate;

  if (noCommitment && booking.stripe_subscription_id) {
    // No-commitment plan (Biweekly/Monthly, "cancel anytime"): cancel at the
    // end of the current billing period, so the customer keeps the visit(s)
    // already covered by the cycle they paid for. Stripe's
    // customer.subscription.deleted webhook (functions/api/stripe/webhook.js)
    // finalizes canceled_at once the period actually ends.
    if (!env.STRIPE_SECRET_KEY) {
      return json({ error: 'Payments are not configured yet. Please contact us.' }, 500);
    }
    try {
      await stripeRequest(env, 'POST', `subscriptions/${booking.stripe_subscription_id}`, {
        cancel_at_period_end: 'true',
      });
    } catch (e) {
      return json({ error: e.message || 'Could not cancel your subscription' }, 502);
    }
    await sql`update bookings set subscription_status = 'canceling' where id = ${booking.id}`;
    immediate = false;
  } else {
    // Committed 6/12-month subscription, or a One-time booking with no
    // subscription at all (a single Checkout Session, not recurring) —
    // cancel immediately. There's no "unused period" to let run out the way
    // a no-commitment plan's already-paid-for cycle has. Best-effort on the
    // Stripe side: a failure there (e.g. already canceled) doesn't block the
    // cancellation itself, since the booking row is the source of truth and
    // staff can reconcile Stripe by hand from the notification below either way.
    if (booking.stripe_subscription_id && env.STRIPE_SECRET_KEY) {
      try {
        await stripeRequest(env, 'DELETE', `subscriptions/${booking.stripe_subscription_id}`);
      } catch (e) {
        // swallow — see comment above
      }
    }
    await sql`
      update bookings
      set canceled_at = now(), subscription_status = case when stripe_subscription_id is not null then 'canceled' else subscription_status end
      where id = ${booking.id}
    `;
    immediate = true;
  }

  // Best-effort — sendGmail never throws, so this can't turn a successful
  // cancellation into a failed response. This is the only place the office
  // finds out about a cancellation at all; a canceled booking otherwise just
  // silently drops off the admin Crew panel's list.
  await sendCancellationNotificationEmail(env, {
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
    immediate,
    estimate: estimateRefund(booking),
  });

  return json({ ok: true });
}
