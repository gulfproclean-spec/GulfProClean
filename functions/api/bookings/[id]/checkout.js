import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { stripeRequest } from '../../../_lib/stripe.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost({ env, request, params }) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: 'Payments are not configured yet. Please contact us to complete your booking.' }, 500);
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
  if (booking.payment_status === 'paid') {
    return json({ error: 'this booking is already paid' }, 400);
  }

  const amountCents = Math.round(Number(booking.final_total) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return json({ error: 'invalid booking total' }, 400);
  }

  const origin = new URL(request.url).origin;
  const description = `${booking.tier} ${booking.page === 'residential' ? 'residential' : 'commercial'} cleaning — ${booking.address}`;

  let session;
  try {
    session = await stripeRequest(env, 'POST', 'checkout/sessions', {
      mode: 'payment',
      client_reference_id: booking.id,
      customer_email: customer.email,
      success_url: `${origin}/book.html?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book.html?bookingId=${booking.id}&canceled=1`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: description.slice(0, 250) },
        },
      }],
    });
  } catch (e) {
    return json({ error: e.message || 'Could not start checkout' }, 502);
  }

  await sql`update bookings set stripe_checkout_session_id = ${session.id} where id = ${booking.id}`;

  return json({ url: session.url });
}
