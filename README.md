# Gulf ProClean

Static marketing site (residential + commercial cleaning) with a small
Neon-Postgres-backed CMS for hero copy, the "what we clean" cards, the
testimonial quote, and the contact note on the residential/commercial pages.

## Structure

- `index.html`, `residential.html`, `commercial.html` — the site
- `ds-base.js`, `image-slot.js`, `tweaks-panel.jsx`, `_ds/` — shared design-system assets imported from the Claude Design project
- `functions/api/content/[page].js` — Cloudflare Pages Function: GET (public) / PUT (admin-token-protected) content for `residential` and `commercial`
- `admin.html` — minimal password-gated editor for that content
- `migrations/001_init.sql` — the one table (`site_content`) this uses

## Local preview

```bash
npm install
node serve.js
```

Opens a plain static file server on `http://localhost:8080`. The
`/api/content/*` routes only exist once deployed to Cloudflare Pages, so
locally the pages fall back to their built-in default copy — this is expected.

## Deploying (Cloudflare Pages, connected to GitHub)

1. Push this repo to GitHub.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, pick this repo.
3. Build settings: Framework preset **None**, build command **(empty)**, build output directory **/**.
   Cloudflare runs `npm install` automatically because `package.json` is present, which is what
   makes `@neondatabase/serverless` available to the function bundler. The `functions/` directory
   is auto-detected — no extra config needed.
4. In **Settings → Environment variables**, add for the Production (and Preview) environment:
   - `DATABASE_URL` — the Neon connection string (`postgresql://...neon.tech/neondb?sslmode=require&channel_binding=require`)
   - `ADMIN_TOKEN` — a long random secret; whoever has it can edit content at `/admin.html`
5. Deploy. The site is live at the `*.pages.dev` URL Cloudflare assigns (a custom domain can be attached afterward in the same project's **Custom domains** tab).

## Editing content

Visit `/admin.html` on the deployed site, paste in the admin token, edit the
JSON for either page, and save. Changes appear on next page load — no
redeploy needed.
