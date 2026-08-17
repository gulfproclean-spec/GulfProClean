create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  page text,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on contact_messages(created_at desc);
