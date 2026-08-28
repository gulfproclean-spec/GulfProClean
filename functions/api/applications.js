import { neon } from '@neondatabase/serverless';
import { sendApplicationNotificationEmail, sendApplicationConfirmationEmail } from '../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function yesNo(v) {
  if (v === 'yes' || v === true) return true;
  if (v === 'no' || v === false) return false;
  return null;
}

function str(v, max = 2000) {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
}

function strArray(v, max = 20) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string').slice(0, max).map(x => x.slice(0, 80)) : [];
}

// POST /api/applications — public. Anyone can apply; nothing here is gated.
export async function onRequestPost({ env, request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const answers = (body.answers && typeof body.answers === 'object') ? body.answers : {};

  const firstName = str(answers.first_name, 120);
  const lastName = str(answers.last_name, 120);
  const email = str(answers.email, 200);
  const phone = str(answers.phone, 40);

  if (!firstName || !lastName || !email || !phone) {
    return json({ error: 'Please give us your name, email and phone number.' }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }
  if (yesNo(answers.is_adult) === false) {
    return json({ error: 'Every posted role requires you to be 18 or older.' }, 400);
  }
  // The three acknowledgements are what make the application a signed
  // document rather than a lead form, so the server insists on them too —
  // the browser check alone is not the record.
  if (!answers.ack_truth || !answers.ack_contingent || !answers.ack_atwill) {
    return json({ error: 'Please check the three required acknowledgements before submitting.' }, 400);
  }
  if (!str(answers.signature, 200)) {
    return json({ error: 'Please type your name as your signature.' }, 400);
  }

  const convicted = yesNo(answers.convicted);
  if (convicted === true && !str(answers.conviction_explanation, 4000)) {
    return json({ error: 'Please add a short explanation for the criminal history question.' }, 400);
  }

  const roleSlug = str(body.role_slug, 120) || 'general';
  const roleTitle = str(body.role_title, 200) || 'General application';

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    insert into job_applications (
      role_slug, role_title, first_name, last_name, email, phone, city, zip,
      work_authorized, needs_sponsorship, is_adult, convicted, conviction_explanation,
      days, shifts, employment, reference_contacts, answers
    ) values (
      ${roleSlug}, ${roleTitle}, ${firstName}, ${lastName}, ${email}, ${phone},
      ${str(answers.city, 120)}, ${str(answers.zip, 20)},
      ${yesNo(answers.work_authorized)}, ${yesNo(answers.needs_sponsorship)},
      ${yesNo(answers.is_adult)}, ${convicted}, ${str(answers.conviction_explanation, 4000)},
      ${strArray(body.days, 7)}, ${strArray(body.shifts, 8)},
      ${JSON.stringify(Array.isArray(body.employment) ? body.employment.slice(0, 6) : [])},
      ${JSON.stringify(Array.isArray(body.reference_contacts) ? body.reference_contacts.slice(0, 4) : [])},
      ${JSON.stringify(answers)}
    )
    returning id, created_at
  `;

  const application = {
    id: rows[0].id,
    roleTitle,
    firstName, lastName, email, phone,
    city: str(answers.city, 120),
    days: strArray(body.days, 7),
    shifts: strArray(body.shifts, 8),
    employmentType: str(answers.employment_type, 60),
    yearsExperience: str(answers.years_experience, 60),
    startDate: str(answers.start_date, 40),
    convicted,
    employment: Array.isArray(body.employment) ? body.employment : [],
    references: Array.isArray(body.reference_contacts) ? body.reference_contacts : [],
    notes: str(answers.notes, 4000),
    resumeUrl: str(answers.resume_url, 500),
    source: str(answers.source, 120),
  };

  // Email is best-effort: the application is already saved, and a Gmail
  // outage must never cost us a candidate.
  try {
    await sendApplicationNotificationEmail(env, application);
    await sendApplicationConfirmationEmail(env, application);
  } catch (e) {
    // swallow — the row is the record of truth
  }

  return json({ ok: true, id: rows[0].id }, 201);
}

// GET /api/applications — admin only. Supports ?status= and ?role= filters.
export async function onRequestGet({ env, request }) {
  const auth = request.headers.get('authorization');
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const role = url.searchParams.get('role');

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    select a.id, a.role_slug, a.role_title, a.first_name, a.last_name, a.email, a.phone,
           a.city, a.zip, a.status, a.work_authorized, a.needs_sponsorship, a.convicted,
           a.conviction_explanation, a.days, a.shifts, a.employment, a.reference_contacts,
           a.answers, a.notes_internal, a.created_at, a.updated_at,
           p.token as prehire_token, p.completed_at as prehire_completed_at
      from job_applications a
      left join prehire_authorizations p on p.application_id = a.id
     where (${status}::text is null or a.status = ${status})
       and (${role}::text is null or a.role_slug = ${role})
     order by a.created_at desc
     limit 500
  `;
  return json({ rows });
}
