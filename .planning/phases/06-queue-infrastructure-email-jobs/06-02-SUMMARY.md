---
phase: "06-queue-infrastructure-email-jobs"
plan: "02"
subsystem: "backend/mail"
tags: ["bullmq", "email", "queue", "dispatcher", "processor"]
dependency_graph:
  requires: ["06-01"]
  provides: ["MailDispatcher", "AuthMailProcessor", "TransactionalMailProcessor", "emails-auth queue", "emails-transactional queue"]
  affects: ["MailModule", "NotificationsModule (Plan 03)"]
tech_stack:
  added: []
  patterns: ["WorkerHost abstract base class", "named BullMQ queue injection", "two-queue email routing via decorator metadata"]
key_files:
  created:
    - backend/src/mail/mail-dispatcher.service.ts
  modified:
    - backend/src/mail/mail.processor.ts
    - backend/src/mail/mail.module.ts
decisions:
  - "MailService kept in providers/exports temporarily — AuthService still imports it; Plan 03 removes the dependency"
  - "BaseMailProcessor is non-exported abstract class — subclasses are the public API"
  - "onFailed logs job.data.to for debugging; acceptable since worker logs are internal only"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-22"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 06 Plan 02: Two-Queue Mail Infrastructure Summary

Two-queue BullMQ mail routing via `MailDispatcher` and `BaseMailProcessor` hierarchy replacing the single `email` queue.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create MailDispatcher and replace MailProcessor hierarchy | 25e7f7c | mail-dispatcher.service.ts (new), mail.processor.ts (replaced) |
| 2 | Update MailModule for two queues + MailDispatcher export | d0d6e00 | mail.module.ts |

## What Was Built

**MailDispatcher** (`mail-dispatcher.service.ts`): Injectable service that injects both `emails-auth` and `emails-transactional` BullMQ queues by name. The `send(mail: QueueableMail)` method calls `getQueueMetadata()` to read decorator metadata and routes the job to the correct queue with `attempts` and `backoff` from the Mailable's decorators.

**BaseMailProcessor** (abstract, non-exported): Extends `WorkerHost`, holds `MailerService` injection, implements `process()` calling `mailerService.sendMail()`, and `onFailed()` for error logging without crashing the worker.

**AuthMailProcessor**: `@Processor('emails-auth', { concurrency: 5 })` — thin subclass of BaseMailProcessor.

**TransactionalMailProcessor**: `@Processor('emails-transactional', { concurrency: 3 })` — thin subclass of BaseMailProcessor.

**MailModule**: Registers both named queues via `BullModule.registerQueue`, provides all four classes, exports both `MailService` (temporary) and `MailDispatcher`.

## Deviations from Plan

None — plan executed exactly as written. TypeScript compilation could not be verified locally (no `node_modules` in worktree; project uses Docker for dependency resolution), but file structure and imports match the established project patterns from `webhook.processor.ts` and Plan 01 types.

## Threat Model Coverage

| Threat | Disposition | Implementation |
|--------|-------------|----------------|
| T-06-02-01: Tampering via Redis job data | accept | Redis is internal; no external access |
| T-06-02-02: DoS from uncaught errors | mitigate | `attempts`/`backoff` in job options; `onFailed` logs without crashing |
| T-06-02-03: Email address in worker logs | accept | Worker logs internal only |

## Known Stubs

None.

## Self-Check: PASSED

- `backend/src/mail/mail-dispatcher.service.ts` exists: FOUND
- `backend/src/mail/mail.processor.ts` contains `AuthMailProcessor` and `TransactionalMailProcessor`: FOUND
- `backend/src/mail/mail.module.ts` registers both named queues: FOUND
- `backend/src/mail/mail.service.ts` still exists (not deleted): FOUND
- Commit 25e7f7c exists: FOUND
- Commit d0d6e00 exists: FOUND
