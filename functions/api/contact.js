import { neon } from '@neondatabase/serverless';
import { sendContactNotificationEmail } from '../_lib/email.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ env, request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const { page, name, email, phone, message } = body;

  const requiredStrings = { name, email, message };
  const missing = Object.entries(requiredStrings).filter(([, v]) => typeof v !== 'string' || !v.trim());
  if (missing.length > 0) {
    return json({ error: 'Please fill in your name, email, and message.' }, 400);
  }
  if (!EMAIL_RE.test(email.trim())) {
    return json({ error: 'Please enter a valid email address.' }, 400);
  }

  const sql = neon(env.DATABASE_URL);
  const rows = await sql`
    insert into contact_messages (page, name, email, phone, message)
    values (${typeof page === 'string' && page.trim() ? page.trim() : null}, ${name.trim()}, ${email.trim()}, ${typeof phone === 'string' && phone.trim() ? phone.trim() : null}, ${message.trim()})
    returning id, created_at
  `;

  await sendContactNotificationEmail(env, {
    name: name.trim(), email: email.trim(),
    phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
    message: message.trim(),
    page: typeof page === 'string' ? page.trim() : null,
  });

  return json({ ok: true, id: rows[0].id }, 201);
}
