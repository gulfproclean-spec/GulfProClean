import { neon } from '@neondatabase/serverless';

// Which paths count as a tracked "page view." Deliberately excludes
// admin.html (so admin's own visits don't inflate customer traffic) and
// everything under /api/ (those are data calls, not page views).
const TRACKED_PATHS = {
  '/': 'index',
  '/index.html': 'index',
  '/residential.html': 'residential',
  '/commercial.html': 'commercial',
  '/contact.html': 'contact',
  '/book.html': 'book',
  '/account.html': 'account',
  '/residential-tiers.html': 'residential-tiers',
  '/residential-plans.html': 'residential-plans',
  '/residential-addons.html': 'residential-addons',
  '/residential-quote.html': 'residential-quote',
  '/residential-home-os.html': 'residential-home-os',
  '/commercial-tiers.html': 'commercial-tiers',
  '/commercial-plans.html': 'commercial-plans',
  '/commercial-addons.html': 'commercial-addons',
  '/commercial-quote.html': 'commercial-quote',
  '/careers.html': 'careers',
  '/careers-job.html': 'careers-job',
  '/careers-process.html': 'careers-process',
  '/apply.html': 'apply',
  '/vendors.html': 'vendors',
  '/vendors-bid.html': 'vendors-bid',
  // onboarding.html is deliberately absent: it is reached only from a personal
  // token link, and counting it would put candidate activity in a traffic report.
};

// Search engines and link-preview bots we WANT crawling the site (SEO,
// social share cards). These are never blocked and never logged as a page
// view (they aren't a customer either), regardless of what else matches.
// Checked first, and short-circuits every other check below.
const GOOD_CRAWLER_PATTERN = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|facebookexternalhit|bingpreview|twitterbot|linkedinbot|pinterest|embedly|quora|vkshare|w3c_validator/i;

// Crawlers, monitors and scanners we don't want counted as customer traffic,
// but also don't want to hard-block (uptime monitors are often something the
// business itself runs; blocking those would break their own tooling).
const SOFT_BOT_PATTERN = /bot|crawl|spider|monitor|uptime|pingdom|statuscake|semrush|ahrefs|mj12|dotbot|petalbot|dataprovider/i;

// Signatures with essentially zero legitimate reason to load a full HTML
// page: raw HTTP clients and scripting/automation libraries.
const HARD_BLOCK_TOOL_PATTERN = /curl|wget|python-requests|scrapy|node[/-]|^node$|node-fetch|undici|go-http-client|java\/[\d.]|libwww-perl|apache-httpclient|okhttp|phantomjs|puppeteer|playwright|headless|lighthouse|gtmetrix/i;

function isKnownGoodCrawler(userAgent) {
  return !!userAgent && GOOD_CRAWLER_PATTERN.test(userAgent);
}

function isHardBlocked(userAgent) {
  if (isKnownGoodCrawler(userAgent)) return false;
  if (!userAgent) return true;
  if (!userAgent.startsWith('Mozilla/')) return true;
  if (HARD_BLOCK_TOOL_PATTERN.test(userAgent)) return true;
  return false;
}

const HOSTING_PROVIDER_PATTERN = /google|amazon|aws|microsoft azure|digitalocean|linode|akamai|ovh|hetzner|oracle cloud|alibaba|tencent|vultr|choopa|contabo|scaleway|leaseweb|hostinger|quadranet|psychz|m247|host europe|servint|webair|cogent|as-colo|colo(cation)?|data ?center|hosting|dedicated|vps|server(s)?\b/i;

const MAX_BROWSER_VERSION = 145;
const VERSIONED_UA_PATTERN = /(Chrome|CriOS|Firefox|FxiOS|Edg|OPR)\/(\d+)/;

function hasImplausibleVersion(userAgent) {
  const match = userAgent.match(VERSIONED_UA_PATTERN);
  if (!match) return false;
  const version = parseInt(match[2], 10);
  return version > MAX_BROWSER_VERSION;
}

function isExcludedFromAnalytics(userAgent, asOrganization) {
  if (isKnownGoodCrawler(userAgent)) return true;
  if (!userAgent) return true;
  if (SOFT_BOT_PATTERN.test(userAgent)) return true;
  if (isHardBlocked(userAgent)) return true;
  if (asOrganization && HOSTING_PROVIDER_PATTERN.test(asOrganization)) return true;
  if (hasImplausibleVersion(userAgent)) return true;
  return false;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const page = TRACKED_PATHS[url.pathname];
  const userAgent = request.headers.get('user-agent');

  if (request.method === 'GET' && page && isHardBlocked(userAgent)) {
    return new Response('Forbidden', { status: 403 });
  }

  const response = await next();

  if (request.method === 'GET' && response.status === 200) {
    const cf = request.cf || {};
    if (page && !isExcludedFromAnalytics(userAgent, cf.asOrganization)) {
      const geo = {
        ip: request.headers.get('CF-Connecting-IP') || null,
        country: cf.country || null,
        region: cf.region || null,
        city: cf.city || null,
      };
      context.waitUntil(logVisit(env, page, url.pathname, geo, userAgent));
    }
  }

  return response;
}

// TEMPORARY DIAGNOSTIC: page_views logging silently stopped working after
// the last deploy (confirmed: deploy succeeded, _middleware.js is correctly
// bundled and routed, and the exact insert statement below works fine when
// run directly against the database). The remaining unknown is something
// failing specifically inside this Function's runtime that the normal
// silent catch was hiding. This version records the actual error message to
// page_view_errors instead of swallowing it, so the next real visit reveals
// the cause. Revert to a plain swallow once the root cause is found and
// fixed — this table is not meant to be permanent.
async function logVisit(env, page, path, geo, userAgent) {
  let sql;
  try {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in this environment');
    }
    sql = neon(env.DATABASE_URL);
    await sql`
      insert into page_views (page, path, ip_address, country, region, city, user_agent)
      values (${page}, ${path}, ${geo.ip}, ${geo.country}, ${geo.region}, ${geo.city}, ${userAgent})
    `;
  } catch (e) {
    try {
      const errSql = sql || neon(env.DATABASE_URL);
      await errSql`
        insert into page_view_errors (error_message, page, path, user_agent)
        values (${String(e && e.message ? e.message : e)}, ${page}, ${path}, ${userAgent})
      `;
    } catch (e2) {
      // If even the error-logging insert fails, there is genuinely nothing
      // more this function can do without surfacing something to the
      // visitor, which tracking must never do.
    }
  }
}
