import type { Guidance } from '../guidance';

/**
 * Public listing item shape (Phase 15-03, D-04 + D-16 + T-15-01).
 *
 * LISTING shape. Per D-04, MUST NOT include `score`, `risks`, `flags`,
 * `inconsistencyFlags`, or `scoreDetails`. Dossier fields (e.g.
 * `behavioralEvaluation`, `medicalHistory`, `monthlyCostUsdMin/Max`,
 * `knownTriggers`, `shelterEntryDate`) are detail-only — see
 * `PublicAnimalDetailDto`.
 *
 * The integration spec asserts no listing item ever exposes any of the
 * 5 forbidden keys, catching regressions if a future PR accidentally
 * spreads the full `animal` row into the response.
 */
export interface PublicAnimalDto {
  id: string;
  name: string;
  breed: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN' | null;
  ageMonths: number | null;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE' | null;
  energyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  guidance: Guidance;
  species: { id: string; name: string; slug: string };
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  photos: {
    id: string;
    url: string;
    caption: string | null;
    position: number;
  }[];
  createdAt: string;
}

export interface PaginatedPublicAnimalList {
  data: PublicAnimalDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
