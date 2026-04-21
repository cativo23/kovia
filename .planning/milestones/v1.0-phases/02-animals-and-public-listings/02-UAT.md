---
status: complete
phase: 02-animals-and-public-listings
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-04-21T05:12:44Z
updated: 2026-04-21T06:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Stop everything, then `docker compose up -d` from a clean state. All services (minio, createbuckets, postgres, api, frontend) reach healthy/running. Homepage loads, no errors in container logs, public API (GET /animals) returns JSON.
result: issue
reported: "cold start on fresh clone fails in three ways: (1) API crashes on boot with `Cannot find module '../generated/prisma/client'` because Docker bind mount masks the image-baked prisma client; (2) DB has no tables — migrations are not applied automatically on compose up; (3) no seed script, so fresh DB has zero users/orgs/species/animals"
severity: blocker

### 2. Public Animal Listings (SSR, no auth)
expected: Open an incognito window, visit `/animales`. Page renders a responsive grid of animal cards (cover photo, name, species badge, age, size). `curl -s http://localhost:3000/animales | grep -i 'og:title'` or `grep -i 'animal-card'` shows SSR content in raw HTML (not a blank shell).
result: pass
note: "SSR verified via curl — Nova's card rendered with photo, name, species badge (Perros), age, breed, compat/health badges, grid layout, filter bar, result count ('1 animal encontrado'). Cold-start seed path worked (registration → invite → org creation → species → animal → listing)."

### 3. Listing Filters and URL Sync
expected: On `/animales`, pick a species filter (e.g., Perros). Results update and the URL query string reflects the filter (`?species=...`). Changing size/age/energy updates both results and URL. Copying the URL and pasting in a fresh tab loads the same filtered state.
result: pass
note: "Verified via browser automation: ?species=perros shows Nova (1 card), ?species=gatos shows 0 cards + empty state, ?size=SMALL shows 0 cards, filter button labels reflect current state. URL is the source of truth — fresh tab load renders filtered result server-side."

### 4. Search and Empty State
expected: Type 2+ characters in the search field — results debounce and filter after ~300ms. Apply filters that return zero animals: friendly empty-state with paw illustration and a "Clear filters" button appears; clicking it resets filters.
result: pass
note: "Verified: typing 'Nov' into search input (with 700ms debounce wait) keeps Nova. Empty filter states show 'No encontramos animales con esos filtros. Intenta con otros criterios.' + 'Limpiar todos los filtros' button — clicking the button resets URL to /animales and Nova reappears."

### 5. Grid/List View Toggle
expected: Click the view toggle on `/animales`. Cards switch from grid layout (2-4 cols responsive) to list layout (horizontal row per animal). Result count is visible in both modes.
result: pass
note: "Verified: clicking 'Ver en lista' and 'Ver en cuadricula' toggle works; result count '1 animal encontrado' visible in both modes."

### 6. Animal Detail Page and Photo Gallery
expected: Click an animal card — detail page at `/animales/:id` opens in a two-column layout (gallery left, info sidebar right). Photo gallery shows main image plus thumbnail strip. Clicking a thumbnail opens a lightbox overlay; arrow keys navigate, Escape closes. Apply button is disabled with a tooltip referencing the next version.
result: pass
note: "Verified: detail page loads with h1=Nova, 4 images, sidebar contact info. Clicking main image opens fullscreen lightbox (fixed inset-0 z-50 bg-black/90). Apply button now reads 'Aplicar para adoptar' and is enabled — expected since Phase 3 (applications) is done. Test description was written pre-Phase-3."

### 7. OG Meta Tags on Detail Page
expected: `curl -s http://localhost:3000/animales/<id>` in the raw HTML contains `<meta property="og:title" ...>`, `og:description`, and `og:image` tags populated from the animal's data. Sharing the URL on a link-preview tool (or just inspecting source) confirms OG metadata is present.
result: pass
note: "Verified in SSR HTML: og:title=Nova, og:description=Novita, og:image=MinIO photo URL, og:type=article, twitter:card=summary_large_image."

### 8. Org Landing Page (/org/:slug)
expected: Visit `/org/<slug>` for a seeded/created org. Page loads via SSR (content visible in raw HTML via curl), shows org header (name, contact, socials) and a grid of that org's animals. No placeholder "coming soon" text.
result: pass
note: "Verified /org/dametupatasv in SSR HTML: h1=DameTuPataSV, description, mailto: email, tel: phone, Instagram + WhatsApp social links, animals grid with Nova card, no placeholder text. OG tags present (title, description, image /og-default.png, type=profile). Same i18n key leak (animals.form.size.large) reproduces on AnimalCard here — already logged under Test 2's gap."

### 9. Org Dashboard Access Control
expected: As an unauthenticated user, navigating to `/org/dashboard` redirects to login. As a non-admin (adopter), it redirects with access denied. As an ORG_ADMIN, the org dashboard layout loads with sidebar (Dashboard, Animales, Perfil).
result: pass

### 10. Animal Creation Wizard (3 steps + photo upload)
expected: From org dashboard, click "Nuevo animal". Wizard presents 3 steps with progress indicator: (1) basic info, (2) characteristics, (3) photos. Each step validates before allowing next. On the photos step, drag-and-drop an image — it resizes client-side (max 1200px), uploads via presigned URL to MinIO, and appears as a thumbnail. Select a cover photo. Submit creates the animal and redirects to the list.
result: pass

### 11. Animal Edit with Immediate Photo Management
expected: From the animal list, open edit page for an existing animal. Form is pre-filled. Photo operations are immediate (not batched): adding a photo, removing one, reordering, and setting a different cover each take effect right away without a "save" button for photos. Saving the form updates textual fields.
result: issue
reported: "reorder dont seems to work everything else works"
severity: major

### 12. Animal Status Lifecycle (AVAILABLE → IN_PROCESS → ADOPTED + archive/restore)
expected: From the animal list action dropdown, transition a test animal through statuses: AVAILABLE → IN_PROCESS → ADOPTED. Invalid transitions are blocked with a clear message. Archive the animal — it disappears from the default list but appears when filtering archived. Restore it — reappears in the active list.
result: pass
note: "Verified via API against Nova: AVAILABLE→IN_PROCESS (200), IN_PROCESS→ADOPTED (200), archive (200, public listing total=0), restore (200, status=AVAILABLE, public listing total=1). Invalid transitions rejected with clear Spanish messages: 'Status must be one of: AVAILABLE, IN_PROCESS, ADOPTED. Use the archive endpoint for ARCHIVED.' and 'Cannot transition from AVAILABLE to AVAILABLE'."

### 13. Species Admin CRUD
expected: As a platform admin, open `/admin/species` (or equivalent). Create a new species (name + slug auto-generated). Edit its name. Delete it. Changes are reflected in the species filter dropdown on the public `/animales` page.
result: pass
note: "Verified via API as PLATFORM_ADMIN: POST /admin/species {name:'Conejos'} (201, slug='conejos' auto-generated), PATCH {name:'Conejos Silvestres'} (200, slug regenerated to 'conejos-silvestres'), GET /species public endpoint includes the edited species, DELETE (200), subsequent GET /species no longer includes it."

## Summary

total: 13
passed: 11
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Animal card on /animales shows localized size label (e.g. 'Grande' for LARGE) instead of the raw i18n key"
  status: failed
  reason: "Observed during Test 2 SSR check: size renders as 'animals.form.size.large' string. Nuxt log: [intlify] Not found 'animals.form.size.large' key in 'es' locale messages"
  severity: minor
  test: 2
  artifacts:
    - path: "frontend/app/components/animals/AnimalCard.vue"
      issue: "Template uses $t('animals.form.size.large') (or similar) but key doesn't exist in es-SV messages"
    - path: "frontend/i18n/locales/es-SV.json"
      issue: "Missing animals.form.size.* keys (SMALL/MEDIUM/LARGE/EXTRA_LARGE) OR AnimalCard uses wrong key path"
  missing:
    - "Add size label keys to es-SV.json under the path AnimalCard uses (likely animals.form.size.{small|medium|large|extra_large})"
    - "OR change AnimalCard to use an existing key path. Also check breed display if it similarly leaks keys"
  root_cause: ""
  debug_session: ""

- truth: "Photo reorder on the animal edit page takes effect (drag/reorder persists and is reflected in the list immediately)"
  status: failed
  reason: "User reported: reorder dont seems to work everything else works (add, remove, cover swap all work)"
  severity: major
  test: 11
  artifacts:
    - path: "frontend/app/components/animals/PhotoUploader.vue"
      issue: "Reorder handler likely not wired to the backend photo-position API (or optimistic update without API call)"
    - path: "backend/src/animals/animals.service.ts"
      issue: "Verify there's an endpoint/method for updating photo position and that PhotoUploader calls it"
  missing:
    - "Confirm API endpoint for photo reorder exists (PATCH /animals/:id/photos/:photoId/position or similar) and that the frontend calls it on drag-drop"
    - "If wiring exists, debug whether the optimistic UI update is only client-side (not persisted) or the API call is failing silently"
  root_cause: ""
  debug_session: ""

- truth: "Cold start on a fresh clone produces a runnable stack (all services healthy, DB migrated, app usable with seed or registration flow)"
  status: failed
  reason: "User reported: three separate cold-start bugs — (1) API crashes because Prisma client isn't in the bind-mounted host dir; (2) DB migrations not applied automatically; (3) no seed script, so zero initial data"
  severity: blocker
  test: 1
  artifacts:
    - path: "backend/Dockerfile"
      issue: "Runs `npm install` (postinstall → prisma generate) which writes to image's /app/src/generated/prisma, but docker-compose bind mount `./backend:/app` masks it at runtime"
    - path: "docker-compose.yml"
      issue: "`api` service has no startup step for `prisma generate` or `prisma migrate deploy`; no dedicated migration/seed service"
    - path: "backend/package.json"
      issue: "No `prisma.seed` config and no seed script; fresh DB starts empty"
  missing:
    - "Add `prisma generate` to api container startup (entrypoint/CMD) OR change bind-mount strategy so the image-generated client survives"
    - "Add `prisma migrate deploy` to api container startup OR add a one-shot migrations service to docker-compose"
    - "Add a seed script (e.g., `backend/prisma/seed.ts` + `prisma.seed` in package.json) that creates platform admin, a sample org/ORG_ADMIN, default species, and a few demo animals"
  root_cause: ""
  debug_session: ""
