import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../../_lib/auth.js';
import { sendBookingConfirmationEmail } from '../../../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

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

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const proposed = Array.isArray(body.extraAddons) ? body.extraAddons : [];
  const valid = proposed
    .filter(e => e && typeof e.name === 'string' && e.name.trim() && Number.isFinite(Number(e.price)) && Number(e.price) >= 0)
    .map(e => ({ name: e.name.trim(), price: Number(e.price) }));
  if (valid.length === 0) {
    return json({ error: 'no valid add-ons provided' }, 400);
  }

  const addedTotal = valid.reduce((s, e) => s + e.price, 0);
  const existingExtras = Array.isArray(booking.extra_addons) ? booking.extra_addons : [];
  const newExtras = [...existingExtras, ...valid];
  const newFinal = Number(booking.final_total) + addedTotal;
  const newGross = Number(booking.gross_total) + addedTotal;

  await sql`
    update bookings
    set extra_addons = ${JSON.stringify(newExtras)}::jsonb, final_total = ${newFinal}, gross_total = ${newGross}
    where id = ${params.id}
  `;

  await sendBookingConfirmationEmail(env, {
    to: customer.email,
    page: booking.page, tier: booking.tier, address: booking.address,
    bookingType: booking.booking_type, months: booking.months || 1,
    scheduledDate: booking.scheduled_date, scheduledTime: booking.scheduled_time,
    finalTotal: newFinal,
  });

  return json({ ok: true, finalTotal: newFinal, extraAddons: newExtras });
}
