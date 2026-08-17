alter table bookings add column if not exists payment_status text not null default 'paid';
alter table bookings add column if not exists stripe_checkout_session_id text;
alter table bookings add column if not exists stripe_payment_intent_id text;
