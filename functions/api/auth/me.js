import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../_lib/auth.js';
import { isFirstTimeCustomer } from '../../_lib/first-time.js';

export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) {
    return new Response(JSON.stringify({ loggedIn: false }), { headers: { 'Content-Type': 'application/json' } });
  }
  // Uses the address on the customer record (kept current by
  // POST /api/bookings), so a second account at an already-serviced property
  // is not reported as first-time. This endpoint used to ask the
  // account-only question and could disagree with signup, login and the
  // authoritative check at booking time.
  const isFirstTime = await isFirstTimeCustomer(sql, customer.id, customer.address);
  return new Response(JSON.stringify({ loggedIn: true, email: customer.email, isFirstTime }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
