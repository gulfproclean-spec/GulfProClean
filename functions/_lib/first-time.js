// Who counts as a first-time customer, in one place.
//
// Four endpoints answer this question — signup, login, /api/auth/me, and the
// authoritative check in POST /api/bookings — and they each used to hand-roll
// their own query. They had already drifted: /api/auth/me matched on the
// account only, so a second account opened at an address we had already
// cleaned was told it was first-time. Whatever that endpoint's answer is used
// for next, it would have been the wrong one.
//
// Two rules, and both of them are corrections to how this behaved before:
//
//   1. ADDRESS, not just account. A new email at a property we have already
//      served is not a new customer. The comparison runs through
//      gpc_address_key() (migrations/024_address_key.sql) rather than
//      lower(address), so "123 Main St, Destin, FL 32541" and
//      "123 main street, destin, fl 32541-1198" are recognised as the same
//      house instead of each earning their own 10%.
//
//   2. Only PAID bookings consume the offer. A booking row is written before
//      the customer is redirected to Stripe, so an abandoned checkout left an
//      'unpaid' row behind — and that row silently disqualified them from the
//      discount when they came back to finish. A booking they actually paid
//      for still counts even if it was later canceled.
//
// The 10% itself is applied server-side in functions/_lib/pricing.js; this
// module only decides eligibility.

export async function isFirstTimeCustomer(sql, customerId, address) {
  const addr = typeof address === 'string' && address.trim() ? address.trim() : null;

  // No address to match on (an account that has never booked, asking
  // /api/auth/me) — fall back to the account-only question, which is the
  // most that can honestly be answered without knowing the property.
  if (!addr) {
    const rows = await sql`
      select 1 from bookings
      where customer_id = ${customerId} and payment_status = 'paid'
      limit 1
    `;
    return rows.length === 0;
  }

  const rows = await sql`
    select 1 from bookings
    where payment_status = 'paid'
      and (customer_id = ${customerId}
           or gpc_address_key(address) = gpc_address_key(${addr}))
    limit 1
  `;
  return rows.length === 0;
}
