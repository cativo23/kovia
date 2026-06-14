/**
 * Apply wizard (3-step) page tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: APPLY-01 + APPLY-05
 *   - APPLY-01: Apply flow consumes adopter profile snapshot + animal-specific extras;
 *     wizard step 1 shows profile data in read-only mode (no re-entry form).
 *   - APPLY-05: Criticality tags (CRÍTICA/IMPORTANTE/OPCIONAL) must NEVER appear in
 *     the rendered HTML of the ExtrasForm step — the DOM must not contain these strings.
 *
 * Analog spec: frontend/app/pages/animales/[id]/index.spec.ts (Phase 15)
 * Pattern: mountSuspended() from @nuxt/test-utils for SSR-aware mount;
 *          vi.mock for useApi and useI18n composables.
 *
 * Downstream plan: 16-08 (apply wizard restructure) converts these it.todo blocks
 * into real assertions using mountSuspended + vi.mock.
 */

import { describe, it } from 'vitest';

describe('Apply wizard (3-step)', () => {
  it.todo('[APPLY-01] redirects to /perfil when completionPct < 100 (apply blocked with "Completa tu perfil primero" message)');

  it.todo('[APPLY-01] Step 1 renders profile data in read-only mode — no edit buttons visible in the profile summary step');

  it.todo('[APPLY-05] Step 2 renders ExtrasForm questions but does not render criticality tags — rendered HTML must not contain the strings CRITICA, IMPORTANTE, or OPCIONAL');

  it.todo('[APPLY-01] Step 3 collects coAplicanteNombre (required), coAplicanteEmail (required), and coAplicantePhone (optional), then submits POST to /applications with extraAnswers + co-aplicante fields and navigates to /perfil/aplicaciones');
});
