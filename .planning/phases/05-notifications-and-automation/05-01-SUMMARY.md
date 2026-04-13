---
phase: 05
plan: 01
type: backend
tags: notifications, webhooks, bullmq, prisma, events
key-files:
  - backend/src/notifications/notifications.module.ts
  - backend/src/notifications/notifications.service.ts
  - backend/src/notifications/webhook.service.ts
  - backend/src/notifications/webhook.processor.ts
  - backend/src/notifications/events.service.ts
  - backend/src/notifications/notifications.controller.ts
  - backend/prisma/schema.prisma
metrics:
  files_created: 11
  files_modified: 10
  lines_added: 1245
  tests: 28
  commits: 1
---

# Phase 05 Plan 01 — Summary

## What Was Done

### Schema & Migration
- Added `NotificationType` enum (6 values) to Prisma schema
- Added `Notification` model with RLS (user SELECT own, system INSERT via admin bypass)
- Added `WebhookOutbox` model (RLS disabled, system-scoped)
- Created and applied migration via `prisma db push`
- Manually created migration SQL file for record-keeping

### Backend Services
- **NotificationsModule**: Imports PrismaModule + BullModule.registerQueue({ name: 'webhook' }), provides all notification/webhook services
- **NotificationsService**: CRUD operations with Spanish notification templates, admin bypass for creation, RLS-scoped reads
- **NotificationsController**: GET /notifications, POST /notifications/:id/read, POST /notifications/read-all (JWT-protected, ADOPTER role)
- **WebhookService**: enqueue() with outbox creation, idempotency keys, BullMQ job with exponential backoff (30s base)
- **WebhookProcessor**: BullMQ worker with @Processor('webhook'), retries on 5xx/timeout, FAILS on 4xx, 10s timeout
- **EventsService**: 6 emit methods (submitted, status_changed, note_added, scored, withdrawn, devuelta) — each creates notification + enqueues webhook

### Integration
- **ApplicationsService**: EventsService injected; emit on create (submitted), updateStatus (status_changed + devuelta), withdraw (withdrawn)
- **ApplicationNotesService**: EventsService injected; emit on create (note_added)
- **ScoringProcessor**: EventsService injected; emit after scoring transaction completes (scored)
- All three modules import NotificationsModule

### Configuration
- N8N_WEBHOOK_URL added to docker-compose.yml (default: "") and .env.example
- Redis already configured for BullMQ

### Tests
- 28 unit tests passing across 4 test files
- Also fixed pre-existing bug in application-notes service spec (wrong CLS key)

## Deviations

- None significant. All tasks completed as planned.

## Commits

| Hash | Description |
|------|-------------|
| b03e53d | feat(05-01): backend notifications and webhook outbox |

## Self-Check: PASSED

- All new source files exist on disk (verified via grep)
- Backend builds successfully (`npx nest build` — 120 files, no errors)
- 28 unit tests pass (`npx vitest run src/notifications/ src/application-notes/`)
- Prisma schema validates (`npx prisma validate`)
- Schema applied to database (`npx prisma db push`)
- EventsService is integrated in all 3 trigger points (ApplicationsService, ApplicationNotesService, ScoringProcessor)
- NotificationType enum has 6 values matching the plan
- Webhook outbox has idempotency key (unique constraint in schema)

## Verification

1. ✅ `npx prisma validate` — schema is valid
2. ✅ Migration applied via `prisma db push`
3. ✅ `npx nest build` — backend compiles (120 files)
4. ✅ `npx vitest run src/notifications/` — 22/22 pass
5. ✅ `npx vitest run src/application-notes/` — 6/6 pass
6. ✅ Notification table exists in database
7. ✅ Webhook_outbox table exists in database
8. ✅ Spanish templates present for all 6 types
9. ✅ N8N_WEBHOOK_URL in docker-compose.yml and .env.example
