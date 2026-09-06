import { neon } from '@neondatabase/serverless';
import { COUPON_CODE_RE, normalizeCode } from '../_lib/coupons.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function isAdmin(env, request) {
  const auth = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

// GET /api/coupons — admin. Every coupon with its live redemption count.
export async function onRequestGet({ env, request }) {
  if (!isAdmin(env, request)) return json({ error: 'unauthorized' }, 401);

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select c.*,
           cu.email as customer_email,
           (select count(*)
              from coupon_redemptions r
              join bookings b on b.id = r.booking_id
             where r.coupon_id = c.id and b.canceled_at is null) as times_redeemed,
           (select coalesce(sum(r.amount_off), 0)
              from coupon_redemptions r
              join bookings b on b.id = r.booking_id
             where r.coupon_id = c.id and b.canceled_at is null) as total_discounted
      from coupons c
      left join customers cu on cu.id = c.customer_id
     order by c.created_at desc
     limit 500
  `;
  return json({ rows });
}

// POST /api/coupons — admin. Issue a code.
export async function onRequestPost({ env, request }) {
  if (!isAdmin(env, request)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const code = normalizeCode(body.code);
  if (!COUPON_CODE_RE.test(code)) {
    return json({ error: 'Code must be 3-32 characters: letters, numbers and hyphens.' }, 400);
  }

  const percentOff = Number(body.percentOff);
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
    return json({ error: 'Percent off must be between 1 and 100.' }, 400);
  }

  const maxRedemptions = body.maxRedemptions == null || body.maxRedemptions === ''
    ? null : Number(body.maxRedemptions);
  if (maxRedemptions != null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
    return json({ error: 'Max redemptions must be a whole number of 1 or more, or left blank for unlimited.' }, 400);
  }

  const page = body.page === 'residential' || body.page === 'commercial' ? body.page : null;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && isNaN(expiresAt.getTime())) return json({ error: 'Invalid expiry date.' }, 400);

  const sql = neon(env.DATABASE_URL);

  // Locking a coupon to a customer is done by email, because that is what the
  // person issuing it actually knows.
  let customerId = null;
  if (body.customerEmail) {
    const found = await sql`select id from customers where lower(email) = lower(${String(body.customerEmail).trim()}) limit 1`;
    if (found.length === 0) return json({ error: 'No customer account with that email.' }, 400);
    customerId = found[0].id;
  }

  const existing = await sql`select 1 from coupons where upper(code) = ${code} limit 1`;
  if (existing.length > 0) return json({ error: 'That code already exists.' }, 409);

  const rows = await sql`
    insert into coupons (code, percent_off, description, customer_id, max_redemptions, expires_at, page, created_by)
    values (${code}, ${percentOff},
            ${typeof body.description === 'string' && body.description.trim() ? body.description.trim().slice(0, 500) : null},
            ${customerId}, ${maxRedemptions}, ${expiresAt ? expiresAt.toISOString() : null}, ${page},
            ${typeof body.createdBy === 'string' ? body.createdBy.trim().slice(0, 120) : null})
    returning *
  `;
  return json({ ok: true, coupon: rows[0] }, 201);
}
