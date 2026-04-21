---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (SWC-powered for NestJS) + Playwright (E2E) |
| **Config file (BE)** | backend/vitest.config.ts |
| **Config file (BE E2E)** | backend/vitest.config.e2e.ts |
| **Config file (FE)** | frontend/vitest.config.ts |
| **Quick run command (BE)** | `docker compose exec api npx vitest run --reporter=verbose` |
| **Quick run command (FE)** | `docker compose exec web npx vitest run --reporter=verbose` |
| **Full suite command** | `docker compose exec api npx vitest run --coverage && docker compose exec web npx vitest run --coverage` |
| **E2E command** | `docker compose exec web npx playwright test` |
| **Estimated runtime** | ~30 seconds (unit), ~60 seconds (full + E2E) |

---

## Sampling Rate

- **After every task commit:** Run quick command for affected service (BE or FE)
- **After every plan wave:** Run full suite command with coverage
- **Before `/gsd:verify-work`:** Full suite must be green + 80%+ coverage
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFR-01 | smoke | `docker compose up -d && docker compose ps` | Wave 0 | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-01 | unit + integration | `docker compose exec api npx vitest run src/auth/auth.service.spec.ts -t "register"` | Wave 0 | ⬜ pending |
| 01-02-02 | 02 | 1 | AUTH-02 | unit + integration | `docker compose exec api npx vitest run src/auth/auth.service.spec.ts -t "verify"` | Wave 0 | ⬜ pending |
| 01-02-03 | 02 | 1 | AUTH-03 | unit + integration | `docker compose exec api npx vitest run src/auth/auth.service.spec.ts -t "reset"` | Wave 0 | ⬜ pending |
| 01-02-04 | 02 | 2 | AUTH-04 | unit + integration | `docker compose exec api npx vitest run src/auth/auth.service.spec.ts -t "refresh"` | Wave 0 | ⬜ pending |
| 01-02-05 | 02 | 1 | AUTH-05 | unit + integration | `docker compose exec api npx vitest run src/auth/strategies/google.strategy.spec.ts` | Wave 0 | ⬜ pending |
| 01-03-01 | 03 | 2 | ORG-01 | unit | `docker compose exec api npx vitest run src/organizations/organizations.service.spec.ts` | Wave 0 | ⬜ pending |
| 01-03-02 | 03 | 2 | ORG-02 | unit + integration | `docker compose exec api npx vitest run src/admin/admin.service.spec.ts -t "invite"` | Wave 0 | ⬜ pending |
| 01-03-03 | 03 | 2 | ORG-03 | unit | `docker compose exec api npx vitest run src/organizations/organizations.service.spec.ts -t "admin"` | Wave 0 | ⬜ pending |
| 01-03-04 | 03 | 2 | ORG-04 | integration | `docker compose exec api npx vitest run src/prisma/rls.integration.spec.ts` | Wave 0 | ⬜ pending |
| 01-03-05 | 03 | 2 | INFR-02 | E2E | `docker compose exec web npx playwright test --grep "i18n"` | Wave 0 | ⬜ pending |
| 01-03-06 | 03 | 2 | INFR-03 | integration | `docker compose exec api npx vitest run src/prisma/rls.integration.spec.ts` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/vitest.config.ts` — Vitest configuration with SWC plugin
- [ ] `backend/vitest.config.e2e.ts` — E2E test configuration
- [ ] `frontend/vitest.config.ts` — Frontend Vitest configuration
- [ ] `backend/src/auth/auth.service.spec.ts` — Auth service unit tests (stubs)
- [ ] `backend/src/prisma/rls.integration.spec.ts` — RLS isolation integration tests (stubs)
- [ ] `backend/test/e2e/auth.e2e.spec.ts` — Backend auth E2E tests (stubs)
- [ ] `frontend/tests/e2e/auth.spec.ts` — Playwright auth flow E2E tests (stubs)
- [ ] Framework install: All via Docker (no host deps)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Docker Compose starts all services | INFR-01 | Requires running containers | Run `docker compose up -d`, verify all services healthy with `docker compose ps` |
| Mailpit catches verification emails | AUTH-02 | Requires visual email inspection | Sign up, check Mailpit UI at localhost:8025 for verification email |
| Google OAuth redirect works | AUTH-05 | Requires browser interaction | Click Google OAuth button, complete Google login flow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
