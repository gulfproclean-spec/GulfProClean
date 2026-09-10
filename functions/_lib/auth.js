function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// Constant-time string comparison. Used below for password-hash comparison,
// and also exported/reused by every admin- and cron-gated endpoint that
// compares an incoming bearer token or shared secret against an environment
// variable — see functions/api/admin/*.js, functions/api/{employees,
// vendors,applications,requests,content,pricing,schedule}.js, and
// functions/api/cron/renewal-reminders.js. Two equal-length inputs are
// compared byte-by-byte with no early exit; differing lengths short-circuit
// to `false` immediately (the same equal-length requirement Node's
// crypto.timingSafeEqual and Web Crypto's timing-safe helpers have), which
// leaks only that the lengths differ, never anything about either string's
// content.
export function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}

export async function verifyPassword(password, hashHex, saltHex) {
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return timingSafeEqualString(toHex(bits), hashHex);
}

export function newSessionToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Three separate account types (customer, applicant, vendor) share this one
// helper file, each with its own cookie name so a person can be signed in as
// more than one type at once without the cookies colliding — a customer who
// is also applying for a job does not get logged out of one by logging into
// the other.
export function sessionCookie(token, name = 'session') {
  return `${name}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(name = 'session') {
  return `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
}

export function getSessionToken(request, name = 'session') {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? match[1] : null;
}

export async function getCustomerFromSession(sql, request) {
  const token = getSessionToken(request);
  if (!token) return null;
  const rows = await sql`
    select c.id, c.email, c.address
    from sessions s
    join customers c on c.id = s.customer_id
    where s.token = ${token} and s.expires_at > now()
  `;
  return rows[0] || null;
}

export async function getApplicantFromSession(sql, request) {
  const token = getSessionToken(request, 'applicant_session');
  if (!token) return null;
  const rows = await sql`
    select a.id, a.email
    from applicant_sessions s
    join applicant_accounts a on a.id = s.applicant_account_id
    where s.token = ${token} and s.expires_at > now()
  `;
  return rows[0] || null;
}

export async function getVendorFromSession(sql, request) {
  const token = getSessionToken(request, 'vendor_session');
  if (!token) return null;
  const rows = await sql`
    select v.id, v.email
    from vendor_sessions s
    join vendor_accounts v on v.id = s.vendor_account_id
    where s.token = ${token} and s.expires_at > now()
  `;
  return rows[0] || null;
}

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
