// Shared between functions/api/schedule.js (what the client sees as
// "already booked") and functions/api/bookings.js / bookings/[id].js (the
// authoritative conflict check before creating or rescheduling a booking).
// A slot is held by any non-canceled booking regardless of payment_status —
// otherwise two customers could both check out for the same 4-hour block
// before either one pays. A canceled booking's slot is excluded by the
// `canceled_at is null` filter below, so canceling automatically frees the
// time back up for other customers — no separate "release" step needed.

// Every visit occupies a 4-hour block on the crew's schedule regardless of
// how finely start times are offered. Slots are now offered hourly (see
// book.html's SLOT_OFFER_INCREMENT_MIN), but booking one still blocks the
// full 4 hours around it — book.html and this file both derive from this
// same constant so client and server can never disagree about how long a
// visit occupies.
export const VISIT_DURATION_MINUTES = 240;

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Two visits on the same date conflict if their 4-hour occupied windows
// overlap at all — not just if they start at the exact same time. Visits
// starting an hour apart (e.g. 9:00 and 10:00) still overlap, since the
// 9:00 visit runs until 13:00. Only a gap of a full VISIT_DURATION_MINUTES
// or more between start times means no overlap.
function slotsOverlap(timeA, timeB) {
  return Math.abs(timeToMinutes(timeA) - timeToMinutes(timeB)) < VISIT_DURATION_MINUTES;
}

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
// whose 4-hour window overlaps a slot already held by another booking, or
// null if none conflict. Same-date + overlapping-time is a conflict even
// when the exact start times differ.
export function findSlotConflict(bookedSlots, wanted) {
  for (const w of wanted) {
    if (bookedSlots.some(b => b.date === w.date && slotsOverlap(b.time, w.time))) return w;
  }
  return null;
}
