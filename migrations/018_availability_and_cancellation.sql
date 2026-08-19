-- Sets business hours to 7am-4pm, every day of the week.
insert into schedule_settings (id, days, updated_at)
values (1, '{
  "mon": {"enabled": true, "start": "07:00", "end": "16:00"},
  "tue": {"enabled": true, "start": "07:00", "end": "16:00"},
  "wed": {"enabled": true, "start": "07:00", "end": "16:00"},
  "thu": {"enabled": true, "start": "07:00", "end": "16:00"},
  "fri": {"enabled": true, "start": "07:00", "end": "16:00"},
  "sat": {"enabled": true, "start": "07:00", "end": "16:00"},
  "sun": {"enabled": true, "start": "07:00", "end": "16:00"}
}'::jsonb, now())
on conflict (id) do update set days = excluded.days, updated_at = now();

-- Marks a booking as canceled without touching payment_status (which still
-- means "was this charged"). Once set, the booking's scheduled_date/time
-- (and any visit_dates) stop blocking availability for other customers.
-- Set automatically when a refund request is filed (see
-- functions/api/bookings/[id]/refund.js) — the refund amount itself still
-- requires manual business review, but the calendar slot frees up right away.
alter table bookings add column if not exists canceled_at timestamptz;
