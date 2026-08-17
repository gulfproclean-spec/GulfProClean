import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { stripeRequest } from '../../../_lib/stripe.js';
import { markBookingPaid } from '../../../_lib/payments.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// Called when the browser returns from Stripe Checkout. This is a UX
// fast-path so the confirmation page doesn't have to wait on webhook
// latency — the webhook (functions/api/stripe/webhook.js) is the source of
// truth and will independently mark the booking paid if this never runs.
export async function onRequestGet({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) {
    return json({ error: 'not logged in' }, 401);
  }
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!sessionId) {
    return json({ error: 'missing session_id' }, 400);
  }

  const rows = await sql`select * from bookings where id = ${params.id}`;
  if (rows.length === 0) {
    return json({ error: 'booking not found' }, 404);
  }
  const booking = rows[0];
  if (booking.customer_id !== customer.id) {
    return json({ error: 'not your booking' }, 403);
  }
  if (booking.stripe_checkout_session_id !== sessionId) {
    return json({ error: 'session does not match this booking' }, 400);
  }

  if (booking.payment_status === 'paid') {
    return json({ paid: true });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'Payments are not configured' }, 500);
  }
  let session;
  try {
    session = await stripeRequest(env, 'GET', `checkout/sessions/${sessionId}`);
  } catch (e) {
    return json({ error: e.message || 'Could not verify payment' }, 502);
  }
  if (session.payment_status !== 'paid') {
    return json({ paid: false });
  }

  const result = await markBookingPaid(sql, env, booking.id, {
    customerEmail: customer.email,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
  });
  return json({ paid: true, justPaid: result.justPaid });
}
