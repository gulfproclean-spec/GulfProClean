import { neon } from '@neondatabase/serverless';
import { getVendorFromSession } from '../../_lib/auth.js';

export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const vendor = await getVendorFromSession(sql, request);
  if (!vendor) {
    return new Response(JSON.stringify({ loggedIn: false }), { headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ loggedIn: true, email: vendor.email }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
