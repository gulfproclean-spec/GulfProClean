-- Real Stripe Subscriptions for recurring (booking_type = 'Monthly')
-- bookings. Before this, every booking — one-time or recurring — was
-- charged as a single lump-sum Stripe Checkout Session for the whole
-- committed term. That's not real recurring billing: nothing charges the
-- customer again next cycle, and there was no way to react to a renewal or
-- a failed card.
--
-- stripe_customer_id on customers lets us create one Stripe Customer object
-- per account and reuse it across bookings/subscriptions, rather than
-- letting Checkout create a fresh anonymous one every time.
--
-- stripe_subscription_id + subscription_status on bookings track the
-- recurring-billing side per booking, independent of payment_status (which
-- continues to mean "the first cycle was paid, this booking is confirmed").
-- subscription_status mirrors Stripe's own subscription status values
-- (active, past_due, canceled, ...) plus a local 'canceling' value set the
-- moment a self-serve cancellation is requested, before Stripe's
-- customer.subscription.deleted webhook confirms it.
--
-- Additive only. No drops, no data changes to existing rows.

alter table customers add column if not exists stripe_customer_id text;

alter table bookings add column if not exists stripe_subscription_id text;
alter table bookings add column if not exists subscription_status text;

create index if not exists bookings_stripe_subscription_idx on bookings(stripe_subscription_id);
