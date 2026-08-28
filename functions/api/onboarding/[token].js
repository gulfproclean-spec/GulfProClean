import { neon } from '@neondatabase/serverless';
import { sendPrehireCompletedEmail, sendPrehireCopyToCandidateEmail } from '../../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// GET /api/onboarding/:token — public, but only useful to whoever holds the
// token. It returns the role title and whether the role drives, and nothing
// about the applicant beyond their first name: enough to show them they are in
// the right place, not enough to leak a candidate list to a guessed token.
export async function onRequestGet({ env, params }) {
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select p.role_title, p.drives, p.completed_at, a.first_name
      from prehire_authorizations p
      join job_applications a on a.id = p.application_id
     where p.token = ${params.token}
  `;
  if (!rows.length) return json({ error: 'not found' }, 404);
  const r = rows[0];
  return json({
    role_title: r.role_title,
    drives: r.drives,
    applicant_name: r.first_name,
    completed: !!r.completed_at,
  });
}

// POST /api/onboarding/:token — the candidate signing.
export async function onRequestPost({ env, request, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const legalName = typeof body.legal_name === 'string' ? body.legal_name.trim().slice(0, 200) : '';
  if (!legalName) return json({ error: 'Please type your full legal name to sign.' }, 400);

  // The FCRA requires the disclosure and a separate written authorization
  // before a report may be obtained, so an unsigned submission is refused
  // rather than stored as a partial record.
  if (!body.fcra_authorized || !body.fcra_summary_received) {
    return json({ error: 'The background check authorization in section A is required.' }, 400);
  }
  if (!body.i9_acknowledged) {
    return json({ error: 'The Form I-9 acknowledgement in section C is required.' }, 400);
  }
  if (!body.drug_policy_acknowledged) {
    return json({ error: 'The drug-free workplace acknowledgement in section D is required.' }, 400);
  }
  if (!body.esign_acknowledged) {
    return json({ error: 'Please confirm that typing your name is your electronic signature.' }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const found = await sql`
    select p.*, a.email, a.first_name, a.last_name
      from prehire_authorizations p
      join job_applications a on a.id = p.application_id
     where p.token = ${params.token}
  `;
  if (!found.length) return json({ error: 'not found' }, 404);
  const row = found[0];

  // Already signed — return success rather than an error, so a candidate who
  // refreshes or clicks the emailed link twice does not think it failed.
  if (row.completed_at) return json({ ok: true, already_completed: true });

  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || null;
  const ua = request.headers.get('user-agent') || null;

  const startDate = typeof body.confirmed_start_date === 'string' && body.confirmed_start_date
    ? body.confirmed_start_date : null;

  await sql`
    update prehire_authorizations set
      legal_name = ${legalName},
      confirmed_start_date = ${startDate},
      fcra_authorized = true,
      fcra_summary_received = true,
      mvr_authorized = ${!!body.mvr_authorized},
      i9_acknowledged = true,
      drug_policy_acknowledged = true,
      esign_acknowledged = true,
      signed_ip = ${ip},
      signed_user_agent = ${ua ? ua.slice(0, 500) : null},
      completed_at = now()
     where token = ${params.token}
  `;

  const signed = {
    name: legalName,
    roleTitle: row.role_title,
    startDate,
    mvrAuthorized: !!body.mvr_authorized,
    signedAt: new Date().toISOString(),
    email: row.email,
  };

  try {
    await sendPrehireCompletedEmail(env, signed);
    await sendPrehireCopyToCandidateEmail(env, signed);
  } catch (e) {
    // The signature is recorded either way.
  }

  return json({ ok: true });
}
