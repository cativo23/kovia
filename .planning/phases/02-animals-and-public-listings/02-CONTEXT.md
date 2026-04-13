# Phase 2: Animals and Public Listings - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Rescue staff can manage animal profiles with photos, and anyone on the internet can browse available animals without an account. Includes: animal CRUD, photo uploads (cloud storage), SSR public listings with SEO, org landing pages with animals, and an org dashboard for animal management.

Requirements: ANIM-01, ANIM-02, ANIM-03, ANIM-04, LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, DASH-01

</domain>

<decisions>
## Implementation Decisions

### Photo Storage & Upload
- MinIO (S3-compatible) for dev, added to docker-compose — same presigned URL pattern works with AWS S3 in production
- Staff can explicitly set a cover photo (star/button), not just first photo
- Photos are editable anytime — add, remove, reorder, change cover from animal edit page
- Optional captions per photo (short description, shown on hover/detail)

### Public Listing Experience
- Card grid AND list view with toggle switch — visitors choose their preferred view
- Filters: species, size, age range, plus organization and any extras Claude considers useful (e.g., energy level)
- Text search bar alongside filters — searches animal name and description
- Animal detail page: photo gallery on left + info sidebar on right, with prominent "Aplicar para adoptar" button
- Empty state: friendly paw illustration + "No encontramos animales con esos filtros" + clear filters button

### Org Dashboard
- Separate org layout (sidebar like admin panel) — nav items: Animales, Aplicaciones (Phase 3), Perfil
- Stats cards at top: Total animales, Disponibles, En proceso, Adoptados
- Animal creation via multi-step wizard: Step 1 Info basica → Step 2 Caracteristicas → Step 3 Fotos
- Adopted animals can be reverted to "Disponible" (for failed adoptions/returns)
- Both soft delete (archive) and hard delete (with extra confirmation) available

### Animal Profile Data
- Species is configurable by platform admin via DB (not a hardcoded enum) — admin manages the species list
- Gender: Macho, Hembra, Desconocido
- Compatibility attributes: good with kids, good with other pets (granular: dogs/cats/other), energy level (Bajo/Medio/Alto), special needs (free text), plus whatever Claude considers relevant (e.g., vacunado, esterilizado, entrenado)

### Claude's Discretion
- Upload UX approach (drag & drop vs file input) — pick the best pattern
- Photo limits (max count and file size) — pick reasonable defaults
- Photo compression/resizing on upload — decide based on performance tradeoffs
- Age capture method (categories vs numeric estimate)
- Pagination approach for public listings (traditional vs load more — consider SSR/SEO)
- Org landing page design (reuse grid component vs custom branded page)
- Dashboard animal list presentation (table vs cards vs kanban)
- Status transition UX (dropdown vs modal confirmation)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **UTable component**: Used in admin panel (orgs, users, invites) — reusable for org dashboard animal list
- **Stats cards pattern**: Admin dashboard has 4-column stat cards — reuse for org dashboard
- **useApi composable**: Factory providing get/post/patch/del — use for all animal API calls
- **Admin layout**: Sidebar + content layout — clone for org layout with different nav items
- **Org [slug].vue page**: Already exists with "Animales disponibles" placeholder — extend with actual animal grid
- **Auth store**: isOrgAdmin getter and organizationId available for org-scoped middleware
- **Confirmation modal pattern**: UModal with confirm/cancel — reuse for status changes and deletes

### Established Patterns
- **Backend module structure**: controller + service + module + DTOs with class-validator — follow for animals module
- **RLS via PRISMA_RLS**: Tenant-scoped queries via CLS context — use for org-scoped animal queries
- **@Roles('ORG_ADMIN') guard**: Role-based access — use for animal CRUD endpoints
- **@Public() decorator**: Unauthenticated access — use for public listing endpoints
- **Audit logging**: AuditService.log() — use for animal creation/deletion/status changes
- **i18n pattern**: es-SV.json with nested keys + useI18n() composable

### Integration Points
- **Prisma schema**: Add Animal, AnimalPhoto, Species models with Organization relation
- **docker-compose.yml**: Add MinIO service for S3-compatible storage
- **Frontend routes**: /animales (public listings), /animales/[id] (detail), /org/dashboard/animales (org CRUD)
- **Admin panel**: Add species management page (/admin/species)
- **Org [slug].vue**: Replace placeholder with actual animal grid
- **SSR**: Use useSeoMeta() for OG tags on animal detail pages (not yet used in codebase)

</code_context>

<specifics>
## Specific Ideas

- Species list must be managed by platform admin through the admin panel, stored in DB — not hardcoded enums
- Rescue staff need to manage photos freely after creation (add/remove/reorder/change cover) because animal profiles evolve
- Toggle between card grid and list view on public listings — visitors choose their preference
- Multi-step wizard for animal creation to guide staff through the process (info → characteristics → photos)
- Both archive and hard delete because staff need to clean up test data but also want safety for real animals

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-animals-and-public-listings*
*Context gathered: 2026-04-09*
