// Minimal database-backed rate limiter.
//
// This Cloudflare Pages project has no KV namespace configured (see
// wrangler.jsonc), so there is nowhere to keep counters between requests
// except the database it already talks to on every request anyway. Each
// call checks and atomically increments a fixed-width time-window bucket in
// the `rate_limit_hits` table (see migrations/031_rate_limit_hits.sql).
//
// The bucket is a simple fixed window (not sliding), so a burst can land up
// to `maxAttempts` right at the start of a new window shortly after another
// `maxAttempts` at the end of the previous one — good enough to blunt
// scripted login/booking-spam attempts without any new infrastructure; it
// is not meant to be a precise or adversarial-proof limiter.
//
// Usage:
//   const ok = await checkRateLimit(sql, `login:customer:${ip}`, 600, 10);
//   if (!ok) return json({ error: 'Too many attempts. Please try again in a few minutes.' }, 429);
export async function checkRateLimit(sql, key, windowSeconds, maxAttempts) {
  try {
    const rows = await sql`
      insert into rate_limit_hits (key, window_start, count)
      values (
        ${key},
        to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}),
        1
      )
      on conflict (key, window_start) do update set count = rate_limit_hits.count + 1
      returning count
    `;
    const count = rows[0] ? rows[0].count : 1;
    return count <= maxAttempts;
  } catch (e) {
    // If the rate-limit table is missing or the check fails for any other
    // reason, fail OPEN rather than locking out every visitor to login or
    // booking because of an unrelated database hiccup.
    return true;
  }
}

// Best-effort client IP for keying a rate limit. Cloudflare always sets
// CF-Connecting-IP on real traffic; x-forwarded-for is a fallback for local/
// non-Cloudflare requests, and a fixed string keeps a fully unidentified
// request from throwing rather than from being rate-limited as a group.
export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
}
