import { stripeRequest } from './stripe.js';

// One Stripe Customer object per account, created lazily and reused across
// every booking that needs one (Subscriptions require a real Customer,
// unlike the old one-time payment-mode Checkout which used customer_email).
// Reusing it means self-serve cancellation and the future billing portal
// can look a customer's subscriptions up directly instead of hunting
// through session objects.
//
// Takes just the customer id (not the minimal row getCustomerFromSession
// returns) and looks up everything it needs itself, so callers don't have
// to know which columns this happens to want.
export async function getOrCreateStripeCustomer(sql, env, customerId) {
  const rows = await sql`select id, email, first_name, last_name, stripe_customer_id from customers where id = ${customerId}`;
  const row = rows[0];
  if (!row) throw new Error('customer not found');
  if (row.stripe_customer_id) return row.stripe_customer_id;

  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || undefined;
  const stripeCustomer = await stripeRequest(env, 'POST', 'customers', {
    email: row.email,
    ...(name ? { name } : {}),
    metadata: { gpc_customer_id: row.id },
  });

  // and stripe_customer_id is null guards against a race with a concurrent
  // request that created one first — whichever write lands first wins, and
  // the loser's freshly-created Stripe Customer is simply left unused
  // rather than causing two conflicting ids to be stored.
  await sql`update customers set stripe_customer_id = ${stripeCustomer.id} where id = ${row.id} and stripe_customer_id is null`;
  const finalRows = await sql`select stripe_customer_id from customers where id = ${row.id}`;
  return finalRows[0].stripe_customer_id;
}
