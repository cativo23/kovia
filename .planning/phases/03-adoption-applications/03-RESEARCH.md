# Phase 3: Adoption Applications — Research

**Researched:** 2026-04-10
**Domain:** NestJS backend (applications CRUD + state machine) + Nuxt 4 frontend (multi-step wizard + localStorage draft + staff queue)
**Confidence:** HIGH — all findings verified directly from codebase; no external library additions required

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 4-step wizard + review step = 5 total steps: Info personal / Vivienda y convivencia / Experiencia y estilo de vida / Fotos del hogar / Revisión y envío
- **D-02:** Reuse multi-step wizard UI from `nuevo.vue` (step indicator + UCard + nav)
- **D-03:** Zod validation per step before allowing Next
- **D-04:** Step 1 mandatory: teléfono, ocupación, fecha de nacimiento
- **D-08:** Minimum 2 photos (blocks submission); maximum 8
- **D-09:** Maximum 8 photos
- **D-10:** Reuse and adapt `AnimalsPhotoUploader` — same presigned URL flow, client-side resize, progress bar
- **D-11:** Photo label "Fotos de tu hogar" with inline "Se requieren mínimo 2 fotos"
- **D-12:** Unauthenticated → modal with Crear cuenta / Iniciar sesión, then redirect back to animal
- **D-13:** Existing application → button changes to "Ver solicitud" linking to status page
- **D-15:** State machine: `enviada → revisando → aprobada / rechazada / seguimiento → adoptada`; `retirada` is adopter-only exit state
- **D-16:** Staff transition controls: enviada→revisando, revisando→aprobada/rechazada/seguimiento, seguimiento→aprobada/rechazada, aprobada→adoptada
- **D-17:** Adopter can only `retirar` their own application (when status is not `adoptada`)
- **D-18:** Status transitions validated in service layer with audit logging (same pattern as animals)
- **D-19:** "Aplicaciones" nav item in org dashboard
- **D-20:** Table columns: Nombre adoptante, Animal (foto + nombre), Fecha enviada, Puntuación ("—"), Estado, Acciones
- **D-21:** Filters: por animal, por estado, por fecha (rango)
- **D-22:** Row click opens full application detail

### Claude's Discretion

- Exact Step 2 housing field layout (defined in UI-SPEC — D-05)
- Exact Step 3 experience/lifestyle field layout (defined in UI-SPEC — D-06)
- localStorage auto-save strategy: on step complete (not every keystroke); key `aplicacion_draft_{animalId}_{userId}`
- Application detail page layout for staff
- Empty state for applications queue
- UX for staff status transition: inline buttons in right sidebar panel (defined in UI-SPEC)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADOP-01 | Adopter can submit a structured multi-step application for a specific animal | Wizard pattern from `nuevo.vue`; new `ApplicationWizard.vue` component; `POST /applications` backend endpoint |
| ADOP-02 | Application form has mandatory fields (personal info, housing) and optional fields (social media, additional context) | Prisma schema for `AdoptionApplication` with JSONB step data columns; Zod schemas per step |
| ADOP-03 | Application requires environment photo uploads (min 2) | Adapted `AnimalsPhotoUploader`; new `ApplicationPhoto` model in Prisma; presigned URL reuse from `UploadService` |
| ADOP-04 | Application form state persists in localStorage (survives connection drops) | Composable `useApplicationDraft`; auto-save on step advance; restore alert on page load |
| ADOP-05 | Application status follows defined state machine | `ApplicationStatus` enum in Prisma; `updateStatus()` service method with transition map; audit logging |
| ADOP-06 | Rescue staff can view and filter/sort the application queue per animal | `GET /applications/org` endpoint with org-scoped RLS; staff queue page at `/org/dashboard/aplicaciones` |

</phase_requirements>

---

## Summary

Phase 3 is an extension of the patterns already established in Phases 1 and 2. No new external libraries are required — the entire stack (NestJS, Prisma, Nuxt 4, Nuxt UI v4, Zod, MinIO, useApi) is already in place and running. The primary work is: (1) a new `applications` backend module replicating the `animals` module pattern with a richer state machine; (2) a multi-step wizard frontend page replicating the `nuevo.vue` pattern at 5 steps instead of 3; (3) a localStorage composable for draft persistence; and (4) two staff pages (queue + detail) replicating the `animales/index.vue` UTable pattern.

The most complex part of this phase is the **Prisma schema design** for `AdoptionApplication` — specifically how to store the structured step data (personal info, housing, lifestyle) without requiring a rigid column-per-field approach that would complicate Phase 4 scoring. The recommended approach is to use typed JSONB columns per step (one `Json` column per step), which Prisma supports natively, keeping the schema lean while allowing Phase 4 to read the data.

The second area of complexity is the **dual-audience nature of the application**: adopters own their own applications (write via `userId`); org staff read all applications for their org (via `organizationId` RLS). The RLS policy needs to handle both read paths cleanly.

**Primary recommendation:** Follow the `animals` module as the canonical implementation reference for everything — module structure, RLS pattern, service layer transitions, audit logging, and controller decorators. The wizard follows `nuevo.vue`. The queue table follows `animales/index.vue`. No surprises.

---

## Standard Stack

All libraries already installed — no new dependencies needed.

### Core (already in project)

| Library | Version | Purpose | Role in Phase 3 |
|---------|---------|---------|-----------------|
| NestJS | installed | API framework | New `applications` module |
| Prisma 7 | installed | ORM + migrations | `AdoptionApplication`, `ApplicationPhoto` models |
| Nuxt 4 | installed | Frontend framework | New wizard + queue pages |
| Nuxt UI v4 | installed | Component library | UCard, UTable, UModal, UButton, USelectMenu, URadioGroup, UCheckbox, UTextarea, UAlert |
| Zod | installed | Form validation | Schema per wizard step |
| MinIO | running | Object storage | Environment photo uploads (same bucket) |

[VERIFIED: docker compose ps shows all services healthy]

### Supporting (already in project)

| Library | Purpose | Phase 3 Usage |
|---------|---------|---------------|
| `nestjs-cls` + `PRISMA_RLS` | Tenant-scoped queries | Org-scoped application reads for staff |
| `AuditService` | Action logging | Every application status change |
| `UploadService` | Presigned URL generation | Environment photo upload — same method, new folder key prefix `applications/` |
| `useApi` composable | HTTP factory | All frontend application API calls |
| Auth store (`isAuthenticated`, `user`, `isOrgAdmin`) | Auth state | Auth gate check on animal detail; staff access control |
| `i18n/locales/es-SV.json` | Translations | All new strings under `applications` key |

[VERIFIED: codebase inspection]

### Alternatives Considered

None. All stack decisions are locked from previous phases. Phase 3 uses no new external libraries.

---

## Architecture Patterns

### Recommended Project Structure

```
backend/src/applications/
├── applications.controller.ts   # REST endpoints
├── applications.module.ts       # Module wiring
├── applications.service.ts      # Business logic + state machine
├── dto/
│   ├── create-application.dto.ts
│   ├── update-application-status.dto.ts
│   └── application-query.dto.ts

frontend/app/
├── pages/
│   ├── animales/[id]/aplicar.vue           # Wizard page (adopter)
│   ├── org/dashboard/aplicaciones/
│   │   ├── index.vue                       # Staff queue
│   │   └── [id].vue                        # Staff detail
│   └── perfil/aplicaciones/
│       ├── index.vue                       # Adopter history
│       └── [id].vue                        # Adopter detail/status
└── components/applications/
    ├── ApplicationWizard.vue
    ├── ApplicationStepPersonal.vue
    ├── ApplicationStepHousing.vue
    ├── ApplicationStepLifestyle.vue
    ├── ApplicationStepPhotos.vue
    ├── ApplicationStepReview.vue
    ├── ApplicationStatusBadge.vue
    └── ApplicationAuthModal.vue
```

### Pattern 1: Backend Module Structure (replicate `animals` module exactly)

**What:** Controller + Service + Module + DTOs with class-validator. RLS-scoped reads for staff, adopter-scoped writes.
**When to use:** All applications endpoints.

```typescript
// Source: backend/src/animals/animals.controller.ts (verified)
@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  // Public: none (all auth-required)
  // Adopter: POST /applications, GET /applications/my, GET /applications/my/:id, PATCH /applications/:id/retirar
  // Org staff: GET /applications/org (RLS-scoped), GET /applications/org/:id, PATCH /applications/:id/status
}
```

**Endpoint design:**

| Method | Path | Guard | Description |
|--------|------|-------|-------------|
| `POST` | `/applications` | `@Roles('ADOPTER')` | Submit application |
| `GET` | `/applications/my` | JWT required | Adopter's own application list |
| `GET` | `/applications/my/:id` | JWT required | Adopter's single application |
| `PATCH` | `/applications/:id/retirar` | JWT required | Adopter withdraws (ownership check in service) |
| `GET` | `/applications/org` | `@Roles('ORG_ADMIN')` | Staff queue (org-scoped via RLS) |
| `GET` | `/applications/org/:id` | `@Roles('ORG_ADMIN')` | Staff single application detail |
| `PATCH` | `/applications/:id/status` | `@Roles('ORG_ADMIN')` | Staff status transition |
| `POST` | `/applications/:id/photos` | `@Roles('ADOPTER')` | Save environment photo refs after upload |

**Note on `@Roles('ADOPTER')`:** The existing `RolesGuard` checks `requiredRoles.includes(user?.role)`. [VERIFIED: `backend/src/auth/guards/roles.guard.ts`]. Using `@Roles('ADOPTER')` means only role=ADOPTER can submit. However, org admins are `ORG_ADMIN`, not `ADOPTER` — they cannot adopt animals via the same account. This is correct by design. If needed, the DTO submission endpoint could require just JWT (no role check) and validate inside the service, but using `@Roles('ADOPTER')` is the cleanest guard.

### Pattern 2: Prisma Schema for AdoptionApplication

**What:** New `AdoptionApplication` and `ApplicationPhoto` models. Step data stored as typed JSONB fields.

**Rationale for JSONB per step:** Phase 4 scoring reads the step data as structured objects. A single `data Json?` column would require Phase 4 to parse an opaque blob. Separating into `personalInfo Json`, `housing Json`, `lifestyle Json` keeps each step queryable and provides clear schema intent while avoiding 15+ individual columns. [ASSUMED — design decision, reasonable trade-off]

```prisma
// Source: new model following AnimalPhoto pattern (verified from schema.prisma)
enum ApplicationStatus {
  ENVIADA
  REVISANDO
  APROBADA
  RECHAZADA
  SEGUIMIENTO
  ADOPTADA
  RETIRADA
}

model AdoptionApplication {
  id             String            @id @default(uuid())
  animalId       String
  animal         Animal            @relation(fields: [animalId], references: [id])
  userId         String
  user           User              @relation(fields: [userId], references: [id])
  organizationId String            // denormalized for RLS — copied from animal.organizationId on create
  status         ApplicationStatus @default(ENVIADA)
  // Step data as JSONB — each step is a typed object
  personalInfo   Json?             // Step 1: phone, occupation, dob
  housing        Json?             // Step 2: housing fields
  lifestyle      Json?             // Step 3: experience + lifestyle
  // Step 5 optional fields
  socialMedia    String?
  additionalContext String?
  // Scoring placeholder (Phase 4 will populate)
  score          Int?
  scoreDetails   Json?
  submittedAt    DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  photos         ApplicationPhoto[]

  @@unique([animalId, userId])  // one application per animal per user
  @@map("adoption_applications")
}

model ApplicationPhoto {
  id            String             @id @default(uuid())
  applicationId String
  application   AdoptionApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  url           String
  key           String
  position      Int                @default(0)
  createdAt     DateTime           @default(now())

  @@map("application_photos")
}
```

**RLS for `adoption_applications`:**
- Adopter reads: `userId = current_setting('app.current_user_id')` — owns their own rows
- Staff reads: `organizationId = current_setting('app.current_org_id')` — sees all applications for their org
- Insert: `userId = current_setting('app.current_user_id')` — can only insert their own
- Admin bypass: `app.is_admin = 'true'`

[VERIFIED: RLS pattern from migration.sql and animals RLS from Phase 2 decision log]

**Critical:** The `@@unique([animalId, userId])` constraint prevents duplicate applications. The service must check for an existing application before letting a user through to the wizard — this is also what drives the "Ver solicitud" button state on animal detail.

### Pattern 3: State Machine in Service Layer (replicate `updateStatus` from AnimalsService)

```typescript
// Source: backend/src/animals/animals.service.ts lines 254-291 (verified)
async updateStatus(id: string, newStatus: string, userId: string, requestingUser: { role: string; id: string }) {
  const app = await this.prismaRls.adoptionApplication.findUnique({ where: { id } });
  if (!app) throw new NotFoundException(`Application ${id} not found`);

  // Staff transitions (ORG_ADMIN only)
  const staffTransitions: Record<string, string[]> = {
    ENVIADA:    ['REVISANDO'],
    REVISANDO:  ['APROBADA', 'RECHAZADA', 'SEGUIMIENTO'],
    SEGUIMIENTO:['APROBADA', 'RECHAZADA'],
    APROBADA:   ['ADOPTADA'],
  };

  // Adopter transition (RETIRAR — only by owner, not if ADOPTADA)
  if (newStatus === 'RETIRADA') {
    if (app.userId !== requestingUser.id) throw new ForbiddenException();
    if (app.status === 'ADOPTADA') throw new BadRequestException('Cannot withdraw adopted application');
  } else {
    const allowed = staffTransitions[app.status] || [];
    if (!allowed.includes(newStatus)) throw new BadRequestException(`Cannot transition from ${app.status} to ${newStatus}`);
  }

  const updated = await this.prismaRls.adoptionApplication.update({
    where: { id },
    data: { status: newStatus },
  });

  await this.auditService.log('application.status_change', requestingUser.id, {
    applicationId: id,
    oldStatus: app.status,
    newStatus,
  });

  return updated;
}
```

### Pattern 4: Multi-Step Wizard Frontend (replicate `nuevo.vue`)

**What:** 5 steps using `v-show` to hide/reveal step content inside a single UCard. Step indicator is the circle/connector pattern from `nuevo.vue`.
**Key difference from `nuevo.vue`:** 5 steps (not 3), and separate single-purpose step components (not reusing `AnimalForm`).

```typescript
// Source: frontend/app/pages/org/dashboard/animales/nuevo.vue (verified)
// Step components pattern: each step component exposes { validate, form }
// Parent wizard calls stepRef.value.validate() before advancing
const steps = [
  { label: t('applications.wizard.step1') }, // Info personal
  { label: t('applications.wizard.step2') }, // Vivienda
  { label: t('applications.wizard.step3') }, // Experiencia
  { label: t('applications.wizard.step4') }, // Fotos del hogar
  { label: t('applications.wizard.step5') }, // Revisión y envío
]
```

**Step 4 (photos) special validation:**
```typescript
// Cannot advance if photos.length < 2
function nextStep() {
  if (currentStep.value === 3) {
    const photos = photoUploaderRef.value?.getUploadedPhotos() || []
    if (photos.length < 2) {
      // Show toast or inline error — do not advance
      return
    }
  }
  currentStep.value++
}
```

### Pattern 5: localStorage Draft Persistence

**What:** Composable `useApplicationDraft(animalId, userId)` that wraps localStorage reads/writes.
**Auto-save trigger:** On successful step advance (not every keystroke — per D-14).

```typescript
// New composable: frontend/app/composables/useApplicationDraft.ts
// Key pattern: aplicacion_draft_{animalId}_{userId}
export function useApplicationDraft(animalId: string, userId: string) {
  const key = `aplicacion_draft_${animalId}_${userId}`

  function saveDraft(stepIndex: number, stepData: Record<string, any>) {
    const existing = loadDraft() || {}
    const updated = { ...existing, [`step${stepIndex}`]: stepData, savedAt: Date.now() }
    localStorage.setItem(key, JSON.stringify(updated))
  }

  function loadDraft(): Record<string, any> | null {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }

  function clearDraft() {
    localStorage.removeItem(key)
  }

  return { saveDraft, loadDraft, clearDraft }
}
```

On wizard mount: check `loadDraft()` — if present, show `UAlert` to restore or start fresh.
On successful submission: call `clearDraft()`.

### Pattern 6: Adapting PhotoUploader for Environment Photos

**What:** The `AnimalsPhotoUploader` component accepts `maxPhotos` and `maxSizeMB` props. For applications, instantiate with `maxPhotos=8`. The minimum enforcement (2 photos) is handled at the wizard level, not inside the uploader.

```typescript
// Source: frontend/app/components/animals/PhotoUploader.vue props (verified)
const props = withDefaults(defineProps<{
  photos?: PhotoItem[]
  maxPhotos?: number    // Pass 8 for applications
  maxSizeMB?: number
}>(), {
  maxPhotos: 10,        // Override to 8
  maxSizeMB: 5,
})
```

**Important:** The uploader uses `POST /upload/presigned-url` with `{ filename, contentType }`. This endpoint exists in `UploadService.getPresignedUrl()`. The key prefix is currently `animals/{uuid}/{filename}`. For application environment photos, the key should use `applications/{uuid}/{filename}` — this requires passing a `folder` option or updating the upload endpoint. See Pitfall 1.

### Pattern 7: Staff Application Queue (replicate `animales/index.vue` UTable pattern)

**What:** UCard wrapping UTable with filter row above. Filter by animal (USelectMenu), by status (USelectMenu), by date range (two UInput type="date").

```typescript
// Source: frontend/app/pages/org/dashboard/animales/index.vue (verified)
// Columns definition pattern:
const columns = [
  { key: 'adopter', label: t('applications.table.adopter') },
  { key: 'animal', label: t('applications.table.animal') },
  { key: 'submittedAt', label: t('applications.table.date') },
  { key: 'score', label: t('applications.table.score') },
  { key: 'status', label: t('applications.table.status') },
  { key: 'actions', label: t('applications.table.actions') },
]
```

**Score column:** Renders `—` (placeholder) with `text-gray-400 italic` styling. Phase 4 will populate without layout changes (per CONTEXT.md D-20, UI-SPEC).

### Pattern 8: Auth Gate Modal on Animal Detail

**What:** The existing animal detail page (`/animales/[id].vue`) has a disabled "Aplicar para adoptar" button. This needs to become state-aware:
1. Not authenticated → `@click` opens `ApplicationAuthModal` (UModal, no navigation)
2. Authenticated, no existing application → navigates to `/animales/[id]/aplicar`
3. Authenticated, application exists → "Ver solicitud" variant button to `/perfil/aplicaciones/{appId}`
4. Animal not AVAILABLE → disabled button with tooltip

**Requires:** `GET /applications/check?animalId={id}` endpoint — returns `{ exists: boolean, applicationId?: string }` for the authenticated user. This is a lightweight query called on animal detail load when user is authenticated.

### Anti-Patterns to Avoid

- **Don't store step form state only in Pinia:** Pinia state is lost on page refresh — localStorage draft must be the source of truth for persistence. Pinia can mirror the current session state, but localStorage is the recovery mechanism.
- **Don't make `/applications` endpoints `@Public()`:** All application reads require authentication. Use `@Public()` only where explicitly needed (none in this module).
- **Don't create a new PhotoUploader component from scratch:** Adapt the existing component via props — changing labels and limits only. This avoids duplicating the presigned URL logic and resize code.
- **Don't use PRISMA_RLS for adopter reads:** Adopter read of their own applications does not use the org-scoped RLS context. Use `publicPrisma` with an explicit `where: { userId }` filter, not the CLS-injected org context.
- **Don't forget `@@unique([animalId, userId])`:** Without this constraint, a user could submit multiple applications for the same animal. The API would allow it and create database inconsistency. Add it to the Prisma schema at migration time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to MinIO | Custom upload logic | Existing `UploadService.getPresignedUrl()` | Already handles presigned URL generation, two S3 clients (internal/public), Docker hostname differences |
| Client-side image resize | Canvas resize code | Existing `resizeImage()` in `PhotoUploader.vue` | Already handles max 1200px, quality 0.85, JPEG/PNG/WebP |
| Multi-tenant org scoping | Custom query filters | `PRISMA_RLS` via `ClsService` + tenant interceptor | Already handles setting `app.current_org_id` on every request |
| Form state validation | Custom validators | Zod schemas + Nuxt UI v4 `UForm` | Standard Schema v1 compatible — Phase 1 locked decision |
| Status badge colors | Custom CSS classes | New `ApplicationStatusBadge.vue` following `StatusBadge.vue` pattern | Consistent with existing status badge component |
| Confirmation modals | Custom modal markup | `UModal` with standard close/confirm pattern | Already used for all destructive actions in the dashboard |
| Session auth check | Custom JWT parsing | Auth store `isAuthenticated` + `user` getters | Phase 1 established: access token in Pinia memory only |

**Key insight:** Every non-trivial sub-problem in this phase has a working, tested solution in the codebase already. The task is assembly and extension, not invention.

---

## Common Pitfalls

### Pitfall 1: Upload Endpoint Key Prefix — `animals/` vs `applications/`

**What goes wrong:** `UploadService.getPresignedUrl()` currently hardcodes the key as `animals/${randomUUID()}/${filename}`. If reused unchanged for application environment photos, all files will be stored under the `animals/` prefix, making them indistinguishable from animal photos and complicating future cleanup.
**Why it happens:** The upload service was built only for animal photos.
**How to avoid:** Update `getPresignedUrl()` to accept an optional `folder` parameter (default `'animals'`). Frontend passes `'applications'` when requesting presigned URLs for environment photos. This is a minor, backwards-compatible change.
**Warning signs:** Environment photos appearing under `animals/` in MinIO console.

[VERIFIED: `backend/src/upload/upload.service.ts` line 62: `const key = \`animals/${randomUUID()}/${filename}\``]

### Pitfall 2: RLS Context for Adopter Reads

**What goes wrong:** Using `this.prismaRls.adoptionApplication.findMany({ where: { userId } })` when the CLS context has no `organizationId` set (adopters have no org context) causes the RLS policy `organizationId = current_setting('app.current_org_id')` to return zero rows.
**Why it happens:** `PRISMA_RLS` is the tenant-scoped client. It works for org admins because the tenant interceptor sets `app.current_org_id` from their JWT. Adopters have no `organizationId` in their JWT payload.
**How to avoid:** Adopter endpoints that read their own applications use `publicPrisma` (the non-RLS Prisma instance) with explicit `where: { userId }`. The RLS-scoped client is used **only** for org staff reads.
**Warning signs:** Adopter's application list returns empty even after successful submission.

[VERIFIED: Pattern from `animals.service.ts` — `publicPrisma` vs `prismaRls` split is already established]

### Pitfall 3: AnimalsService `ClsService` Not Injected in Constructor Signature

**What goes wrong:** The animals service spec (`animals.service.spec.ts`) constructs `AnimalsService` with 4 arguments (prismaRls, publicPrisma, uploadService, auditService). But `animals.service.ts` constructor has `ClsService` as the 5th argument. If the applications service follows the same pattern and tests mirror the existing spec, the constructor argument count mismatch will cause test failures.
**Why it happens:** The spec was written before `ClsService` was added, or `ClsService` was not mocked.
**How to avoid:** Include `ClsService` mock in `ApplicationsService` unit tests from the start.

[VERIFIED: `animals.service.spec.ts` line 47 — `new AnimalsService(mockPrismaRls, mockPublicPrisma, mockUploadService, mockAuditService)` — missing ClsService mock]

### Pitfall 4: Wizard Step Ref State with `v-show` vs Component Unmounting

**What goes wrong:** Step components use `defineExpose({ validate, form })` called from the parent wizard. With `v-show`, all step components are always mounted — refs are always available. If someone changes to `v-if` for performance, the refs become `null` when steps are hidden, causing `stepRef.value?.validate()` to silently do nothing.
**Why it happens:** `nuevo.vue` uses `v-show`, not `v-if`. It's easy to accidentally switch.
**How to avoid:** Keep `v-show` on all step content wrappers — same as `nuevo.vue`. Never use `v-if` on wizard steps.

[VERIFIED: `nuevo.vue` lines 53-78 — all steps use `v-show`]

### Pitfall 5: Application Detail Auth — Org Admin Reading Adopter Profile Data

**What goes wrong:** The staff application detail page shows the adopter's name and contact info. This data comes from the `User` model, which has RLS `owner_isolation ON "users"`. An org admin querying `adoptionApplication.findUnique({ include: { user: true } })` via `prismaRls` may get the application but the joined `user` row may be blocked by `owner_isolation`.
**Why it happens:** RLS on `users` only allows the user to read their own row, and org admin is not the user who submitted the application.
**How to avoid:** The applications service staff detail endpoint should query applications via `prismaRls` (for org scoping) but select only the user fields needed (firstName, lastName, email) via `publicPrisma` separately, or use a `SELECT` via the superuser connection. Alternatively, denormalize adopter name + email onto `AdoptionApplication` at submission time (snapshotted value). The denormalization approach is simpler and avoids RLS cross-table issues.

[VERIFIED: migration.sql — `owner_isolation ON "users" USING ("id"::text = current_setting('app.current_user_id', true))`]
[ASSUMED: Prisma's `include` with RLS may silently return null for the nested `user` object — needs verification at runtime. Denormalization is the safer pattern.]

### Pitfall 6: `@@unique([animalId, userId])` — Frontend Must Handle 409

**What goes wrong:** If a user navigates directly to `/animales/[id]/aplicar` bypassing the "Ver solicitud" button (which requires the frontend check), the backend will reject with 409 Conflict. The frontend must handle this gracefully — redirect to their existing application instead of showing a generic error.
**How to avoid:** The wizard page `onMounted` should call `GET /applications/check?animalId={id}` before rendering the wizard. If `{ exists: true }` is returned, redirect immediately to `/perfil/aplicaciones/{applicationId}`.

### Pitfall 7: Draft Restoration After Successful Submission

**What goes wrong:** On successful submission, if the draft is not cleared before navigation, next time the user visits the same animal's wizard they see a stale draft alert. Worse: if network fails after submission but before draft clear, the draft persists but the application is already in the DB.
**How to avoid:** Clear the draft immediately upon receiving a successful `201` from `POST /applications`. The server is the source of truth — the draft is only for recovery from failure, not the canonical record.

---

## Code Examples

### Backend: Prisma RLS policies for applications (replication of animals pattern)

```sql
-- Source: backend/prisma/migrations/20260408203549_init/migration.sql (verified pattern)
ALTER TABLE "adoption_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "application_photos" ENABLE ROW LEVEL SECURITY;

-- Adopter reads their own applications
CREATE POLICY adopter_own ON "adoption_applications"
  USING ("userId"::text = current_setting('app.current_user_id', true));

-- Org staff reads applications for their org
CREATE POLICY org_staff_read ON "adoption_applications"
  FOR SELECT USING ("organizationId"::text = current_setting('app.current_org_id', true));

-- Platform admin bypass
CREATE POLICY admin_bypass ON "adoption_applications"
  USING (current_setting('app.is_admin', true) = 'true');
```

### Frontend: Draft restore alert pattern

```vue
<!-- Source: UI-SPEC.md interaction contracts (verified) -->
<UAlert
  v-if="hasDraft"
  variant="soft"
  color="info"
  :description="$t('applications.draft.restoreMessage')"
>
  <template #footer>
    <div class="flex gap-2">
      <UButton size="sm" @click="restoreDraft">{{ $t('applications.draft.restore') }}</UButton>
      <UButton size="sm" variant="ghost" color="neutral" @click="clearDraft">
        {{ $t('applications.draft.startFresh') }}
      </UButton>
    </div>
  </template>
</UAlert>
```

### Frontend: Auth gate check on animal detail

```typescript
// Source: Pattern from auth.ts middleware + useApi composable (verified)
// In /animales/[id].vue onMounted (after auth store init):
const existingApplication = ref<{ exists: boolean; applicationId?: string } | null>(null)

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      existingApplication.value = await get(`/applications/check?animalId=${route.params.id}`)
    } catch {
      // Non-critical — default to "no existing application"
    }
  }
})
```

### Backend: Applications module registration

```typescript
// Source: Pattern from animals.module.ts (verified pattern)
@Module({
  imports: [PrismaModule, UploadModule, AuditModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
// Register in app.module.ts imports array
```

---

## State of the Art

No external library changes. All current approaches remain valid for Phase 3.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Animal wizard (3 steps) | Application wizard (5 steps) | Phase 3 | Same pattern, more steps |
| Single upload folder `animals/` | Add `folder` param to `getPresignedUrl()` | Phase 3 | Backwards compatible |
| Org layout: Dashboard, Animales, Perfil | Add Aplicaciones nav item | Phase 3 | Minimal layout change |
| Animal `StatusBadge` | New `ApplicationStatusBadge` following same pattern | Phase 3 | 7 statuses vs 4 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JSONB per-step columns are the better design vs single `data Json` | Architecture Patterns / Prisma Schema | Low — both work; if wrong, schema change in Phase 4 migration |
| A2 | Prisma `include: { user: true }` via `prismaRls` will return null for adopter user data due to `owner_isolation` RLS | Pitfall 5 | Medium — if wrong, no extra work needed; if right and not addressed, adopter name shows blank in staff detail |
| A3 | `@Roles('ADOPTER')` is the correct guard for the application submit endpoint (org admins do not adopt animals) | Architecture Patterns / Endpoint design | Low — if org admin needs to test adoption flow, they need a separate ADOPTER account |
| A4 | Denormalization (snapshot adopter firstName, lastName, email onto `AdoptionApplication`) is simpler than RLS cross-table join | Architecture Patterns / Pitfall 5 | Low — adds a few columns; alternative is a raw SQL join outside RLS |

---

## Open Questions

1. **`getPresignedUrl` folder parameter — breaking change?**
   - What we know: Current signature is `getPresignedUrl(filename, contentType)`. Adding `folder` as optional with default `'animals'` is backwards compatible.
   - What's unclear: Whether any other consumers of `UploadService` would be affected.
   - Recommendation: Add `folder = 'animals'` as a third optional parameter with default. Zero breaking change.

2. **Staff reading adopter full name — RLS workaround**
   - What we know: `owner_isolation` on `users` table may block org admin from seeing the adopter's User row via Prisma join.
   - What's unclear: Exact Prisma behavior when RLS returns null for an include — does it null the field or throw?
   - Recommendation: Denormalize `adopterFirstName`, `adopterLastName`, `adopterEmail` directly onto `AdoptionApplication` at creation time. Snapshotted at submit. Staff sees who applied without needing to join `users` via RLS.

3. **`GET /applications/check` — public vs authenticated**
   - What we know: This endpoint needs to return whether the current user has applied for a specific animal. It only makes sense for authenticated users.
   - What's unclear: Should it return 404 (no application) or `{ exists: false }` for cleaner frontend handling?
   - Recommendation: Return `{ exists: boolean, applicationId?: string }` with 200 always — cleaner for frontend conditional rendering without try/catch on 404.

---

## Environment Availability

All dependencies are running in Docker. No missing dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Prisma + RLS | ✓ | 16 | — |
| MinIO | Photo uploads | ✓ | latest (healthy) | — |
| NestJS API | Backend | ✓ | running port 3000 | — |
| Nuxt web | Frontend | ✓ | running port 3001 | — |
| Redis | Session/cache | ✓ | 7-alpine (healthy) | — |
| Mailpit | Email previews | ✓ | latest (healthy) | — |

[VERIFIED: `docker compose ps` — all 6 services Up and healthy]

---

## Validation Architecture

`nyquist_validation: true` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (backend) + Vitest + happy-dom (frontend) |
| Config file | `backend/vitest.config.ts` (assumed — pattern from animals.service.spec.ts exists) |
| Quick run command | `docker compose exec api npx vitest run --reporter=verbose src/applications` |
| Full suite command | `docker compose exec api npx vitest run` |

[VERIFIED: `animals.service.spec.ts` uses vitest `describe/it/expect/vi` — Phase 1 decision confirmed]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADOP-01 | `create()` stores all step data and returns application with status ENVIADA | unit | `docker compose exec api npx vitest run src/applications/applications.service.spec.ts -t "create"` | ❌ Wave 0 |
| ADOP-02 | Step validation via Zod rejects missing mandatory fields | unit (FE) | `docker compose exec web npx vitest run app/components/applications` | ❌ Wave 0 |
| ADOP-03 | Photo count < 2 blocks wizard advancement (frontend guard) | unit (FE) | `docker compose exec web npx vitest run app/components/applications/ApplicationStepPhotos.spec.ts` | ❌ Wave 0 |
| ADOP-04 | Draft saves to localStorage on step advance; clears on submit | unit (FE) | `docker compose exec web npx vitest run app/composables/useApplicationDraft.spec.ts` | ❌ Wave 0 |
| ADOP-05 | `updateStatus()` validates transitions; blocks invalid; logs audit | unit | `docker compose exec api npx vitest run src/applications/applications.service.spec.ts -t "updateStatus"` | ❌ Wave 0 |
| ADOP-05 | Adopter `retirar` blocked when status is ADOPTADA | unit | `docker compose exec api npx vitest run src/applications/applications.service.spec.ts -t "retirar"` | ❌ Wave 0 |
| ADOP-06 | Staff `findAllByOrg()` returns only org-scoped applications | unit | `docker compose exec api npx vitest run src/applications/applications.service.spec.ts -t "findAllByOrg"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `docker compose exec api npx vitest run src/applications`
- **Per wave merge:** `docker compose exec api npx vitest run && docker compose exec web npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/applications/applications.service.spec.ts` — covers ADOP-01, ADOP-05, ADOP-06
- [ ] `frontend/app/composables/useApplicationDraft.spec.ts` — covers ADOP-04
- [ ] `frontend/app/components/applications/ApplicationStepPhotos.spec.ts` — covers ADOP-03

*(Frontend vitest config may need `app/components/applications/` directory glob — verify against existing test config)*

---

## Security Domain

`security_enforcement` not set to false — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT guard (existing `JwtAuthGuard`) — all application endpoints require auth |
| V3 Session Management | no | Session management handled in Phase 1, unchanged |
| V4 Access Control | yes | `@Roles('ORG_ADMIN')` for staff endpoints; ownership check in service for adopter withdraw |
| V5 Input Validation | yes | Zod schemas per wizard step; class-validator DTOs on all POST/PATCH endpoints |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Adopter reads another adopter's application | Information Disclosure | `publicPrisma.findMany({ where: { userId: requestingUserId } })` — explicit user scope |
| Org admin reads applications from another org | Information Disclosure | RLS policy `organizationId = current_setting('app.current_org_id')` via `prismaRls` |
| Adopter forces invalid status transition (e.g., self-approve) | Tampering | Staff transition endpoint requires `@Roles('ORG_ADMIN')`; adopter endpoint only allows RETIRADA |
| Mass upload — too many photos | Denial of Service | Frontend: `maxPhotos=8` prop blocks UI; backend: validate photo count on `POST /applications/:id/photos` |
| Draft localStorage injection (XSS crafted draft) | Tampering | Draft data is re-validated via Zod on each step before sending to server — server-side validation is authoritative |

---

## Sources

### Primary (HIGH confidence — verified from codebase)

- `backend/src/animals/animals.service.ts` — state machine pattern, audit logging, RLS split
- `backend/src/animals/animals.controller.ts` — controller structure, decorators, guard usage
- `backend/src/auth/guards/roles.guard.ts` — `@Roles()` decorator behavior
- `backend/src/auth/guards/jwt-auth.guard.ts` — `@Public()` and JWT guard behavior
- `backend/src/auth/strategies/jwt.strategy.ts` — JWT payload shape (`{ sub, email, role, organizationId }`)
- `backend/src/upload/upload.service.ts` — presigned URL generation, key prefix
- `backend/src/audit/audit.service.ts` — `log(action, userId, details)` signature
- `backend/prisma/schema.prisma` — existing models, enums, RLS-relevant field names
- `backend/prisma/migrations/20260408203549_init/migration.sql` — existing RLS policies
- `frontend/app/pages/org/dashboard/animales/nuevo.vue` — wizard pattern (v-show, step refs, defineExpose)
- `frontend/app/components/animals/AnimalForm.vue` — `defineExpose({ validate, form, errors })` pattern
- `frontend/app/components/animals/PhotoUploader.vue` — upload flow, `getUploadedPhotos()`, props
- `frontend/app/pages/org/dashboard/animales/index.vue` — UTable + filter pattern
- `frontend/app/layouts/org.vue` — nav items pattern (`navItems` computed array)
- `frontend/app/middleware/auth.ts` — auth redirect pattern
- `.planning/phases/03-adoption-applications/03-CONTEXT.md` — all locked decisions
- `.planning/phases/03-adoption-applications/03-UI-SPEC.md` — component inventory, layout contracts, copywriting

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — accumulated Phase 1+2 decisions (Zod, Standard Schema v1, Nuxt UI v4, presigned URL flow)
- `.planning/REQUIREMENTS.md` — ADOP-01 through ADOP-06 requirement text

### Tertiary (LOW confidence — assumptions flagged)

- A2: Prisma `include` behavior when child row is blocked by RLS — runtime behavior not tested in this session
- A4: JSONB column design preference — architectural opinion, not from a definitive spec

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries verified running in Docker
- Architecture: HIGH — all patterns verified from existing codebase; assumptions clearly flagged
- Pitfalls: HIGH for verified ones (Pitfall 1, 2, 3, 4, 7); MEDIUM for RLS cross-table join (Pitfall 5, needs runtime test)

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable stack, no fast-moving dependencies)
