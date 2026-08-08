// Minimal cookie-based "session" for demo purposes.
//
// IMPORTANT: this base64-encodes the session payload but does NOT sign or
// encrypt it, so it is NOT secure for a real production login system.
// Before you launch this for real, swap this file's implementation for
// NextAuth.js, Clerk, Lucia, or another vetted auth library. See README.md
// → "Going to production" for pointers. It's kept intentionally simple here
// so the booking/matching/dashboard flows are easy to read and demo.

export const SESSION_COOKIE = "gcp_session";

export function encodeSession(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeSession(value) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
