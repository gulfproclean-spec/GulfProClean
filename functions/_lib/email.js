function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// Best-effort: never throws. If RESEND_API_KEY isn't configured, this is a no-op
// so bookings still succeed even before email is set up.
export async function sendBookingConfirmationEmail(env, {
  to, page, tier, address, scheduledDate, scheduledTime, finalTotal, bookingType, months,
}) {
  if (!env.RESEND_API_KEY || !to) return;

  const fromEmail = env.FROM_EMAIL || 'Gulf ProClean <onboarding@resend.dev>';
  const dateStr = formatDate(scheduledDate);
  const pageLabel = page === 'residential' ? 'Residential' : 'Commercial';
  const billingLabel = bookingType === 'Monthly' && months > 1 ? `Monthly × ${months} mo` : bookingType;

  const refundNote = bookingType === 'One-time'
    ? "This is a one-time visit. If it hasn't happened yet, you can cancel anytime for a full refund minus a $50 cancellation fee."
    : (months >= 6
        ? `You're on our ${months}-month subscription. You can cancel anytime — the discount already applied is deducted from your refund.`
        : "You're on our month-to-month plan. Cancel anytime — no notice period required.");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#153238">
      <h2 style="margin:0 0 8px">Booking confirmed</h2>
      <p style="color:#3d4a4d">Thanks for booking with Gulf ProClean. Here are your details:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#7a746a">Service</td><td style="padding:6px 0;text-align:right">${tier} (${pageLabel})</td></tr>
        <tr><td style="padding:6px 0;color:#7a746a">Address</td><td style="padding:6px 0;text-align:right">${address}</td></tr>
        <tr><td style="padding:6px 0;color:#7a746a">Billing</td><td style="padding:6px 0;text-align:right">${billingLabel}</td></tr>
        ${dateStr ? `<tr><td style="padding:6px 0;color:#7a746a">Scheduled</td><td style="padding:6px 0;text-align:right">${dateStr} at ${scheduledTime}</td></tr>` : ''}
        <tr><td style="padding:12px 0;font-weight:600;border-top:1px solid #e3ded2">Total paid</td><td style="padding:12px 0;font-weight:600;text-align:right;border-top:1px solid #e3ded2">${money(finalTotal)}</td></tr>
      </table>
      <p style="font-size:13px;color:#7a746a">No contracts — cancel anytime. ${refundNote}</p>
      <p style="font-size:13px;color:#7a746a">Manage or reschedule this booking anytime from your account.</p>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: 'Your Gulf ProClean booking is confirmed',
        html,
      }),
    });
  } catch (e) {
    // Email is best-effort - never block or fail the booking itself.
  }
}

// Sent by functions/api/cron/renewal-reminders.js at ~30 days, ~15 days,
// and on the day a 6- or 12-month subscription's commitment period ends.
export async function sendRenewalReminderEmail(env, { to, page, tier, months, endDate, daysUntilEnd }) {
  if (!env.RESEND_API_KEY || !to) return;

  const fromEmail = env.FROM_EMAIL || 'Gulf ProClean <onboarding@resend.dev>';
  const dateStr = formatDate(endDate);
  const pageLabel = page === 'residential' ? 'Residential' : 'Commercial';
  const when = daysUntilEnd <= 0 ? 'today' : `in ${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'}`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#153238">
      <h2 style="margin:0 0 8px">Your subscription is ending ${when}</h2>
      <p style="color:#3d4a4d">Your ${months}-month ${tier} plan (${pageLabel}) ends on ${dateStr}. Renew from your account to keep your discounted rate and stay on schedule.</p>
      <p style="font-size:13px;color:#7a746a">No contracts — cancel anytime. Manage or renew this subscription anytime from your account.</p>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: `Your Gulf ProClean subscription ends ${when}`,
        html,
      }),
    });
  } catch (e) {
    // Email is best-effort - never block or fail the reminder run itself.
  }
}
