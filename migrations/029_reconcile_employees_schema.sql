-- Reconciles this file with the `employees` table as it has actually existed
-- in production since some point after 023_employee_assignment.sql (which
-- still defines `employees.name text not null`, and is now out of date).
--
-- No migration file in this repo ever added the columns below — they exist
-- live on production (and on every branch forked from it) but were applied
-- by hand at some point, the exact drift database-schema-drift.md warns
-- about. This migration doesn't change today's schema (every clause is
-- IF NOT EXISTS / idempotent against the current live shape); it exists so
-- the migration history stops lying about it, and so a fresh environment
-- built from scratch from these files ends up with the same table production
-- actually has.
--
-- Renaming `name` to first_name/last_name is why functions/_lib/assignment.js,
-- functions/api/employees.js, functions/api/employees/[id].js, and
-- functions/api/admin/bookings.js were all still querying a `name` column
-- that hasn't existed for a while — every one of them 500'd (Postgres
-- "column e.name does not exist") the moment they ran. Fixed alongside this
-- migration.
alter table employees rename column name to first_name;
alter table employees add column if not exists last_name text not null default '';
alter table employees alter column last_name drop default;

alter table employees add column if not exists address_line1 text;
alter table employees add column if not exists city text;
alter table employees add column if not exists state text;
alter table employees add column if not exists zip text;
alter table employees add column if not exists address text;
alter table employees add column if not exists home_lat numeric;
alter table employees add column if not exists home_lng numeric;
alter table employees add column if not exists work_days jsonb not null default '{}'::jsonb;
alter table employees add column if not exists max_hours_per_day numeric not null default 8;
alter table employees add column if not exists service_types text[] not null default '{residential,commercial}'::text[];
alter table employees add column if not exists notes text;
alter table employees add column if not exists updated_at timestamptz not null default now();

create unique index if not exists employees_email_key on employees(email);
create index if not exists employees_city_idx on employees(city);
