-- Adds a Biweekly billing plan (a 2-week prepaid block, months = 0.5)
-- alongside the existing Monthly/6-Month/12-Month plans, so `months` can no
-- longer be a whole number.
alter table bookings alter column months type numeric using months::numeric;
alter table bookings alter column months set default 1;
