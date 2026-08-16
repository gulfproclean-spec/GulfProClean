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
  const rows = await sql`select content from site_content where page = ${page}`;
  if (rows.length === 0) {
    return cors(new Response(JSON.stringify({ error: 'not found' }), { status: 404 }));
  }
  return cors(new Response(JSON.stringify(rows[0].content), {
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
  const sql = neon(env.DATABASE_URL);
  await sql`
    insert into site_content (page, content, updated_at)
    values (${page}, ${JSON.stringify(body)}::jsonb, now())
    on conflict (page) do update set content = excluded.content, updated_at = now()
  `;
  return cors(new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  }));
}
