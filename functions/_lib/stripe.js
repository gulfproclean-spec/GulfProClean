// Minimal fetch-based Stripe REST client — no SDK, since the Stripe Node SDK
// relies on APIs the Cloudflare Workers runtime doesn't fully support.

function flattenParams(obj, prefix = '') {
  const pairs = [];
  for (const [key, value] of Object.entries(obj)) {
    const k = prefix ? `${prefix}[${key}]` : key;
    if (value == null) continue;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v != null && typeof v === 'object') pairs.push(...flattenParams(v, `${k}[${i}]`));
        else pairs.push([`${k}[${i}]`, String(v)]);
      });
    } else if (typeof value === 'object') {
      pairs.push(...flattenParams(value, k));
    } else {
      pairs.push([k, String(value)]);
    }
  }
  return pairs;
}

export async function stripeRequest(env, method, path, params) {
  let url = `https://api.stripe.com/v1/${path}`;
  const headers = { Authorization: 'Basic ' + btoa(`${env.STRIPE_SECRET_KEY}:`) };
  let body;
  if (method === 'GET') {
    if (params) url += '?' + new URLSearchParams(flattenParams(params)).toString();
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(flattenParams(params || {})).toString();
  }
  const res = await fetch(url, { method, headers, body });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error((data.error && data.error.message) || 'Stripe API error');
    err.stripeError = data.error;
    throw err;
  }
  return data;
}

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verifies Stripe's Stripe-Signature header per their documented scheme:
// https://stripe.com/docs/webhooks#verify-manually
export async function verifyStripeWebhookSignature(payload, sigHeader, secret, toleranceSeconds = 300) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map(p => p.split('=')));
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > toleranceSeconds) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${payload}`);
  return timingSafeEqualStr(expected, v1);
}
