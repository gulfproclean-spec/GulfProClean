import { neon } from '@neondatabase/serverless';
import { getCustomerFromSession } from '../../_lib/auth.js';

const MIN_NOTICE_MS = 24 * 60 * 60 * 1000;
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function combineDateTime(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM" - interpreted in server local time,
  // consistent with how the client builds/reads these values.
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export async function onRequestPut({ env, request, params }) {
  const sql = neon(env.DATABASE_URL);
  const customer = await getCustomerFromSession(sql, request);
  if (!customer) {
    return new Response(JSON.stringify({ error: 'not logged in' }), { status: 401 });
  }

  const rows = await sql`select * from bookings where id = ${params.id}`;
  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'booking not found' }), { status: 404 });
  }
  const booking = rows[0];
  if (booking.customer_id !== customer.id) {
    return new Response(JSON.stringify({ error: 'not your booking' }), { status: 403 });
  }
  if (!booking.scheduled_date || !booking.scheduled_time) {
    return new Response(JSON.stringify({ error: 'this booking has no scheduled time to change' }), { status: 400 });
  }

  const currentDateTime = combineDateTime(
    typeof booking.scheduled_date === 'string' ? booking.scheduled_date : booking.scheduled_date.toISOString().slice(0, 10),
    booking.scheduled_time
  );
  if (currentDateTime.getTime() - Date.now() < MIN_NOTICE_MS) {
    return new Response(JSON.stringify({ error: 'This appointment is less than 24 hours away and can no longer be rescheduled. Please contact us directly.' }), { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }
  const { scheduledDate, scheduledTime } = body;
  if (!scheduledDate || !scheduledTime || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !/^\d{2}:\d{2}$/.test(scheduledTime)) {
    return new Response(JSON.stringify({ error: 'invalid date or time' }), { status: 400 });
  }

  const newDateTime = combineDateTime(scheduledDate, scheduledTime);
  if (newDateTime.getTime() - Date.now() < MIN_NOTICE_MS) {
    return new Response(JSON.stringify({ error: 'The new time must be at least 24 hours from now.' }), { status: 400 });
  }

  const scheduleRows = await sql`select days from schedule_settings where id = 1`;
  const days = scheduleRows[0] ? scheduleRows[0].days : null;
  const dayKey = DAY_KEYS[newDateTime.getDay()];
  const dayCfg = days ? days[dayKey] : null;
  if (!dayCfg || !dayCfg.enabled || scheduledTime < dayCfg.start || scheduledTime >= dayCfg.end) {
    return new Response(JSON.stringify({ error: 'That day or time is outside available service hours.' }), { status: 400 });
  }

  await sql`
    update bookings
    set scheduled_date = ${scheduledDate}, scheduled_time = ${scheduledTime}
    where id = ${params.id}
  `;

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
