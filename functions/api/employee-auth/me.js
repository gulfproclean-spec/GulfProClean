import { neon } from '@neondatabase/serverless';
import { getEmployeeFromSession } from '../../_lib/auth.js';

export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const emp = await getEmployeeFromSession(sql, request);
  if (!emp) {
    return new Response(JSON.stringify({ loggedIn: false }), { headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({
    loggedIn: true, id: emp.id, email: emp.email,
    name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
  }), { headers: { 'Content-Type': 'application/json' } });
}
