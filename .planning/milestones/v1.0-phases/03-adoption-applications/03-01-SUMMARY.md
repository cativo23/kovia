---
plan: 03-01
phase: 03-adoption-applications
status: complete
completed_at: 2026-04-11
---

# Plan 03-01: Backend Applications Module

## What was built

Backend applications module implementing the full CRUD API, state machine, and RLS for adoption applications.

## Key files created/modified

- `backend/prisma/schema.prisma` — Added AdoptionApplication + ApplicationPhoto models, ApplicationStatus enum (7 states), relations to Animal and User
- `backend/prisma/migrations/20260411042344_adoption_applications/migration.sql` — Migration with RLS policies: adopter_own, org_staff_read, admin_bypass on adoption_applications; app_photos_via_application on application_photos
- `backend/src/applications/applications.service.ts` — Full CRUD + state machine (staffTransitions) + audit logging; publicPrisma for adopter reads, prismaRls for org staff reads
- `backend/src/applications/applications.controller.ts` — 8 REST endpoints: POST /, GET /check, GET /my, GET /my/:id, PATCH /:id/retirar, GET /org, GET /org/:id, PATCH /:id/status
- `backend/src/applications/applications.module.ts` — Module scaffold with PrismaModule, UploadModule, AuditModule imports
- `backend/src/applications/dto/create-application.dto.ts` — CreateApplicationDto with PhotoRefDto
- `backend/src/applications/dto/update-application-status.dto.ts` — UpdateApplicationStatusDto
- `backend/src/applications/dto/application-query.dto.ts` — ApplicationQueryDto with pagination + filters
- `backend/src/applications/applications.service.spec.ts` — 21 unit tests (all passing)
- `backend/src/upload/upload.service.ts` — Added optional `folder` parameter (default 'animals', backward compatible)
- `backend/src/app.module.ts` — ApplicationsModule registered

## Tests

21 unit tests covering: create flow, conflict detection, animal status guard, my applications, org applications, checkExisting, all state machine transitions (valid and invalid), withdraw ownership check, withdraw ADOPTADA guard, audit logging.

## Commits

- `88b2612` — feat(03-01): Prisma schema, migration with RLS, upload service folder param, ApplicationsModule scaffold
- `1fcefa5` — feat(03-01): ApplicationsService CRUD, state machine, audit logging, controller, and unit tests
