-- Coupons: a percentage off one future booking.
--
-- Modelled on the existing first-time-customer discount rather than on the
-- recurring ladder, and that distinction matters. The recurring discount is
-- clamped at the property's cost floor, so on most homes it delivers close to
-- nothing. A coupon is an acquisition/retention cost -- you are deliberately
-- buying the next job -- so like the 10% first-time discount it is applied
-- after the clamp and may price a visit below the floor. That is the point.
--
-- Coupons do NOT stack with the first-time discount: the larger of the two
-- applies. Compounding 20% on top of 10% would put a first visit 28% under a
-- price that is already at cost.

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),

  -- Stored uppercase; lookups uppercase the input. Customers type these.
  code text not null unique,

  percent_off numeric(5,2) not null check (percent_off > 0 and percent_off <= 100),

  description text,

  -- null = anyone may redeem. Set = locked to one customer, which is what
  -- "here is 20% off your next service" actually means when handed to a
  -- specific person after a job.
  customer_id uuid references customers(id) on delete cascade,

  -- null = unlimited. 1 = single use, the normal case.
  max_redemptions int,

  -- null = never expires.
  expires_at timestamptz,

  -- Restrict to one side of the business, or leave null for both.
  page text check (page in ('residential', 'commercial')),

  active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists coupons_code_idx on coupons (upper(code));
create index if not exists coupons_customer_idx on coupons (customer_id) where customer_id is not null;

-- One row per use. times_redeemed is derived from this rather than stored on
-- the coupon, so a canceled booking's redemption can be released by deleting
-- the row and the count stays honest without a second source of truth.
create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references coupons(id) on delete cascade,
  booking_id  uuid not null references bookings(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,

  -- What the discount was actually worth, in dollars, at redemption time.
  -- Recorded because percent_off can be edited later and the historical
  -- value would otherwise be unrecoverable.
  amount_off numeric(10,2) not null,
  percent_off numeric(5,2) not null,

  created_at timestamptz not null default now()
);

-- A booking redeems at most one coupon.
create unique index if not exists coupon_redemptions_booking_idx on coupon_redemptions (booking_id);
create index if not exists coupon_redemptions_coupon_idx on coupon_redemptions (coupon_id);
