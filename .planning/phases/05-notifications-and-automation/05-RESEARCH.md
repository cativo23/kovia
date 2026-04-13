# Phase 5: Notifications and Automation — Research

**Date:** 2026-04-13
**Purpose:** Answer "What do I need to know to PLAN this phase well?"

---

## Current Architecture Analysis

### 1. Existing BullMQ Patterns

**Redis Configuration** (`docker-compose.yml`):
- Redis 7-alpine running on port 6380 (host) / 6379 (container)
- Service name: `redis`
- `REDIS_URL` env var: `redis://redis:6379`
- No password authentication

**BullModule Setup** (`backend/src/app.module.ts`):
```ts
BullModule.forRoot({
  connection: {
    host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'redis',
    port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : 6379,
  },
})
```
- Parsed from `REDIS_URL` env var with fallback
- Global connection shared across all queues

**Scoring Processor** (`backend/src/scoring/scoring.processor.ts`):
- Uses `@Processor('scoring')` decorator extending `WorkerHost`
- Receives `{ applicationId: string }` job data
- Runs inside `publicPrisma.$transaction` with `set_config('app.is_admin', 'true', true)` for admin bypass
- No retry configuration — uses default BullMQ behavior
- Silently returns if application not found (`if (!application) return;`)
- **Pattern**: processor reads from queue, performs work, updates database directly

**Scoring Module** (`backend/src/scoring/scoring.module.ts`):
```ts
BullModule.registerQueue({ name: 'scoring' }),
exports: [ScoringService, BullModule.registerQueue({ name: 'scoring' })]
```

**Mail Processor** (`backend/src/mail/mail.processor.ts`):
- Simpler pattern: `@Processor('email')` extending `WorkerHost`
- Receives `{ to, subject, template, context }` from job data
- Directly calls `mailerService.sendMail()`
- No error handling or retry logic visible

**Mail Service** (`backend/src/mail/mail.service.ts`):
- Uses `@InjectQueue('email')` to inject queue
- Adds jobs with named job types: `emailQueue.add('verification', {...})`
- Job names: `verification`, `reset-password`, `org-invite`
- **Pattern**: service injects Queue, adds jobs with typed payloads

**Applications Module** (`backend/src/applications/applications.module.ts`):
- Already imports `BullModule.registerQueue({ name: 'scoring' })`
- `ApplicationsService` injects `@InjectQueue('scoring')` and enqueues scoring after application creation

**Key takeaway**: To add a webhook queue, follow the exact same pattern:
1. Register queue in a new module (e.g., `WebhookModule`): `BullModule.registerQueue({ name: 'webhook' })`
2. Create `WebhookProcessor` extending `WorkerHost` with `@Processor('webhook')`
3. Inject `@InjectQueue('webhook')` wherever events need to enqueue webhook jobs

### 2. Prisma Schema (`backend/prisma/schema.prisma`)

**Current models**: User, RefreshToken, Organization, OrgInvite, Species, Animal, AdoptionApplication, ApplicationNote, ApplicationPhoto, AnimalPhoto, AuditLog

**Key enums**:
- `ApplicationStatus`: ENVIADA, REVISANDO, APROBADA, RECHAZADA, SEGUIMIENTO, ADOPTADA, RETIRADA, DEVUELTA
- `UserRole`: ADOPTER, ORG_ADMIN, PLATFORM_ADMIN

**Missing models (Phase 5)**:
- `Notification` — in-app notifications for adopters
- `WebhookOutbox` — outbox table for reliable webhook delivery

**Recommended schema additions**:

```prisma
enum NotificationType {
  APPLICATION_SUBMITTED
  STATUS_CHANGED
  NOTE_ADDED
  SCORED
  WITHDRAWN
  DEVUELTA
}

model Notification {
  id          String            @id @default(uuid())
  userId      String            // adopter
  type        NotificationType
  title       String            // Spanish template, e.g., "Tu solicitud fue aprobada"
  body        String?           // Additional context, e.g., "para Max"
  applicationId String?
  application AdoptionApplication? @relation(fields: [applicationId], references: [id])
  isRead      Boolean           @default(false)
  createdAt   DateTime          @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}

model WebhookOutbox {
  id          String   @id @default(uuid())
  eventType   String   // application.submitted, application.status_changed, etc.
  payload     Json     // Full event payload
  idempotencyKey String @unique
  status      String   @default("PENDING") // PENDING, DELIVERED, FAILED
  attempts    Int      @default(0)
  maxAttempts Int      @default(6)
  nextAttemptAt DateTime?
  lastError   String?
  deliveredAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status, nextAttemptAt])
  @@map("webhook_outbox")
}
```

### 3. Application Service — Status Transitions

**File**: `backend/src/applications/applications.service.ts`

**State machine** (`staffTransitions`):
```ts
const staffTransitions: Record<string, string[]> = {
  ENVIADA: ['REVISANDO'],
  REVISANDO: ['APROBADA', 'RECHAZADA', 'SEGUIMIENTO'],
  SEGUIMIENTO: ['APROBADA', 'RECHAZADA'],
  APROBADA: ['ADOPTADA'],
  ADOPTADA: ['DEVUELTA'],
};
```

**Key methods that should emit events** (per D-09):
| Method | Event | Notes |
|--------|-------|-------|
| `create()` | `application.submitted` | Already has a `$transaction` pattern (via `prismaRls.create` + scoring enqueue) |
| `updateStatus()` | `application.status_changed` | Currently uses `prismaRls.update` + `auditService.log` — needs to be wrapped in a transaction that also creates notification + outbox entries |
| `withdraw()` | `application.withdrawn` | Currently uses `publicPrisma.update` + `auditService.log` — needs same transaction treatment |
| (Notes service) `create()` | `note.added` | Separate module — needs to coordinate with notification/outbox creation |
| (Scoring processor) completion | `application.scored` | After `tx.adoptionApplication.update({ score, scoreDetails })` — needs to enqueue notification + webhook |

**Critical observation**: The current `updateStatus` and `withdraw` methods are NOT wrapped in a `$transaction` that includes the audit log. The audit log is called after the update. This means events should be emitted similarly — created in the same transaction as the status change, not after.

**Recommended pattern**: Wrap `updateStatus` in a `$transaction` that performs: (1) status update, (2) notification creation, (3) webhook outbox insertion, (4) audit log. Same for `withdraw`.

### 4. Application Notes Service

**File**: `backend/src/application-notes/application-notes.service.ts`

- Simple CRUD: `create(applicationId, dto, userId)` and `findByApplication(applicationId)`
- Uses `prismaRls` (RLS-scoped client)
- Gets `organizationId` from CLS context
- No BullMQ queue involved

**Integration point**: When a note is created, a notification for the adopter and a webhook outbox entry should be created in the same transaction as the note creation.

### 5. Frontend Layouts

**Three layouts exist**:
- `default.vue` — Public layout (navbar + footer). This is where the **bell icon** goes for adopters.
- `org.vue` — Staff dashboard (sidebar + header). Bell icon NOT needed here (staff don't get notifications per D-03).
- `auth.vue` — Centered auth pages (login/register). No bell needed.

**Navbar structure** (`default.vue`):
- Header with: Paw print logo + "Kovia", nav links (home, animals, my-org), auth section
- Auth section shows: `UDropdownMenu` with user profile items when authenticated
- **Bell placement**: Between nav links and auth section, only when `isAuthenticated && !isOrgAdmin`

**i18n infrastructure** (`frontend/i18n/locales/es-SV.json`):
- Single locale file: `es-SV.json` (705 lines)
- Strategy: `no_prefix` (default locale, no URL prefix)
- Lang dir: `../i18n/locales` relative to `app/`
- Keys organized by domain: `common`, `auth`, `nav`, `admin`, `animals`, `org`, `applications`, `detail`, `listings`, `landing`, `validation`
- **New keys needed**: `notifications` section with bell tooltip, notification type templates, read/unread labels

**Nuxt config** (`frontend/nuxt.config.ts`):
- Modules: `@nuxt/ui`, `@pinia/nuxt`, `@nuxtjs/i18n`
- Components auto-loaded from `~/components`
- `@nuxt/ui` provides `UIcon`, `UButton`, `UDropdownMenu` — bell icon can use `i-lucide-bell`

### 6. Docker Compose — Redis

- Redis 7-alpine, no password
- Host port 6380 (to avoid local conflict), container port 6379
- Health check: not configured (only `service_started` condition)
- **Already sufficient** for adding another BullMQ queue — no infra changes needed

---

## Implementation Approach

### Backend Structure

```
backend/src/
├── notifications/
│   ├── notifications.module.ts       # BullModule.registerQueue({ name: 'webhook' })
│   ├── notifications.service.ts      # createNotification(), getNotifications(), markAsRead()
│   └── notifications.controller.ts   # GET /notifications, POST /notifications/:id/read
├── webhooks/
│   ├── webhooks.module.ts            # Can be combined with notifications module
│   ├── webhooks.processor.ts         # @Processor('webhook') — processes outbox
│   └── webhooks.service.ts           # enqueueWebhook(), retry logic
└── app.module.ts                     # Import NotificationsModule
```

**Single module recommendation**: Combine notifications and webhooks into one `NotificationsModule` since they share the event emission pattern. The webhook processor is a separate provider within the same module.

### Event Emission Pattern

Two viable approaches:

**Option A: Direct inline calls** (simpler, recommended)
- In each service method (`updateStatus`, `withdraw`, `create`), add notification and outbox creation directly within the existing Prisma `$transaction`
- Pro: No abstraction layer, easy to follow
- Con: Couples event emission to each method

**Option B: Event service** (cleaner separation)
- Create an `EventsService` with methods like `emitApplicationStatusChange()`, `emitApplicationSubmitted()`
- Each method handles notification creation + outbox insertion in a transaction
- Pro: Centralized event logic, easier to add new events
- Con: Additional abstraction, requires passing transaction context

**Recommendation**: Option B with an `EventsService`. It keeps the application service focused on business logic and makes it easy to add new event types. The events service uses `publicPrisma.$transaction` with admin bypass since it's triggered from various service contexts.

### Webhook Outbox Processing

**Processor pattern** (following scoring processor):
```ts
@Processor('webhook')
export class WebhookProcessor extends WorkerHost {
  async process(job: Job<{ outboxId: string }>) {
    // 1. Fetch outbox entry
    // 2. POST to N8N_WEBHOOK_URL with payload + idempotency key
    // 3. Update status to DELIVERED or increment attempts
    // 4. Throw to trigger retry if failed
  }
}
```

**Retry schedule** (per CONTEXT.md suggestion): 30s, 2m, 10m, 30m, 2h, 6h
- BullMQ supports `attempts` and `backoff` options
- Use `backoff: { type: 'exponential', delay: 30000 }` as base, or custom delay calculation

**Idempotency**: Each webhook outbox entry gets a UUID `idempotencyKey` included in the webhook payload as an `X-Idempotency-Key` header.

### Webhook Payload Schema

Consistent across all event types:
```json
{
  "id": "evt_xxxxx",
  "type": "application.status_changed",
  "timestamp": "2026-04-13T12:00:00Z",
  "data": {
    "applicationId": "uuid",
    "adopterId": "uuid",
    "animalId": "uuid",
    "organizationId": "uuid",
    "status": "APROBADA",
    "previousStatus": "REVISANDO",
    "metadata": {}
  }
}
```

### Frontend Structure

```
frontend/app/
├── components/
│   └── notifications/
│       ├── NotificationBell.vue      # Bell icon with unread count badge
│       └── NotificationList.vue      # Dropdown list of notifications
├── pages/
│   └── notificaciones/
│       └── index.vue                 # Full notification history page (optional)
├── composables/
│   └── useNotifications.ts           # Polling logic, mark-as-read
└── layouts/
    └── default.vue                   # Modified: add NotificationBell to navbar
```

**Polling strategy**: On page load, fetch notifications. When bell is clicked, fetch fresh list. No continuous polling — just on-demand fetches (per D-02: "polling on page load and when user opens the bell").

**Unread count**: Fetch count on page load, update when bell is opened.

---

## Key Considerations

### Risks and Dependencies

1. **Phase 3 dependency**: Phase 5 depends on Phase 3 (Adoption Applications). The `create()` method and status transitions must exist before notifications can be emitted. Check: Phase 3 is "Not started" per ROADMAP.md.

2. **Phase 4 dependency**: The `application.scored` event depends on the scoring processor (Phase 4). Scoring processor already exists in codebase but Phase 4 is "Not started" per ROADMAP.md.

3. **Prisma $transaction scope**: Currently, `updateStatus()` and `withdraw()` use different Prisma clients (`prismaRls` vs `publicPrisma`). Wrapping them in a single `$transaction` that includes notification/outbox creation requires careful client selection. Using `publicPrisma.$transaction` with admin bypass is the safest approach for cross-cutting concerns.

4. **RLS for notifications**: Notification model is user-scoped (one user sees only their notifications). RLS policy should allow user to read their own notifications. Since notifications are created with admin bypass, no INSERT policy issues.

5. **WebhookOutbox RLS**: The outbox table is system-scoped, not org-scoped or user-scoped. It should have RLS disabled (like audit_logs) or use admin-only policies.

6. **N8N_WEBHOOK_URL env var**: Not yet in docker-compose.yml. Needs to be added as optional env var (empty string in dev).

7. **Error handling in webhook processor**: BullMQ retry behavior depends on throwing errors. Need to distinguish between retryable errors (network timeout, 5xx) and non-retryable (4xx from n8n, invalid payload).

8. **Dead letter handling**: After max attempts (suggested 6), outbox entries should transition to `FAILED` status. Consider a periodic cleanup job or admin visibility for failed webhooks.

### Gotchas

1. **Scoring processor uses `as any` for DEVUELTA**: The enum value `DEVUELTA` is in the enum but may not be typed correctly in Prisma client. Verify after Phase 4 migration.

2. **No existing event system**: Currently there's no EventEmitter or pub/sub pattern. Events are implicitly handled by audit logs. Phase 5 introduces a formal pattern.

3. **CLS context in BullMQ workers**: Scoring processor explicitly runs `set_config('app.is_admin', 'true', true)` because workers have no CLS tenant context. The webhook processor will need the same treatment.

4. **Frontend auth gate**: The `default.vue` layout is used for both authenticated and unauthenticated users. The bell should only render when `isAuthenticated && user.role === 'ADOPTER'` (per D-03: adopter-only).

5. **Spanish templates**: All notification titles/bodies should be stored in Spanish (es-SV). The templates are simple string interpolation, not full i18n — notifications are created server-side with Spanish text already baked in.

---

## Open Questions

1. **Notification read UX**: Should there be a "mark all as read" button, or only individual mark-as-read? CONTEXT.md says this is at "Claude's discretion."

2. **Notification retention**: Should old notifications be archived/deleted after N days? Or kept indefinitely?

3. **Webhook failure visibility**: Should failed webhook deliveries be visible to platform admins via a dashboard? Or is logging sufficient for MVP?

4. **Webhook timeout**: What timeout should be used for the HTTP POST to n8n? (Suggest 10s with retries)

5. **Notification polling interval**: CONTEXT.md says "polling on page load and bell click" — should there also be periodic background polling (e.g., every 60s) while the user is active?

6. **Outbox entry deduplication**: Should the outbox prevent duplicate entries for the same event (e.g., same applicationId + eventType within a time window)? Or is the idempotency key sufficient?

7. **Event ordering**: If status changes rapidly (ENVIADA → REVISANDO → APROBADA), webhooks may arrive out of order at n8n. Should the payload include a monotonic sequence number?

8. **Phase 3/4 completion status**: ROADMAP.md shows Phase 3 and 4 as "Not started" but STATE.md shows Phase 4 as "EXECUTING" with UI-SPEC approved. Clarify actual completion state before planning.

---

## RESEARCH COMPLETE
