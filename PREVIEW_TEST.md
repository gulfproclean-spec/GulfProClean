# Preview deployment trigger

This file exists only to trigger a fresh Cloudflare Pages Preview build on
the `preview-test` branch, so testing has a live URL that picks up the
Preview environment variables (test-mode Stripe keys, the Neon `testing`
branch DATABASE_URL, and a dedicated ADMIN_TOKEN).

Safe to delete once testing is done — this branch is never merged to `main`.
