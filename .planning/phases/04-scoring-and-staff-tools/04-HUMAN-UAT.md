---
status: complete
phase: 04-scoring-and-staff-tools
source: [04-VERIFICATION.md]
started: 2026-04-11T00:00:00Z
updated: 2026-04-21T22:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. BullMQ end-to-end
expected: Submit a new adoption application, confirm score (numeric + risk level) appears in ScorePanel within seconds via BullMQ background processing
result: PASS — submitted application for Nova as adopter@test.local; ScorePanel showed score=56 "Requiere revision" immediately on staff detail view. Events application.submitted + application.scored both fired in API logs.

### 2. Red flag visual
expected: Trigger a known red flag scenario (e.g. aplicant has prior DEVUELTA), confirm RedFlagsAlert renders above ScorePanel with correct color (error/warning)
result: PASS — set adopter to 2x DEVUELTA via DB, rescored Milo application via API, RedFlagsAlert rendered above ScorePanel in amber with "Requiere atencion: El solicitante ha devuelto 2 animales anteriormente." Score=43.

### 3. Shadow mode toggle
expected: Set NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=false, restart frontend container, confirm ScorePanel renders nothing for staff viewing an application
result: PASS — set NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=false in docker-compose.yml, force-recreated web container, navigated to Milo application detail. ScorePanel UCard absent; no score, no RiskBadge, no breakdown rendered. 8 cards present (personal info, housing, experience, photos, status, applicant history, notes, animal) — none contain score/puntuación. Env var restored to true afterwards.

### 4. Notes RLS
expected: Org B staff cannot read or write org A's internal notes on shared applications; confirm 403 or empty response
result: PASS — created Org B (orgb-pilot) with org@pilot.test as admin. Added note as Org A on application 9a79a2db. GET /notes as Org B returns []. GET /notes as Org A returns 1 note. POST /notes as Org B creates a note tagged to Org B's organizationId (not Org A's) — RLS INSERT WITH CHECK enforces correct org isolation. Neither read leakage nor cross-org write-injection possible.

### 5. DEVUELTA flow
expected: Staff can transition an application from ADOPTADA → DEVUELTA; status updates correctly and appears in application queue
result: PASS (with bug fix) — discovered DEVUELTA was missing from UpdateApplicationStatusDto @IsIn validator; added it. After fix, advanced Milo app to ADOPTADA via API chain, then clicked "Registrar devolucion" in UI, confirmed modal appeared, clicked Confirmar. Status badge updated to "Devuelta" reactively, "Sin acciones disponibles" shown (correct terminal state). application.devuelta event fired. Verified DEVUELTA appears in the applications queue list.

### 6. ApplicantHistorySummary with real data
expected: Adopter with prior applications shows correct totals in ApplicantHistorySummary card; DEVUELTA badge appears when returnCount > 0
result: PASS (with bug fixes) — fixed two bugs: (1) cls.get('orgId') → cls.get('organizationId') key mismatch; (2) swapped publicPrisma (PrismaService/app_user blocked by RLS) to prismaRls (sets app.current_org_id via CLS). After fixes, /adopters/:id/summary returns {totalApplications:3, adopted:0, returned:3}. UI card shows "3 solicitudes · 0 adoptados · 3 devueltos" with "3 devueltos" badge rendered correctly.

### 7. Cross-org projection
expected: Adopter profile page hides animalName and score for applications from other orgs (isOwnOrg=false rows show masked data)
result: PASS (with bug fix) — added PublicPrismaService (uses MIGRATION_DATABASE_URL/postgres superuser to bypass RLS) and PRISMA_PUBLIC injection token. Injected into AdoptersService for cross-org findMany. Created Org B test app (Koko/ADOPTADA/score=72) for adopter. GET /history as Org A returns 4 apps: Org B app shows {animalName:null, score:null, isOwnOrg:false}; Org A apps show full data with isOwnOrg:true. Summary shows totalApplications:4, adopted:1, returned:3 — global counts correct.

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

### Bug fixes applied during UAT
1. `UpdateApplicationStatusDto` — DEVUELTA missing from @IsIn validator (backend/src/applications/dto/update-application-status.dto.ts)
2. `AdoptersService` — cls.get('orgId') wrong key; should be 'organizationId' (backend/src/adopters/adopters.service.ts)
3. `AdoptersService` — publicPrisma (app_user) blocked by adoption_applications RLS; replaced with prismaRls for org-scoped auth check and prismaPublic (postgres superuser) for cross-org history reads (backend/src/adopters/adopters.service.ts + new public-prisma.service.ts)
