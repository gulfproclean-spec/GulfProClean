-- Backs functions/_lib/rate-limit.js: a minimal database-backed rate limit
-- for the login endpoints (functions/api/auth/login.js,
-- functions/api/applicant-auth/login.js, functions/api/vendor-auth/login.js)
-- and booking submission (functions/api/bookings.js), since this project has
-- no Cloudflare KV namespace configured to hold counters instead.
--
-- One row per (key, window_start) — `key` is something like
-- "login:customer:<ip>" or "booking:<ip>", `window_start` is the fixed-width
-- time bucket the request landed in (see checkRateLimit in
-- functions/_lib/rate-limit.js for how it's computed), and `count` is the
-- number of requests seen in that bucket so far.
--
-- NOT APPLIED AUTOMATICALLY. Per this repo's existing process (see
-- README.md's migrations note), paste this file's contents into the Neon
-- console's SQL Editor and run it once against the live database.
create table if not exists rate_limit_hits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

-- Lets a future cleanup job (not included here) cheaply delete expired
-- buckets without a full table scan. This table is small and self-limiting
-- (each key only ever has a handful of live windows), so cleanup is a
-- nice-to-have, not a requirement for this to work correctly.
create index if not exists rate_limit_hits_window_start_idx on rate_limit_hits (window_start);
