import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../_lib/auth.js';
import { findValidCoupon } from '../../_lib/coupons.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET /api/coupons/:code?page=residential — logged-in customer.
//
// Lets the booking page show the discount before payment. This is a
// convenience only: functions/_lib/pricing.js re-validates and re-applies the
// coupon when the booking is actually created, so a forged response here buys
// nothing.
export async function onRequestGet({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) return json({ error: 'Log in to use a coupon.' }, 401);

  const page = new URL(request.url).searchParams.get('page');
  const { coupon, error } = await findValidCoupon(sql, params.code, {
    customerId: customer.id,
    page: page === 'residential' || page === 'commercial' ? page : null,
  });
  if (error) return json({ valid: false, error }, 200);

  // Only what the page needs to render the discount. Nothing about who else
  // holds the code or how often it has been used.
  return json({
    valid: true,
    code: coupon.code,
    percentOff: Number(coupon.percent_off),
    description: coupon.description || null,
  });
}

// PATCH /api/coupons/:code — admin. Deactivate or reactivate.
export async function onRequestPatch({ env, request, params }) {
  const auth = request.headers.get('authorization');
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  if (typeof body.active !== 'boolean') {
    return json({ error: 'active must be true or false' }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    update coupons set active = ${body.active}
     where upper(code) = ${String(params.code || '').trim().toUpperCase()}
     returning *
  `;
  if (rows.length === 0) return json({ error: 'not found' }, 404);
  return json({ ok: true, coupon: rows[0] });
}
