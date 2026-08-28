import { neon } from '@neondatabase/serverless';
import { sendPrehireInviteEmail } from '../../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const STATUSES = ['new', 'screening', 'interview', 'working_interview', 'offer',
                  'onboarding', 'hired', 'declined', 'withdrawn'];

function requireAdmin(env, request) {
  const auth = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

// 32 hex characters from the platform CSPRNG. Long enough that the onboarding
// link cannot be guessed, which is the only thing standing between a stranger
// and someone else's pre-hire paperwork.
function newToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ env, request, params }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select a.*, p.token as prehire_token, p.completed_at as prehire_completed_at,
           p.legal_name as prehire_legal_name, p.confirmed_start_date,
           p.fcra_authorized, p.mvr_authorized, p.i9_acknowledged,
           p.drug_policy_acknowledged, p.signed_ip
      from job_applications a
      left join prehire_authorizations p on p.application_id = a.id
     where a.id = ${params.id}
  `;
  if (!rows.length) return json({ error: 'not found' }, 404);
  return json(rows[0]);
}

// PATCH /api/applications/:id
//   { status?, notes_internal?, issue_prehire?: { drives: boolean } }
//
// Issuing the pre-hire link is deliberately a separate, explicit action rather
// than something that fires automatically on a status change: the link is what
// starts the background check, and that should never happen by accident.
export async function onRequestPatch({ env, request, params }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const found = await sql`select * from job_applications where id = ${params.id}`;
  if (!found.length) return json({ error: 'not found' }, 404);
  const app = found[0];

  if (typeof body.status === 'string') {
    if (!STATUSES.includes(body.status)) {
      return json({ error: `status must be one of: ${STATUSES.join(', ')}` }, 400);
    }
    await sql`update job_applications set status = ${body.status}, updated_at = now() where id = ${params.id}`;
  }

  if (typeof body.notes_internal === 'string') {
    await sql`update job_applications set notes_internal = ${body.notes_internal.slice(0, 8000)}, updated_at = now() where id = ${params.id}`;
  }

  let prehire = null;
  if (body.issue_prehire) {
    const existing = await sql`select * from prehire_authorizations where application_id = ${params.id}`;
    if (existing.length) {
      prehire = existing[0];   // never mint a second token for one application
    } else {
      const token = newToken();
      const drives = body.issue_prehire.drives !== false;
      const created = await sql`
        insert into prehire_authorizations (application_id, token, role_slug, role_title, drives)
        values (${params.id}, ${token}, ${app.role_slug}, ${app.role_title}, ${drives})
        returning *
      `;
      prehire = created[0];
      await sql`update job_applications set status = 'onboarding', updated_at = now() where id = ${params.id}`;

      const origin = new URL(request.url).origin;
      try {
        await sendPrehireInviteEmail(env, {
          to: app.email,
          name: `${app.first_name} ${app.last_name}`,
          roleTitle: app.role_title,
          link: `${origin}/onboarding.html?token=${token}`,
        });
      } catch (e) {
        // The token exists either way; the link can be resent from admin.
      }
    }
  }

  const updated = await sql`
    select a.*, p.token as prehire_token, p.completed_at as prehire_completed_at
      from job_applications a
      left join prehire_authorizations p on p.application_id = a.id
     where a.id = ${params.id}
  `;
  return json({ ok: true, application: updated[0], prehire });
}
