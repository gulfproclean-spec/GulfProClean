-- Anonymous page-view counter for the admin dashboard.
-- No IP addresses, cookies, or visitor identifiers are stored — just an
-- aggregate count per page, per visit.
create table if not exists page_views (
  id bigserial primary key,
  page text not null,
  path text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_page_views_page on page_views (page);
create index if not exists idx_page_views_viewed_at on page_views (viewed_at);
