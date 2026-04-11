---
phase: 3
slug: adoption-applications
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (backend) + Vitest + happy-dom (frontend) |
| **Config file** | `backend/vitest.config.ts` |
| **Quick run command** | `docker compose exec api npx vitest run --reporter=verbose src/applications` |
| **Full suite command** | `docker compose exec api npx vitest run` |
| **Frontend typecheck** | `docker compose exec -T web npx nuxi typecheck` |
| **Estimated runtime** | ~30 seconds (backend tests), ~60 seconds (typecheck) |

---

## Sampling Rate

- **After every task commit:** Run `docker compose exec api npx vitest run --reporter=verbose src/applications`
- **After every plan wave:** Run `docker compose exec api npx vitest run`
- **Frontend plans (02, 03):** Run `docker compose exec -T web npx nuxi typecheck` after each task
- **Before `/gsd-verify-work`:** Full suite must be green + typecheck clean
- **Max feedback latency:** 30 seconds (backend), 60 seconds (typecheck)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 03-01-01 | 01 | 1 | ADOP-01 | T-03-01 | DTO validation on input | unit | `docker compose exec -T api npx vitest run src/applications/applications.service.spec.ts -t "create"` | ⬜ pending |
| 03-01-02 | 01 | 1 | ADOP-05 | T-03-06 | State machine rejects invalid transitions | unit | `docker compose exec -T api npx vitest run src/applications/applications.service.spec.ts -t "status"` | ⬜ pending |
| 03-02-01 | 02 | 2 | ADOP-02, ADOP-03 | T-03-08 | Zod validates form steps client-side | typecheck | `docker compose exec -T web npx nuxi typecheck 2>&1 \| tail -20` | ⬜ pending |
| 03-02-02 | 02 | 2 | ADOP-04, ADOP-01 | T-03-09 | Auth middleware on wizard, ownership check on detail | typecheck | `docker compose exec -T web npx nuxi typecheck 2>&1 \| tail -20` | ⬜ pending |
| 03-03-01 | 03 | 2 | ADOP-06 | T-03-12 | RLS scoping via backend | typecheck | `docker compose exec -T web npx nuxi typecheck 2>&1 \| tail -20` | ⬜ pending |
| 03-03-02 | 03 | 2 | ADOP-05 | T-03-13 | Transition map mirrors backend | typecheck | `docker compose exec -T web npx nuxi typecheck 2>&1 \| tail -20` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Backend spec stubs are created inline by Plan 01 Task 2 (TDD plan — `tdd="true"` creates `applications.service.spec.ts` as part of the RED-GREEN cycle). No separate Wave 0 task needed for backend.

Frontend components (Plans 02, 03) are verified via `nuxi typecheck` which performs full Vue SFC compilation and TypeScript checking. This catches import errors, prop type mismatches, missing exports, and template binding issues — providing stronger sampling than stub-only spec files. No separate frontend spec stubs needed as Wave 0 artifacts.

- [x] `backend/src/applications/applications.service.spec.ts` — created by 03-01 Task 2 (TDD inline)
- [x] Frontend verification — `nuxi typecheck` covers compilation correctness for all Vue SFC files

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-step form UX flow end-to-end | ADOP-01 | Requires browser interaction | Log in as adopter, navigate to animal detail, complete all 5 steps, submit |
| Environment photo upload | ADOP-02 | Requires file system + MinIO | Upload 2+ photos during application, confirm MinIO bucket contains `applications/` prefixed keys |
| localStorage draft persistence | ADOP-04 | Requires browser localStorage | Start application, advance 2 steps, close tab, reopen — draft alert should appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (backend TDD inline, frontend via typecheck)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
