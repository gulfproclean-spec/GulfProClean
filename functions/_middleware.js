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
// page: raw HTTP clients and scripting/automation libraries. A real
// browser's user-agent — even an obscure or very old one — starts with
// "Mozilla/5.0" for historical compatibility reasons, and search engines
// preserve that too (see GOOD_CRAWLER_PATTERN, checked first). No UA at
// all, or a UA that isn't shaped like a browser's, or an explicit tool
// signature, is about as close to certain as this gets that the request is
// a script, not a person — so these are actively refused with a 403 rather
// than merely excluded from analytics.
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

// Analytics-only signal: is the request coming from a datacenter/hosting
// network rather than a residential or mobile ISP? Cloudflare resolves this
// for us in request.cf.asOrganization. Real visitors browse from
// home/office/mobile connections; automated traffic very often runs on
// cloud compute. This will occasionally flag a legitimate visitor on a
// corporate VPN — a deliberate false-positive tradeoff in favor of a
// cleaner traffic count, which is why this stays analytics-only rather
// than a hard block.
const HOSTING_PROVIDER_PATTERN = /google|amazon|aws|microsoft azure|digitalocean|linode|akamai|ovh|hetzner|oracle cloud|alibaba|tencent|vultr|choopa|contabo|scaleway|leaseweb|hostinger|quadranet|psychz|m247|host europe|servint|webair|cogent|as-colo|colo(cation)?|data ?center|hosting|dedicated|vps|server(s)?\b/i;

// NOTE: a browser-version-plausibility check ("is this Chrome version too
// high to be real?") lived here briefly and was removed. It caused a real
// production incident: it silently misclassified genuine, up-to-date
// Chrome browsers as bots the moment real Chrome's version number passed
// the hardcoded ceiling, with no error of any kind — analytics just quietly
// stopped recording real visitors. Any check based on "what a plausible
// current version number looks like" goes stale the moment browsers
// release again and is not worth the risk of silently losing real traffic
// data. The signals above (known bot/tool keywords, hosting-provider ASN)
// don't have this failure mode and are sufficient on their own.

function isExcludedFromAnalytics(userAgent, asOrganization) {
  if (isKnownGoodCrawler(userAgent)) return true;
  if (!userAgent) return true;
  if (SOFT_BOT_PATTERN.test(userAgent)) return true;
  if (isHardBlocked(userAgent)) return true;
  if (asOrganization && HOSTING_PROVIDER_PATTERN.test(asOrganization)) return true;
  return false;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const page = TRACKED_PATHS[url.pathname];
  const userAgent = request.headers.get('user-agent');

  // Hard-block obvious script/automation traffic on real page routes before
  // it ever reaches the page-rendering code. Scoped to TRACKED_PATHS (not
  // /api/*) so server-to-server callers like the Stripe webhook are
  // unaffected.
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

async function logVisit(env, page, path, geo, userAgent) {
  try {
    const sql = neon(env.DATABASE_URL);
    await sql`
      insert into page_views (page, path, ip_address, country, region, city, user_agent)
      values (${page}, ${path}, ${geo.ip}, ${geo.country}, ${geo.region}, ${geo.city}, ${userAgent})
    `;
  } catch (e) {
    // Swallow — visit tracking must never surface an error to the visitor.
  }
}
