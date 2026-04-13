---
status: partial
phase: 04-scoring-and-staff-tools
source: [04-VERIFICATION.md]
started: 2026-04-11T00:00:00Z
updated: 2026-04-11T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. BullMQ end-to-end
expected: Submit a new adoption application, confirm score (numeric + risk level) appears in ScorePanel within seconds via BullMQ background processing
result: [pending]

### 2. Red flag visual
expected: Trigger a known red flag scenario (e.g. aplicant has prior DEVUELTA), confirm RedFlagsAlert renders above ScorePanel with correct color (error/warning)
result: [pending]

### 3. Shadow mode toggle
expected: Set NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=false, restart frontend container, confirm ScorePanel renders nothing for staff viewing an application
result: [pending]

### 4. Notes RLS
expected: Org B staff cannot read or write org A's internal notes on shared applications; confirm 403 or empty response
result: [pending]

### 5. DEVUELTA flow
expected: Staff can transition an application from ADOPTADA → DEVUELTA; status updates correctly and appears in application queue
result: [pending]

### 6. ApplicantHistorySummary with real data
expected: Adopter with prior applications shows correct totals in ApplicantHistorySummary card; DEVUELTA badge appears when returnCount > 0
result: [pending]

### 7. Cross-org projection
expected: Adopter profile page hides animalName and score for applications from other orgs (isOwnOrg=false rows show masked data)
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
