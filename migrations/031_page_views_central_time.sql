-- Adds a Central-time column to page_views, alongside the existing
-- viewed_at (a timestamptz — an absolute instant, not tied to any
-- timezone). Gulf ProClean operates on Central Time, so this gives the
-- admin dashboard a ready-to-read local time without doing timezone math
-- by hand on every query.
alter table page_views
  add column if not exists viewed_at_central timestamp;

-- Backfill rows that existed before this column did.
update page_views
  set viewed_at_central = viewed_at at time zone 'America/Chicago'
  where viewed_at_central is null;

-- Keep it populated automatically on every future insert (and on any
-- update that changes viewed_at), derived from viewed_at — so no
-- application code needs to set it explicitly, and it stays correct
-- through CST/CDT changes since 'America/Chicago' carries DST rules.
create or replace function set_page_views_central_time()
returns trigger as $$
begin
  new.viewed_at_central := new.viewed_at at time zone 'America/Chicago';
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_page_views_central_time on page_views;
create trigger trg_page_views_central_time
  before insert or update on page_views
  for each row
  execute function set_page_views_central_time();
