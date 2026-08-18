-- Optional per-visit schedule: null for the default "same day/time,
-- recurring" bookings. When the customer chooses to pick each visit's date
-- individually, this holds the full list [{date, time}, ...]; the booking's
-- existing scheduled_date/scheduled_time columns still hold the first visit
-- (what refund/reschedule logic reads as "the" scheduled visit).
alter table bookings add column if not exists visit_dates jsonb;
