/**
 * Mi Perfil page tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: PROFILE-02
 *   - Mi Perfil page with independent per-section editing, inline progress bar,
 *     and per-section completion badges.
 *
 * 16-UI-SPEC Mi Perfil layout:
 *   - 5 ProfileSection cards rendered in the correct order
 *   - ProfileCompletionBar shows correct pct (computed server-side from AdopterProfileService)
 *   - Per-section completion badge: verde (complete) / terracota-ámbar (incomplete)
 *   - completionPct 100 swaps bar to verde + label "Perfil completo"
 *
 * Analog spec: frontend/app/pages/animales/[id]/index.spec.ts (Phase 15)
 * Pattern: mountSuspended() from @nuxt/test-utils for SSR-aware mount;
 *          vi.mock for useApi and useI18n composables.
 *
 * Downstream plan: 16-07 (Mi Perfil page implementation) converts these it.todo
 * blocks into real assertions using mountSuspended + vi.mock.
 */

import { describe, it } from 'vitest';

describe('Mi Perfil page', () => {
  it.todo('[PROFILE-02] renders 5 ProfileSection cards in the correct order: datos básicos, hogar, estilo de vida, experiencia general, fotos del hogar');

  it.todo('[PROFILE-02] ProfileCompletionBar shows the correct completionPct percentage from the API response');

  it.todo('[PROFILE-02] section completion badge color is verde when section.complete is true');

  it.todo('[PROFILE-02] completionPct 100 swaps the completion bar color to verde and shows label "Perfil completo"');
});
