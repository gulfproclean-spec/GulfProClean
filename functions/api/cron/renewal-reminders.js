import { neon } from '@neondatabase/serverless';
import { sendRenewalReminderEmail } from '../../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// Cloudflare Pages Functions have no built-in cron trigger, so nothing in
// this repo calls this route on its own yet. Wire up a daily call from an
// external scheduler (a GitHub Actions scheduled workflow, or a separate
// Cloudflare Worker with its own Cron Trigger) that sends:
//   POST /api/cron/renewal-reminders
//   x-cron-secret: <CRON_SECRET>
// with CRON_SECRET set to the same value here and on that scheduler. See
// README.md for the full setup steps.
export async function onRequestPost({ env, request }) {
  if (!env.CRON_SECRET || request.headers.get('x-cron-secret') !== env.CRON_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }
  const sql = neon(env.DATABASE_URL);

  // Only 6- and 12-month subscriptions have a commitment end date worth
  // reminding about. Ranges (not exact-day equality) mean a missed cron run
  // still catches up on the next one instead of silently skipping a reminder.
  const rows = await sql`
    select b.id, b.page, b.tier, b.months,
           b.reminder_30_sent_at, b.reminder_15_sent_at, b.reminder_0_sent_at,
           c.email,
           (b.scheduled_date + (b.months * interval '1 month'))::date as end_date
    from bookings b
    join customers c on c.id = b.customer_id
    where b.booking_type = 'Monthly' and b.months in (6, 12)
      and b.payment_status = 'paid' and b.scheduled_date is not null
      and (b.reminder_0_sent_at is null or b.reminder_15_sent_at is null or b.reminder_30_sent_at is null)
  `;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sent = [];

  for (const b of rows) {
    const endDate = new Date(String(b.end_date).slice(0, 10) + 'T00:00:00');
    const daysUntilEnd = Math.round((endDate - today) / (1000 * 60 * 60 * 24));

    let bucket = null;
    if (daysUntilEnd <= 0 && !b.reminder_0_sent_at) bucket = '0';
    else if (daysUntilEnd <= 15 && daysUntilEnd > 0 && !b.reminder_15_sent_at) bucket = '15';
    else if (daysUntilEnd <= 30 && daysUntilEnd > 15 && !b.reminder_30_sent_at) bucket = '30';
    if (!bucket) continue;

    await sendRenewalReminderEmail(env, {
      to: b.email, page: b.page, tier: b.tier, months: b.months,
      endDate: b.end_date, daysUntilEnd,
    });

    if (bucket === '0') await sql`update bookings set reminder_0_sent_at = now() where id = ${b.id}`;
    else if (bucket === '15') await sql`update bookings set reminder_15_sent_at = now() where id = ${b.id}`;
    else await sql`update bookings set reminder_30_sent_at = now() where id = ${b.id}`;

    sent.push({ bookingId: b.id, bucket, daysUntilEnd });
  }

  return json({ checked: rows.length, sent });
}
