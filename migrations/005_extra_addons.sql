alter table bookings add column if not exists extra_addons jsonb not null default '[]';
