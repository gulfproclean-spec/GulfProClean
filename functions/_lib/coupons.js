// Coupon lookup and validation. Shared by the validate endpoint (so the
// booking page can show the discount before payment) and by the booking
// endpoint (which re-validates, because nothing the browser says about a
// discount is trusted).

export const COUPON_CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,31}$/;

export function normalizeCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

// Returns { coupon } when redeemable, or { error } with a message written for
// the customer. Never throws on a bad code — an unknown code is an ordinary
// outcome, not an exception.
export async function findValidCoupon(sql, rawCode, { customerId, page } = {}) {
  const code = normalizeCode(rawCode);
  if (!code) return { error: 'Enter a coupon code.' };
  if (!COUPON_CODE_RE.test(code)) return { error: 'That does not look like a valid coupon code.' };

  const rows = await sql`
    select c.*,
           (select count(*)
              from coupon_redemptions r
              join bookings b on b.id = r.booking_id
             where r.coupon_id = c.id
               and b.canceled_at is null) as times_redeemed
      from coupons c
     where upper(c.code) = ${code}
     limit 1
  `;
  if (rows.length === 0) return { error: 'That coupon code was not found.' };

  const c = rows[0];

  if (!c.active) return { error: 'That coupon is no longer active.' };
  if (c.expires_at && new Date(c.expires_at) < new Date()) {
    return { error: 'That coupon has expired.' };
  }
  if (c.max_redemptions != null && Number(c.times_redeemed) >= Number(c.max_redemptions)) {
    return { error: 'That coupon has already been used.' };
  }
  if (c.customer_id && customerId && c.customer_id !== customerId) {
    // Deliberately vague: confirming a code belongs to someone else would
    // let anyone enumerate which codes exist and who holds them.
    return { error: 'That coupon is not available on this account.' };
  }
  if (c.customer_id && !customerId) {
    return { error: 'Log in to use this coupon.' };
  }

  // One redemption per customer, always. max_redemptions caps the code
  // overall; without this a single shared code like NEXT20 could be redeemed
  // by the same person on every booking they ever make.
  if (customerId) {
    const mine = await sql`
      select 1 from coupon_redemptions r
        join bookings b on b.id = r.booking_id
       where r.coupon_id = ${c.id} and r.customer_id = ${customerId}
         and b.canceled_at is null
       limit 1
    `;
    if (mine.length > 0) return { error: 'You have already used that coupon.' };
  }

  if (c.page && page && c.page !== page) {
    const label = c.page === 'residential' ? 'residential' : 'commercial';
    return { error: `That coupon applies to ${label} service only.` };
  }

  return { coupon: c };
}
