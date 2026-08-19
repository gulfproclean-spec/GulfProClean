-- Mirrors refund_requests (010_refunds.sql): compute + record a pending
-- request for the business to review and process manually — never an
-- automatic Stripe charge/credit. Records the financial impact of switching
-- a paid recurring booking to a different billing plan (e.g. Monthly ->
-- 12-Month), based on the new plan's discount vs the old one, applied only
-- to visits not yet delivered.
create table if not exists plan_change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  customer_id uuid not null references customers(id),
  old_months numeric not null,
  new_months numeric not null,
  visits_delivered int not null,
  visits_remaining int not null,
  old_per_visit_price numeric not null,
  new_per_visit_price numeric not null,
  price_difference numeric not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists plan_change_requests_booking_idx on plan_change_requests(booking_id);
