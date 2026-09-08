import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { stripeRequest } from '../../../_lib/stripe.js';
import { getOrCreateStripeCustomer } from '../../../_lib/stripe-customer.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// Visits-per-week is not stored directly, but it's exactly recoverable from
// how functions/_lib/pricing.js computed visits_count in the first place:
// visitsPerWeek * monthsVal * 4 for every Monthly booking, residential or
// commercial (see computeBookingPricing). Recomputing it here (rather than
// storing it) means there's one formula for the relationship, not two that
// can drift apart.
function visitsPerWeekOf(booking) {
  const months = Number(booking.months);
  const visits = Number(booking.visits_count);
  if (!Number.isFinite(months) || months <= 0 || !Number.isFinite(visits)) return null;
  return visits / (months * 4);
}

// How this booking's plan maps to a Stripe recurring price: how often an
// invoice fires, and how many visits that invoice covers. Biweekly (0.5mo)
// bills every 2 weeks; every other plan bills monthly — including the
// 6- and 12-month plans, which commit the customer for that long (via
// subscription_data.cancel_at below) but still bill in normal monthly
// cycles rather than one lump sum upfront.
function cycleFor(months, visitsPerWeek) {
  if (months === 0.5) {
    return { interval: 'week', intervalCount: 2, visitsPerCycle: visitsPerWeek * 2 };
  }
  return { interval: 'month', intervalCount: 1, visitsPerCycle: visitsPerWeek * 4 };
}

// 6- and 12-month plans are sold as a commitment, which Stripe has no native
// concept of — subscription_data.cancel_at is what actually enforces it:
// Stripe stops billing and auto-cancels the subscription at the term end
// rather than renewing forever. Term start is the first scheduled visit
// (falls back to now if one somehow isn't set yet).
function commitmentCancelAt(booking, months) {
  if (months !== 6 && months !== 12) return null;
  const start = booking.scheduled_date ? new Date(`${String(booking.scheduled_date).slice(0, 10)}T00:00:00`) : new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return Math.floor(end.getTime() / 1000);
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

  const origin = new URL(request.url).origin;
  const description = `${booking.tier} ${booking.page === 'residential' ? 'residential' : 'commercial'} cleaning — ${booking.address}`;
  const successUrl = `${origin}/book.html?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/book.html?bookingId=${booking.id}&canceled=1`;

  let session;

  if (booking.booking_type === 'Monthly') {
    const months = Number(booking.months);
    const visitsPerWeek = visitsPerWeekOf(booking);
    if (!visitsPerWeek || visitsPerWeek <= 0) {
      return json({ error: 'invalid booking schedule' }, 400);
    }
    const { interval, intervalCount, visitsPerCycle } = cycleFor(months, visitsPerWeek);
    const perVisit = Number(booking.per_visit_price);
    const perCycleCents = Math.round(perVisit * visitsPerCycle * 100);
    if (!Number.isFinite(perCycleCents) || perCycleCents <= 0) {
      return json({ error: 'invalid booking total' }, 400);
    }

    let stripeCustomerId;
    try {
      stripeCustomerId = await getOrCreateStripeCustomer(sql, env, customer.id);
    } catch (e) {
      return json({ error: e.message || 'Could not set up billing' }, 502);
    }

    const cancelAt = commitmentCancelAt(booking, months);

    try {
      session = await stripeRequest(env, 'POST', 'checkout/sessions', {
        mode: 'subscription',
        client_reference_id: booking.id,
        customer: stripeCustomerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: perCycleCents,
            recurring: { interval, interval_count: intervalCount },
            product_data: { name: description.slice(0, 250) },
          },
        }],
        subscription_data: {
          metadata: { booking_id: booking.id },
          ...(cancelAt ? { cancel_at: cancelAt } : {}),
        },
      });
    } catch (e) {
      return json({ error: e.message || 'Could not start checkout' }, 502);
    }
  } else {
    const amountCents = Math.round(Number(booking.final_total) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json({ error: 'invalid booking total' }, 400);
    }
    try {
      session = await stripeRequest(env, 'POST', 'checkout/sessions', {
        mode: 'payment',
        client_reference_id: booking.id,
        customer_email: customer.email,
        success_url: successUrl,
        cancel_url: cancelUrl,
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
  }

  await sql`update bookings set stripe_checkout_session_id = ${session.id} where id = ${booking.id}`;

  return json({ url: session.url });
}
