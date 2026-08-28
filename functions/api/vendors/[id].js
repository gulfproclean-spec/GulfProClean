import { neon } from '@neondatabase/serverless';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const STATUSES = ['new', 'verifying', 'approved', 'rejected', 'inactive'];

function requireAdmin(env, request) {
  const auth = request.headers.get('authorization');
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}

export async function onRequestGet({ env, request, params }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`select * from vendor_submissions where id = ${params.id}`;
  if (!rows.length) return json({ error: 'not found' }, 404);
  return json(rows[0]);
}

// PATCH /api/vendors/:id
//   { status?, notes_internal?, license_verified?: { by },
//     coi_received?, w9_received?, workers_comp_verified? }
//
// A vendor cannot be approved until its licence has been verified against the
// issuing authority and its insurance confirmed. Enforcing that here rather
// than in the admin UI means the rule survives a rushed afternoon.
export async function onRequestPatch({ env, request, params }) {
  if (!requireAdmin(env, request)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const found = await sql`select * from vendor_submissions where id = ${params.id}`;
  if (!found.length) return json({ error: 'not found' }, 404);
  const v = found[0];

  if (body.license_verified) {
    const by = typeof body.license_verified.by === 'string' ? body.license_verified.by.slice(0, 200) : 'admin';
    await sql`
      update vendor_submissions
         set license_verified_at = now(), license_verified_by = ${by}, updated_at = now()
       where id = ${params.id}
    `;
    v.license_verified_at = new Date().toISOString();
  }

  for (const flag of ['coi_received', 'w9_received', 'workers_comp_verified']) {
    if (typeof body[flag] === 'boolean') {
      if (flag === 'coi_received') {
        await sql`update vendor_submissions set coi_received = ${body[flag]}, updated_at = now() where id = ${params.id}`;
      } else if (flag === 'w9_received') {
        await sql`update vendor_submissions set w9_received = ${body[flag]}, updated_at = now() where id = ${params.id}`;
      } else {
        await sql`update vendor_submissions set workers_comp_verified = ${body[flag]}, updated_at = now() where id = ${params.id}`;
      }
      v[flag] = body[flag];
    }
  }

  if (typeof body.status === 'string') {
    if (!STATUSES.includes(body.status)) {
      return json({ error: `status must be one of: ${STATUSES.join(', ')}` }, 400);
    }
    if (body.status === 'approved') {
      const needsLicense = v.details && v.details.license_required === 'yes';
      if (needsLicense && !v.license_verified_at) {
        return json({ error: "This vendor's licence has not been verified with the issuing authority yet. Verify it first, then approve." }, 400);
      }
      if (!v.coi_received) {
        return json({ error: 'No certificate of insurance recorded. Mark the COI received before approving.' }, 400);
      }
      if (!v.workers_comp_verified) {
        return json({ error: "Workers' compensation coverage or exemption has not been verified. Verify it before approving." }, 400);
      }
    }
    await sql`update vendor_submissions set status = ${body.status}, updated_at = now() where id = ${params.id}`;
  }

  if (typeof body.notes_internal === 'string') {
    await sql`update vendor_submissions set notes_internal = ${body.notes_internal.slice(0, 8000)}, updated_at = now() where id = ${params.id}`;
  }

  const updated = await sql`select * from vendor_submissions where id = ${params.id}`;
  return json({ ok: true, vendor: updated[0] });
}
