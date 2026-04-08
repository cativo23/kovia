---
phase: 01-foundation
plan: 02
subsystem: auth
tags: [jwt, passport, bcrypt, google-oauth, bullmq, handlebars, mailpit, nestjs, prisma]

requires:
  - phase: 01-foundation-01
    provides: Docker Compose stack, Prisma schema with User/RefreshToken models, PrismaService, BullMQ
provides:
  - AuthService with register, verify, login, reset, refresh, resend, logout
  - AuthController with 12 REST endpoints
  - Passport strategies (local, JWT, JWT-refresh, Google OAuth)
  - Guards (JwtAuth global with @Public bypass, Roles, Local, Google)
  - MailService with async BullMQ email queue
  - Spanish email templates (verification, password reset)
  - Common decorators (@CurrentUser, @Public, @Roles)
  - HttpExceptionFilter for consistent error responses
affects: [01-03, 01-04, 01-05]

tech-stack:
  added: [cookie-parser]
  patterns: [jwt-access-refresh-rotation, bullmq-email-queue, handlebars-templates, passport-strategy-pattern, global-jwt-guard-with-public-bypass]

key-files:
  created:
    - backend/src/auth/auth.service.ts
    - backend/src/auth/auth.controller.ts
    - backend/src/auth/auth.module.ts
    - backend/src/auth/strategies/local.strategy.ts
    - backend/src/auth/strategies/jwt.strategy.ts
    - backend/src/auth/strategies/jwt-refresh.strategy.ts
    - backend/src/auth/strategies/google.strategy.ts
    - backend/src/auth/guards/jwt-auth.guard.ts
    - backend/src/auth/guards/roles.guard.ts
    - backend/src/auth/dto/register.dto.ts
    - backend/src/auth/dto/login.dto.ts
    - backend/src/auth/dto/reset-password.dto.ts
    - backend/src/users/users.service.ts
    - backend/src/users/users.module.ts
    - backend/src/mail/mail.service.ts
    - backend/src/mail/mail.processor.ts
    - backend/src/mail/mail.module.ts
    - backend/src/mail/templates/verification.hbs
    - backend/src/mail/templates/reset-password.hbs
    - backend/src/common/decorators/current-user.decorator.ts
    - backend/src/common/decorators/public.decorator.ts
    - backend/src/common/decorators/roles.decorator.ts
    - backend/src/common/filters/http-exception.filter.ts
    - backend/prisma/migrations/20260408210000_auth_rls_policies/migration.sql
  modified:
    - backend/src/app.module.ts
    - backend/src/app.controller.ts
    - backend/src/main.ts
    - backend/nest-cli.json
    - backend/package.json

key-decisions:
  - "Mailer HandlebarsAdapter imported from @nestjs-modules/mailer/adapters/ (not dist/adapters/) for ESM exports compatibility"
  - "Template dir uses process.cwd() path to avoid SWC __dirname mismatch with dist"
  - "cookie-parser default import (not * as) for SWC ESM compatibility"
  - "Auth RLS policies added: public_insert, auth_lookup, auth_update for unauthenticated operations"
  - "JWT_VERIFICATION_SECRET falls back to JWT_ACCESS_SECRET for simpler dev config"

patterns-established:
  - "Global JwtAuthGuard with @Public() decorator bypass via Reflector"
  - "Refresh token in httpOnly cookie, access token in response body"
  - "Refresh token rotation: old token deleted, new pair issued on refresh"
  - "BullMQ email queue with Handlebars template processor"
  - "Magic link pattern: verify/reset tokens auto-login (return token pair)"
  - "First user auto-promoted to PLATFORM_ADMIN via user count check"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

duration: 8min
completed: 2026-04-08
---

# Phase 1 Plan 02: Authentication Backend Summary

**JWT auth with refresh rotation, email verification via BullMQ + Mailpit, password reset magic links, and Google OAuth strategy with Passport**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-08T20:51:14Z
- **Completed:** 2026-04-08T20:59:50Z
- **Tasks:** 2
- **Files modified:** 37

## Accomplishments
- Full auth API: register, verify email, login, password reset, token refresh, Google OAuth, logout
- 30 unit tests passing across auth service, users service, and Google strategy
- Async email delivery via BullMQ queue with Spanish Handlebars templates
- Verified end-to-end: registration creates user and sends verification email to Mailpit
- All 12 auth endpoints documented in Swagger at /api/docs

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth core services, users module, and email infrastructure** - `84cee9d` (test), `06912b1` (feat)
2. **Task 2: Passport strategies, guards, controller wiring, and Google OAuth** - `f0f7a00` (test), `95e0e51` (feat)

_TDD pattern: test commit (RED) followed by implementation commit (GREEN)_

## Files Created/Modified
- `backend/src/auth/auth.service.ts` - Core auth logic: register, verify, login, reset, refresh, resend, logout
- `backend/src/auth/auth.controller.ts` - 12 REST endpoints with Swagger decorators
- `backend/src/auth/auth.module.ts` - Wires strategies, guards, controller, UsersModule, MailModule
- `backend/src/auth/strategies/local.strategy.ts` - Email/password validation via bcrypt
- `backend/src/auth/strategies/jwt.strategy.ts` - Access token from Authorization Bearer header
- `backend/src/auth/strategies/jwt-refresh.strategy.ts` - Refresh token from httpOnly cookie
- `backend/src/auth/strategies/google.strategy.ts` - Google OAuth with user upsert by googleId/email
- `backend/src/auth/guards/jwt-auth.guard.ts` - Global guard with @Public() bypass
- `backend/src/auth/guards/roles.guard.ts` - Role-based access via @Roles decorator
- `backend/src/auth/dto/register.dto.ts` - Registration DTO with password strength validation
- `backend/src/auth/dto/login.dto.ts` - Login DTO
- `backend/src/auth/dto/reset-password.dto.ts` - ResetPasswordRequestDto and ResetPasswordDto
- `backend/src/users/users.service.ts` - User CRUD via Prisma (findByEmail, findById, create, update)
- `backend/src/users/users.module.ts` - Exports UsersService
- `backend/src/mail/mail.service.ts` - Queue verification, reset, and invite emails via BullMQ
- `backend/src/mail/mail.processor.ts` - BullMQ worker processing email jobs via MailerService
- `backend/src/mail/mail.module.ts` - Mailer + BullMQ queue registration with Handlebars adapter
- `backend/src/mail/templates/verification.hbs` - Spanish verification email HTML template
- `backend/src/mail/templates/reset-password.hbs` - Spanish password reset email HTML template
- `backend/src/common/decorators/current-user.decorator.ts` - @CurrentUser() parameter decorator
- `backend/src/common/decorators/public.decorator.ts` - @Public() route decorator
- `backend/src/common/decorators/roles.decorator.ts` - @Roles() route decorator
- `backend/src/common/filters/http-exception.filter.ts` - Consistent error response format
- `backend/prisma/migrations/20260408210000_auth_rls_policies/migration.sql` - Auth-specific RLS policies

## Decisions Made
- **HandlebarsAdapter import path:** Use `@nestjs-modules/mailer/adapters/` (ESM exports) not `dist/adapters/`
- **Template directory:** `process.cwd()/src/mail/templates` instead of `__dirname` to avoid SWC dist path mismatch
- **cookie-parser import:** Default import instead of namespace import for SWC ESM compatibility
- **Auth RLS policies:** Added permissive INSERT/SELECT/UPDATE policies when no user context is set, enabling registration and auth lookups through RLS
- **JWT_VERIFICATION_SECRET:** Falls back to JWT_ACCESS_SECRET when not set, simplifying dev configuration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] HandlebarsAdapter import path incompatible with ESM exports**
- **Found during:** Task 2 (API startup)
- **Issue:** `@nestjs-modules/mailer/dist/adapters/handlebars.adapter` not exported in package.json exports map
- **Fix:** Changed import to `@nestjs-modules/mailer/adapters/handlebars.adapter`
- **Files modified:** backend/src/mail/mail.module.ts
- **Committed in:** 95e0e51

**2. [Rule 3 - Blocking] cookie-parser namespace import fails with SWC**
- **Found during:** Task 2 (API startup)
- **Issue:** `import * as cookieParser from 'cookie-parser'` results in `_cookieparser is not a function`
- **Fix:** Changed to default import: `import cookieParser from 'cookie-parser'`
- **Files modified:** backend/src/main.ts
- **Committed in:** 95e0e51

**3. [Rule 3 - Blocking] Handlebars template files not found in dist/**
- **Found during:** Task 2 (email sending)
- **Issue:** SWC builder does not copy .hbs files to dist, so `__dirname` pointed to non-existent templates
- **Fix:** Changed template dir to `join(process.cwd(), 'src', 'mail', 'templates')` and added assets config to nest-cli.json
- **Files modified:** backend/src/mail/mail.module.ts, backend/nest-cli.json
- **Committed in:** 95e0e51

**4. [Rule 1 - Bug] RLS policies blocking user registration**
- **Found during:** Task 2 (smoke test)
- **Issue:** Users table has RLS enabled but no policy allowing inserts without tenant context, blocking registration
- **Fix:** Added three RLS policies (public_insert, auth_lookup, auth_update) for operations without user context
- **Files modified:** backend/prisma/migrations/20260408210000_auth_rls_policies/migration.sql
- **Committed in:** 95e0e51

**5. [Rule 3 - Blocking] Missing cookie-parser dependency**
- **Found during:** Task 2 (refresh token implementation)
- **Issue:** cookie-parser not installed, needed for extracting refresh token from httpOnly cookie
- **Fix:** Installed cookie-parser and @types/cookie-parser
- **Files modified:** backend/package.json, backend/package-lock.json
- **Committed in:** 95e0e51

---

**Total deviations:** 5 auto-fixed (1 bug, 4 blocking)
**Impact on plan:** All fixes necessary for runtime correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required. Google OAuth uses placeholder values for dev.

## Next Phase Readiness
- Auth API complete and tested, ready for frontend auth pages (Plan 03)
- Email infrastructure verified: Mailpit receives verification emails
- Global JWT guard active with @Public() bypass pattern established
- All Swagger documentation in place for frontend integration
- Google OAuth strategy ready (needs real GOOGLE_CLIENT_ID/SECRET for production)

## Self-Check: PASSED

All 16 key files verified present. All 4 task commits (84cee9d, 06912b1, f0f7a00, 95e0e51) verified in git log.
