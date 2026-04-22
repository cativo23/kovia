---
phase: "06-queue-infrastructure-email-jobs"
plan: "03"
subsystem: "backend/auth, backend/notifications, backend/mail"
tags: ["mailables", "queue", "dispatcher", "handlebars", "integration"]
dependency_graph:
  requires:
    - "06-01 (QueueableMail subclasses)"
    - "06-02 (MailDispatcher, two-queue processors)"
  provides:
    - "AuthService using MailDispatcher for all email sends"
    - "WelcomeMail trigger on email verification"
    - "ApplicationSubmittedMail and StatusChangedMail dispatches in EventsService"
    - "Three new Spanish Handlebars templates"
  affects:
    - "AuthModule (no MailService dependency)"
    - "NotificationsModule (imports MailModule)"
    - "MailModule (MailService fully removed)"
tech_stack:
  added: []
  patterns:
    - "Post-transaction email dispatch (D-11 convention)"
    - "Typed Mailable constructor calls at call sites"
    - "fetchApplicationContext extended with user and organization includes"
key_files:
  created:
    - "backend/src/mail/templates/welcome.hbs"
    - "backend/src/mail/templates/application-submitted.hbs"
    - "backend/src/mail/templates/status-changed.hbs"
  modified:
    - "backend/src/auth/auth.service.ts"
    - "backend/src/notifications/events.service.ts"
    - "backend/src/notifications/notifications.module.ts"
    - "backend/src/mail/mail.module.ts"
  deleted:
    - "backend/src/mail/mail.service.ts"
decisions:
  - "WelcomeMail dispatch placed after prisma.user.update() and before generateTokens() in verifyEmail() — D-11 compliant"
  - "Email dispatches in EventsService placed after emitAndEnqueue() returns, not inside it — emitAndEnqueue() contains the $transaction boundary"
  - "fetchApplicationContext() extended with user and organization selects to provide adopterEmail, adopterFirstName, orgName without a separate query"
  - "MailService deleted (not just removed from exports) — all callers migrated in this plan"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 4
  files_deleted: 1
---

# Phase 06 Plan 03: Email Integration Wiring Summary

Final integration step connecting all 6 typed Mailable classes to their trigger points: AuthService migrated from MailService to MailDispatcher, WelcomeMail added on email verification, ApplicationSubmittedMail and StatusChangedMail wired in EventsService, three Spanish Handlebars templates created, and MailService deleted as dead code.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate AuthService to MailDispatcher + WelcomeMail trigger + 3 HBS templates | 5202433 | auth.service.ts, welcome.hbs, application-submitted.hbs, status-changed.hbs |
| 2 | Wire MailDispatcher into EventsService, import MailModule, remove MailService | b753054 | events.service.ts, notifications.module.ts, mail.module.ts, (deleted) mail.service.ts |

## What Was Built

**AuthService migration:** Replaced `MailService` injection with `MailDispatcher`. All 4 email call sites now use typed Mailable constructors:
- `register()` → `new VerificationMail(dto.email, { firstName, verificationUrl })`
- `verifyEmail()` → `new WelcomeMail(user.email, { firstName })` (new trigger, D-06)
- `requestPasswordReset()` → `new ResetPasswordMail(email, { firstName, resetUrl })`
- `resendVerification()` → `new VerificationMail(email, { firstName, verificationUrl })`

**EventsService wiring:** `MailDispatcher` injected via constructor. `fetchApplicationContext()` extended to include `user` and `organization` relations, returning `adopterEmail`, `adopterFirstName`, and `orgName`. Email dispatches added after `emitAndEnqueue()` returns (post-transaction, D-11):
- `emitApplicationSubmitted()` → `new ApplicationSubmittedMail(...)`
- `emitApplicationStatusChanged()` → `new StatusChangedMail(...)`

**NotificationsModule:** `MailModule` added to imports array so `EventsService` can resolve `MailDispatcher`.

**MailModule cleanup:** `MailService` removed from providers and exports. `mail.service.ts` deleted.

**Three Handlebars templates** in Spanish, following the established table-based inline-CSS pattern from `verification.hbs`:
- `welcome.hbs` — post-verification welcome, context: `{{firstName}}`
- `application-submitted.hbs` — adoption request confirmation, context: `{{firstName}}`, `{{animalName}}`, `{{orgName}}`
- `status-changed.hbs` — status update notification, context: `{{firstName}}`, `{{animalName}}`, `{{newStatus}}`

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat | Disposition | Implementation |
|--------|-------------|----------------|
| T-06-03-01: WelcomeMail spoofing | accept | Fires only after `jwtService.verifyAsync()` succeeds with email-verification token type |
| T-06-03-02: DoS from invalid adopterEmail | accept | Empty string falls through to BullMQ retry via `onFailed`; no crash |
| T-06-03-03: Email sent without DB record | accept | Convention D-11 + BullMQ retry sufficient at current scale |

## Known Stubs

None — all 6 Mailable classes are fully wired to their trigger points with real data.

## Verification

```
grep -c "new VerificationMail" backend/src/auth/auth.service.ts   -> 2 ✓
grep -c "new WelcomeMail" backend/src/auth/auth.service.ts        -> 1 ✓
grep "MailService" backend/src/auth/auth.service.ts               -> (no match) ✓
ls backend/src/mail/templates/                                     -> 6 .hbs files ✓
ls backend/src/mail/mail.service.ts 2>/dev/null                   -> (empty) ✓
grep "MailModule" backend/src/notifications/notifications.module.ts -> match ✓
```

## Self-Check: PASSED

Files created:
- backend/src/mail/templates/welcome.hbs: FOUND
- backend/src/mail/templates/application-submitted.hbs: FOUND
- backend/src/mail/templates/status-changed.hbs: FOUND

Files modified:
- backend/src/auth/auth.service.ts: FOUND
- backend/src/notifications/events.service.ts: FOUND
- backend/src/notifications/notifications.module.ts: FOUND
- backend/src/mail/mail.module.ts: FOUND

Files deleted:
- backend/src/mail/mail.service.ts: CONFIRMED DELETED

Commits verified:
- 5202433 (Task 1): FOUND
- b753054 (Task 2): FOUND

TypeScript compilation: Cannot verify locally (no node_modules in worktree; project uses Docker). File structure and import paths follow established project patterns verified against existing files.
