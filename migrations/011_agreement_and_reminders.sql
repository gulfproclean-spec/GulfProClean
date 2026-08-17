alter table bookings add column if not exists agreement_accepted_at timestamptz;
alter table bookings add column if not exists reminder_30_sent_at timestamptz;
alter table bookings add column if not exists reminder_15_sent_at timestamptz;
alter table bookings add column if not exists reminder_0_sent_at timestamptz;
