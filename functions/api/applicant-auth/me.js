import { neon } from '@neondatabase/serverless';
import { getApplicantFromSession } from '../../_lib/auth.js';

export async function onRequestGet({ env, request }) {
  const sql = neon(env.DATABASE_URL);
  const applicant = await getApplicantFromSession(sql, request);
  if (!applicant) {
    return new Response(JSON.stringify({ loggedIn: false }), { headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ loggedIn: true, email: applicant.email }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
