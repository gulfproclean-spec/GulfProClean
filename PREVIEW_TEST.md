# Preview deployment trigger

This file exists only to trigger fresh Cloudflare Pages Preview builds on
the `preview-test` branch, so testing has a live URL that picks up the
Preview environment variables (test-mode Stripe keys, the Neon `testing`
branch DATABASE_URL, and a dedicated ADMIN_TOKEN).

Safe to delete once testing is done — this branch is never merged to `main`.

Rebuild log:
- Initial trigger, before the Test-mode Stripe webhook endpoint existed.
- Rebuilt after creating the Test-mode webhook endpoint and updating
  STRIPE_WEBHOOK_SECRET in Cloudflare's Preview environment to match.
