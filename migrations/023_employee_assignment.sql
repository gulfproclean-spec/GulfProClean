-- Technicians available for dispatch, and the assignment on each booking.
-- Assignment is set automatically when a booking is created (whoever has
-- the lightest load on that date — see functions/_lib/assignment.js) and
-- can be changed at any time by the office via PATCH /api/bookings/:id/assign.
-- Auto-assignment only ever picks a starting point, never a lock.
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table bookings add column if not exists assigned_employee_id uuid references employees(id);
alter table bookings add column if not exists assigned_at timestamptz;

create index if not exists bookings_assigned_employee_idx on bookings(assigned_employee_id);
create index if not exists bookings_scheduled_date_idx on bookings(scheduled_date);
