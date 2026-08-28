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

export async function onRequest(context) {
  const { request, next, env } = context;
  const response = await next();

  if (request.method === 'GET' && response.status === 200) {
    const url = new URL(request.url);
    const page = TRACKED_PATHS[url.pathname];
    if (page) {
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
