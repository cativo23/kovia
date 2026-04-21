---
phase: 4
slug: scoring-and-staff-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (BE unit), vitest (FE component via @nuxt/test-utils) |
| **Config file** | `backend/vitest.config.ts`, `frontend/vitest.config.ts` |
| **Quick run command** | `docker compose exec backend npx vitest run --reporter=verbose src/scoring/` |
| **Full suite command** | `docker compose exec backend npx vitest run && docker compose exec frontend npx vitest run` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `docker compose exec backend npx vitest run --reporter=verbose src/scoring/`
- **After every plan wave:** Run `docker compose exec backend npx vitest run && docker compose exec frontend npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | SCOR-01,02,05 | — | Engine puro sin DB calls | unit | `docker compose exec backend npx vitest run src/scoring/engine.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | SCOR-04 | — | Red flags generados correctamente | unit | `docker compose exec backend npx vitest run src/scoring/engine.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | SCOR-01 | — | BullMQ job encolado tras submit | unit | `docker compose exec backend npx vitest run src/applications/applications.service.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | HIST-02,DASH-03 | — | Transicion ADOPTADA->DEVUELTA valida solo staff | unit | `docker compose exec backend npx vitest run src/applications/applications.service.spec.ts` | ❌ W0 | ⬜ pending |
| 4-01-05 | 01 | 1 | SCOR-01 | — | Endpoint rescore solo ORG_ADMIN | unit | `docker compose exec backend npx vitest run src/applications/applications.controller.spec.ts` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | SCOR-02,03 | — | ScorePanel renderiza score y breakdown | component | `docker compose exec frontend npx vitest run components/ScorePanel.spec.ts` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | SCOR-04 | — | RedFlagsAlert siempre encima del score panel | component | `docker compose exec frontend npx vitest run components/RedFlagsAlert.spec.ts` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | DASH-04 | — | InternalNotes solo append, no edicion | component | `docker compose exec frontend npx vitest run components/InternalNotes.spec.ts` | ❌ W0 | ⬜ pending |
| 4-02-04 | 02 | 2 | DASH-04 | — | Endpoint notas scoped a organizationId (RLS) | unit | `docker compose exec backend npx vitest run src/applications/notes.service.spec.ts` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 3 | HIST-01,02,03 | — | Endpoint history retorna solo outcome summaries cross-org | unit | `docker compose exec backend npx vitest run src/adopters/adopters.service.spec.ts` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 3 | DASH-05 | — | AdopterHistoryPage renderiza summary card + historial | component | `docker compose exec frontend npx vitest run pages/adoptantes.spec.ts` | ❌ W0 | ⬜ pending |
| 4-03-03 | 03 | 3 | HIST-03,SCOR-04 | — | Red flag DEVUELTA detectado en scoring engine | unit | `docker compose exec backend npx vitest run src/scoring/engine.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/scoring/engine.spec.ts` — stubs para SCOR-01, SCOR-02, SCOR-04, SCOR-05
- [ ] `backend/src/applications/applications.service.spec.ts` — stubs para BullMQ job y DEVUELTA transition
- [ ] `backend/src/applications/applications.controller.spec.ts` — stub para rescore endpoint
- [ ] `backend/src/applications/notes.service.spec.ts` — stubs para DASH-04 RLS
- [ ] `backend/src/adopters/adopters.service.spec.ts` — stubs para HIST-01, HIST-02, HIST-03
- [ ] `frontend/components/ScorePanel.spec.ts` — stubs para SCOR-02, SCOR-03
- [ ] `frontend/components/RedFlagsAlert.spec.ts` — stubs para SCOR-04
- [ ] `frontend/components/InternalNotes.spec.ts` — stubs para DASH-04
- [ ] `frontend/pages/adoptantes.spec.ts` — stubs para DASH-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shadow mode oculta score UI cuando `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=false` | SCOR-01 | Requiere reinicio de container con env var distinta | Setear var a false, restart frontend container, verificar que ScorePanel no renderiza nada |
| Score en tabla index.vue se actualiza tras procesamiento BullMQ | SCOR-01 | Timing async; requiere observar UI tras submit | Enviar solicitud, esperar ~2s, refrescar lista, verificar columna score muestra valor |
| Staff puede aprobar solicitante con alto riesgo (score bajo) | SCOR-06 | Flujo E2E de UI | Aprobar solicitud con riskLevel=alto_riesgo, verificar status cambia sin bloqueo |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
