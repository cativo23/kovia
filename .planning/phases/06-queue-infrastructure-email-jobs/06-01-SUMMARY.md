---
phase: "06-queue-infrastructure-email-jobs"
plan: "01"
subsystem: "backend/mail/mailables"
tags: ["mailables", "queue", "decorators", "tdd", "reflect-metadata"]
dependency_graph:
  requires: []
  provides:
    - "QueueableMail base class"
    - "Queueable marker interface"
    - "@Queue/@Tries/@Backoff class decorators"
    - "getQueueMetadata() metadata reader"
    - "VerificationMail"
    - "ResetPasswordMail"
    - "OrgInviteMail"
    - "WelcomeMail"
    - "ApplicationSubmittedMail"
    - "StatusChangedMail"
  affects: []
tech_stack:
  added: []
  patterns:
    - "Class decorator pattern with reflect-metadata for BullMQ queue config"
    - "Typed constructor context to prevent Prisma model serialization into job payloads"
key_files:
  created:
    - "backend/src/mail/mailables/queueable.interface.ts"
    - "backend/src/mail/mailables/decorators.ts"
    - "backend/src/mail/mailables/queueable-mail.ts"
    - "backend/src/mail/mailables/metadata-reader.ts"
    - "backend/src/mail/mailables/verification.mail.ts"
    - "backend/src/mail/mailables/reset-password.mail.ts"
    - "backend/src/mail/mailables/org-invite.mail.ts"
    - "backend/src/mail/mailables/welcome.mail.ts"
    - "backend/src/mail/mailables/application-submitted.mail.ts"
    - "backend/src/mail/mailables/status-changed.mail.ts"
    - "backend/src/mail/mailables/mailables.spec.ts"
    - "backend/src/mail/mailables/mailable-subclasses.spec.ts"
  modified: []
decisions:
  - "Used reflect-metadata (transitive dep of @nestjs/common, imported in main.ts) — no new package required"
  - "QueueableMail is concrete not abstract — matches Laravel Mailable pattern and allows plain instances for default metadata tests"
  - "Typed context in each subclass constructor prevents Prisma model leakage into BullMQ job payloads at compile time (T-06-01-01)"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-22"
  tasks_completed: 2
  files_created: 12
---

# Phase 06 Plan 01: Mailable Type System Summary

Three-layer Mailable architecture for Phase 6 queue infrastructure: marker interface, concrete base class with @Queue/@Tries/@Backoff decorator metadata, and 6 typed subclasses covering all email notification types.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Mailable foundation files | de57a6b | queueable.interface.ts, decorators.ts, queueable-mail.ts, metadata-reader.ts |
| 2 | Create all 6 Mailable subclasses | 85de988 | verification.mail.ts, reset-password.mail.ts, org-invite.mail.ts, welcome.mail.ts, application-submitted.mail.ts, status-changed.mail.ts |

TDD commits:
- 22d5f9f — test(06-01): foundation RED
- de57a6b — feat(06-01): foundation GREEN
- 98dcda3 — test(06-01): subclasses RED
- 85de988 — feat(06-01): subclasses GREEN

## Test Results

42 tests passing across 2 spec files:
- `mailables.spec.ts` — 8 tests for getQueueMetadata defaults and decorator round-trips
- `mailable-subclasses.spec.ts` — 34 tests covering each subclass (to, template, context shape, queue, attempts, backoff.delay)

## Verification

```
ls backend/src/mail/mailables/*.ts | wc -l  -> 12 (10 impl + 2 spec)
grep "extends QueueableMail" ...            -> 6 production subclasses
grep "@Queue('emails-auth')"  ...           -> 4 auth mailables
grep "@Queue('emails-transactional')" ...   -> 2 transactional mailables
```

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-06-01-01 (Info Disclosure) | Each subclass constructor takes a typed context (e.g., `{ firstName: string; verificationUrl: string }`) — TypeScript rejects Prisma model instances at compile time | Applied |

## Known Stubs

None — all 6 Mailable subclasses are fully wired with correct decorator metadata.

## TDD Gate Compliance

- RED gate: commits 22d5f9f (foundation) and 98dcda3 (subclasses) — confirmed failing before implementation
- GREEN gate: commits de57a6b and 85de988 — all 42 tests pass

## Self-Check: PASSED

Files created:
- backend/src/mail/mailables/queueable.interface.ts ✓
- backend/src/mail/mailables/decorators.ts ✓
- backend/src/mail/mailables/queueable-mail.ts ✓
- backend/src/mail/mailables/metadata-reader.ts ✓
- backend/src/mail/mailables/verification.mail.ts ✓
- backend/src/mail/mailables/reset-password.mail.ts ✓
- backend/src/mail/mailables/org-invite.mail.ts ✓
- backend/src/mail/mailables/welcome.mail.ts ✓
- backend/src/mail/mailables/application-submitted.mail.ts ✓
- backend/src/mail/mailables/status-changed.mail.ts ✓

Commits verified:
- 22d5f9f ✓
- de57a6b ✓
- 98dcda3 ✓
- 85de988 ✓
