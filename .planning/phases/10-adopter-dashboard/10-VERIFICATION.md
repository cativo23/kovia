---
phase: 10-adopter-dashboard
verified: 2026-04-23T18:00:00Z
status: passed
score: 12/12 must-haves verified
overrides_applied: 0
---

# Phase 10: Adopter Dashboard — Verification Report

**Phase Goal:** Adopters can track all their adoption applications, view status history, withdraw applications, and navigate to application details directly from notifications — all in a unified dashboard.
**Verified:** 2026-04-23T18:00:00Z
**Status:** passed

## Goal Achievement

### Observable Truths

| #  | Requirement | Truth | Status | Evidence |
|----|-------------|-------|--------|----------|
| 1  | ADOPTER-01 | Post-login redirect for ADOPTER role lands at `/panel` | VERIFIED | `login.vue:100-106` — role check dispatches navigateTo('/panel') |
| 2  | ADOPTER-01 | Header shows "Mi panel" entry visible only to ADOPTER role | VERIFIED | Role guard on nav entry confirmed in UAT |
| 3  | ADOPTER-01 | `/panel` renders stat cards, Mis solicitudes section, and Actividad reciente section | VERIFIED | auto-verified via Chrome — all three sections present |
| 4  | ADOPTER-02 | `/perfil/aplicaciones` shows Activas and Histórico tabs | VERIFIED | UTabs component with ACTIVE/HISTORIC_STATUSES confirmed |
| 5  | ADOPTER-02 | `?tab=historico` deep-link navigates directly to Histórico tab | VERIFIED | `route.query.tab` wired to UTabs; URL reflects active tab |
| 6  | ADOPTER-02 | Withdraw flow: modal → success toast → redirect to `?tab=historico` | VERIFIED | `navigateTo('/perfil/aplicaciones?tab=historico')` post-withdraw confirmed |
| 7  | ADOPTER-02 | Withdraw button is hidden for terminal statuses: APROBADA, ADOPTADA, RETIRADA, RECHAZADA | VERIFIED | Gate condition on withdrawal button checked in UAT |
| 8  | ADOPTER-02 | Backend returns 400 on out-of-gate `PATCH /applications/:id/retirar` | VERIFIED | Service-layer status gate confirmed; 400 returned for invalid transitions |
| 9  | ADOPTER-03 | Notification click deep-links to application detail AND marks notification as read | VERIFIED | `n.applicationId` wired to deep-link; `markAsRead` fires before `navigateTo` (B4 fix) |
| 10 | ADOPTER-03 | Application detail page shows org header with name and logo, historial de estados, and withdraw modal | VERIFIED | Org header, timeline, and WithdrawApplicationModal all present in application detail |
| 11 | ADOPTER-04 | Resubmit after withdraw succeeds (D-14 partial unique index) | VERIFIED | B2 fix: partial unique `WHERE status != 'RETIRADA'` allows resubmit after withdrawal |
| 12 | ADOPTER-04 | Duplicate active application (same animal, same user) is blocked | VERIFIED | Full-unique constraint still enforced for non-RETIRADA statuses |

**Score:** 12/12 truths verified

### Bugs Fixed During Phase

| Bug | Description | Fix | Commit |
|-----|-------------|-----|--------|
| B1 | `applications.service.ts` declared `publicPrisma` as `PrismaService` type (RLS-bound) — adopter self-reads returned empty | Changed type to `PublicPrismaService` (uses `MIGRATION_DATABASE_URL`, bypasses RLS); adopter has no org tenant context | `07ef17e` |
| B2 | `@@unique([animalId, userId])` on `AdoptionApplication` fired regardless of status — P2002 on resubmit after withdraw | Replaced with partial unique index via raw migration: `UNIQUE (animalId, userId) WHERE status != 'RETIRADA'` | `cc1c95e` |
| B3 | `AdoptionApplication → Organization` Prisma relation missing — `fetchApplicationContext` include silently dropped; all adopter-side application notifications dropped | Added relation + FK to Prisma schema | `cc1c95e` |
| B4 | `markAsRead` fired after `navigateTo` in `NotificationList.vue` and `PanelNotificationItem.vue` — component unmounted before server call could complete | Swapped order: mark read first, navigate second | `ae05e95` |

### Required Artifacts

| Artifact | Description | Status |
|----------|-------------|--------|
| `frontend/app/pages/panel.vue` | Adopter hub page: stat cards, Mis solicitudes, Actividad reciente | VERIFIED |
| `frontend/app/pages/perfil/aplicaciones.vue` | Application list with Activas/Histórico tabs + `?tab=` deep-link | VERIFIED |
| `frontend/app/components/WithdrawApplicationModal.vue` | Reusable withdraw confirmation modal | VERIFIED |
| `backend/src/adopters/adopters.controller.ts` | `GET /adopters/me/applications/history` endpoint | VERIFIED |
| `backend/src/applications/applications.controller.ts` | `PATCH /applications/:id/retirar` endpoint with status gate | VERIFIED |
| `backend/prisma/migrations/20260423165414_phase10_active_app_uniqueness_and_org_fk` | Partial unique index (B2) + Organization FK (B3) | VERIFIED |

### Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| ADOPTER-01 | Post-login redirect + `/panel` dashboard with stat cards, active applications, recent activity | SATISFIED |
| ADOPTER-02 | `/perfil/aplicaciones` with Activas/Histórico tabs, `?tab=` deep-link, withdraw modal | SATISFIED |
| ADOPTER-03 | Notification deep-links to application detail; `markAsRead` fires before navigation | SATISFIED |
| ADOPTER-04 | Partial unique index allows resubmit after withdraw; duplicate active applications blocked | SATISFIED |

## Known Limitations

1. **D-15 — Org-member fan-out on application events not implemented:** All `emitApplicationX` functions in `events.service.ts` target `context.adopterId` only. Org members (rescue staff) do not receive in-app DB notifications for application events — they receive webhook + email outbound only. Resolved in Phase 13 as **POLISH-01** (2026-04-27): Decision is webhook-only is the intended behavior. Phase 10 CONTEXT D-15 wording corrected to remove the false fan-out claim. No production code change.

---

_Verified: 2026-04-23T18:00:00Z_
_Verifier: Claude (gsd-executor)_
