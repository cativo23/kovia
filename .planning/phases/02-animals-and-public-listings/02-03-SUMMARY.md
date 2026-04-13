---
phase: 02-animals-and-public-listings
plan: 03
subsystem: ui, frontend, seo
tags: [nuxt, vue, nuxt-ui, ssr, seo, og-tags, public-listings, filters, i18n, e2e, playwright]
status: checkpoint-pending

# Dependency graph
requires:
  - phase: 02-animals-and-public-listings
    plan: 01
    provides: Animals CRUD API, public listing endpoints, species API
  - phase: 02-animals-and-public-listings
    plan: 02
    provides: StatusBadge, AnimalForm patterns, org layout, auth store (isOrgAdmin)
provides:
  - Public SSR listing page at /animales with URL-driven filters and pagination
  - AnimalCard component (grid/list dual-mode with photos, badges, compat indicators)
  - AnimalFilters component (species, size, age range, energy, debounced search)
  - AnimalGrid component (responsive grid + list toggle, result count)
  - EmptyAnimals component (filtered/empty variants with paw illustration)
  - BrandHeader component (Kovia logo + tagline)
  - Animal detail page at /animales/:id with SSR OG meta tags and photo gallery
  - PhotoGallery component (thumbnail strip, lightbox, keyboard navigation)
  - Org landing page at /org/:slug with SSR (replaced onMounted with useFetch)
  - Updated default layout with sticky navbar, Animals nav link, org admin link, footer
  - Updated landing page with hero section and featured animals grid
  - E2E tests for listing, filters, detail OG tags, org page, empty state
affects: [03-adoption-applications]

# Tech tracking
tech-stack:
  added: []
  patterns: [ssr-with-url-driven-filters, useSeoMeta-og-tags, dual-mode-card, lightbox-teleport]

key-files:
  created:
    - frontend/app/pages/animales/index.vue
    - frontend/app/pages/animales/[id].vue
    - frontend/app/components/animals/AnimalCard.vue
    - frontend/app/components/animals/AnimalGrid.vue
    - frontend/app/components/animals/AnimalFilters.vue
    - frontend/app/components/animals/EmptyAnimals.vue
    - frontend/app/components/animals/PhotoGallery.vue
    - frontend/app/components/brand/BrandHeader.vue
    - frontend/tests/e2e/animals.spec.ts
  modified:
    - frontend/app/layouts/default.vue
    - frontend/app/pages/index.vue
    - frontend/app/pages/org/[slug].vue
    - frontend/i18n/locales/es-SV.json

key-decisions:
  - "URL-driven filters use navigateTo({ query }) so each filter state is a bookmarkable SSR URL"
  - "useFetch with computed query object for reactive SSR refetch on filter/page changes"
  - "PhotoGallery uses Teleport for lightbox overlay to avoid z-index stacking issues"
  - "Apply button disabled with tooltip referencing Phase 3 (adoption applications)"
  - "org/[slug].vue replaced onMounted with useFetch for full SSR support"
  - "AnimalFilters debounces search 300ms and requires 2+ chars before firing"

# Metrics
duration: ~30min
completed: 2026-04-10
checkpoint: Task 3 (human-verify) — awaiting user verification
---

# Phase 02 Plan 03: Public Listings Frontend Summary

**SSR public animal listings with URL-driven filters, photo gallery + OG tags on detail page, org landing page with real animals, brand identity, and E2E tests — awaiting human verification (Task 3)**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-10
- **Completed (Tasks 1-2):** 2026-04-10
- **Tasks completed:** 2 of 3 (Task 3 is checkpoint:human-verify)
- **Files modified/created:** 13

## Accomplishments

### Task 1: Public listing page with SSR, filters, grid/list toggle, brand identity
- `AnimalCard.vue` — dual-mode card (grid/list) with cover photo, species badge, age, size, compat/health badges
- `AnimalFilters.vue` — horizontal filter bar: species (from API), size, age range, energy level, debounced search (300ms); collapsible on mobile
- `AnimalGrid.vue` — responsive CSS grid (1/2/3/4 cols) + list mode with view toggle and result count
- `EmptyAnimals.vue` — friendly paw illustration + clear-filters button (filtered vs empty variants)
- `BrandHeader.vue` — Kovia paw logo + tagline component
- `animales/index.vue` — SSR listing page: filters, pagination, URL query param sync via `navigateTo`
- `default.vue` — sticky navbar with Kovia brand, Animals + My Org nav links, user dropdown, footer
- `index.vue` — hero section + featured animals (6 SSR-fetched), org CTA section
- `es-SV.json` — added `listings.*`, `detail.*`, `nav.animals/myOrg`, `landing.hero/featured/orgCta`, `common.footer.*`, `org.profile.animals/noAnimals/seeAll`

### Task 2: Animal detail page, org landing page SSR, E2E tests
- `PhotoGallery.vue` — main image + thumbnail strip + lightbox (Teleport), keyboard nav (arrows/escape), captions
- `animales/[id].vue` — two-column layout (gallery left, info sidebar right), `useSeoMeta` for all OG tags, disabled apply button with tooltip
- `org/[slug].vue` — converted from `onMounted` to SSR `useFetch`, added `AnimalGrid` + `AnimalFilters`, kept existing org header/contact/social sections, added org OG tags
- `animals.spec.ts` — 7 E2E tests: listing loads without auth, SSR content in raw HTML, filter URL params, view toggle, detail OG tags, org page animals, empty state

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Public listing page, filters, components, brand | `5848032` |
| 2 | Detail page OG tags, photo gallery, org SSR, E2E | `aa37013` |

## Deviations from Plan

None — plan executed exactly as written. All components created per spec.

## Known Stubs

- **Apply button** (`animales/[id].vue`): `UButton disabled` with tooltip "Disponible en la siguiente version". Intentional — Phase 3 (adoption applications) will enable this. Not blocking plan goal.

## Checkpoint Pending

Task 3 is `checkpoint:human-verify` — requires user to manually verify:
1. Org dashboard (login → animal CRUD wizard, photo upload, status changes)
2. Public listings (incognito → animal cards, grid/list toggle, species filter, search)
3. Animal detail (photo gallery, OG tags in page source)
4. Org landing page (real animals, no placeholder text)
5. SSR check via curl for `og:title` tags
6. Brand identity (navbar, colors, footer consistency)

## Self-Check: PASSED

All created files verified on disk:
- frontend/app/pages/animales/index.vue ✓
- frontend/app/pages/animales/[id].vue ✓
- frontend/app/components/animals/AnimalCard.vue ✓
- frontend/app/components/animals/AnimalGrid.vue ✓
- frontend/app/components/animals/AnimalFilters.vue ✓
- frontend/app/components/animals/EmptyAnimals.vue ✓
- frontend/app/components/animals/PhotoGallery.vue ✓
- frontend/app/components/brand/BrandHeader.vue ✓
- frontend/tests/e2e/animals.spec.ts ✓
- Commit 5848032 ✓
- Commit aa37013 ✓

---
*Phase: 02-animals-and-public-listings*
*Completed tasks: 2/3 (checkpoint:human-verify pending)*
*Date: 2026-04-10*
