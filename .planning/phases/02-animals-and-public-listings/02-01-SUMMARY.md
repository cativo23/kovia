---
phase: 02-animals-and-public-listings
plan: 01
subsystem: api, database
tags: [prisma, nestjs, s3, minio, rls, presigned-url, species, animals]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Prisma RLS infrastructure, auth guards, admin panel, audit service, tenant interceptor
provides:
  - Species, Animal, AnimalPhoto Prisma models with migration
  - MinIO Docker service for S3-compatible photo storage
  - UploadService with presigned URL generation
  - SpeciesService with admin CRUD
  - AnimalsService with full CRUD, status lifecycle, photo management
  - Public listing endpoints for unauthenticated access
  - RLS policies on animals table (org-scoped write, public read)
  - Species admin page in frontend admin panel
affects: [02-02-org-dashboard, 02-03-public-listings, 03-adoption-applications]

# Tech tracking
tech-stack:
  added: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "minio (Docker)"]
  patterns: [presigned-url-upload, public-vs-org-scoped-queries, status-lifecycle-machine]

key-files:
  created:
    - backend/src/animals/animals.service.ts
    - backend/src/animals/animals.controller.ts
    - backend/src/animals/animals.module.ts
    - backend/src/animals/dto/create-animal.dto.ts
    - backend/src/animals/dto/update-animal.dto.ts
    - backend/src/animals/dto/update-status.dto.ts
    - backend/src/animals/dto/animal-query.dto.ts
    - backend/src/upload/upload.service.ts
    - backend/src/upload/upload.controller.ts
    - backend/src/upload/upload.module.ts
    - backend/src/species/species.service.ts
    - backend/src/species/species.controller.ts
    - backend/src/species/species.module.ts
    - backend/prisma/migrations/20260410012352_animals_species/migration.sql
    - frontend/app/pages/admin/species.vue
  modified:
    - backend/prisma/schema.prisma
    - backend/src/app.module.ts
    - docker-compose.yml
    - frontend/app/layouts/admin.vue
    - frontend/i18n/locales/es-SV.json
    - backend/package.json

key-decisions:
  - "MinIO added to docker-compose with healthcheck, createbuckets init service, and public-read bucket policy"
  - "RLS on animals uses app.is_admin for platform admin bypass and app.current_org_id for org scoping"
  - "Public animal reads use publicPrisma (no RLS context); org-scoped writes use PRISMA_RLS injection"
  - "Species table has no RLS -- platform-level resource managed by admin via publicPrisma"
  - "Status transitions validated in service layer with audit logging for every state change"

patterns-established:
  - "Dual-Prisma pattern: publicPrisma for unauthenticated reads, PRISMA_RLS for org-scoped mutations"
  - "Presigned URL upload: frontend requests URL from backend, uploads directly to MinIO/S3"
  - "Status lifecycle machine with valid transition map and audit trail"
  - "Photo management: position-based ordering, explicit cover photo, S3 cleanup on delete"

requirements-completed: [ANIM-01, ANIM-02, ANIM-03, ANIM-04, DASH-01]

# Metrics
duration: 10min
completed: 2026-04-10
---

# Phase 02 Plan 01: Animal Backend API Summary

**Prisma Animal/Species/AnimalPhoto schema with RLS, MinIO photo storage, full CRUD API (22 endpoints), and 22 unit tests**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-10T01:20:40Z
- **Completed:** 2026-04-10T01:31:00Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Species, Animal, AnimalPhoto models with RLS policies (6 policies on animals table)
- MinIO Docker service with auto-created public-read bucket
- UploadService generating presigned PUT URLs for direct S3 upload
- Complete animals CRUD API with 22 endpoints (org-scoped + public)
- Status lifecycle: AVAILABLE -> IN_PROCESS -> ADOPTED, with archive/restore
- Photo management: add, remove, reorder, set cover photo
- Species admin page with create/edit/delete modals in admin panel
- 22 unit tests across 3 test files (animals, upload, species)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema, MinIO Docker service, and upload service** - `9a8ce0a` (feat)
2. **Task 2: Animals CRUD API with org-scoped RLS, status lifecycle, and public listing endpoints** - `5be8d0c` (feat)

## Files Created/Modified
- `backend/prisma/schema.prisma` - Added Species, Animal, AnimalPhoto models and enums
- `backend/prisma/migrations/20260410012352_animals_species/migration.sql` - Schema + RLS policies
- `backend/src/animals/animals.service.ts` - Full animal CRUD, status lifecycle, photo management
- `backend/src/animals/animals.controller.ts` - 22 endpoints (org-scoped + public)
- `backend/src/animals/dto/*.ts` - CreateAnimal, UpdateAnimal, UpdateStatus, AnimalQuery DTOs
- `backend/src/upload/upload.service.ts` - S3 presigned URL generation and object deletion
- `backend/src/upload/upload.controller.ts` - Presigned URL endpoint with content type validation
- `backend/src/species/species.service.ts` - Species CRUD with slug generation
- `backend/src/species/species.controller.ts` - Public list + admin CRUD endpoints
- `docker-compose.yml` - Added MinIO, createbuckets, S3 env vars to api
- `frontend/app/pages/admin/species.vue` - Species admin page with table, modals
- `frontend/app/layouts/admin.vue` - Added Especies nav item
- `frontend/i18n/locales/es-SV.json` - Species admin i18n keys

## Decisions Made
- MinIO added as Docker service with healthcheck and auto-bucket creation via mc init container
- Animals RLS uses existing `app.is_admin`, `app.current_org_id` settings from prisma-rls.extension.ts
- Species table has no RLS (platform-level, admin-managed via publicPrisma)
- Public animal queries use publicPrisma to bypass RLS entirely; RLS public_read policy serves as secondary defense layer
- Status transition validation done in service layer (not DB constraints) for flexibility and clear error messages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- S3 mock in vitest required proper class-based constructors (not vi.fn()) for PutObjectCommand and DeleteObjectCommand
- Migration file created with root ownership by Docker; appended RLS policies via docker compose exec

## User Setup Required

None - MinIO starts automatically via docker-compose with auto-created bucket.

## Next Phase Readiness
- All backend APIs ready for org dashboard frontend (Plan 02)
- Public listing endpoints ready for SSR pages (Plan 03)
- Species admin page already functional in admin panel
- UploadService ready for photo upload integration in org dashboard

---
*Phase: 02-animals-and-public-listings*
*Completed: 2026-04-10*
