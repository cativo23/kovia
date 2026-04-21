---
phase: 01-foundation
plan: 05
subsystem: testing
tags: [playwright, vitest, e2e, chromium, mailpit, docker]

requires:
  - phase: 01-foundation-02
    provides: Auth API (register, verify, login, reset, refresh) with JWT + refresh cookie
  - phase: 01-foundation-03
    provides: Frontend auth pages, Pinia auth store, route middleware
provides:
  - Playwright E2E test suite for frontend auth flows (5 tests)
  - Backend E2E test suite against live API + DB (14 tests)
  - Auth store bug fixes (fetchProfile after login/verify/reset)
  - Auth plugin for session restoration on page reload
  - Nitro API proxy for same-origin cookies in Docker
affects: [02-01, 02-02]

tech-stack:
  added: ["@playwright/test"]
  patterns: [nitro-api-proxy, auth-plugin-session-restore, mailpit-e2e-helper]

key-files:
  created:
    - frontend/playwright.config.ts
    - frontend/tests/e2e/auth.spec.ts
    - frontend/app/plugins/auth.ts
    - backend/test/e2e/auth.e2e-spec.ts
  modified:
    - frontend/app/stores/auth.ts
    - frontend/nuxt.config.ts
    - frontend/package.json
    - backend/src/auth/auth.controller.ts
    - backend/src/auth/auth.service.ts
    - backend/src/main.ts
    - docker-compose.yml

key-decisions:
  - "Nitro routeRules proxy (/api/**) to backend to avoid CORS and third-party cookie issues in Docker"
  - "Auth plugin (plugins/auth.ts) runs initialize() on every page load for session restoration"
  - "Auth store fetchProfile() after login/verify/reset since backend returns accessToken only"
  - "getProfile endpoint returns full user data from DB instead of JWT payload"
  - "sameSite cookie changed to 'lax' in development for Docker cross-origin compatibility"
  - "NUXT_API_INTERNAL env var for server-side API URL, /api proxy for client-side"

patterns-established:
  - "Mailpit E2E helper: search by recipient, extract tokens from HTML, clearMailpit between tests"
  - "Nitro proxy pattern: /api/** -> backend, avoiding CORS and cookie issues"
  - "Auth session restore: global plugin initializes auth store on page load via refresh cookie"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

duration: 31min
completed: 2026-04-08
---

# Phase 1 Plan 05: E2E Test Suite for Auth Flows Summary

**Playwright frontend E2E tests (register, verify, login, session persist, password reset via Mailpit) and Vitest backend E2E tests (14 tests covering all auth endpoints against live API + PostgreSQL)**

## Performance

- **Duration:** 31 min
- **Started:** 2026-04-08T21:14:09Z
- **Completed:** 2026-04-08T21:45:09Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- 5 Playwright E2E tests covering the full auth lifecycle in the browser: register, email verification via Mailpit API, login, session persist (page reload with silent refresh), password reset
- 14 backend E2E tests covering register (success + duplicate + invalid), verify-email (valid + invalid), login (valid + wrong password + unverified), refresh (valid + no cookie), password reset (full flow), and session persistence (access token + refresh cycle)
- Fixed critical integration bugs: auth store not fetching user profile after auth actions, missing session restore on page reload, third-party cookie blocking in Docker environment
- Established Nitro API proxy pattern for same-origin cookie handling in Docker

## Task Commits

Each task was committed atomically:

1. **Task 1: Playwright config and frontend E2E auth specs** - `b5ba9ed` (feat)
2. **Task 2: Backend auth E2E tests against live API + database** - `399d108` (test)

## Files Created/Modified
- `frontend/playwright.config.ts` - Playwright config with Chromium for Docker E2E
- `frontend/tests/e2e/auth.spec.ts` - 5 Playwright E2E specs for auth flows with Mailpit integration
- `frontend/app/plugins/auth.ts` - Global auth plugin for session restoration on page load
- `backend/test/e2e/auth.e2e-spec.ts` - 14 backend E2E tests against live API endpoints
- `frontend/app/stores/auth.ts` - Fixed: fetchProfile after login/verify/reset, added fetchProfile method
- `frontend/nuxt.config.ts` - Added Nitro proxy routeRules for /api/**, updated runtimeConfig
- `frontend/package.json` - Added @playwright/test dependency
- `backend/src/auth/auth.controller.ts` - getProfile uses userId lookup, sameSite cookie fix
- `backend/src/auth/auth.service.ts` - Added getProfile method returning full user data
- `backend/src/main.ts` - CORS updated with Docker-internal origin
- `docker-compose.yml` - Changed NUXT_PUBLIC_API_URL to NUXT_API_INTERNAL

## Decisions Made
- **Nitro API proxy:** Client-side API calls go through `/api/**` proxy to avoid CORS and third-party cookie blocking. The `NUXT_PUBLIC_API_URL` env var was renamed to `NUXT_API_INTERNAL` to prevent Nuxt's auto-override of the public runtime config.
- **Auth plugin:** Created a global Nuxt plugin that calls `authStore.initialize()` on every page load, restoring the session from the refresh token cookie. Previously, only the `auth` middleware called initialize, leaving public pages without session restoration.
- **fetchProfile pattern:** The backend auth endpoints (login, verify-email, reset-password) return only `{ accessToken }`, not user data. The auth store now calls a separate `fetchProfile()` method after each auth action to get the full user object from `/auth/me`.
- **getProfile from DB:** Changed the `/auth/me` endpoint to look up the user from the database instead of returning the JWT payload, providing complete user data (firstName, lastName, emailVerified, organizationId).
- **sameSite cookie:** Changed from `strict` to `lax` in development mode to allow cookies to be sent in cross-origin contexts within Docker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Auth store not fetching user profile after auth actions**
- **Found during:** Task 1 (email verification E2E test)
- **Issue:** Auth store expected `{ accessToken, user }` from login/verify/reset responses, but backend only returns `{ accessToken }`. User object was always null after auth actions.
- **Fix:** Added `fetchProfile()` method to auth store, called after login, verifyEmail, and resetPassword. Updated `/auth/me` endpoint to return full user data from DB.
- **Files modified:** frontend/app/stores/auth.ts, backend/src/auth/auth.controller.ts, backend/src/auth/auth.service.ts
- **Committed in:** b5ba9ed

**2. [Rule 3 - Blocking] CORS blocking E2E requests from Docker-internal browser**
- **Found during:** Task 1 (register E2E test)
- **Issue:** Browser at `localhost:3000` (Nuxt container) made requests to `api:3000`, but CORS only allowed `localhost:3001`.
- **Fix:** Added `http://localhost:3000` to CORS origins in backend main.ts.
- **Files modified:** backend/src/main.ts
- **Committed in:** b5ba9ed

**3. [Rule 3 - Blocking] Third-party cookies blocked by browser in Docker**
- **Found during:** Task 1 (session persist E2E test)
- **Issue:** Refresh token cookie set by `api:3000` was blocked as third-party cookie when browser ran on `localhost:3000`. Session persistence failed after page reload.
- **Fix:** Implemented Nitro API proxy (`/api/**` -> `http://api:3000/**`) so all requests are same-origin. Changed `NUXT_PUBLIC_API_URL` env to `NUXT_API_INTERNAL` and set public apiUrl to `/api`.
- **Files modified:** frontend/nuxt.config.ts, docker-compose.yml
- **Committed in:** b5ba9ed

**4. [Rule 1 - Bug] Auth store not initializing on public pages**
- **Found during:** Task 1 (session persist E2E test)
- **Issue:** `authStore.initialize()` was only called by the `auth` middleware, but the home page is public. After reload on `/`, no session restoration happened.
- **Fix:** Created global auth plugin (`plugins/auth.ts`) that calls `initialize()` on every page load.
- **Files modified:** frontend/app/plugins/auth.ts
- **Committed in:** b5ba9ed

**5. [Rule 3 - Blocking] @playwright/test not installed**
- **Found during:** Task 1 (Playwright config setup)
- **Issue:** Only `playwright-core` was installed, but `@playwright/test` is required for the test runner and assertions.
- **Fix:** Installed `@playwright/test` as dev dependency.
- **Files modified:** frontend/package.json, frontend/package-lock.json
- **Committed in:** b5ba9ed

**6. [Rule 1 - Bug] resetPassword sending wrong field name**
- **Found during:** Task 1 (password reset E2E test)
- **Issue:** Auth store sent `{ token, password }` but backend DTO expects `{ token, newPassword }`.
- **Fix:** Changed auth store's resetPassword action to send `newPassword` field.
- **Files modified:** frontend/app/stores/auth.ts
- **Committed in:** b5ba9ed

---

**Total deviations:** 6 auto-fixed (3 bugs, 3 blocking)
**Impact on plan:** All fixes necessary for E2E tests and overall auth correctness. The Nitro proxy and auth plugin are architectural improvements that fix real production issues.

## Issues Encountered
- Chromium system dependencies (`libnspr4`, `libxfixes3`, etc.) required manual installation in Docker container due to GPG signature issues preventing `playwright install-deps`
- Docker disk space (100% full) required `docker system prune` before installing dependencies
- Nuxt dev server Vite socket became stale after `/tmp` cleanup, required container restart

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All auth E2E tests pass against the Docker Compose stack
- VALIDATION.md Wave 0 test file requirements satisfied
- Nitro proxy pattern established for future API calls
- Auth session restoration works reliably across page reloads
- Backend E2E test pattern established for future endpoint testing

## Self-Check: PASSED

All 4 key files verified present. Both task commits (b5ba9ed, 399d108) verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-04-08*
