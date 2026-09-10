import { neon } from '@neondatabase/serverless';
import { timingSafeEqualString } from '../../_lib/auth.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const REFUND_STATUSES = ['pending', 'processed', 'declined'];
const PLAN_STATUSES    = ['pending', 'applied', 'declined'];

function str(v, max = 500) {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}

// PATCH /api/requests/:id — admin only. Body: { kind, status, stripeRef, resolvedBy, notes }
//
// `kind` is required and disambiguates the two tables; ids are UUIDs from
// different sequences and could otherwise collide in principle.
//
// THIS ENDPOINT MOVES NO MONEY. It records what a human already did in the
// Stripe dashboard. Marking a refund 'processed' therefore requires
// stripeRef — the re_... id of the refund actually issued. Without it there
// is nothing tying the row to a real movement of funds, and "processed"
// would mean only that somebody clicked a button.
export async function onRequestPatch({ env, request, params }) {
  const auth = request.headers.get('authorization');
  if (!env.ADMIN_TOKEN || !timingSafeEqualString(auth || '', `Bearer ${env.ADMIN_TOKEN}`)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const kind = body.kind;
  if (kind !== 'refund' && kind !== 'plan_change') {
    return json({ error: 'kind must be "refund" or "plan_change"' }, 400);
  }

  const status     = str(body.status, 40);
  const stripeRef  = str(body.stripeRef, 200);
  const resolvedBy = str(body.resolvedBy, 120);
  const notes      = str(body.notes, 2000);

  const allowed = kind === 'refund' ? REFUND_STATUSES : PLAN_STATUSES;
  if (!status || !allowed.includes(status)) {
    return json({ error: `status must be one of: ${allowed.join(', ')}` }, 400);
  }

  const settled = kind === 'refund' ? 'processed' : 'applied';
  if (status === settled && !stripeRef) {
    return json({
      error: kind === 'refund'
        ? 'Issue the refund in the Stripe dashboard first, then paste its refund id (re_...) here. This screen does not move money.'
        : 'Charge or credit the difference in the Stripe dashboard first, then paste the payment intent or refund id here. This screen does not move money.',
    }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const resolvedAt = status === 'pending' ? null : new Date().toISOString();

  const rows = kind === 'refund'
    ? await sql`
        update refund_requests
           set status = ${status},
               stripe_refund_id = coalesce(${stripeRef}, stripe_refund_id),
               resolved_by = coalesce(${resolvedBy}, resolved_by),
               notes = coalesce(${notes}, notes),
               resolved_at = ${resolvedAt}
         where id = ${params.id}
         returning *`
    : await sql`
        update plan_change_requests
           set status = ${status},
               stripe_reference = coalesce(${stripeRef}, stripe_reference),
               resolved_by = coalesce(${resolvedBy}, resolved_by),
               notes = coalesce(${notes}, notes),
               resolved_at = ${resolvedAt}
         where id = ${params.id}
         returning *`;

  if (rows.length === 0) return json({ error: 'not found' }, 404);
  return json({ ok: true, row: rows[0] });
}
