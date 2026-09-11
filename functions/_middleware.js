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

// Crawlers, monitors and scanners. Without this filter the counter reports
// bot hits as customer visits — the first week of data was ~55 hits/day, all
// on '/', with zero navigation to any other page, which is the signature of
// automated traffic rather than people.
//
// This is a heuristic on a self-declared header, so it is not exhaustive:
// well-behaved bots identify themselves, badly-behaved ones do not. Treat
// the result as "traffic minus the obvious bots," not as verified humans.
const BOT_PATTERN = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|w3c_validator|monitor|uptime|pingdom|statuscake|semrush|ahrefs|mj12|dotbot|petalbot|dataprovider|scrapy|curl|wget|python-requests|axios|headless|lighthouse|gtmetrix|phantomjs|puppeteer|playwright/i;

// Second signal, independent of the user-agent string: is the request coming
// from a datacenter/hosting network rather than a residential or mobile ISP?
// Cloudflare resolves this for us in request.cf.asOrganization. Real visitors
// browse from home/office/mobile connections; automated traffic (scrapers,
// headless browsers, bots that fake a normal browser UA to dodge BOT_PATTERN)
// very often runs on cloud compute. This will occasionally flag a legitimate
// visitor on a corporate VPN that egresses through a cloud provider — a
// deliberate false-positive tradeoff in favor of a cleaner traffic count.
const HOSTING_PROVIDER_PATTERN = /google|amazon|aws|microsoft azure|digitalocean|linode|akamai|ovh|hetzner|oracle cloud|alibaba|tencent|vultr|choopa|contabo|scaleway|leaseweb|hostinger/i;

function isBot(userAgent, asOrganization) {
  if (!userAgent) return true;          // no UA at all is not a browser
  if (BOT_PATTERN.test(userAgent)) return true;
  if (asOrganization && HOSTING_PROVIDER_PATTERN.test(asOrganization)) return true;
  return false;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const response = await next();

  if (request.method === 'GET' && response.status === 200) {
    const url = new URL(request.url);
    const page = TRACKED_PATHS[url.pathname];
    const userAgent = request.headers.get('user-agent');
    const cf = request.cf || {};
    if (page && !isBot(userAgent, cf.asOrganization)) {
      // Cloudflare's edge already resolved the visitor's IP to a
      // country/region/city — no external lookup needed.
      const geo = {
        ip: request.headers.get('CF-Connecting-IP') || null,
        country: cf.country || null,
        region: cf.region || null,
        city: cf.city || null,
      };
      // waitUntil lets this finish after the response is already on its way
      // to the browser — tracking never adds latency to a page load, and a
      // failure here (e.g. DB hiccup) never breaks the page itself.
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
