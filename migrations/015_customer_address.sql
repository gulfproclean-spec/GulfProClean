-- Mirrors the address/contact/billing fields already captured per-booking
-- (see 009_contact_address.sql, 013_billing_address.sql) onto the customer
-- record itself, so an account carries its most recent service address and
-- billing info independent of any single booking.
alter table customers add column if not exists first_name text;
alter table customers add column if not exists last_name text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists address_line1 text;
alter table customers add column if not exists unit text;
alter table customers add column if not exists city text;
alter table customers add column if not exists state text;
alter table customers add column if not exists zip text;
alter table customers add column if not exists address text;
alter table customers add column if not exists billing_address text;
