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

function isBot(userAgent) {
  if (!userAgent) return true;          // no UA at all is not a browser
  return BOT_PATTERN.test(userAgent);
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const response = await next();

  if (request.method === 'GET' && response.status === 200) {
    const url = new URL(request.url);
    const page = TRACKED_PATHS[url.pathname];
    if (page && !isBot(request.headers.get('user-agent'))) {
      // waitUntil lets this finish after the response is already on its way
      // to the browser — tracking never adds latency to a page load, and a
      // failure here (e.g. DB hiccup) never breaks the page itself.
      context.waitUntil(logVisit(env, page, url.pathname));
    }
  }

  return response;
}

async function logVisit(env, page, path) {
  try {
    const sql = neon(env.DATABASE_URL);
    await sql`insert into page_views (page, path) values (${page}, ${path})`;
  } catch (e) {
    // Swallow — visit tracking must never surface an error to the visitor.
  }
}
