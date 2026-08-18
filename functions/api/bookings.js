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
    page, notes, tier, bookingType, months, frequency,
    sqft, restroomBand, areas, propertyType, occupancy, hardFloorPct,
    addons, addonsApplied, extraAddons, scheduledDate, scheduledTime,
    firstName, lastName, phone, addressLine1, unit, city, state, zip,
    agreementAccepted,
  } = body;

  const requiredStrings = { firstName, lastName, phone, addressLine1, city, state, zip };
  const missing = Object.entries(requiredStrings).filter(([, v]) => typeof v !== 'string' || !v.trim());
  if (!PAGES.has(page) || !tier || !bookingType || !frequency || missing.length > 0) {
    return new Response(JSON.stringify({ error: 'Please fill in all required fields (name, phone, and full address).' }), { status: 400 });
  }
  const unitVal = typeof unit === 'string' ? unit.trim() : '';
  if (agreementAccepted !== true) {
    return new Response(JSON.stringify({ error: 'You must agree to the Service Agreement to book.' }), { status: 400 });
  }
  if (!/^[A-Za-z]{2}$/.test(state)) {
    return new Response(JSON.stringify({ error: 'Invalid state.' }), { status: 400 });
  }
  if (!/^\d{5}(-\d{4})?$/.test(zip.trim())) {
    return new Response(JSON.stringify({ error: 'Invalid zip code.' }), { status: 400 });
  }
  const address = [addressLine1.trim(), unitVal, `${city.trim()}, ${state.toUpperCase()} ${zip.trim()}`].filter(Boolean).join(', ');

  // First-time-customer discount eligibility is checked against both the
  // account and the service address — a new account at an address that's
  // already been serviced isn't a first-time customer, even if the email
  // is new. This is the authoritative check; the pre-payment estimate on
  // book.html mirrors it via signup/login but this is what actually gets
  // charged.
  const priorBookings = await sql`
    select 1 from bookings
    where customer_id = ${customer.id} or lower(address) = lower(${address})
    limit 1
  `;
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

  // after_frequency_price stores the One-Time/Standard Service Price
  // (pricing.standardPrice), not the pre-surcharge base rate — it's the
  // refund-reconciliation reference per the service agreement, and every
  // subscription discount is computed as a percentage off it.
  const rows = await sql`
    insert into bookings (
      customer_id, page, address, notes, tier, booking_type, months, frequency,
      addons, addons_applied, extra_addons, visits_count, gross_total, final_total, is_first_time,
      scheduled_date, scheduled_time, payment_status, pricing_input,
      first_name, last_name, phone, address_line1, unit, city, state, zip,
      per_visit_price, after_frequency_price, agreement_accepted_at
    ) values (
      ${customer.id}, ${page}, ${address}, ${notes || null}, ${tier}, ${bookingType}, ${monthsVal}, ${frequency},
      ${JSON.stringify(pricing.resolvedAddons)}::jsonb, ${JSON.stringify(appliedAddons)}::jsonb, ${JSON.stringify(pricing.resolvedExtraAddons)}::jsonb,
      ${pricing.visitsCount}, ${pricing.grossTotal}, ${pricing.finalTotal}, ${isFirstTime},
      ${scheduledDate || null}, ${scheduledTime || null}, 'unpaid', ${JSON.stringify(pricingInput)}::jsonb,
      ${firstName.trim()}, ${lastName.trim()}, ${phone.trim()}, ${addressLine1.trim()}, ${unitVal || null}, ${city.trim()}, ${state.toUpperCase()}, ${zip.trim()},
      ${pricing.perVisit}, ${pricing.standardPrice}, now()
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
    select id, page, address, tier, booking_type, months, frequency, addons, addons_applied, extra_addons, visits_count, final_total, scheduled_date, scheduled_time, payment_status, first_name, last_name, phone, created_at
    from bookings where customer_id = ${customer.id} order by created_at desc
  `;
  return new Response(JSON.stringify({ bookings: rows }), { headers: { 'Content-Type': 'application/json' } });
}
