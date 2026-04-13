# Phase 2: Animals and Public Listings — Research

**Researched:** 2026-04-09

## Codebase Findings

### Backend Architecture (NestJS)
- **Module pattern**: controller + service + module + DTOs with class-validator decorators
- **RLS**: `PRISMA_RLS` token provides tenant-scoped Prisma client via CLS context. `PrismaService` (publicPrisma) for unauthenticated queries. Both injected in services.
- **Guards**: Global `JwtAuthGuard` + `RolesGuard`. `@Public()` decorator skips JWT. `@Roles('ORG_ADMIN')` for role-based access.
- **Audit**: Global `AuditModule` exports `AuditService` — use `AuditService.log()` for animal CRUD events.
- **Tenant interceptor**: Sets `userId`, `organizationId`, `isAdmin` in CLS from JWT payload. Runs after JWT guard.
- **Existing modules**: auth, admin, organizations, audit, prisma, tenant, users, mail
- **API prefix**: Backend routes are at root (no /api/v1 prefix). Nuxt proxy at `/api/v1/[...]` strips prefix.
- **DB init**: `init.sql` creates `app_user` role. RLS policies in migration files. Current policies only on `users` table.

### Frontend Architecture (Nuxt 4)
- **Nuxt UI v4** (^4.6.1) — uses UTable, UCard, UButton, UIcon, UDropdownMenu, UModal components
- **Layouts**: `default.vue` (public site), `admin.vue` (sidebar + content), `auth.vue` (auth pages)
- **Composables**: `useApi()` returns `{get, post, put, patch, del, api}` wrapping `$api` plugin
- **Auth store**: Pinia store with `isAuthenticated`, `isAdmin`, `isOrgAdmin`, `organizationId` getters
- **i18n**: `@nuxtjs/i18n` with `es-SV` default locale, lazy-loaded from `frontend/i18n/locales/es-SV.json`, `strategy: 'no_prefix'`
- **SSR**: Nuxt runs SSR. `useHead()` used on index page. `useSeoMeta()` not yet used but available.
- **Proxy**: `frontend/server/routes/api/v1/[...].ts` proxies to backend via `NUXT_API_INTERNAL`
- **Middleware**: `auth.ts`, `guest.ts`, `admin.ts`, `org-setup.global.ts`
- **Org page**: `frontend/app/pages/org/[slug].vue` exists with placeholder "Animales disponibles" section
- **No components dir yet**: No custom components — all inline in pages

### Prisma Schema
- Models: `User`, `RefreshToken`, `Organization`, `OrgInvite`, `AuditLog`
- `Organization` has `adminId` (unique), `slug` (unique), and social fields
- No `Animal`, `AnimalPhoto`, or `Species` models yet
- Generator: `prisma-client` output to `../src/generated/prisma`

### Docker Compose
- Services: api, web, postgres, redis, mailpit
- No MinIO/S3 service yet — needs to be added
- Postgres 16 with healthcheck, pgdata volume

### Test Structure
- Backend: vitest specs in `src/**/*.spec.ts` (unit) + `src/prisma/rls.integration.spec.ts`
- Frontend: vitest unit tests in `tests/unit/`, Playwright E2E in `tests/e2e/`
- RLS integration tests use raw pg Client connections

## Technical Decisions

### Photo Storage — MinIO
- Add MinIO service to docker-compose (S3-compatible, port 9000 for API, 9001 for console)
- Use `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for presigned URLs
- Same code works with AWS S3 in production (just change endpoint/credentials)
- Upload flow: frontend requests presigned PUT URL → uploads directly to MinIO → saves URL in DB
- Bucket: `kovia-animals` with public read for animal photos

### Photo Upload UX (Claude's discretion)
- **Approach**: Drag-and-drop zone + file input fallback using a custom component
- **Limits**: Max 10 photos per animal, 5MB per photo
- **Compression**: Client-side resize to max 1200px width before upload (reduces bandwidth, MinIO stores final)
- **Cover photo**: Explicit star/button on photo grid, stored as `isCover` boolean on `AnimalPhoto`

### Age Capture (Claude's discretion)
- **Approach**: Numeric estimate with unit selector (years/months). Better for filtering than categories.
- Store as `ageMonths` integer in DB (convert years to months). Display as "2 anos" or "6 meses".

### Pagination (Claude's discretion)
- **Approach**: Traditional pagination with page numbers for public listings (SSR-friendly, SEO-friendly — each page is a distinct URL)
- Use `?page=1&limit=12` query params. Server renders the page with correct data.

### Org Landing Page (Claude's discretion)
- **Approach**: Reuse the animal grid component inside existing `org/[slug].vue` page. Replace placeholder with actual filtered grid. No separate custom page needed.

### Dashboard Animal List (Claude's discretion)
- **Approach**: Table view using existing UTable pattern (matches admin panel). Status column with colored badges. Action dropdown for edit/archive/delete.

### Status Transition UX (Claude's discretion)
- **Approach**: Dropdown selector with confirmation modal for critical transitions (to adopted, archive, delete). Simple dropdown change for available ↔ in process.

### Animal Data Model

```
Species (admin-managed)
  id, name, slug, createdAt

Animal
  id, name, description, speciesId, breed, gender, ageMonths, size, energyLevel
  goodWithKids, goodWithDogs, goodWithCats, goodWithOtherPets
  specialNeeds, vaccinated, sterilized, trained
  status (available/in_process/adopted/archived)
  organizationId, isCoverPhotoId
  createdAt, updatedAt, archivedAt

AnimalPhoto
  id, animalId, url, caption, position (for ordering), isCover
  createdAt
```

### RLS Strategy
- `animals` table: RLS enabled. Org-scoped write (INSERT/UPDATE/DELETE with `app.current_org_id`). Public read for `status = 'available'`. Org read for own animals (any status).
- `animal_photos` table: RLS follows animal's org. Join-based policies or no RLS (accessed through animal service logic).
- `species` table: No RLS — platform-level, admin-managed. Use `publicPrisma`.

### SSR + SEO
- Animal detail pages use `useSeoMeta()` for OG tags (title, description, image)
- Use `useAsyncData()` or `useFetch()` for SSR data fetching (not onMounted)
- Nuxt proxy needs to work for SSR: server-side fetches use `NUXT_API_INTERNAL` (http://api:3000)

### Routes
- **Public**: `/animales` (listings), `/animales/[id]` (detail)
- **Org dashboard**: `/org/dashboard` (home), `/org/dashboard/animales` (list), `/org/dashboard/animales/nuevo` (create wizard), `/org/dashboard/animales/[id]/editar` (edit)
- **Admin**: `/admin/species` (species management)
- **Org landing**: `/org/[slug]` (existing, extend with animal grid)

## Risk Areas

1. **MinIO Docker setup**: First new service addition — ensure healthcheck, volume persistence, env vars all correct
2. **Presigned URL flow**: Requires careful coordination between backend (generate URL) and frontend (upload to MinIO directly)
3. **RLS for animals**: First tenant-scoped table with public read — policies need to handle both authenticated and unauthenticated access
4. **SSR data fetching**: Switching from `onMounted` pattern (current org page) to `useAsyncData` for SEO — proxy must work server-side
5. **Photo ordering/cover**: UI state management for drag-to-reorder and cover selection during creation wizard

## Dependencies

- Phase 1 complete (auth, orgs, RLS infrastructure, admin panel) ✓
- No external dependencies beyond existing stack + MinIO + @aws-sdk packages

---
*Research for: Phase 02-animals-and-public-listings*
*Completed: 2026-04-09*
