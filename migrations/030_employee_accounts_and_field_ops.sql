-- Employee login + the field-ops data the employee app (employee.html /
-- the Gulf ProClean Crew mobile app) reads and writes.
--
-- Employees do NOT self-register: the office creates each technician in
-- admin.html's Crew panel and sets their password there (or via
-- PATCH /api/employees/:id { password }). password_hash/salt are therefore
-- nullable — a technician with no password set simply cannot log in yet.
-- Sessions mirror customers/sessions, applicant_sessions and vendor_sessions
-- exactly (see 027) so functions/_lib/auth.js reuses the same helpers with
-- its own cookie name, employee_session.
--
-- Additive only. No drops, no data changes.

alter table employees add column if not exists password_hash text;
alter table employees add column if not exists password_salt text;

create table if not exists employee_sessions (
  token text primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- One row per booking, created lazily the first time the assigned technician
-- touches it. checks is a flat map "<phase>::<category>::<itemIndex>" -> true,
-- matching the checklist definition in employee-app.js; status is derived
-- from clock_in / checks / signoff rather than stored, so the two can never
-- disagree.
create table if not exists job_progress (
  booking_id uuid primary key references bookings(id) on delete cascade,
  employee_id uuid references employees(id),
  checks jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  signoff jsonb not null default '{}'::jsonb,
  clock_in timestamptz,
  clock_out timestamptz,
  updated_at timestamptz not null default now()
);

-- Start-of-shift supply check: one per technician per day. items is a map of
-- kit item name -> 'ok' | 'low' | 'out'.
create table if not exists supply_checks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  check_date date not null,
  items jsonb not null default '{}'::jsonb,
  notes text,
  submitted_at timestamptz not null default now(),
  unique (employee_id, check_date)
);

create index if not exists supply_checks_date_idx on supply_checks(check_date);

-- Account deletion (functions/api/auth/delete-account.js, required by both
-- app stores) keeps paid bookings for accounting but detaches them from the
-- deleted person, so the FK must allow null. Unpaid bookings still cascade
-- away with the customer row as before.
alter table bookings alter column customer_id drop not null;
