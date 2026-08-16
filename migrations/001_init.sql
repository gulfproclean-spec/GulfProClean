create table if not exists site_content (
  page text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);
