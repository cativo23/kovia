/**
 * Co-aplicante confirmation page tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: APPLY-06
 *   - Co-aplicante receives confirmation link via stubbed channel (email, WhatsApp future).
 *   - Public confirmation page /confirmar-coapplicante/{token} — no login required.
 *   - 4-state machine: loading → expired | invalid | valid → confirmed.
 *
 * Analog spec: frontend/app/pages/team/accept/[token].vue
 * (4-state machine analog: loading/expired/invalid/confirmed)
 *
 * Downstream plan: 16-08 (co-aplicante confirmation page implementation) converts
 * these it.todo blocks into real assertions using mountSuspended + vi.mock.
 */

import { describe, expect, it } from 'vitest';

describe('Co-aplicante confirmation page', () => {
  it.todo('[APPLY-06] shows loading state on initial mount while the token is being validated');

  it.todo('[APPLY-06] expired token shows an expired UAlert with no CTA — token expired after 72h shows "Contactar al refugio" nudge');

  it.todo('[APPLY-06] invalid token shows an invalid error card with no CTA');

  it.todo('[APPLY-06] valid token shows the animal name + adopter first name + single "Confirmo mi participación en este hogar" CTA');

  it.todo('[APPLY-06] clicking the CTA fires a POST to the confirmation endpoint and shows a success card on response');

  // Regression lock: this test MUST fail until Plan 16-08 implements the confirmation page.
  // It is intentionally failing to turn CI red for Wave 0.
  it('placeholder until implemented', () => {
    expect.fail('Phase 16 implementation pending — APPLY-06 confirmation page');
  });
});
