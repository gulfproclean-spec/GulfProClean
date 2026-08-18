-- Mirrors billing_address (013_billing_address.sql, 015_customer_address.sql):
-- a "billing name" distinct from the customer's own name, null when it's
-- the same as the customer's name.
alter table bookings add column if not exists billing_name text;
alter table customers add column if not exists billing_name text;
