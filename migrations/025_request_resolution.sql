-- Audit trail for the two request types a human executes by hand in Stripe.
--
-- Refunds and plan changes are deliberately not auto-executed: the app
-- computes the amount and records the request, and a person moves the money
-- in the Stripe dashboard. That is a defensible design only if the record
-- says who did it and which Stripe object satisfied it. Without these
-- columns "processed" is an unsupported assertion.
--
-- Additive only. No drops, no data changes.

alter table refund_requests
  add column if not exists stripe_refund_id text,
  add column if not exists resolved_by      text,
  add column if not exists notes            text;

alter table plan_change_requests
  add column if not exists stripe_reference text,
  add column if not exists resolved_by      text,
  add column if not exists notes            text;

create index if not exists refund_requests_status_idx      on refund_requests (status, requested_at desc);
create index if not exists plan_change_requests_status_idx on plan_change_requests (status, requested_at desc);
