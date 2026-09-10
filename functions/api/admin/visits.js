import { neon } from '@neondatabase/serverless';
import { timingSafeEqualString } from '../../_lib/auth.js';

export async function onRequestGet({ env, request }) {
  const auth = request.headers.get('Authorization') || '';
  if (!timingSafeEqualString(auth, `Bearer ${env.ADMIN_TOKEN}`)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const sql = neon(env.DATABASE_URL);
  const [totalRows, byPageRows, last7DaysRows, byCountryRows, recentRows] = await Promise.all([
    sql`select count(*)::int as total from page_views`,
    sql`select page, count(*)::int as count from page_views group by page order by count desc`,
    sql`
      select to_char(viewed_at, 'YYYY-MM-DD') as day, count(*)::int as count
      from page_views
      where viewed_at > now() - interval '7 days'
      group by day
      order by day asc
    `,
    sql`
      select coalesce(country, 'Unknown') as country, count(*)::int as count
      from page_views
      group by country
      order by count desc
    `,
    sql`
      select page, path, ip_address::text as ip_address, country, region, city,
             to_char(viewed_at_central, 'YYYY-MM-DD HH24:MI') as viewed_at
      from page_views
      order by viewed_at desc
      limit 50
    `,
  ]);

  return new Response(JSON.stringify({
    total: totalRows[0]?.total || 0,
    byPage: byPageRows,
    last7Days: last7DaysRows,
    byCountry: byCountryRows,
    recentVisits: recentRows,
  }), { headers: { 'Content-Type': 'application/json' } });
}
