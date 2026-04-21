---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [docker, nestjs, nuxt, prisma, postgresql, rls, vitest, redis, mailpit, i18n]

requires:
  - phase: none
    provides: greenfield project
provides:
  - Docker Compose with 5 services (api, web, postgres, redis, mailpit)
  - NestJS 11 backend with Swagger, validation, CORS, CLS, BullMQ
  - Nuxt 4 frontend with @nuxt/ui, Pinia, i18n (es-SV default)
  - Prisma 7 schema with 5 models and RLS policies
  - PrismaService with driver adapter and RLS extension via nestjs-cls
  - Vitest configs for both backend and frontend
affects: [01-02, 01-03, 01-04, 01-05]

tech-stack:
  added: [nestjs@11, nuxt@4, prisma@7, @prisma/adapter-pg, pg, nestjs-cls, @nestjs/bullmq, bullmq, @nestjs/swagger, class-validator, class-transformer, @nuxt/ui, @pinia/nuxt, @nuxtjs/i18n, vitest, unplugin-swc, @swc/core, @swc/cli, happy-dom]
  patterns: [prisma-rls-extension, cls-tenant-context, swc-builder, driver-adapter]

key-files:
  created:
    - docker-compose.yml
    - backend/prisma/schema.prisma
    - backend/prisma.config.ts
    - backend/src/prisma/prisma.service.ts
    - backend/src/prisma/prisma-rls.extension.ts
    - backend/src/prisma/prisma.module.ts
    - backend/src/tenant/tenant.middleware.ts
    - backend/src/tenant/tenant.module.ts
    - backend/vitest.config.ts
    - frontend/nuxt.config.ts
    - frontend/i18n/locales/es-SV.json
  modified:
    - backend/src/main.ts
    - backend/src/app.module.ts
    - .gitignore

key-decisions:
  - "Prisma 7 generated client imported from client.ts not index (no index.js in generated output)"
  - "SWC builder with typeCheck disabled for Prisma 7 ESM/CJS compatibility"
  - "Redis host port mapped to 6380 to avoid conflict with host Redis"
  - "Skipped @nuxt/test-utils due to workspace: protocol incompatibility with npm"

patterns-established:
  - "PrismaService extends PrismaClient with PrismaPg driver adapter"
  - "RLS enforcement via Prisma $extends + SET LOCAL in transaction"
  - "TenantMiddleware populates CLS store with userId, organizationId, isAdmin from JWT"
  - "All Docker scaffolding via docker run --rm -v node:22"
  - "Import Prisma generated client from src/generated/prisma/client"

requirements-completed: [INFR-01, INFR-03]

duration: 41min
completed: 2026-04-08
---

# Phase 1 Plan 01: Infrastructure and Scaffold Summary

**Docker Compose monorepo with NestJS 11, Nuxt 4, Prisma 7 schema (5 models), and PostgreSQL RLS policies on tenant-scoped tables**

## Performance

- **Duration:** 41 min
- **Started:** 2026-04-08T20:06:13Z
- **Completed:** 2026-04-08T20:47:58Z
- **Tasks:** 2
- **Files modified:** 37

## Accomplishments
- Full Docker Compose stack (5 services) running with hot reload via volume mounts
- NestJS 11 API with Swagger at /api/docs, global validation pipe, CORS, CLS, BullMQ
- Nuxt 4 frontend with @nuxt/ui, Pinia, i18n (es-SV default), landing page showing Spanish text
- Prisma 7 schema with User, RefreshToken, Organization, OrgInvite, AuditLog models migrated to PostgreSQL
- RLS policies active on users, organizations, org_invites, audit_logs tables
- PrismaService with driver adapter, RLS extension via nestjs-cls, TenantMiddleware for request context
- Vitest configured for both backend (SWC plugin) and frontend (happy-dom)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold monorepo with Docker Compose, NestJS 11, and Nuxt 4** - `f6ba5b3` (feat)
2. **Task 2: Prisma schema, RLS migration, and database initialization** - `d1b8d5b` (feat)

## Files Created/Modified
- `docker-compose.yml` - 5-service Docker Compose orchestration
- `.env.example` - Environment variable template
- `.gitignore` - Updated with node_modules, dist, generated, coverage patterns
- `backend/Dockerfile` - Dev Dockerfile with node:22
- `backend/package.json` - All backend dependencies (auth, email, queue, testing)
- `backend/tsconfig.json` - Strict mode with paths aliases
- `backend/nest-cli.json` - SWC builder configuration
- `backend/src/main.ts` - Swagger, validation pipe, CORS
- `backend/src/app.module.ts` - ConfigModule, ClsModule, BullModule, PrismaModule, TenantModule
- `backend/vitest.config.ts` - Vitest with SWC plugin for decorators
- `backend/vitest.config.e2e.ts` - E2E test configuration
- `backend/prisma.config.ts` - Prisma 7 config with MIGRATION_DATABASE_URL
- `backend/prisma/schema.prisma` - All Phase 1 models
- `backend/prisma/init.sql` - app_user role creation for RLS
- `backend/prisma/migrations/20260408203549_init/migration.sql` - Schema + RLS policies
- `backend/src/prisma/prisma.service.ts` - PrismaClient with PrismaPg adapter
- `backend/src/prisma/prisma-rls.extension.ts` - RLS via $extends + SET LOCAL
- `backend/src/prisma/prisma.module.ts` - Global module exporting both clients
- `backend/src/tenant/tenant.middleware.ts` - JWT claims to CLS store
- `backend/src/tenant/tenant.module.ts` - Middleware registration
- `frontend/Dockerfile` - Dev Dockerfile with nuxt dev
- `frontend/package.json` - Nuxt 4 with UI, Pinia, i18n modules
- `frontend/nuxt.config.ts` - i18n (es-SV default, no_prefix), runtimeConfig
- `frontend/app/app.vue` - NuxtLayout + NuxtPage
- `frontend/app/pages/index.vue` - Landing page with i18n keys
- `frontend/i18n/locales/es-SV.json` - Spanish translations (common, auth, org, admin, landing)
- `frontend/vitest.config.ts` - Vitest with happy-dom environment

## Decisions Made
- **Prisma 7 client import path:** Generated client has no index.js -- must import from `generated/prisma/client` specifically
- **SWC builder without typeCheck:** Prisma 7 generated TypeScript uses ESM patterns that cause tsc errors under nodenext CJS resolution; SWC handles transpilation correctly
- **Redis host port 6380:** Host already has Redis on 6379; mapped container port to 6380 to avoid conflict
- **Skipped @nuxt/test-utils:** Package uses `workspace:*` protocol dependencies incompatible with npm; using vitest + happy-dom directly
- **prisma.config.ts uses MIGRATION_DATABASE_URL:** Migrations run as postgres superuser (bypasses RLS), runtime uses app_user (RLS enforced)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @nestjs/config dependency**
- **Found during:** Task 1 (API startup)
- **Issue:** NestJS scaffold did not include @nestjs/config, causing compilation failure
- **Fix:** Installed @nestjs/config via docker compose exec
- **Files modified:** backend/package.json, backend/package-lock.json
- **Committed in:** f6ba5b3 (Task 1 commit)

**2. [Rule 1 - Bug] Prisma 7 url in schema.prisma rejected**
- **Found during:** Task 2 (Prisma migrate)
- **Issue:** Prisma 7 no longer supports `url` in datasource block of schema.prisma -- moved to prisma.config.ts
- **Fix:** Removed url from schema.prisma, configured in prisma.config.ts
- **Files modified:** backend/prisma/schema.prisma, backend/prisma.config.ts
- **Committed in:** d1b8d5b (Task 2 commit)

**3. [Rule 3 - Blocking] Generated Prisma client module resolution failure**
- **Found during:** Task 2 (API restart with PrismaModule)
- **Issue:** Import from `../generated/prisma` failed at runtime -- Prisma 7 generates client.ts as main export with no index.js
- **Fix:** Changed imports to `../generated/prisma/client`, configured SWC builder without typeCheck
- **Files modified:** backend/src/prisma/prisma.service.ts, backend/src/prisma/prisma-rls.extension.ts, backend/nest-cli.json
- **Committed in:** d1b8d5b (Task 2 commit)

**4. [Rule 3 - Blocking] Missing @swc/cli for SWC builder**
- **Found during:** Task 2 (SWC builder activation)
- **Issue:** NestJS SWC builder requires @swc/cli which wasn't in scaffold
- **Fix:** Added @swc/cli as dev dependency, rebuilt Docker image
- **Files modified:** backend/package.json, backend/package-lock.json
- **Committed in:** d1b8d5b (Task 2 commit)

**5. [Rule 3 - Blocking] Redis port 6379 conflict with host**
- **Found during:** Task 1 (docker compose up)
- **Issue:** Port 6379 already in use on host machine
- **Fix:** Mapped Redis container port to host 6380
- **Files modified:** docker-compose.yml
- **Committed in:** f6ba5b3 (Task 1 commit)

---

**Total deviations:** 5 auto-fixed (1 bug, 4 blocking)
**Impact on plan:** All auto-fixes necessary for correct runtime behavior. No scope creep.

## Issues Encountered
- Nuxt scaffolding (`nuxi init`) requires interactive terminal input even with `--template` flag; used the template download which completed before the interactive prompt
- @nuxt/test-utils uses `workspace:*` protocol incompatible with npm; deferred to using vitest + happy-dom directly (no impact on test capability)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Docker Compose stack ready for auth module development (Plan 02)
- Prisma schema has all Phase 1 models; additional models can be added via new migrations
- RLS policies ready for integration testing with app_user role
- Frontend i18n skeleton ready for auth pages (Plan 03)
- Test infrastructure ready for both FE and BE test development

## Self-Check: PASSED

All key files verified present. Both task commits (f6ba5b3, d1b8d5b) verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-04-08*
