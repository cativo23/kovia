# Phase 3: Adoption Applications - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Logged-in adopters can submit structured multi-step applications for a specific animal, with photo uploads and localStorage persistence. Rescue staff can view and manage the application queue per organization from a dedicated dashboard section. State machine transitions are enforced on both sides.

Requirements: ADOP-01, ADOP-02, ADOP-03, ADOP-04, ADOP-05, ADOP-06

</domain>

<decisions>
## Implementation Decisions

### Application Form Structure
- **D-01:** 4-step wizard + review step = 5 total steps
  - Step 1: Info personal (teléfono, ocupación, fecha de nacimiento — nombre y email vienen del usuario autenticado)
  - Step 2: Vivienda y convivencia (tipo de vivienda, propiedad vs alquiler, si alquila: ¿tiene permiso para mascotas?, espacio exterior, adultos y niños en el hogar, mascotas actuales con especies)
  - Step 3: Experiencia y estilo de vida (mascotas anteriores + qué pasó con ellas, experiencia con la especie del animal, horas solas en casa, nivel de actividad, razones para adoptar)
  - Step 4: Fotos del ambiente (mínimo 2 requeridas, máximo 8)
  - Step 5: Revisión y envío (resumen completo + campos opcionales: redes sociales e Instagram/Facebook + texto libre de contexto adicional)
- **D-02:** Reuse the existing step wizard UI pattern from `frontend/app/pages/org/dashboard/animales/nuevo.vue` (step indicator + UCard per step)
- **D-03:** Fields in each step validated with Zod before allowing Next; cannot advance with invalid data

### Form Fields Detail
- **D-04:** Step 1 mandatory fields: teléfono, ocupación, fecha de nacimiento
- **D-05:** Step 2 — Claude's discretion on exact housing fields (tipo vivienda, propiedad/alquiler, permiso mascotas si alquila, espacio exterior, adultos, niños, mascotas actuales)
- **D-06:** Step 3 — Claude's discretion on experience + lifestyle fields (experiencia previa, qué pasó con mascotas anteriores, horas solas, nivel actividad, motivo adopción)
- **D-07:** Step 5 optional fields: link de redes sociales (Instagram/Facebook del hogar) + campo de texto libre "Contexto adicional"

### Environment Photos (Step 4)
- **D-08:** Minimum 2 photos required to proceed past Step 4 (blocks submission if < 2)
- **D-09:** Maximum 8 photos
- **D-10:** Reuse and adapt the existing `AnimalsPhotoUploader` component — same presigned URL flow to MinIO, client-side resize, progress bar. Update labels and limits only.
- **D-11:** Photo UX label: "Fotos de tu hogar" — show requirement inline ("Se requieren mínimo 2 fotos")

### Auth Gate
- **D-12:** Unauthenticated user clicks "Aplicar para adoptar" → opens modal with two options: crear cuenta / iniciar sesión. On success, redirects back to the same animal automatically.
- **D-13:** Authenticated user who already submitted an application for this animal → button changes to "Ver solicitud" and links to their existing application status page.

### LocalStorage Draft Persistence (ADOP-04)
- **D-14:** Claude's discretion on persistence strategy. Suggested approach: auto-save on step completion (not every keystroke), key pattern `aplicacion_draft_{animalId}_{userId}`, cleared automatically on successful submission.

### Application State Machine (ADOP-05)
- **D-15:** State transitions:
  - `enviada` → `revisando` → `aprobada` / `rechazada` / `seguimiento` → `adoptada`
  - `retirada` is an exit state accessible by the adopter (not staff)
- **D-16:** Staff controls: enviada→revisando, revisando→aprobada/rechazada/seguimiento, seguimiento→aprobada/rechazada, aprobada→adoptada
- **D-17:** Adopter controls: can only **retirar** their own application (and only while status is not yet `adoptada`)
- **D-18:** Status transitions on backend are validated in service layer with audit logging (same pattern as animal status in Phase 2)

### Staff Application Queue (ADOP-06)
- **D-19:** Dedicated "Aplicaciones" section in org dashboard nav (confirmed in Phase 2 planning): Animales | **Aplicaciones** | Perfil
- **D-20:** Table columns: Nombre del adoptante, Animal (foto + nombre), Fecha enviada, Puntuación (placeholder "—" until Phase 4 scoring), Estado (badge), Acciones (Ver detalle)
- **D-21:** Filters available: por animal, por estado, por fecha (rango)
- **D-22:** Clicking a row opens the full application detail (all steps, photos, adopter history placeholder for Phase 4)

### Claude's Discretion
- Exact Step 2 housing field layout (property type options, exterior space options, etc.)
- Exact Step 3 experience/lifestyle field layout
- localStorage auto-save strategy (on step complete vs debounced)
- Application detail page layout for staff (info layout, photo gallery placement)
- Empty state for the applications queue (no applications yet)
- UX for staff status transition (inline dropdown in table vs modal confirmation)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Existing patterns to follow
- `frontend/app/pages/org/dashboard/animales/nuevo.vue` — multi-step wizard UI pattern (step indicator, UCard per step, navigation)
- `frontend/app/components/animals/AnimalForm.vue` — form section pattern (defineExpose validate/form)
- `frontend/app/components/animals/PhotoUploader.vue` — presigned URL upload component to adapt
- `frontend/app/pages/animales/[id].vue` — animal detail page with disabled "Aplicar" button to wire up
- `backend/src/animals/animals.service.ts` — status transition validation + audit logging pattern to replicate

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Multi-step wizard UI** (`nuevo.vue`): Step indicator, UCard per step, Next/Back navigation — reuse directly for the application wizard
- **PhotoUploader component**: Presigned URL → MinIO, client-side resize to max 1200px, progress bar — adapt for environment photos (change labels + limits)
- **AnimalForm pattern**: `defineExpose({ validate, form })` for step validation control — use same pattern for ApplicationForm steps
- **useApi composable**: `get/post/patch/del` factory — use for all application API calls
- **UTable + filters pattern**: Admin panel and org dashboard use UTable with filter controls — reuse for application queue
- **UModal confirmation pattern**: Status changes and deletes already use modal confirmation — reuse for application status transitions
- **Auth store**: `isOrgAdmin`, `organizationId`, `user` getters available for access control

### Established Patterns
- **Backend module structure**: controller + service + module + DTOs with class-validator — follow for applications module
- **RLS via PRISMA_RLS**: Tenant-scoped queries via CLS context — use for org-scoped application reads (staff)
- **@Roles('ORG_ADMIN') guard**: Protect staff application endpoints
- **@Public() + JWT optional**: Application form itself needs optional auth (to show existing application state)
- **Audit logging**: AuditService.log() — use for every application status change
- **i18n pattern**: es-SV.json with nested keys — all new UI strings go here
- **Zod + UForm**: Standard Schema v1 (Phase 1 decision) — use for all application form step validation

### Integration Points
- **Prisma schema**: Add `AdoptionApplication`, `ApplicationPhoto`, and related models
- **Animal detail page** (`/animales/[id].vue`): Wire up the disabled "Aplicar" button — check auth state and existing application
- **Org dashboard nav**: Add "Aplicaciones" nav item to org layout
- **New routes**:
  - `/animales/[id]/aplicar` — multi-step application wizard (authenticated)
  - `/org/dashboard/aplicaciones` — staff application queue
  - `/org/dashboard/aplicaciones/[id]` — staff application detail
  - `/perfil/aplicaciones` — adopter's own application history (list)
  - `/perfil/aplicaciones/[id]` — adopter's application status/detail

</code_context>

<specifics>
## Specific Ideas

- Step 5 (Revisión) shows a clean read-only summary of all previous steps, with "Editar" links per section to go back and fix
- The "Puntuación" column in the staff table is built in Phase 3 but shows "—" as placeholder — Phase 4 will populate it without schema changes
- Adopter gets a success page/state after submission ("¡Solicitud enviada!") that explains what happens next and links to their application history
- The auth modal on animal detail should preserve the user's scroll position and animal context — not a full page redirect

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-adoption-applications*
*Context gathered: 2026-04-10*
