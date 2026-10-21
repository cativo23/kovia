/**
 * Shared types for the public-facing adopter surface (Phase 15-05, D-04 + D-16).
 *
 * Mirrors `backend/src/public-animals/dto/public-animal.dto.ts` —
 * the dedicated public DTO that structurally lacks `score`, `risks`,
 * `flags`, `inconsistencyFlags`, `scoreDetails` (T-15-01 / PUBLIC-03).
 *
 * The shape returned by:
 *   - GET /public/animals       → AnimalPublic[]
 *   - GET /public/animals/:id   → AnimalPublicDetail (extends AnimalPublic)
 *
 * Consumers in Phase 15-05:
 *   - frontend/app/components/animals/AnimalCard.vue
 *   - frontend/app/components/animals/AnimalGrid.vue
 *   - frontend/app/components/animals/GuidancePill.vue
 *   - frontend/app/pages/animales/index.vue
 *
 * Consumers in Phase 15-06 (downstream):
 *   - frontend/app/pages/animales/[id]/index.vue (dossier page) re-imports
 *     `AnimalPublicDetail` for the long-form layout.
 */

/**
 * Categorical pill color. Server-resolved from `Animal.adoptionCategory` per
 * the D-02 mapping. Frontend never recomputes this — the API is authoritative
 * (PUBLIC-03).
 */
export type GuidanceColor = 'verde' | 'ambar' | 'rojo';

/**
 * Server-computed guidance object on every public animal item.
 * - `label` is the ready-to-render Spanish string (verbatim).
 * - `copy` is ONLY present when `color === 'rojo'` — verbatim PUBLIC-06
 *   medical copy (locked-copy-consistency boundary spec asserts this matches
 *   the backend constant `LOCKED_MEDICAL_COPY`).
 */
export interface Guidance {
  color: GuidanceColor;
  label: string;
  copy?: string;
}

/**
 * Photo subshape used by listing + detail.
 */
export interface AnimalPhoto {
  id: string;
  url: string;
  caption: string | null;
  position: number;
}

/**
 * Public LISTING shape — GET /public/animals.
 *
 * Structural absence of `score`, `risks`, `flags`, `inconsistencyFlags`,
 * `scoreDetails` is the T-15-01 mitigation (see backend public DTO doc).
 */
export interface AnimalPublic {
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
  photos: AnimalPhoto[];
  createdAt: string;
}

/**
 * Public DETAIL shape — GET /public/animals/:id. Extends listing with the
 * dossier fields (D-05) plus `dossierVersion` for the ack flow (D-09).
 *
 * Consumed by Phase 15-06 (dossier long-form page).
 */
export interface AnimalPublicDetail extends AnimalPublic {
  behavioralEvaluation: string;
  medicalHistory: string;
  monthlyCostUsdMin: number;
  monthlyCostUsdMax: number | null;
  knownTriggers: string[];
  shelterEntryDate: string;
  dossierVersion: number;
}

/**
 * Paginated listing envelope returned by GET /public/animals.
 */
export interface PaginatedAnimalPublicList {
  data: AnimalPublic[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
