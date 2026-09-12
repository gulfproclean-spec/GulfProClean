import { neon } from '@neondatabase/serverless';

// ULTRA-MINIMAL DIAGNOSTIC VERSION. All bot-detection/classification logic
// temporarily removed to isolate whether the Function runs at all and
// whether the DB insert succeeds from this runtime, independent of any of
// that logic. Every single GET request gets an unconditional insert
// attempt into page_view_errors (repurposed here as a generic diagnostic
// log, not just errors) recording either "ok" or the real error message.
// This is not meant to stay — restore the real _middleware.js content once
// the cause is found.
export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const response = await next();

  if (request.method === 'GET') {
    context.waitUntil(diagnosticLog(env, url.pathname, request.headers.get('user-agent')));
  }

  return response;
}

async function diagnosticLog(env, path, userAgent) {
  let status = 'ok';
  try {
    if (!env.DATABASE_URL) {
      status = 'DATABASE_URL missing';
    }
    const sql = neon(env.DATABASE_URL);
    await sql`
      insert into page_view_errors (error_message, page, path, user_agent)
      values (${status}, ${'diagnostic'}, ${path}, ${userAgent})
    `;
  } catch (e) {
    // Last-resort: try again with a bare-minimum insert in case the
    // failure is something about the template values themselves rather
    // than the connection.
    try {
      const sql2 = neon(env.DATABASE_URL);
      await sql2`insert into page_view_errors (error_message) values (${'CAUGHT: ' + String(e && e.stack ? e.stack : e)})`;
    } catch (e2) {
      // truly nothing more we can do
    }
  }
}
