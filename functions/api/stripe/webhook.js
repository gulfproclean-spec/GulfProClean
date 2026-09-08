import { neon } from '@neondatabase/serverless';
import { verifyStripeWebhookSignature } from '../../_lib/stripe.js';
import { markBookingPaid } from '../../_lib/payments.js';

// Subscription events (invoice.*, customer.subscription.*) don't carry a
// booking id directly — they carry a Stripe subscription id, which we
// stored on bookings.stripe_subscription_id when the subscription's
// Checkout Session completed. This is the one place that lookup happens.
async function findBookingBySubscription(sql, subscriptionId) {
  if (!subscriptionId) return null;
  const rows = await sql`select id from bookings where stripe_subscription_id = ${subscriptionId}`;
  return rows[0] || null;
}

export async function onRequestPost({ env, request }) {
  const payload = await request.text();
  const sig = request.headers.get('Stripe-Signature');

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('webhook not configured', { status: 500 });
  }
  const valid = await verifyStripeWebhookSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response('invalid signature', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const sql = neon(env.DATABASE_URL);

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (session.payment_status === 'paid' && session.client_reference_id) {
      await markBookingPaid(sql, env, session.client_reference_id, {
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      });
    }
  }

  // Renewal invoices for an existing subscription — the first cycle is
  // already handled by checkout.session.completed above, so this mainly
  // confirms the subscription is healthy and clears any past_due status
  // left by an earlier failed payment.
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    const booking = await findBookingBySubscription(sql, subscriptionId);
    if (booking) {
      await sql`update bookings set subscription_status = 'active' where id = ${booking.id}`;
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    const booking = await findBookingBySubscription(sql, subscriptionId);
    if (booking) {
      await sql`update bookings set subscription_status = 'past_due' where id = ${booking.id}`;
    }
  }

  // Stripe's own status is the source of truth for anything that isn't
  // 'canceled' (active, past_due, unpaid, paused, ...) — mirror it as-is
  // rather than re-deriving it.
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const booking = await findBookingBySubscription(sql, sub.id);
    if (booking && sub.status !== 'canceled') {
      await sql`update bookings set subscription_status = ${sub.status} where id = ${booking.id}`;
    }
  }

  // Fires whether the subscription ended via self-serve cancel-at-period-end
  // (functions/api/bookings/[id]/cancel-subscription.js), the 6/12-month
  // commitment's cancel_at being reached, or a manual cancel from the Stripe
  // dashboard. canceled_at is only set here if it isn't already set, so a
  // booking canceled through the refund-request flow (which cancels the
  // Stripe subscription itself and sets canceled_at immediately) isn't
  // double-processed when this event arrives after the fact.
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const booking = await findBookingBySubscription(sql, sub.id);
    if (booking) {
      await sql`
        update bookings
        set subscription_status = 'canceled', canceled_at = coalesce(canceled_at, now())
        where id = ${booking.id}
      `;
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
}
