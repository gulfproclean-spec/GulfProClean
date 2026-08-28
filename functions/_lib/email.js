const GMAIL_ADDRESS = 'gulfproclean@gmail.com';
const CONTACT_INBOX = GMAIL_ADDRESS;

// The neon serverless driver normally returns a `date` column as a plain
// 'YYYY-MM-DD' string, but callers of this module (e.g. functions/_lib/
// payments.js passing booking.scheduled_date straight through) don't all
// guarantee that, so every date-formatting helper below accepts either.
function toDateStr(d) {
  return typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = toDateStr(dateStr).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function billingLabelFor(bookingType, months) {
  if (bookingType !== 'Monthly') return bookingType;
  if (months < 1) return 'Biweekly';
  if (months > 1) return `Monthly × ${months} mo`;
  return 'Monthly';
}

// -- .ics calendar attachment ---------------------------------------------
// Floating local time (no Z suffix, no TZID) — matches how scheduled_date/
// scheduled_time are treated everywhere else in this app (naive values,
// never converted through an explicit timezone). Calendar apps display a
// floating time as-is, which is correct here since the customer's own
// calendar app runs in the same timezone as the service address.

function icsPad(n) { return String(n).padStart(2, '0'); }

function icsDateTime(dateStr, timeStr) {
  return `${toDateStr(dateStr).replace(/-/g, '')}T${timeStr.replace(':', '')}00`;
}

function addHours(dateStr, timeStr, hours) {
  const [y, m, d] = toDateStr(dateStr).split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const dt = new Date(y, m - 1, d, h, mi);
  dt.setHours(dt.getHours() + hours);
  return {
    date: `${dt.getFullYear()}-${icsPad(dt.getMonth() + 1)}-${icsPad(dt.getDate())}`,
    time: `${icsPad(dt.getHours())}:${icsPad(dt.getMinutes())}`,
  };
}

function escapeIcsText(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Same UID across a booking's confirmation and any later reschedule emails,
// so calendar apps that support it treat the follow-up .ics as an update to
// the same event rather than a duplicate.
function buildBookingIcs({ bookingId, summary, description, location, scheduledDate, scheduledTime, durationHours = 4 }) {
  const dtStart = icsDateTime(scheduledDate, scheduledTime);
  const end = addHours(scheduledDate, scheduledTime, durationHours);
  const dtEnd = icsDateTime(end.date, end.time);
  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${icsPad(now.getUTCMonth() + 1)}${icsPad(now.getUTCDate())}T${icsPad(now.getUTCHours())}${icsPad(now.getUTCMinutes())}${icsPad(now.getUTCSeconds())}Z`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gulf ProClean//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:booking-${bookingId}@gulfproclean.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function money(n) {
  const cents = Math.round(n * 100);
  const dollars = cents / 100;
  return '$' + (cents % 100 === 0
    ? dollars.toLocaleString('en-US')
    : dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}

// -- Gmail API transport ----------------------------------------------
// All outbound mail is sent through the Gmail API as gulfproclean@gmail.com,
// authenticated via a long-lived OAuth2 refresh token (see README.md's
// "Email" section for the one-time Google Cloud setup). Every function
// below is best-effort: it never throws, and is a silent no-op until
// GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN are all set,
// so the site still works end-to-end before email is configured.

async function getGmailAccessToken(env) {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) return null;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID,
        client_secret: env.GMAIL_CLIENT_SECRET,
        refresh_token: env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch (e) {
    return null;
  }
}

// UTF-8 safe base64 helpers (Workers has no Buffer; btoa only handles
// Latin1, so the string is first turned into UTF-8 bytes).
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function utf8ToBase64Url(str) {
  return utf8ToBase64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// attachment: { filename, mimeType, content } — content is a plain string,
// base64-encoded here (RFC 2045 76-char line wrapping).
function buildRawMessage({ to, subject, html, replyTo, attachment }) {
  const headers = [
    `From: Gulf ProClean <${GMAIL_ADDRESS}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${utf8ToBase64(subject)}?=`,
    'MIME-Version: 1.0',
  ];
  if (replyTo) headers.push(`Reply-To: ${replyTo}`);

  if (!attachment) {
    headers.push('Content-Type: text/html; charset="UTF-8"');
    return utf8ToBase64Url(headers.join('\r\n') + '\r\n\r\n' + html);
  }

  const boundary = `gpc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  const attachmentB64 = utf8ToBase64(attachment.content).replace(/(.{76})/g, '$1\r\n');
  const body = [
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    `--${boundary}`,
    `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    '',
    attachmentB64,
    `--${boundary}--`,
  ].join('\r\n');
  return utf8ToBase64Url(headers.join('\r\n') + '\r\n\r\n' + body);
}

async function sendGmail(env, { to, subject, html, replyTo, attachment }) {
  if (!to) return;
  const accessToken = await getGmailAccessToken(env);
  if (!accessToken) return;
  try {
    await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: buildRawMessage({ to, subject, html, replyTo, attachment }) }),
    });
  } catch (e) {
    // Email is best-effort - never block or fail the caller.
  }
}

// -- Messages ------------------------------------------------------------

export async function sendBookingConfirmationEmail(env, {
  to, bookingId, page, tier, address, scheduledDate, scheduledTime, finalTotal, bookingType, months,
}) {
  const dateStr = formatDate(scheduledDate);
  const pageLabel = page === 'residential' ? 'Residential' : 'Commercial';
  const billingLabel = billingLabelFor(bookingType, months);

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
      ${scheduledDate && scheduledTime ? '<p style="font-size:13px;color:#7a746a">A calendar invite for your first visit is attached.</p>' : ''}
    </div>
  `;

  const attachment = (bookingId && scheduledDate && scheduledTime) ? {
    filename: 'gulf-proclean-visit.ics',
    mimeType: 'text/calendar; method=PUBLISH',
    content: buildBookingIcs({
      bookingId,
      summary: `Gulf ProClean — ${tier} ${pageLabel} Cleaning`,
      description: `${tier} ${pageLabel} cleaning visit. Billing: ${billingLabel}.`,
      location: address,
      scheduledDate, scheduledTime,
    }),
  } : undefined;

  await sendGmail(env, { to, subject: 'Your Gulf ProClean booking is confirmed', html, attachment });
}

// Sent by functions/api/cron/renewal-reminders.js at ~30 days, ~15 days,
// and on the day a 6- or 12-month subscription's commitment period ends.
export async function sendRenewalReminderEmail(env, { to, page, tier, months, endDate, daysUntilEnd }) {
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

  await sendGmail(env, { to, subject: `Your Gulf ProClean subscription ends ${when}`, html });
}

// Best-effort: notifies the business inbox whenever a booking is marked
// paid, with everything the customer submitted plus the final price — the
// company-facing counterpart to sendBookingConfirmationEmail, which only
// goes to the customer.
export async function sendBookingNotificationEmail(env, {
  page, tier, address, billingName, billingAddress, scheduledDate, scheduledTime, finalTotal, grossTotal,
  bookingType, months, frequency, visitsCount, firstName, lastName, phone, customerEmail, notes,
}) {
  const dateStr = formatDate(scheduledDate);
  const pageLabel = page === 'residential' ? 'Residential' : 'Commercial';
  const billingLabel = billingLabelFor(bookingType, months);
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#153238">
      <h2 style="margin:0 0 8px">New paid booking</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#7a746a">Customer</td><td style="padding:6px 0;text-align:right">${fullName}</td></tr>
        <tr><td style="padding:6px 0;color:#7a746a">Email</td><td style="padding:6px 0;text-align:right">${customerEmail || ''}</td></tr>
        ${phone ? `<tr><td style="padding:6px 0;color:#7a746a">Phone</td><td style="padding:6px 0;text-align:right">${phone}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#7a746a">Service</td><td style="padding:6px 0;text-align:right">${tier} (${pageLabel})</td></tr>
        <tr><td style="padding:6px 0;color:#7a746a">Address</td><td style="padding:6px 0;text-align:right">${address}</td></tr>
        ${billingName ? `<tr><td style="padding:6px 0;color:#7a746a">Billing name</td><td style="padding:6px 0;text-align:right">${billingName}</td></tr>` : ''}
        ${billingAddress ? `<tr><td style="padding:6px 0;color:#7a746a">Billing address</td><td style="padding:6px 0;text-align:right">${billingAddress}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#7a746a">Billing</td><td style="padding:6px 0;text-align:right">${billingLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#7a746a">Frequency</td><td style="padding:6px 0;text-align:right">${frequency || '—'}</td></tr>
        ${visitsCount ? `<tr><td style="padding:6px 0;color:#7a746a">Visits</td><td style="padding:6px 0;text-align:right">${visitsCount}</td></tr>` : ''}
        ${dateStr ? `<tr><td style="padding:6px 0;color:#7a746a">Scheduled</td><td style="padding:6px 0;text-align:right">${dateStr} at ${scheduledTime}</td></tr>` : ''}
        ${notes ? `<tr><td style="padding:6px 0;color:#7a746a">Notes</td><td style="padding:6px 0;text-align:right">${notes}</td></tr>` : ''}
        <tr><td style="padding:12px 0;font-weight:600;border-top:1px solid #e3ded2">Total paid</td><td style="padding:12px 0;font-weight:600;text-align:right;border-top:1px solid #e3ded2">${money(finalTotal)}</td></tr>
      </table>
    </div>
  `;

  await sendGmail(env, {
    to: CONTACT_INBOX,
    subject: `New paid booking: ${fullName || 'customer'} (${pageLabel})`,
    html,
    replyTo: customerEmail || undefined,
  });
}

// Notifies the business inbox when a customer submits the Contact Us form.
// The message itself is always stored in contact_messages regardless of
// whether this email succeeds or Gmail is even configured.
export async function sendContactNotificationEmail(env, { name, email, phone, message, page }) {
  const pageLabel = page ? page.charAt(0).toUpperCase() + page.slice(1) : 'General';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#153238">
      <h2 style="margin:0 0 8px">New contact form submission</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#7a746a">From</td><td style="padding:6px 0;text-align:right">${name}</td></tr>
        <tr><td style="padding:6px 0;color:#7a746a">Email</td><td style="padding:6px 0;text-align:right">${email}</td></tr>
        ${phone ? `<tr><td style="padding:6px 0;color:#7a746a">Phone</td><td style="padding:6px 0;text-align:right">${phone}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#7a746a">Page</td><td style="padding:6px 0;text-align:right">${pageLabel}</td></tr>
      </table>
      <p style="color:#3d4a4d;white-space:pre-wrap">${message}</p>
    </div>
  `;

  await sendGmail(env, {
    to: CONTACT_INBOX,
    subject: `New contact message from ${name}`,
    html,
    replyTo: email,
  });
}

// -- Careers and vendors ---------------------------------------------------

// Applicant- and vendor-supplied text is interpolated into these templates, so
// it is escaped first. Without this, a name containing markup would render as
// markup in whatever mail client opens the notification.
function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function row(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<tr><td style="padding:6px 12px 6px 0;color:#7a746a;vertical-align:top">${esc(label)}</td>` +
         `<td style="padding:6px 0;text-align:right">${esc(value)}</td></tr>`;
}

function shell(title, inner) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#153238">
      <h2 style="margin:0 0 8px;font-weight:600">${esc(title)}</h2>
      ${inner}
      <p style="margin-top:28px;font-size:12px;color:#7a746a">Gulf ProClean — Pensacola to Panama City Beach</p>
    </div>
  `;
}

export async function sendApplicationNotificationEmail(env, a) {
  const employment = (a.employment || [])
    .filter(e => e && e.company)
    .map(e => `<li style="margin-bottom:6px">${esc(e.company)}${e.title ? ' — ' + esc(e.title) : ''}` +
               `${e.from || e.to ? ` <span style="color:#7a746a">(${esc(e.from || '?')} – ${esc(e.to || '?')})</span>` : ''}` +
               `${e.supervisor ? `<br><span style="color:#7a746a;font-size:13px">Supervisor: ${esc(e.supervisor)}</span>` : ''}` +
               `${e.do_not_contact ? '<br><span style="color:#b3261e;font-size:13px">Do not contact — still employed</span>' : ''}</li>`)
    .join('');

  const refs = (a.references || [])
    .filter(r => r && r.name)
    .map(r => `<li>${esc(r.name)}${r.relationship ? ' — ' + esc(r.relationship) : ''}${r.phone ? ' — ' + esc(r.phone) : ''}</li>`)
    .join('');

  const inner = `
    <p style="color:#3d4a4d;margin:0 0 4px">Applying for <strong>${esc(a.roleTitle)}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      ${row('Name', `${a.firstName} ${a.lastName}`)}
      ${row('Email', a.email)}
      ${row('Phone', a.phone)}
      ${row('City', a.city)}
      ${row('Employment type', a.employmentType)}
      ${row('Experience', a.yearsExperience)}
      ${row('Earliest start', a.startDate)}
      ${row('Days', (a.days || []).join(', '))}
      ${row('Shifts', (a.shifts || []).join(', '))}
      ${row('Heard about us', a.source)}
      ${a.resumeUrl ? row('Résumé', a.resumeUrl) : ''}
    </table>
    ${a.convicted === true
      ? `<div style="border-left:3px solid #b68235;padding:10px 14px;background:#faf8f4;font-size:13.5px;color:#3d4a4d">
           <strong>Answered yes to the criminal history question.</strong> Assess this individually — the offense,
           how long ago, and whether it relates to this role. It is not an automatic disqualification.
         </div>`
      : ''}
    ${employment ? `<h3 style="font-size:15px;margin:22px 0 6px">Employment history</h3><ul style="font-size:14px;color:#3d4a4d;padding-left:18px;margin:0">${employment}</ul>` : ''}
    ${refs ? `<h3 style="font-size:15px;margin:22px 0 6px">References</h3><ul style="font-size:14px;color:#3d4a4d;padding-left:18px;margin:0">${refs}</ul>` : ''}
    ${a.notes ? `<h3 style="font-size:15px;margin:22px 0 6px">Notes from the applicant</h3><p style="font-size:14px;color:#3d4a4d;white-space:pre-wrap;margin:0">${esc(a.notes)}</p>` : ''}
  `;

  await sendGmail(env, {
    to: CONTACT_INBOX,
    subject: `New application: ${a.roleTitle} — ${a.firstName} ${a.lastName}`,
    html: shell('New job application', inner),
    replyTo: a.email,
  });
}

export async function sendApplicationConfirmationEmail(env, a) {
  const inner = `
    <p style="color:#3d4a4d;line-height:1.6">Hi ${esc(a.firstName)} — thanks for applying for
      <strong>${esc(a.roleTitle)}</strong>. We have your application and someone will review it.</p>
    <p style="color:#3d4a4d;line-height:1.6">If your experience fits a role we are actively filling, we will
      call you within about five business days for a short phone conversation.</p>
    <p style="color:#3d4a4d;line-height:1.6"><strong>Nothing else is needed from you right now.</strong>
      Please do not send us a Social Security number, date of birth, or copies of any documents.
      If we make you a conditional offer, we will send a secure link for that — and not before.</p>
    <p style="color:#3d4a4d;line-height:1.6">Questions, or need an accommodation for any part of the process?
      Just reply to this email.</p>
  `;
  await sendGmail(env, {
    to: a.email,
    subject: `We received your application — ${a.roleTitle}`,
    html: shell('Application received', inner),
  });
}

export async function sendPrehireInviteEmail(env, { to, name, roleTitle, link }) {
  const inner = `
    <p style="color:#3d4a4d;line-height:1.6">Hi ${esc(name)} — congratulations. Your conditional offer for
      <strong>${esc(roleTitle)}</strong> is attached separately; this email is the secure link to the
      authorizations we need before your start date.</p>
    <p style="margin:24px 0"><a href="${esc(link)}"
      style="background:#b68235;color:#153238;font-weight:600;font-size:15px;padding:13px 26px;border-radius:3px;text-decoration:none;display:inline-block">Complete your authorizations</a></p>
    <p style="color:#3d4a4d;line-height:1.6;font-size:14px">The page asks you to read a disclosure and sign an
      authorization for a background check, and — if your role drives — for a driving record check.
      It takes about five minutes.</p>
    <p style="color:#3d4a4d;line-height:1.6;font-size:14px"><strong>It does not ask for your Social Security
      number or date of birth, and you should not send those to us.</strong> After you sign, the background
      check company will email you a link to its own secure portal for those. Your Form I-9 documents are
      shown in person on your first day.</p>
    <p style="color:#7a746a;font-size:13px;line-height:1.6">This link is personal to you — please don't forward it.
      If it doesn't work, reply to this email and we'll send a new one.</p>
  `;
  await sendGmail(env, { to, subject: `Next step for your Gulf ProClean offer — ${roleTitle}`, html: shell('Your conditional offer', inner) });
}

export async function sendPrehireCompletedEmail(env, s) {
  const inner = `
    <p style="color:#3d4a4d;margin:0 0 4px"><strong>${esc(s.name)}</strong> signed their pre-hire authorizations.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      ${row('Role', s.roleTitle)}
      ${row('Email', s.email)}
      ${row('Background check authorized', 'Yes')}
      ${row('Driving record authorized', s.mvrAuthorized ? 'Yes' : 'Not authorized / not applicable')}
      ${row('Form I-9 acknowledged', 'Yes')}
      ${row('Drug-free workplace acknowledged', 'Yes')}
      ${row('Confirmed start date', s.startDate || 'Not given')}
      ${row('Signed at', s.signedAt)}
    </table>
    <div style="border-left:3px solid #b68235;padding:10px 14px;background:#faf8f4;font-size:13.5px;color:#3d4a4d">
      You can now order the background check. If it comes back with something that makes you reconsider,
      send the pre-adverse action notice first — a copy of the report plus the FCRA Summary of Rights — and
      give at least five business days to respond before any final decision.
    </div>
  `;
  await sendGmail(env, { to: CONTACT_INBOX, subject: `Pre-hire authorizations signed — ${s.name}`, html: shell('Authorizations signed', inner), replyTo: s.email });
}

export async function sendPrehireCopyToCandidateEmail(env, s) {
  const inner = `
    <p style="color:#3d4a4d;line-height:1.6">This is your copy of what you signed on
      ${esc(new Date(s.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      ${row('Name signed', s.name)}
      ${row('Role', s.roleTitle)}
      ${row('Background check authorization', 'Signed')}
      ${row('Driving record authorization', s.mvrAuthorized ? 'Signed' : 'Not signed')}
      ${row('Form I-9 acknowledgement', 'Signed')}
      ${row('Drug-free workplace acknowledgement', 'Signed')}
      ${row('Confirmed start date', s.startDate || 'To be confirmed')}
    </table>
    <p style="color:#3d4a4d;line-height:1.6;font-size:14px">The background check company will email you a link
      to its own secure portal. We never see the identifiers you enter there.</p>
    <p style="color:#3d4a4d;line-height:1.6;font-size:14px">If anything in the report gives us pause, you will get
      a copy of it and a Summary of Your Rights under the Fair Credit Reporting Act, plus at least five business
      days to respond, before we make any final decision.</p>
    <p style="color:#3d4a4d;line-height:1.6;font-size:14px">You may revoke your authorization in writing at any
      time before the report is obtained by replying to this email.</p>
  `;
  await sendGmail(env, { to: s.email, subject: 'Your copy — Gulf ProClean pre-hire authorizations', html: shell('Your signed authorizations', inner) });
}

export async function sendVendorNotificationEmail(env, v) {
  const d = v.details || {};
  const flatRates = d.flat_rates ? `<h3 style="font-size:15px;margin:22px 0 6px">Flat-rate pricing</h3>
      <p style="font-size:14px;color:#3d4a4d;white-space:pre-wrap;margin:0">${esc(d.flat_rates)}</p>` : '';

  const inner = `
    <p style="color:#3d4a4d;margin:0 0 4px"><strong>${esc(v.businessName)}</strong> submitted pricing.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      ${row('Contact', `${v.contactName}${d.contact_title ? ' (' + d.contact_title + ')' : ''}`)}
      ${row('Email', v.email)}
      ${row('Phone', v.phone)}
      ${row('Trades', (v.trades || []).join(', '))}
      ${row('Areas', (v.areas || []).join(', '))}
      ${row('Years in business', d.years_in_business)}
      ${row('Technicians', d.crew_size)}
      ${row('Licence required', d.license_required === 'yes' ? 'Yes' : 'No statewide licence')}
      ${row('Licence number', v.licenseNumber)}
      ${row('Issuing authority', v.licenseAuthority)}
      ${row('Licence expires', v.licenseExpires)}
      ${row('GL carrier', d.gl_carrier)}
      ${row('GL limit', d.gl_limit)}
      ${row('GL expires', d.gl_expires)}
      ${row("Workers' comp", d.workers_comp === 'covered' ? 'Carries coverage'
              : d.workers_comp === 'exempt' ? 'Holds Florida exemption' : d.workers_comp)}
      ${row('Tech background screening', d.tech_screening)}
      ${row('Hourly rate', v.hourlyRate !== null && v.hourlyRate !== undefined ? '$' + v.hourlyRate : null)}
      ${row('After hours', d.afterhours_rate ? '$' + d.afterhours_rate : null)}
      ${row('Emergency', d.emergency_rate ? '$' + d.emergency_rate : null)}
      ${row('Trip fee', d.trip_fee ? '$' + d.trip_fee : null)}
      ${row('Materials markup', d.materials_markup ? d.materials_markup + '%' : null)}
      ${row('Response — routine', d.response_routine)}
      ${row('Response — emergency', d.response_emergency)}
      ${row('Payment terms', d.payment_terms)}
      ${row('Warranty', d.warranty)}
      ${row('Prices hold for', d.price_validity)}
    </table>
    ${flatRates}
    ${d.notes ? `<h3 style="font-size:15px;margin:22px 0 6px">Notes</h3><p style="font-size:14px;color:#3d4a4d;white-space:pre-wrap;margin:0">${esc(d.notes)}</p>` : ''}
    <div style="border-left:3px solid #b68235;padding:10px 14px;background:#faf8f4;font-size:13.5px;color:#3d4a4d;margin-top:22px">
      Before approving: verify the licence with the issuing authority yourself, collect the certificate of
      insurance and the workers' comp certificate or exemption, and get the W-9. The admin screen will not let
      you approve until those are marked done.
    </div>
  `;

  await sendGmail(env, {
    to: CONTACT_INBOX,
    subject: `Vendor pricing: ${v.businessName} — ${(v.trades || []).slice(0, 3).join(', ')}`,
    html: shell('New vendor submission', inner),
    replyTo: v.email,
  });
}

export async function sendVendorConfirmationEmail(env, v) {
  const inner = `
    <p style="color:#3d4a4d;line-height:1.6">Thanks — we have ${esc(v.businessName)}'s pricing.</p>
    <p style="color:#3d4a4d;line-height:1.6">We will verify your licence with the issuing authority and review your
      rates, usually within two to three business days. If it looks like a fit, we will email you for your
      certificate of insurance, your workers' compensation certificate or exemption, and your W-9, and set up a
      short call about terms.</p>
    <p style="color:#3d4a4d;line-height:1.6"><strong>Nothing else is needed right now, and we will never ask for
      bank details by email.</strong></p>
    <p style="color:#3d4a4d;line-height:1.6">If your licence or insurance changes before you hear from us, reply
      here and let us know.</p>
  `;
  await sendGmail(env, { to: v.email, subject: 'We received your pricing — Gulf ProClean', html: shell('Vendor submission received', inner) });
}
