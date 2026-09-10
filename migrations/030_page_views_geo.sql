-- Adds IP-based geolocation to page-view tracking, sourced from Cloudflare's
-- edge request data (request.cf / CF-Connecting-IP) — no external
-- geolocation service or client-side code needed.
--
-- This is a deliberate change from this table's original design (see
-- 020_page_views.sql, which built it as anonymous by intent). Added
-- 2026-09-10 at the owner's explicit request, with explicit confirmation to
-- store both the raw IP address and city-level location.
alter table page_views
  add column if not exists ip_address inet,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists city text;

create index if not exists idx_page_views_country on page_views (country);
