# Mobile apps (iOS + Android)

Two Capacitor shells that wrap the live site, so the apps always run the
same code the website runs — no separate mobile codebase to maintain:

| Folder | App name | Bundle / package id | Opens |
|---|---|---|---|
| `apps/customer` | Gulf ProClean | `com.gulfproclean.app` | `/account.html` (book, manage, reschedule) |
| `apps/crew` | Gulf ProClean Crew | `com.gulfproclean.crew` | `/employee.html` (technician checklist app) |

`capacitor.config.json` → `server.url` is the production site. **If the site
moves to a custom domain, change that URL in both configs and rebuild.**

## Build once (on a Mac for iOS; any OS for Android)

```
cd apps/customer            # or apps/crew
npm install
npx cap add ios             # needs Xcode 15+ (Mac only)
npx cap add android         # needs Android Studio + JDK 17
npm run assets              # generates every icon/splash size from resources/
npx cap sync
```

Then `npm run ios` opens Xcode and `npm run android` opens Android Studio.
Signing, archiving and uploading are done from those two IDEs — see
`STORE-SUBMISSION.md` in the repo root for the full step-by-step.

The `ios/` and `android/` folders Capacitor generates are meant to be
committed once created (they hold signing config and store metadata).
