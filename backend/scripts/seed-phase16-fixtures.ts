// backend/scripts/seed-phase16-fixtures.ts
//
// Phase 16 e2e fixture seeder — creates deterministic test adopters + animals
// needed by the @phase16 Playwright suite (Plan 16-09 Task 1).
//
// Run before @phase16 e2e:
//   docker compose exec api npx tsx scripts/seed-phase16-fixtures.ts
//
// Idempotent: all inserts use upsert / findFirst+create patterns so re-runs
// are safe. Uses MIGRATION_DATABASE_URL (superuser) to bypass RLS — this is
// a platform-admin test-fixture script, not an app-user path.
//
// Test emails seeded:
//   ADOPTER_COMPLETE_EMAIL = e2e-adopter-complete@phase16.test  (AdopterProfile 100%)
//   ADOPTER_EMPTY_EMAIL    = e2e-adopter-empty@phase16.test     (no AdopterProfile)
//   ADOPTER_LEGACY_EMAIL   = e2e-adopter-legacy@phase16.test    (legacy AdoptionApplication, no profile)
//   CO_APLICANTE_EMAIL     = e2e-coaplicante@phase16.test        (deterministic co-aplicante)
//
// All emails use the .test TLD — non-routable in production (T-16-09-01).
// Threat model: write scope is limited to test-only rows; re-runs are no-ops
// for already-seeded rows.

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
} as ConstructorParameters<typeof PrismaClient>[0]);

// ---------------------------------------------------------------------------
// Test fixture constants — exported so the e2e spec can import or read as env
// ---------------------------------------------------------------------------
export const ADOPTER_COMPLETE_EMAIL = 'e2e-adopter-complete@phase16.test';
export const ADOPTER_EMPTY_EMAIL = 'e2e-adopter-empty@phase16.test';
export const ADOPTER_LEGACY_EMAIL = 'e2e-adopter-legacy@phase16.test';
export const CO_APLICANTE_EMAIL = 'e2e-coaplicante@phase16.test';

// DameTuPataSV seed org slug (from existing seed.ts convention)
const DAME_TU_PATA_SLUG = 'dametupatasv';
// Animal names for the two apply-flow fixtures
const ANIMAL_1_NAME = 'e2e-perro-luna-phase16';
const ANIMAL_2_NAME = 'e2e-perro-sol-phase16';

// ---------------------------------------------------------------------------
// Report accumulator
// ---------------------------------------------------------------------------
interface Report {
  orgsFound: number;
  adoptersUpserted: string[];
  profilesCreated: string[];
  animalsEnsured: string[];
  extrasTemplatesFound: number;
  extrasTemplatesMissing: string[];
  legacyApplicationCreated: boolean;
}

const report: Report = {
  orgsFound: 0,
  adoptersUpserted: [],
  profilesCreated: [],
  animalsEnsured: [],
  extrasTemplatesFound: 0,
  extrasTemplatesMissing: [],
  legacyApplicationCreated: false,
};

// ---------------------------------------------------------------------------
// findOrCreateUser — upsert by email using unique constraint
// ---------------------------------------------------------------------------
async function findOrCreateUser(params: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }
  // bcrypt hash for "Password1234!" — pre-computed so we skip bcrypt runtime dep.
  // Not security-sensitive: test-only credentials on .test TLD.
  const PLACEHOLDER_HASH =
    '$2b$10$YJiXhYTH/p5GtpWE.LyVlORkIlx9fMfMJE5kv3SV7rHOl3jnEzPgm';
  const user = await prisma.user.create({
    data: {
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      password: PLACEHOLDER_HASH,
      role: 'ADOPTER',
      emailVerified: true,
    },
    select: { id: true },
  });
  return user.id;
}

// ---------------------------------------------------------------------------
// ensureOrg — find the DameTuPataSV org by slug
// ---------------------------------------------------------------------------
async function findDameTuPataOrg(): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { slug: DAME_TU_PATA_SLUG },
    select: { id: true },
  });
  return org?.id ?? null;
}

// ---------------------------------------------------------------------------
// ensureAnimal — find or create a seed animal for the apply flow
// ---------------------------------------------------------------------------
async function ensureAnimal(params: {
  orgId: string;
  name: string;
  adoptionCategory: string;
}): Promise<{ id: string; name: string; isNew: boolean }> {
  const existing = await prisma.animal.findFirst({
    where: { name: params.name, organizationId: params.orgId },
    select: { id: true, name: true },
  });
  if (existing) {
    return { id: existing.id, name: existing.name, isNew: false };
  }

  // Look up species id (dog) — use first available species
  const species = await prisma.species.findFirst({
    select: { id: true },
  });

  const animal = await prisma.animal.create({
    data: {
      name: params.name,
      organizationId: params.orgId,
      speciesId: species?.id ?? 'unknown',
      adoptionCategory: params.adoptionCategory as never,
      status: 'AVAILABLE',
      dossierComplete: true,
      dossierVersion: 1,
      // Minimal required fields for a complete-dossier animal
      behavioralEvaluation:
        'Animal tranquilo, sociable. Convive bien con niños y otros perros.',
      medicalHistory: 'Vacunas al día. Esterilizado. Sin condiciones crónicas.',
      monthlyCostUsdMin: 20,
      monthlyCostUsdMax: 50,
      shelterEntryDate: new Date('2025-01-01T00:00:00.000Z'),
    },
    select: { id: true, name: true },
  });
  return { id: animal.id, name: animal.name, isNew: true };
}

// ---------------------------------------------------------------------------
// seedCompleteAdopter — Adopter A: fully completed AdopterProfile (100%)
// ---------------------------------------------------------------------------
async function seedCompleteAdopter(): Promise<void> {
  const userId = await findOrCreateUser({
    email: ADOPTER_COMPLETE_EMAIL,
    firstName: 'Ana',
    lastName: 'Completa',
  });
  report.adoptersUpserted.push(ADOPTER_COMPLETE_EMAIL);

  // Upsert profile — update:{} makes re-runs idempotent
  const existing = await prisma.adopterProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!existing) {
    const profile = await prisma.adopterProfile.create({
      data: {
        userId,
        // Section 1: datos básicos
        phone: '+50377001001',
        occupation: 'Diseñadora gráfica',
        birthDate: new Date('1992-03-15T00:00:00.000Z'),
        city: 'San Salvador',
        // Section 2: hogar
        housingType: 'casa',
        ownership: 'propia',
        exteriorSpace: true,
        petPermission: true,
        adults: 2,
        children: 0,
        currentPets: null as never,
        // Section 3: estilo de vida
        activityLevel: 'activo',
        hoursAlone: 4,
        adoptionReason: 'Quiero compañía y dar una segunda oportunidad a un animal.',
        // Section 4: experiencia general
        speciesExperience: 'Tuve un perro labrador por 8 años. Sé manejar adiestramiento básico.',
        previousPets: null as never,
        additionalContext: 'Trabajo desde casa 3 días a la semana.',
      },
      select: { id: true },
    });

    // Section 5: fotos del hogar — at least 1 ProfilePhoto row
    await prisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        key: 'profiles/e2e-adopter-complete-photo-1.jpg',
        position: 0,
      },
    });

    report.profilesCreated.push(ADOPTER_COMPLETE_EMAIL);
  }
}

// ---------------------------------------------------------------------------
// seedEmptyAdopter — Adopter B: no AdopterProfile row (SC-1 fixture)
// ---------------------------------------------------------------------------
async function seedEmptyAdopter(): Promise<void> {
  await findOrCreateUser({
    email: ADOPTER_EMPTY_EMAIL,
    firstName: 'Bruno',
    lastName: 'Vacío',
  });
  report.adoptersUpserted.push(ADOPTER_EMPTY_EMAIL);
  // Intentionally NO AdopterProfile row — SC-1 test fills profile from scratch
}

// ---------------------------------------------------------------------------
// seedLegacyAdopter — Adopter C: legacy AdoptionApplication, no AdopterProfile
// ---------------------------------------------------------------------------
async function seedLegacyAdopter(orgId: string, animalId: string): Promise<void> {
  const userId = await findOrCreateUser({
    email: ADOPTER_LEGACY_EMAIL,
    firstName: 'Carmen',
    lastName: 'Histórica',
  });
  report.adoptersUpserted.push(ADOPTER_LEGACY_EMAIL);

  // Ensure no profile exists for this adopter (legacy scenario)
  const profileExists = await prisma.adopterProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  // We do NOT remove an existing profile — if operator ran backfill first,
  // the adopter has a partial profile. SC-6 test tolerates this edge case.

  // Create one historical application if none exists
  const existingApp = await prisma.adoptionApplication.findFirst({
    where: { userId },
    select: { id: true },
  });

  if (!existingApp) {
    await prisma.adoptionApplication.create({
      data: {
        userId,
        animalId,
        organizationId: orgId,
        status: 'PENDIENTE',
        submittedAt: new Date('2025-06-01T00:00:00.000Z'),
        // Legacy blobs — no profileSnapshot or extraAnswers (pre-Phase 16)
        personalInfo: {
          phone: '+50399001001',
          occupation: 'Maestra',
          birthDate: '1988-07-20T00:00:00.000Z',
          city: 'Santa Ana',
        },
        housing: {
          housingType: 'apartamento',
          ownership: 'alquilada',
          exteriorSpace: false,
          petPermission: true,
          adults: 3,
          children: 1,
        },
        lifestyle: {
          activityLevel: 'moderado',
          hoursAlone: 6,
          adoptionReason: 'Mi hijo quiere una mascota.',
          speciesExperience: 'Ninguna experiencia previa.',
        },
        additionalContext: 'Vivimos en apartamento con balcón.',
        // Phase 16 co-aplicante fields: null (pre-migration)
        coAplicanteNombre: null,
        coAplicanteEmail: null,
        profileSnapshot: null as never,
        extraAnswers: null as never,
      },
    });
    report.legacyApplicationCreated = true;
  }

  if (!profileExists) {
    // No profile to report creating
  }
}

// ---------------------------------------------------------------------------
// verifyExtrasTemplates — check DameTuPataSV has seed templates from Plan 16-02
// ---------------------------------------------------------------------------
async function verifyExtrasTemplates(orgId: string): Promise<void> {
  const categories = [
    'SALUDABLE_ADULTO',
    'SENIOR',
    'MEDICO_CRONICO',
    'REACTIVO',
    'ESPECIAL',
  ];

  for (const category of categories) {
    const tmpl = await prisma.extrasTemplate.findUnique({
      where: {
        organizationId_adoptionCategory: {
          organizationId: orgId,
          adoptionCategory: category as never,
        },
      },
      select: { id: true, questions: true },
    });

    if (tmpl) {
      report.extrasTemplatesFound++;
    } else {
      report.extrasTemplatesMissing.push(category);
      console.warn(
        `[WARN] ExtrasTemplate for category=${category} not found in DameTuPataSV. ` +
          'Run `docker compose exec api npx prisma db seed` to seed Plan 16-02 templates.',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// printReport — summary log matching backfill-adopter-profiles.ts style
// ---------------------------------------------------------------------------
function printReport(animal1Id: string, animal2Id: string): void {
  console.log('');
  console.log('========================================');
  console.log('seed-phase16-fixtures — Summary');
  console.log('========================================');
  console.log(`Test adopters upserted:         ${report.adoptersUpserted.length}`);
  report.adoptersUpserted.forEach((e) => console.log(`  - ${e}`));
  console.log(`AdopterProfile rows created:    ${report.profilesCreated.length}`);
  console.log(`Animals ensured (AVAILABLE):    ${report.animalsEnsured.length}`);
  report.animalsEnsured.forEach((a) => console.log(`  - ${a}`));
  console.log(`ExtrasTemplate rows found:      ${report.extrasTemplatesFound} / 5`);
  if (report.extrasTemplatesMissing.length) {
    console.log(
      `  MISSING categories: ${report.extrasTemplatesMissing.join(', ')} — run prisma db seed first`,
    );
  }
  console.log(`Legacy application created:     ${report.legacyApplicationCreated}`);
  console.log('');
  console.log('Animal fixture IDs (for e2e spec):');
  console.log(`  ANIMAL_1_ID=${animal1Id}  (${ANIMAL_1_NAME})`);
  console.log(`  ANIMAL_2_ID=${animal2Id}  (${ANIMAL_2_NAME})`);
  console.log('');
  console.log('Test credentials (all passwords: Password1234!):');
  console.log(`  ADOPTER_COMPLETE_EMAIL=${ADOPTER_COMPLETE_EMAIL}`);
  console.log(`  ADOPTER_EMPTY_EMAIL=${ADOPTER_EMPTY_EMAIL}`);
  console.log(`  ADOPTER_LEGACY_EMAIL=${ADOPTER_LEGACY_EMAIL}`);
  console.log(`  CO_APLICANTE_EMAIL=${CO_APLICANTE_EMAIL}`);
  console.log('');
  console.log('Next step:');
  console.log(
    '  docker compose exec frontend npx playwright test --grep @phase16 --reporter=line',
  );
  console.log('');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('Phase 16 fixture seeder — starting');
  console.log('');

  // 1. Find DameTuPataSV org
  const orgId = await findDameTuPataOrg();
  if (!orgId) {
    console.error(
      '[ERROR] DameTuPataSV organization not found (slug=dametupatasv). ' +
        'Run `docker compose exec api npx prisma db seed` first.',
    );
    process.exit(1);
  }
  report.orgsFound = 1;
  console.log(`DameTuPataSV org found: id=${orgId}`);

  // 2. Ensure two AVAILABLE animals with dossierComplete=true (SC-2 requires 2)
  const animal1 = await ensureAnimal({
    orgId,
    name: ANIMAL_1_NAME,
    adoptionCategory: 'SALUDABLE_ADULTO',
  });
  report.animalsEnsured.push(`${animal1.name} (id=${animal1.id}, new=${animal1.isNew})`);

  const animal2 = await ensureAnimal({
    orgId,
    name: ANIMAL_2_NAME,
    adoptionCategory: 'SALUDABLE_ADULTO',
  });
  report.animalsEnsured.push(`${animal2.name} (id=${animal2.id}, new=${animal2.isNew})`);

  // 3. Verify ExtrasTemplate rows from Plan 16-02 seed
  await verifyExtrasTemplates(orgId);

  // 4. Adopter A — complete profile (100%)
  await seedCompleteAdopter();

  // 5. Adopter B — empty (no AdopterProfile for SC-1)
  await seedEmptyAdopter();

  // 6. Adopter C — legacy application, no profile (SC-6)
  await seedLegacyAdopter(orgId, animal1.id);

  // Print final report with animal IDs
  printReport(animal1.id, animal2.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('seed-phase16-fixtures failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
