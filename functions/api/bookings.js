import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../_lib/auth.js';
import { computeBookingPricing, PricingError } from '../_lib/pricing.js';

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
  const {
    page, address, notes, tier, bookingType, months, frequency,
    sqft, restroomBand, areas, propertyType, occupancy, hardFloorPct,
    addons, addonsApplied, extraAddons, scheduledDate, scheduledTime,
  } = body;

  if (!PAGES.has(page) || !address || !tier || !bookingType || !frequency) {
    return new Response(JSON.stringify({ error: 'missing required fields' }), { status: 400 });
  }

  const priorBookings = await sql`select 1 from bookings where customer_id = ${customer.id} limit 1`;
  const isFirstTime = priorBookings.length === 0;

  // Price is derived entirely server-side from raw selections — nothing
  // computed by the browser is trusted here. See functions/_lib/pricing.js.
  let pricing;
  try {
    pricing = await computeBookingPricing(sql, {
      page, tier, booking: bookingType, months, frequency,
      sqft, restroomBand, areas, propertyType, occupancy, hardFloorPct,
      addons: Array.isArray(addons) ? addons.map(a => ({ name: a && a.name, occurrences: a && a.occurrences })) : [],
      extraAddons: Array.isArray(extraAddons) ? extraAddons.map(e => ({ name: e && e.name })) : [],
    }, isFirstTime);
  } catch (e) {
    if (e instanceof PricingError) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
    throw e;
  }

  const purchasedAddonNames = new Set(pricing.resolvedAddons.map(a => a.name));
  const appliedAddons = (Array.isArray(addonsApplied) ? addonsApplied : []).filter(n => typeof n === 'string');
  if (appliedAddons.some(name => !purchasedAddonNames.has(name))) {
    return new Response(JSON.stringify({ error: 'add-ons applied to this visit must be ones you paid for' }), { status: 400 });
  }

  const monthsVal = bookingType === 'Monthly' ? (Number(months) || 1) : 1;
  const pricingInput = { sqft, restroomBand, areas, propertyType, occupancy, hardFloorPct };

  const rows = await sql`
    insert into bookings (
      customer_id, page, address, notes, tier, booking_type, months, frequency,
      addons, addons_applied, extra_addons, visits_count, gross_total, final_total, is_first_time,
      scheduled_date, scheduled_time, payment_status, pricing_input
    ) values (
      ${customer.id}, ${page}, ${address}, ${notes || null}, ${tier}, ${bookingType}, ${monthsVal}, ${frequency},
      ${JSON.stringify(pricing.resolvedAddons)}::jsonb, ${JSON.stringify(appliedAddons)}::jsonb, ${JSON.stringify(pricing.resolvedExtraAddons)}::jsonb,
      ${pricing.visitsCount}, ${pricing.grossTotal}, ${pricing.finalTotal}, ${isFirstTime},
      ${scheduledDate || null}, ${scheduledTime || null}, 'unpaid', ${JSON.stringify(pricingInput)}::jsonb
    )
    returning id
  `;

  return new Response(JSON.stringify({
    ok: true, id: rows[0].id, isFirstTime,
    finalTotal: pricing.finalTotal, grossTotal: pricing.grossTotal, visitsCount: pricing.visitsCount,
  }), {
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
    select id, page, address, tier, booking_type, months, frequency, addons, addons_applied, extra_addons, visits_count, final_total, scheduled_date, scheduled_time, payment_status, created_at
    from bookings where customer_id = ${customer.id} order by created_at desc
  `;
  return new Response(JSON.stringify({ bookings: rows }), { headers: { 'Content-Type': 'application/json' } });
}
