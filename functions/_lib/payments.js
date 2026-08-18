import { sendBookingConfirmationEmail, sendBookingNotificationEmail } from './email.js';

// Idempotent: only flips payment_status + sends the confirmation email the
// first time a booking is marked paid (webhook and the client-side
// verify-payment fallback both call this, and either can arrive first).
export async function markBookingPaid(sql, env, bookingId, { customerEmail, paymentIntentId } = {}) {
  const rows = await sql`
    update bookings
    set payment_status = 'paid', stripe_payment_intent_id = coalesce(${paymentIntentId || null}, stripe_payment_intent_id)
    where id = ${bookingId} and payment_status != 'paid'
    returning *
  `;
  if (rows.length === 0) {
    return { justPaid: false };
  }
  const booking = rows[0];
  const email = customerEmail || (await sql`select email from customers where id = ${booking.customer_id}`)[0]?.email;
  if (email) {
    await sendBookingConfirmationEmail(env, {
      to: email,
      page: booking.page, tier: booking.tier, address: booking.address,
      bookingType: booking.booking_type, months: booking.months || 1,
      scheduledDate: booking.scheduled_date, scheduledTime: booking.scheduled_time,
      finalTotal: booking.final_total,
    });
  }
  await sendBookingNotificationEmail(env, {
    page: booking.page, tier: booking.tier, address: booking.address, billingAddress: booking.billing_address,
    bookingType: booking.booking_type, months: booking.months || 1, frequency: booking.frequency,
    visitsCount: booking.visits_count, scheduledDate: booking.scheduled_date, scheduledTime: booking.scheduled_time,
    finalTotal: booking.final_total, grossTotal: booking.gross_total,
    firstName: booking.first_name, lastName: booking.last_name, phone: booking.phone, customerEmail: email,
    notes: booking.notes,
  });
  return { justPaid: true, booking };
}
