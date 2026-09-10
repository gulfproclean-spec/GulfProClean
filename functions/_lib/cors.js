// Shared CORS helper for the two endpoints (site content, pricing bands)
// that used to set Access-Control-Allow-Origin: '*'. This is a single-site
// app, not a public API — there is no legitimate case where an arbitrary
// third-party origin should be able to read these responses via CORS — so
// only this project's own known origins are ever reflected back. Same-origin
// requests from the site's own pages are unaffected either way; this only
// changes what a *different* origin is allowed to read via fetch/XHR.
const ALLOWED_ORIGINS = new Set([
  'https://gulfproclean.pages.dev',
  'https://preview-test.gulfproclean.pages.dev',
]);

// Applies CORS headers to `res` based on the request's Origin header,
// reflecting it back only when it's in the allowlist above (never '*').
// `Vary: Origin` tells caches the response differs by origin so a cached
// response for one origin is never served to another.
export function applyCors(request, res) {
  const origin = request && request.headers.get('Origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.append('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  return res;
}
