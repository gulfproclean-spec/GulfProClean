import { neon } from '@neondatabase/serverless';
import { verifyStripeWebhookSignature } from '../../_lib/stripe.js';
import { markBookingPaid } from '../../_lib/payments.js';

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

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    if (session.payment_status === 'paid' && session.client_reference_id) {
      const sql = neon(env.DATABASE_URL);
      await markBookingPaid(sql, env, session.client_reference_id, {
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
}
