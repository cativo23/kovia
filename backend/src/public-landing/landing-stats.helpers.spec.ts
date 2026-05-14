import { describe, it, expect } from 'vitest';
import {
  computeLayoutVariant,
  DAY1_TO_YEAR2_THRESHOLD,
} from './landing-stats.helpers';

/**
 * Phase 15-04 unit spec for the Day-1↔Year-2 threshold (D-12 + RESEARCH
 * §Threshold evaluation, lines 594-605). Pure-function tests — no DB.
 *
 * The integration spec (`public-landing.service.integration.spec.ts`)
 * covers the DB-touching contracts (privacy projection, dossierComplete
 * filter, etc) and would be too expensive at 500 ADOPTADA seed rows for
 * a boundary sweep — hence this faster, focused helper spec.
 */
describe('computeLayoutVariant (D-12 threshold)', () => {
  it('returns day1 when totalAdoptions=0 and verifiedRefugiosCount=0', () => {
    expect(
      computeLayoutVariant({ totalAdoptions: 0, verifiedRefugiosCount: 0 }),
    ).toBe('day1');
  });

  it('returns day1 at boundary totalAdoptions=499, verifiedRefugiosCount=10', () => {
    expect(
      computeLayoutVariant({
        totalAdoptions: 499,
        verifiedRefugiosCount: 10,
      }),
    ).toBe('day1');
  });

  it('returns day1 at boundary totalAdoptions=500, verifiedRefugiosCount=9', () => {
    expect(
      computeLayoutVariant({ totalAdoptions: 500, verifiedRefugiosCount: 9 }),
    ).toBe('day1');
  });

  it('returns year2 at boundary totalAdoptions=500, verifiedRefugiosCount=10', () => {
    expect(
      computeLayoutVariant({
        totalAdoptions: 500,
        verifiedRefugiosCount: 10,
      }),
    ).toBe('year2');
  });

  it('returns year2 when both stats well above threshold', () => {
    expect(
      computeLayoutVariant({
        totalAdoptions: 1000,
        verifiedRefugiosCount: 50,
      }),
    ).toBe('year2');
  });

  it('exposes the canonical threshold constant for downstream readers', () => {
    expect(DAY1_TO_YEAR2_THRESHOLD).toEqual({
      totalAdoptions: 500,
      verifiedRefugiosCount: 10,
    });
  });
});
