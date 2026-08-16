import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../_lib/auth.js';

export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) {
    return new Response(JSON.stringify({ loggedIn: false }), { headers: { 'Content-Type': 'application/json' } });
  }
  const bookingRows = await sql`select 1 from bookings where customer_id = ${customer.id} limit 1`;
  const isFirstTime = bookingRows.length === 0;
  return new Response(JSON.stringify({ loggedIn: true, email: customer.email, isFirstTime }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
