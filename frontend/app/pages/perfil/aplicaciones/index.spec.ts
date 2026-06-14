/**
 * Mis Aplicaciones page tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: APPLY-07 + APPLY-06
 *   - APPLY-07: Mis Aplicaciones table view per adopter (animal · refugio · state · date per row).
 *     Each row shows a coAplicanteConfirmed badge: ámbar (pending) or verde (confirmed).
 *   - APPLY-06: Co-aplicante confirmation banner appears on Mis Aplicaciones when any
 *     active application has coAplicanteConfirmed=false, showing the confirmation link status.
 *
 * Analog spec: frontend/app/pages/animales/[id]/index.spec.ts (Phase 15)
 * Pattern: mountSuspended() from @nuxt/test-utils for SSR-aware mount;
 *          vi.mock for useApi and useI18n composables.
 *
 * Downstream plan: 16-08 (Mis Aplicaciones enhancement) converts these it.todo blocks
 * into real assertions using mountSuspended + vi.mock.
 */

import { describe, it } from 'vitest';

describe('Mis Aplicaciones', () => {
  it.todo('[APPLY-07] each row shows status badge + coAplicanteConfirmed pill — ámbar "Esperando confirmación del hogar" when false, verde "Hogar confirmado" when true');

  it.todo('[APPLY-06] confirmation banner appears at the top of the page when any active application has coAplicanteConfirmed=false');

  it.todo('[APPLY-07] historical rows without co-aplicante fields (pre-migration applications) render no coAplicante pill');
});
