alter table bookings add column if not exists per_visit_price numeric;
alter table bookings add column if not exists after_frequency_price numeric;

create table if not exists refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  customer_id uuid not null references customers(id),
  amount numeric not null,
  visits_delivered int not null,
  visits_remaining int not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists refund_requests_booking_idx on refund_requests(booking_id);
