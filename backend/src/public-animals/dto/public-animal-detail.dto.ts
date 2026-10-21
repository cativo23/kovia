import type { PublicAnimalDto } from './public-animal.dto';

/**
 * Public detail shape (Phase 15-03, D-04 + D-07).
 *
 * Extends the listing shape with the dossier fields that are detail-only
 * (D-04 — the listing card never shows full dossier text). MUST NOT
 * include `score`, `risks`, `flags`, `inconsistencyFlags`, or
 * `scoreDetails`.
 *
 * `dossierVersion` is exposed so the frontend can carry it forward into
 * the apply flow's `acknowledge-dossier` POST + sessionStorage rehydrate
 * cycle (D-11). The actual staleness ENFORCEMENT lives in `DossierAckGuard`
 * (Phase 16 binds it).
 */
export interface PublicAnimalDetailDto extends PublicAnimalDto {
  behavioralEvaluation: string | null;
  medicalHistory: string | null;
  monthlyCostUsdMin: number | null;
  monthlyCostUsdMax: number | null;
  knownTriggers: string[];
  shelterEntryDate: string | null;
  dossierVersion: number;
}
