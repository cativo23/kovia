---
status: complete
phase: 03-adoption-applications
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-04-10T00:00:00Z
updated: 2026-04-11T06:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Auth gate modal on animal detail
expected: Open an animal's public detail page (/animales/[id]) while logged out. The "Aplicar" CTA should show. Clicking it opens a modal (not a redirect) with options to register or log in, keeping the animal page visible behind it.
result: pass

### 2. 4-state CTA button
expected: As a logged-in adopter with no prior application, open an available animal's detail page. The CTA should read "Aplicar" and link to the wizard. For an animal that is not AVAILABLE, the button should be disabled with a tooltip.
result: pass

### 3. Application wizard navigation
expected: Clicking "Aplicar" on an available animal routes to /animales/[id]/aplicar. The page shows a 5-step wizard (Personal → Vivienda → Estilo de vida → Fotos → Revisión). Clicking Next/Back navigates between steps without losing filled data.
result: pass

### 4. Draft auto-save and restore
expected: Fill in steps 1–2 of the wizard, then close the tab and reopen /animales/[id]/aplicar. The wizard should offer to restore your draft (or auto-restore it) with the previously entered values intact.
result: pass

### 5. Wizard submission
expected: Complete all 5 steps with valid data and click "Enviar solicitud". The application is submitted and the page shows a success state (not an error). The back-to-animal link or similar confirmation is visible.
result: pass

### 6. Existing application CTA state
expected: After submitting an application, go back to the same animal's detail page. The CTA should now read "Ver solicitud" (not "Aplicar"), linking to the adopter's application detail.
result: pass

### 7. Adopter application history
expected: Navigate to /perfil/aplicaciones. The page lists your submitted applications with animal name, submission date, and a status badge (e.g., ENVIADA in blue). Empty state shows a clipboard icon if no applications exist.
result: pass

### 8. Adopter application detail and withdraw
expected: Click an application in /perfil/aplicaciones. The detail page shows all submitted info (personal, housing, lifestyle, photos) plus the current status badge. A "Retirar solicitud" button is visible (when status allows). Clicking it shows a confirmation modal before actually withdrawing.
result: pass

### 9. Staff queue — Aplicaciones nav and list
expected: Log in as org staff and open the org dashboard. The left nav shows an "Aplicaciones" (or "Solicitudes") link. Clicking it shows a table of all applications with columns: adopter name, animal (thumbnail + name), date, status badge, and a "Ver detalle" button.
result: pass

### 10. Staff queue — filters
expected: On the staff applications queue, use the status dropdown to filter by "ENVIADA". The table updates to show only applications in that status. Clearing the filter restores all results.
result: pass

### 11. Staff application detail
expected: Click "Ver detalle" on any application row. The detail page shows the adopter's full submission (personal info, housing, lifestyle, photos) plus a right-side panel with the current status badge and available transition buttons.
result: pass

### 12. Staff status transition with modal
expected: On the staff detail page, click one of the transition buttons (e.g., "Marcar en revisión"). A confirmation modal appears. Confirming it updates the status badge reactively on the page (no full page reload) and shows a success toast.
result: pass

## Summary

total: 13
passed: 12
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Animal listings page at /animales shows available animals"
  status: failed
  reason: "Page loads with header/footer but no animal cards render. API at /api/v1/animals returns 4 animals correctly. Proxy works. Bug is in frontend rendering — possibly AnimalFilters component or useFetch hydration issue."
  severity: major
  test: 0
  artifacts: []
  missing: []
