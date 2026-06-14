/**
 * Day-1 vs Year-2 landing-variant computation (Phase 15-04, D-12).
 *
 * Extracted from the service so the threshold logic can be unit-tested
 * without a live database. The integration spec then focuses on the DB-
 * touching contracts (privacy projection, dossierComplete filter, etc).
 *
 * Threshold per ROADMAP §Phase 15 + CONTEXT D-12:
 *   variant = (totalAdoptions >= 500 AND verifiedRefugiosCount >= 10)
 *             ? 'year2' : 'day1'
 *
 * Boundary cases — all asserted in `landing-stats.helpers.spec.ts`:
 *   (0,    0)  → day1
 *   (499, 10)  → day1   (totalAdoptions below threshold)
 *   (500,  9)  → day1   (verifiedRefugios below threshold)
 *   (500, 10)  → year2  (both meet threshold)
 *   (1000, 50) → year2  (both well above threshold)
 */

export const DAY1_TO_YEAR2_THRESHOLD = {
  totalAdoptions: 500,
  verifiedRefugiosCount: 10,
} as const;

export type LandingLayoutVariant = 'day1' | 'year2';

export function computeLayoutVariant(stats: {
  totalAdoptions: number;
  verifiedRefugiosCount: number;
}): LandingLayoutVariant {
  return stats.totalAdoptions >= DAY1_TO_YEAR2_THRESHOLD.totalAdoptions &&
    stats.verifiedRefugiosCount >=
      DAY1_TO_YEAR2_THRESHOLD.verifiedRefugiosCount
    ? 'year2'
    : 'day1';
}
