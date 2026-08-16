import { neon } from '@neondatabase/serverless';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function validDays(days) {
  if (!days || typeof days !== 'object') return false;
  return DAY_KEYS.every(k => {
    const d = days[k];
    return d && typeof d.enabled === 'boolean' && /^\d{2}:\d{2}$/.test(d.start) && /^\d{2}:\d{2}$/.test(d.end);
  });
}

export async function onRequestGet({ env }) {
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`select days from schedule_settings where id = 1`;
  const days = rows[0] ? rows[0].days : null;
  return new Response(JSON.stringify({ days }), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPut({ env, request }) {
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }
  if (!validDays(body.days)) {
    return new Response(JSON.stringify({ error: 'invalid schedule shape' }), { status: 400 });
  }
  const sql = neon(env.DATABASE_URL);
  await sql`
    insert into schedule_settings (id, days, updated_at)
    values (1, ${JSON.stringify(body.days)}::jsonb, now())
    on conflict (id) do update set days = excluded.days, updated_at = now()
  `;
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
