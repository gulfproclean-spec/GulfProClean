alter table bookings add column if not exists addons_applied jsonb not null default '[]';
