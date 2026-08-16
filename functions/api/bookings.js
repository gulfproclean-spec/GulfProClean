import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../_lib/auth.js';
import { sendBookingConfirmationEmail } from '../_lib/email.js';

const PAGES = new Set(['residential', 'commercial']);

export async function onRequestPost({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) {
    return new Response(JSON.stringify({ error: 'not logged in' }), { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }
  const { page, address, notes, tier, bookingType, months, frequency, addons, addonsApplied, visitsCount, grossTotal, finalTotal, scheduledDate, scheduledTime } = body;

  if (!PAGES.has(page) || !address || !tier || !bookingType || !frequency) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), { status: 400 });
  }
  const gross = Number(grossTotal);
  const final = Number(finalTotal);
  const visits = Number(visitsCount);
  if (!Number.isFinite(gross) || !Number.isFinite(final) || !Number.isFinite(visits) || gross < 0 || final < 0 || final > gross || visits < 1) {
    return new Response(JSON.stringify({ error: 'invalid pricing totals' }), { status: 400 });
  }
  const purchasedAddonNames = new Set((addons || []).map(a => a.name));
  const appliedAddons = Array.isArray(addonsApplied) ? addonsApplied : [];
  if (appliedAddons.some(name => !purchasedAddonNames.has(name))) {
    return new Response(JSON.stringify({ error: 'add-ons applied to this visit must be ones you paid for' }), { status: 400 });
  }

  const priorBookings = await sql`select 1 from bookings where customer_id = ${customer.id} limit 1`;
  const isFirstTime = priorBookings.length === 0;

  const monthsVal = Number(months) || 1;
  const rows = await sql`
    insert into bookings (
      customer_id, page, address, notes, tier, booking_type, months, frequency,
      addons, addons_applied, visits_count, gross_total, final_total, is_first_time,
      scheduled_date, scheduled_time
    ) values (
      ${customer.id}, ${page}, ${address}, ${notes || null}, ${tier}, ${bookingType}, ${monthsVal}, ${frequency},
      ${JSON.stringify(addons || [])}::jsonb, ${JSON.stringify(appliedAddons)}::jsonb, ${visits}, ${gross}, ${final}, ${isFirstTime},
      ${scheduledDate || null}, ${scheduledTime || null}
    )
    returning id
  `;

  await sendBookingConfirmationEmail(env, {
    to: customer.email,
    page, tier, address,
    bookingType, months: monthsVal,
    scheduledDate, scheduledTime,
    finalTotal: final,
  });

  return new Response(JSON.stringify({ ok: true, id: rows[0].id, isFirstTime }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) {
    return new Response(JSON.stringify({ error: 'not logged in' }), { status: 401 });
  }
  const rows = await sql`
    select id, page, address, tier, booking_type, months, frequency, addons, addons_applied, visits_count, final_total, scheduled_date, scheduled_time, created_at
    from bookings where customer_id = ${customer.id} order by created_at desc
  `;
  return new Response(JSON.stringify({ bookings: rows }), { headers: { 'Content-Type': 'application/json' } });
}
