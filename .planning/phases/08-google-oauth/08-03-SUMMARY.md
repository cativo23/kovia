---
phase: 08-google-oauth
plan: "03"
subsystem: auth
tags: [google-oauth, frontend, i18n, sessionStorage, toast, redirect-preservation]
dependency_graph:
  requires:
    - 08-02 (backend loginWithGoogle + controller outcome flags)
  provides:
    - sessionStorage redirect preservation in authStore.loginWithGoogle()
    - Toast notifications for new-user and account-linking OAuth flows
    - i18n keys auth.welcomeToKovia and auth.googleLinked
    - auth/callback.vue reads sessionStorage dest after OAuth
  affects:
    - frontend/app/stores/auth.ts
    - frontend/app/pages/auth/callback.vue
    - frontend/i18n/locales/es-SV.json
tech_stack:
  added: []
  patterns:
    - sessionStorage namespaced key (kovia:oauth_redirect) for redirect preservation
    - Toast pattern matching login.vue (useToast + useI18n)
    - Semantic color token text-error replacing literal text-red-500
key_files:
  modified:
    - frontend/app/stores/auth.ts
    - frontend/app/pages/auth/callback.vue
    - frontend/i18n/locales/es-SV.json
decisions:
  - sessionStorage key prefixed with kovia: to avoid collisions (D-07)
  - Login and register paths excluded from redirect storage (no point returning there after OAuth)
  - Returning users navigate silently — no toast to avoid notification fatigue
  - text-red-500 migrated to text-error per UI-SPEC.md semantic token recommendation
metrics:
  duration_minutes: 12
  completed_date: "2026-04-23"
  tasks_completed: 1
  tasks_pending_uat: 1
  files_modified: 3
---

# Phase 08 Plan 03: Frontend OAuth UX Summary

**One-liner:** Added sessionStorage redirect preservation to loginWithGoogle(), extended callback.vue with conditional toast notifications (new user / linked account / silent return), and added two es-SV i18n keys — pending Chrome UAT.

## Status: PENDING HUMAN VERIFICATION

Task 1 (code) complete and committed. Task 2 (Chrome UAT) awaits human verification.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add i18n keys + sessionStorage + extend callback.vue | 3d273a1 | frontend/app/stores/auth.ts, frontend/app/pages/auth/callback.vue, frontend/i18n/locales/es-SV.json |

## What Was Done

### Task 1 — Three-file frontend change

**frontend/i18n/locales/es-SV.json:** Added two keys after `oauthCallback`:
- `auth.welcomeToKovia` — "¡Bienvenido a Kovia, {firstName}!" (success toast for new users)
- `auth.googleLinked` — "Tu cuenta de Google ha sido vinculada exitosamente" (info toast for linked accounts)

**frontend/app/stores/auth.ts — loginWithGoogle():** Extended from a one-liner to read `router.currentRoute.value.fullPath` before the full-page redirect. Stores the path in `sessionStorage['kovia:oauth_redirect']` unless the user is already on `/login` or `/register` (no point restoring those paths). Then navigates to Google as before.

**frontend/app/pages/auth/callback.vue:** Extended `onMounted` handler:
- After `handleOAuthCallback(token)` resolves, checks `route.query.new` and `route.query.linked` flags set by the backend controller (Plan 02)
- `new === 'true'` → success toast with `auth.welcomeToKovia` interpolating `authStore.user.firstName`
- `linked === 'true'` → info toast with `auth.googleLinked`
- Neither flag → silent navigation (returning user)
- Reads `sessionStorage['kovia:oauth_redirect']`, clears it, navigates to that path (or `/` if absent)
- Error icon migrated from `text-red-500` to `text-error` semantic token

**register.vue:** Verified (read-only) — `authStore.loginWithGoogle()` already wired to the Google button at line 109. No changes needed.

## Verification

```
grep welcomeToKovia es-SV.json           → line 85 present
grep googleLinked es-SV.json             → line 86 present
grep kovia:oauth_redirect auth.ts        → line 61 present
grep welcomeToKovia callback.vue         → line 42 present
grep googleLinked callback.vue           → line 47 present
grep kovia:oauth_redirect callback.vue   → lines 50-51 present
grep text-error callback.vue             → line 9 present (not text-red-500)
nuxi typecheck (modified files only)     → 0 errors
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all OAuth flow paths are wired. Toast messages use real `authStore.user.firstName` populated by `handleOAuthCallback`. Redirect destination reads from sessionStorage set by the same `loginWithGoogle()` action.

## Threat Surface Scan

No new network endpoints or auth paths introduced. sessionStorage key is namespaced (`kovia:`) and cleared immediately after read — no persistent sensitive data stored. toast content uses `firstName` from authenticated user object (already trusted).

## Pending: Chrome UAT

The following must be verified by human tester in Chrome with real Google credentials:

- SC-1: New Google user lands on adopter dashboard after OAuth (no form fill), welcome toast shows firstName
- SC-2: New sign-in creates DB user row + dispatches WelcomeMail, isNew=true flag visible
- SC-3: Existing-email user linked — no duplicate row, isLinked toast shown
- SC-4: refresh_token httpOnly cookie set; protected routes accessible; deactivated users blocked
- Redirect preservation: user lands at originally intended route after OAuth
- /register Google button: visible and triggers OAuth identically to /login

## Self-Check: PASSED

- [x] frontend/app/stores/auth.ts modified (sessionStorage.setItem present at line 61)
- [x] frontend/app/pages/auth/callback.vue modified (toast + redirect logic present)
- [x] frontend/i18n/locales/es-SV.json modified (welcomeToKovia + googleLinked present)
- [x] Commit 3d273a1 exists (Task 1)
- [x] No TypeScript errors in modified files
- [x] No unexpected file deletions in commit
