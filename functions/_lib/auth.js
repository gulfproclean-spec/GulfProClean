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

// Hashes a session token before it is ever written to or read from the
// database. Only this digest is stored, in sessions.token_hash /
// applicant_sessions.token_hash / vendor_sessions.token_hash /
// employee_sessions.token_hash — never the raw token from
// newSessionToken(), which stays only in the browser's session cookie and
// in-memory during a request. If the database were ever read by someone
// unauthorized, a stolen token_hash cannot be replayed as a cookie value
// the way a stolen raw token could.
//
// Plain SHA-256 (Web Crypto, the same API hashPassword/verifyPassword above
// already use for PBKDF2 — there is no Node `crypto` module on Cloudflare
// Pages Functions), not PBKDF2: PBKDF2's iteration cost defends a
// low-entropy secret (a human password) against offline guessing. A session
// token is already 256 bits straight out of the platform CSPRNG
// (newSessionToken above) — nothing meaningful to "guess" — so a slow KDF
// buys nothing here and would just add latency to every authenticated
// request. Looking a hash up with plain SQL `=` (see getCustomerFromSession
// etc. below) is likewise fine and deliberately not run through
// timingSafeEqualString: that helper protects comparisons against a raw
// secret (a password hash, a bearer token) where a timing difference could
// leak information about the secret itself. Two SHA-256 digests being
// compared for equality don't have that property — nothing about the
// original token is recoverable from how long the comparison takes.
export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(digest);
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Four separate account types (customer, applicant, vendor, employee) share
// this one helper file, each with its own cookie name so a person can be
// signed in as more than one type at once without the cookies colliding — a
// customer who is also applying for a job does not get logged out of one by
// logging into the other.
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
  const tokenHash = await hashToken(token);
  const rows = await sql`
    select c.id, c.email, c.address
    from sessions s
    join customers c on c.id = s.customer_id
    where s.token_hash = ${tokenHash} and s.expires_at > now()
  `;
  return rows[0] || null;
}

export async function getApplicantFromSession(sql, request) {
  const token = getSessionToken(request, 'applicant_session');
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const rows = await sql`
    select a.id, a.email
    from applicant_sessions s
    join applicant_accounts a on a.id = s.applicant_account_id
    where s.token_hash = ${tokenHash} and s.expires_at > now()
  `;
  return rows[0] || null;
}

export async function getVendorFromSession(sql, request) {
  const token = getSessionToken(request, 'vendor_session');
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const rows = await sql`
    select v.id, v.email
    from vendor_sessions s
    join vendor_accounts v on v.id = s.vendor_account_id
    where s.token_hash = ${tokenHash} and s.expires_at > now()
  `;
  return rows[0] || null;
}

// Employees (the crew using employee.html / the Crew mobile app). The
// session also dies the moment the office deactivates the technician —
// `active = true` is part of the lookup, so a deactivated employee is
// logged out on their next request without anyone having to hunt down
// their sessions. Same token_hash scheme as the other three account types
// above — see hashToken's comment for why.
export async function getEmployeeFromSession(sql, request) {
  const token = getSessionToken(request, 'employee_session');
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const rows = await sql`
    select e.id, e.email, e.first_name, e.last_name, e.phone
    from employee_sessions s
    join employees e on e.id = s.employee_id
    where s.token_hash = ${tokenHash} and s.expires_at > now() and e.active = true
  `;
  return rows[0] || null;
}

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
