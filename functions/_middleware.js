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
