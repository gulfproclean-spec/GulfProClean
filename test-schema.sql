-- Asserts that every database object the server code actually queries exists.
--
--   psql "$DATABASE_URL" -f test-schema.sql
--
-- This file exists because migrations have twice been applied only partly,
-- and both times the failure was invisible until a customer hit it:
--
--   * 019_plan_change_requests.sql was never applied, so every attempt to
--     change a billing plan returned a 500.
--   * 018_availability_and_cancellation.sql was applied only halfway — its
--     schedule_settings insert ran, its `alter table bookings add column
--     canceled_at` did not. getBookedSlots() reads that column on every
--     booking, so GET /api/schedule threw and NO CUSTOMER COULD BOOK. The
--     site looked fine; the failure surfaced as a generic error on step 1.
--
-- Nothing records which migrations have run, so run this after any migration
-- and before trusting a deploy. Every row must report PASS.
with required(obj, kind) as (values
  -- bookings: the pricing, scheduling, payment and cancellation paths
  ('bookings.address',                    'column'),
  ('bookings.payment_status',             'column'),
  ('bookings.canceled_at',                'column'),  -- 018; getBookedSlots
  ('bookings.is_first_time',              'column'),
  ('bookings.pricing_input',              'column'),
  ('bookings.per_visit_price',            'column'),
  ('bookings.after_frequency_price',      'column'),
  ('bookings.visit_dates',                'column'),  -- 017
  ('bookings.billing_name',               'column'),  -- 016
  ('bookings.billing_address',            'column'),  -- 013
  ('bookings.agreement_accepted_at',      'column'),
  ('bookings.stripe_checkout_session_id', 'column'),  -- 007
  ('bookings.stripe_payment_intent_id',   'column'),  -- 007
  ('bookings.scheduled_date',             'column'),
  ('bookings.scheduled_time',             'column'),
  -- customers: the account record bookings.js keeps in sync
  ('customers.email',                     'column'),
  ('customers.password_hash',             'column'),
  ('customers.address',                   'column'),  -- 015; /api/auth/me
  ('customers.billing_name',              'column'),  -- 016
  -- sessions
  ('sessions.token',                      'column'),
  ('sessions.expires_at',                 'column'),
  -- tables added by later migrations that whole features depend on
  ('schedule_settings',                   'table'),
  ('plan_change_requests',                'table'),   -- 019
  ('refund_requests',                     'table'),
  ('page_views',                          'table'),   -- 020
  ('job_applications',                    'table'),   -- 021
  ('vendor_submissions',                  'table'),   -- 022
  -- the first-time-customer address normalization
  ('gpc_address_key',                     'function') -- 024
)
select case when present then 'PASS' else 'FAIL' end as result, kind, obj
from (
  select obj, kind,
    case kind
      when 'column' then exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name  = split_part(obj, '.', 1)
          and column_name = split_part(obj, '.', 2))
      when 'table' then exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = obj)
      when 'function' then exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = obj)
    end as present
  from required
) x
order by result, kind, obj;
