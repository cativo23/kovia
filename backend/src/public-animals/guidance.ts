/**
 * Server-side guidance computation (Phase 15-03, D-02 + D-04).
 *
 * Single source of truth for the public-facing `verde / ámbar / rojo`
 * adoption pill rendered on `/animales` and `/animales/:id`. The pill
 * color, label, and (for `rojo`) the LOCKED PUBLIC-06 medical copy are
 * derived from the canonical `AdoptionCategory` enum value on the animal.
 *
 * **Never** overridable by refugio admins. Refugios fill the dossier and
 * choose a category; the public surface receives the mapped guidance
 * server-side so the locked copy can never drift from the i18n value.
 *
 * The byte-equality contract between this constant and the i18n key
 * `animals.guidance.rojo.medicalCopy` is enforced by
 * `backend/test/locked-copy-consistency.spec.ts` (mitigates T-15-05).
 */

export type AdoptionCategory =
  | 'SALUDABLE_ADULTO'
  | 'SENIOR'
  | 'MEDICO_CRONICO'
  | 'REACTIVO'
  | 'ESPECIAL';

export type GuidanceColor = 'verde' | 'ambar' | 'rojo';

export interface Guidance {
  color: GuidanceColor;
  label: string;
  /** Only present when `color === 'rojo'` — verbatim LOCKED PUBLIC-06 string. */
  copy?: string;
}

/**
 * LOCKED PUBLIC-06 — verbatim medical-copy string for the two `rojo`
 * adoption categories (MEDICO_CRONICO + ESPECIAL).
 *
 * MUST byte-equal `frontend/i18n/locales/es-SV.json` →
 * `animals.guidance.rojo.medicalCopy`. The locked-copy-consistency spec
 * fails the build if either side drifts.
 */
export const LOCKED_MEDICAL_COPY =
  'Animal con condición médica activa. Conocé los detalles y costos antes de aplicar';

/**
 * Canonical category → pill color mapping (D-02).
 * verde  = SALUDABLE_ADULTO
 * ambar  = SENIOR | REACTIVO
 * rojo   = MEDICO_CRONICO | ESPECIAL
 */
export const COLORS: Record<AdoptionCategory, GuidanceColor> = {
  SALUDABLE_ADULTO: 'verde',
  SENIOR: 'ambar',
  REACTIVO: 'ambar',
  MEDICO_CRONICO: 'rojo',
  ESPECIAL: 'rojo',
};

/**
 * Canonical category → pill label mapping (D-02).
 * Labels are server-resolved so the public API returns ready-to-render
 * strings — frontend renders them verbatim.
 */
export const LABELS: Record<AdoptionCategory, string> = {
  SALUDABLE_ADULTO: 'Buena pareja',
  SENIOR: 'Considerá: edad senior',
  REACTIVO: 'Considerá: manejo cuidadoso',
  MEDICO_CRONICO: 'Necesidades especiales · revisá dossier',
  ESPECIAL: 'Necesidades especiales · revisá dossier',
};

/**
 * Compute the public guidance object for the given adoption category.
 * Returns `{ color, label }` plus `copy: LOCKED_MEDICAL_COPY` ONLY when
 * the resolved color is `rojo` (MEDICO_CRONICO / ESPECIAL).
 */
export function computeGuidance(category: AdoptionCategory): Guidance {
  const color = COLORS[category];
  const label = LABELS[category];
  const copy = color === 'rojo' ? LOCKED_MEDICAL_COPY : undefined;
  return { color, label, copy };
}
