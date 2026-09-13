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
// full 4 hours forward from it — book.html and this file both derive from
// this same constant so client and server can never disagree about how
// long a visit occupies.
export const VISIT_DURATION_MINUTES = 240;

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// A candidate start time is blocked by an existing booking only going
// FORWARD from that booking's start — e.g. an existing 10:00 booking blocks
// 10:00, 11:00, 12:00, and 13:00, but NOT 7:00, 8:00, or 9:00. This is
// deliberately one-directional, by request: earlier start times stay
// available even though, strictly, a 9:00 visit would run until 13:00 and
// overlap a 10:00 job. That edge case (booking an earlier hour after a
// later one is already taken) is accepted as out of scope for now — the
// stricter symmetric version (blocking both directions) is a one-line
// change here if that ever becomes a real double-booking problem.
function isBlockedBy(candidateTime, bookedTime) {
  const candidate = timeToMinutes(candidateTime);
  const booked = timeToMinutes(bookedTime);
  return candidate >= booked && candidate < booked + VISIT_DURATION_MINUTES;
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
// that falls within an already-booked slot's forward 4-hour window, or null
// if none conflict. See isBlockedBy above for the exact (one-directional)
// rule.
export function findSlotConflict(bookedSlots, wanted) {
  for (const w of wanted) {
    if (bookedSlots.some(b => b.date === w.date && isBlockedBy(w.time, b.time))) return w;
  }
  return null;
}
