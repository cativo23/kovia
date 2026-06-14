/**
 * PublicProfileResponseDto — adopter-facing profile shape (Phase 16 PROFILE-01).
 *
 * Explicit field interface — no spread from the Prisma row (T-16-03-04 mitigation).
 * completionPct is computed server-side in AdopterProfileService.computeCompletionPct().
 *
 * Does NOT include criticality or any ExtrasTemplate fields.
 */
export interface PublicProfileResponseDto {
  id: string;

  // Section 1: datos básicos
  phone: string | null;
  occupation: string | null;
  birthDate: string | null; // ISO date string, stored as Date in DB
  city: string | null;

  // Section 2: hogar
  housingType: string | null;
  ownership: string | null;
  exteriorSpace: boolean | null;
  petPermission: boolean | null;
  adults: number | null;
  children: number | null;
  currentPets: any[] | null;

  // Section 3: estilo de vida
  activityLevel: string | null;
  hoursAlone: number | null;
  adoptionReason: string | null;

  // Section 4: experiencia general
  speciesExperience: boolean | null;
  previousPets: any[] | null;
  additionalContext: string | null;

  // Section 5: fotos del hogar (computed completeness)
  photos: { id: string; url: string; key: string; position: number }[];

  // Computed
  completionPct: number;
}
