import { neon } from '@neondatabase/serverless';
import { sendVendorNotificationEmail, sendVendorConfirmationEmail } from '../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v, max = 2000) {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}
function strArray(v, max = 30) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, max).map(x => x.slice(0, 80)) : [];
}

// POST /api/vendors — public.
export async function onRequestPost({ env, request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const businessName = str(body.business_name, 200);
  const contactName = str(body.contact_name, 200);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const details = (body.details && typeof body.details === 'object') ? body.details : {};

  if (!businessName || !contactName || !email || !phone) {
    return json({ error: 'Please give us your business name, contact name, email and phone.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  const trades = strArray(body.trades);
  if (!trades.length) return json({ error: 'Please select at least one trade you provide.' }, 400);

  // Re-checked server-side rather than trusted from the browser: an uninsured
  // subcontractor's workers become the hiring contractor's employees for
  // injury purposes, so this one is not a formality.
  if (details.workers_comp === 'none') {
    return json({
      error: "We can't add a vendor with neither workers' compensation coverage nor a valid Florida exemption certificate. " +
             'Get one of the two in place and submit again — gulfproclean@gmail.com if you want to talk it through.',
    }, 400);
  }
  // A licensed trade with no licence number cannot be verified, and an
  // unverifiable vendor never gets dispatched, so it is refused at the door.
  if (details.license_required === 'yes' && !str(body.license_number, 100)) {
    return json({ error: 'Please include your licence number — we verify it with the issuing authority before dispatch.' }, 400);
  }
  if (!details.cert_accurate || !details.cert_verify || !details.cert_notify) {
    return json({ error: 'Please check the three required certifications before submitting.' }, 400);
  }

  const hourly = Number(body.hourly_rate);
  const licenseExpires = str(body.license_expires, 20);

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    insert into vendor_submissions (
      business_name, contact_name, email, phone, trades, areas,
      license_number, license_authority, license_expires, hourly_rate, details
    ) values (
      ${businessName}, ${contactName}, ${email}, ${phone},
      ${trades}, ${strArray(body.areas, 20)},
      ${str(body.license_number, 100)}, ${str(body.license_authority, 200)},
      ${licenseExpires}, ${Number.isFinite(hourly) ? hourly : null},
      ${JSON.stringify(details)}
    )
    returning id, created_at
  `;

  const vendor = {
    id: rows[0].id,
    businessName, contactName, email, phone,
    trades, areas: strArray(body.areas, 20),
    licenseNumber: str(body.license_number, 100),
    licenseAuthority: str(body.license_authority, 200),
    licenseExpires,
    hourlyRate: Number.isFinite(hourly) ? hourly : null,
    details,
  };

  try {
    await sendVendorNotificationEmail(env, vendor);
    await sendVendorConfirmationEmail(env, vendor);
  } catch (e) {
    // Row is saved; email is best-effort.
  }

  return json({ ok: true, id: rows[0].id }, 201);
}

// GET /api/vendors — admin only. ?status= and ?trade= filters.
export async function onRequestGet({ env, request }) {
  const auth = request.headers.get('authorization');
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const trade = url.searchParams.get('trade');

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select * from vendor_submissions
     where (${status}::text is null or status = ${status})
       and (${trade}::text is null or ${trade} = any(trades))
     order by created_at desc
     limit 500
  `;
  return json({ rows });
}
