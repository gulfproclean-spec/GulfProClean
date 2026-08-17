alter table bookings add column if not exists pricing_input jsonb not null default '{}';
