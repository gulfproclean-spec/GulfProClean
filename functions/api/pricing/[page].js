import { neon } from '@neondatabase/serverless';

const PAGES = new Set(['residential', 'commercial']);

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return res;
}

export async function onRequestOptions() {
  return cors(new Response(null, { status: 204 }));
}

export async function onRequestGet({ params, env }) {
  const page = params.page;
  if (!PAGES.has(page)) {
    return cors(new Response(JSON.stringify({ error: 'unknown page' }), { status: 404 }));
  }
  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select band_order, band_label, max_sqft,
           essential::float8 as essential, preferred::float8 as preferred, premium::float8 as premium,
           unavailable
    from pricing_tiers where page = ${page} order by band_order
  `;
  return cors(new Response(JSON.stringify({ rows }), {
    headers: { 'Content-Type': 'application/json' },
  }));
}

export async function onRequestPut({ params, env, request }) {
  const page = params.page;
  if (!PAGES.has(page)) {
    return cors(new Response(JSON.stringify({ error: 'unknown page' }), { status: 404 }));
  }
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return cors(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }));
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return cors(new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 }));
  }
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows || rows.length === 0 || rows.some(r => typeof r.band_label !== 'string' || !r.band_label.trim() || !Number.isFinite(Number(r.band_order)))) {
    return cors(new Response(JSON.stringify({ error: 'invalid rows' }), { status: 400 }));
  }

  const sql = neon(env.DATABASE_URL);
  await sql`delete from pricing_tiers where page = ${page}`;
  for (const r of rows) {
    const maxSqft = r.max_sqft === '' || r.max_sqft == null ? null : Number(r.max_sqft);
    const unavailable = !!r.unavailable;
    const essential = unavailable || r.essential === '' || r.essential == null ? null : Number(r.essential);
    const preferred = unavailable || r.preferred === '' || r.preferred == null ? null : Number(r.preferred);
    const premium = unavailable || r.premium === '' || r.premium == null ? null : Number(r.premium);
    await sql`
      insert into pricing_tiers (page, band_order, band_label, max_sqft, essential, preferred, premium, unavailable)
      values (${page}, ${Number(r.band_order)}, ${r.band_label.trim()}, ${maxSqft}, ${essential}, ${preferred}, ${premium}, ${unavailable})
    `;
  }
  return cors(new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  }));
}
