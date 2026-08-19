// Shared between functions/api/schedule.js (what the client sees as
// "already booked") and functions/api/bookings.js / bookings/[id].js (the
// authoritative conflict check before creating or rescheduling a booking).
// A slot is held by any non-canceled booking regardless of payment_status —
// otherwise two customers could both check out for the same 4-hour block
// before either one pays.
export async function getBookedSlots(sql, { excludeBookingId } = {}) {
  const rows = excludeBookingId
    ? await sql`
        select scheduled_date, scheduled_time, visit_dates from bookings
        where canceled_at is null and id != ${excludeBookingId}
          and (
            (scheduled_date is not null and scheduled_date >= current_date - interval '1 day')
            or visit_dates is not null
          )
      `
    : await sql`
        select scheduled_date, scheduled_time, visit_dates from bookings
        where canceled_at is null
          and (
            (scheduled_date is not null and scheduled_date >= current_date - interval '1 day')
            or visit_dates is not null
          )
      `;
  const slots = [];
  for (const b of rows) {
    if (b.scheduled_date && b.scheduled_time) {
      slots.push({ date: String(b.scheduled_date).slice(0, 10), time: b.scheduled_time });
    }
    if (Array.isArray(b.visit_dates)) {
      for (const v of b.visit_dates) {
        if (v && v.date && v.time) slots.push({ date: v.date, time: v.time });
      }
    }
  }
  return slots;
}

// Returns the first requested slot (from `wanted`, an array of {date, time})
// that's already held by another booking, or null if none conflict.
export function findSlotConflict(bookedSlots, wanted) {
  for (const w of wanted) {
    if (bookedSlots.some(b => b.date === w.date && b.time === w.time)) return w;
  }
  return null;
}
