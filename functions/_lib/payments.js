import { sendBookingConfirmationEmail, sendBookingNotificationEmail } from './email.js';

// Idempotent: only flips payment_status + sends the confirmation email the
// first time a booking is marked paid (webhook and the client-side
// verify-payment fallback both call this, and either can arrive first).
//
// subscriptionId is passed for Monthly bookings paid via a mode:'subscription'
// Checkout Session (see functions/api/bookings/[id]/checkout.js) — it's
// stored alongside stripe_subscription_id so later webhook events
// (invoice.paid, customer.subscription.updated/deleted) can find this
// booking by subscription id.
export async function markBookingPaid(sql, env, bookingId, { customerEmail, paymentIntentId, subscriptionId } = {}) {
  const rows = await sql`
    update bookings
    set payment_status = 'paid',
        stripe_payment_intent_id = coalesce(${paymentIntentId || null}, stripe_payment_intent_id),
        stripe_subscription_id = coalesce(${subscriptionId || null}, stripe_subscription_id),
        subscription_status = case when ${subscriptionId || null}::text is not null then 'active' else subscription_status end
    where id = ${bookingId} and payment_status != 'paid'
    returning *
  `;
  if (rows.length === 0) {
    return { justPaid: false };
  }
  const booking = rows[0];
  const email = customerEmail || (await sql`select email from customers where id = ${booking.customer_id}`)[0]?.email;

  // The technician assigned at booking creation (functions/_lib/
  // assignment.js) or since reassigned by the office (PATCH
  // /api/bookings/:id/assign) — looked up fresh here rather than trusting
  // anything cached on `booking`, since assignment can change any time
  // before payment completes.
  let technicianName = null;
  if (booking.assigned_employee_id) {
    const emp = await sql`select first_name, last_name from employees where id = ${booking.assigned_employee_id}`;
    if (emp[0]) technicianName = `${emp[0].first_name} ${emp[0].last_name}`.trim();
  }

  if (email) {
    await sendBookingConfirmationEmail(env, {
      to: email, bookingId: booking.id,
      page: booking.page, tier: booking.tier, address: booking.address,
      bookingType: booking.booking_type, months: booking.months || 1,
      scheduledDate: booking.scheduled_date, scheduledTime: booking.scheduled_time,
      finalTotal: booking.final_total, technicianName,
    });
  }
  await sendBookingNotificationEmail(env, {
    page: booking.page, tier: booking.tier, address: booking.address,
    billingName: booking.billing_name, billingAddress: booking.billing_address,
    bookingType: booking.booking_type, months: booking.months || 1, frequency: booking.frequency,
    visitsCount: booking.visits_count, scheduledDate: booking.scheduled_date, scheduledTime: booking.scheduled_time,
    finalTotal: booking.final_total, grossTotal: booking.gross_total,
    firstName: booking.first_name, lastName: booking.last_name, phone: booking.phone, customerEmail: email,
    notes: booking.notes, technicianName,
  });
  return { justPaid: true, booking };
}
