// backend/scripts/seed-phase17-fixtures.ts
//
// Phase 17 e2e fixture seeder — creates deterministic test adopters + animals +
// Phase 17 entities needed by the @phase17 Playwright suite (Plan 17-00 Task 3).
//
// ─── DEPENDENCY NOTICE ───────────────────────────────────────────────────────
// This seeder references Phase 17 schema additions (Plan 02):
//   - adoption_applications.approvedAt  (TIMESTAMP, nullable)
//   - adoption_applications.status values: IN_REFLECTION, FINALIZED  (Plan 01 enum migration)
//   - table: encuentros  (Encuentro 1:1 with application)
//   - table: foster_periods  (FosterPeriod optional 1:1)
//   - table: post_adoption_check_ins  (PostAdoptionCheckIn N:1)
//
// The seeder will FAIL if run before Plan 01 (enum migration) and Plan 02
// (schema migration adding the above columns/tables). Run Plans 00→01→02 first.
// ─────────────────────────────────────────────────────────────────────────────
//
// Run before @phase17 e2e:
//   docker compose exec api npx tsx scripts/seed-phase17-fixtures.ts
//
// Idempotent: all inserts use findFirst+create or raw INSERT … ON CONFLICT DO NOTHING
// patterns so re-runs are safe. Uses MIGRATION_DATABASE_URL (superuser) to bypass
// RLS — this is a platform-admin test-fixture script, not an app-user path.
//
// Fixtures seeded:
//   IN_REFLECTION_ADOPTER_EMAIL  = e2e-adopter-reflexion@phase17.test
//     → AdoptionApplication status=IN_REFLECTION, approvedAt=fixed past instant
//       (reflexión-banner target: Plans 06 asserts banner is visible on
//        /perfil/aplicaciones/[id])
//
//   FINALIZED_ADOPTER_EMAIL      = e2e-adopter-finalized@phase17.test
//     → AdoptionApplication status=FINALIZED with Encuentro (completed, PROCEED),
//       optional FosterPeriod=null, and one PostAdoptionCheckIn (DAY_14, COMPLETED,
//       with stored responses) — org-application-detail surfacing target:
//       Plan 07 asserts encuentro badge + DAY_14 check-in responses visible.
//
//   ORG_STAFF_EMAIL              = e2e-staff-phase17@phase17.test
//     → ORG_STAFF member of the DameTuPataSV org (to log into org-detail page)
//
// All emails use the .test TLD — non-routable in production.
// Threat model: write scope is limited to test-only rows; re-runs are no-ops.

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const { Client } = pg;

const adapter = new PrismaPg({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
} as ConstructorParameters<typeof PrismaClient>[0]);

// Superuser client — used for raw SQL inserts of Phase 17 entities
// (Plan 02 tables may not have Prisma client bindings until generated client rebuilt).
const superClient = new Client({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});

// ---------------------------------------------------------------------------
// Test fixture constants — must match phase17-safeguards.spec.ts
// ---------------------------------------------------------------------------
export const IN_REFLECTION_ADOPTER_EMAIL = 'e2e-adopter-reflexion@phase17.test';
export const FINALIZED_ADOPTER_EMAIL = 'e2e-adopter-finalized@phase17.test';
export const ORG_STAFF_EMAIL = 'e2e-staff-phase17@phase17.test';
export const TEST_PASSWORD = 'Password1234!';

// approvedAt for the IN_REFLECTION fixture — 24h ago (within the 48h window;
// banner shows unlock time that is still in the future from test execution time).
// This is intentionally within the window so the reflexión banner is visible.
const IN_REFLECTION_APPROVED_AT = new Date(Date.now() - 24 * 60 * 60 * 1000);

// approvedAt for the FINALIZED fixture — 72h ago (well past the 48h window).
const FINALIZED_APPROVED_AT = new Date(Date.now() - 72 * 60 * 60 * 1000);
const FINALIZED_AT = new Date(Date.now() - 48 * 60 * 60 * 1000);

// DameTuPataSV seed org slug
const DAME_TU_PATA_SLUG = 'dametupatasv';

// Animal names for the two Phase 17 fixtures
const REFLEXION_ANIMAL_NAME = 'e2e-perro-reflexion-phase17';
const FINALIZED_ANIMAL_NAME = 'e2e-perro-finalized-phase17';

// ---------------------------------------------------------------------------
// Report accumulator
// ---------------------------------------------------------------------------
interface Report {
  orgFound: boolean;
  adoptersUpserted: string[];
  animalsEnsured: string[];
  reflexionAppId: string | null;
  finalizedAppId: string | null;
  encuentroCreated: boolean;
  checkInCreated: boolean;
  staffCreated: boolean;
}

const report: Report = {
  orgFound: false,
  adoptersUpserted: [],
  animalsEnsured: [],
  reflexionAppId: null,
  finalizedAppId: null,
  encuentroCreated: false,
  checkInCreated: false,
  staffCreated: false,
};

// ---------------------------------------------------------------------------
// findOrCreateUser
// ---------------------------------------------------------------------------
async function findOrCreateUser(params: {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true },
  });
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
    return existing.id;
  }
  const user = await prisma.user.create({
    data: {
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      passwordHash,
      role: (params.role ?? 'ADOPTER') as never,
      emailVerified: true,
    },
    select: { id: true },
  });
  return user.id;
}

// ---------------------------------------------------------------------------
// findDameTuPataOrg
// ---------------------------------------------------------------------------
async function findDameTuPataOrg(): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { slug: DAME_TU_PATA_SLUG },
    select: { id: true },
  });
  return org?.id ?? null;
}

// ---------------------------------------------------------------------------
// ensureAnimal
// ---------------------------------------------------------------------------
async function ensureAnimal(params: {
  orgId: string;
  name: string;
  adoptionCategory?: string;
  status?: string;
}): Promise<{ id: string; name: string; isNew: boolean }> {
  const existing = await prisma.animal.findFirst({
    where: { name: params.name, organizationId: params.orgId },
    select: { id: true, name: true },
  });
  if (existing) {
    return { id: existing.id, name: existing.name, isNew: false };
  }

  const species = await prisma.species.findFirst({ select: { id: true } });

  const animal = await prisma.animal.create({
    data: {
      name: params.name,
      organizationId: params.orgId,
      speciesId: species?.id ?? 'unknown',
      adoptionCategory: (params.adoptionCategory ?? 'SALUDABLE_ADULTO') as never,
      status: (params.status ?? 'IN_PROCESS') as never,
      dossierComplete: true,
      dossierVersion: 1,
      behavioralEvaluation: 'Animal tranquilo, sociable.',
      medicalHistory: 'Vacunas al día.',
      monthlyCostUsdMin: 20,
      monthlyCostUsdMax: 50,
      shelterEntryDate: new Date('2025-01-01T00:00:00.000Z'),
    },
    select: { id: true, name: true },
  });
  return { id: animal.id, name: animal.name, isNew: true };
}

// ---------------------------------------------------------------------------
// seedReflexionFixture — adopter with IN_REFLECTION application (Plan 06 target)
//
// Depends on Plan 01 (IN_REFLECTION enum value) + Plan 02 (approvedAt column).
// After Plans 01+02, this seeds an adopter whose application is in the 48h
// reflexión window, so the Plan 06 reflexión banner is visible on
// /perfil/aplicaciones/[id].
// ---------------------------------------------------------------------------
async function seedReflexionFixture(orgId: string): Promise<void> {
  const userId = await findOrCreateUser({
    email: IN_REFLECTION_ADOPTER_EMAIL,
    firstName: 'Rosa',
    lastName: 'Reflexión',
  });
  report.adoptersUpserted.push(IN_REFLECTION_ADOPTER_EMAIL);

  const animal = await ensureAnimal({
    orgId,
    name: REFLEXION_ANIMAL_NAME,
    status: 'IN_PROCESS',
  });
  report.animalsEnsured.push(`${animal.name} (id=${animal.id})`);

  // Find or create the application using raw SQL (depends on Plan 01 enum + Plan 02 approvedAt).
  const existingApp = await superClient.query(
    `SELECT id FROM adoption_applications WHERE "userId" = $1 AND "animalId" = $2 LIMIT 1`,
    [userId, animal.id],
  );

  if (existingApp.rows.length === 0) {
    const appRow = await superClient.query(
      `INSERT INTO adoption_applications
         (id, "userId", "organizationId", "animalId", status, "approvedAt", "submittedAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, $2, $3, 'IN_REFLECTION', $4, NOW() - INTERVAL '3 days', NOW())
       RETURNING id`,
      [userId, orgId, animal.id, IN_REFLECTION_APPROVED_AT],
    );
    report.reflexionAppId = appRow.rows[0].id;
    console.log(`  [IN_REFLECTION] application created: id=${report.reflexionAppId}`);
    console.log(`    approvedAt=${IN_REFLECTION_APPROVED_AT.toISOString()} (24h ago, 48h window still active)`);
    console.log(`    reflexión unlock time: ${new Date(IN_REFLECTION_APPROVED_AT.getTime() + 48 * 60 * 60 * 1000).toISOString()}`);
  } else {
    report.reflexionAppId = existingApp.rows[0].id;
    // Ensure the status and approvedAt are still correct on re-runs.
    await superClient.query(
      `UPDATE adoption_applications
       SET status='IN_REFLECTION', "approvedAt"=$1, "updatedAt"=NOW()
       WHERE id=$2`,
      [IN_REFLECTION_APPROVED_AT, report.reflexionAppId],
    );
    console.log(`  [IN_REFLECTION] application already exists: id=${report.reflexionAppId} (status+approvedAt refreshed)`);
  }
}

// ---------------------------------------------------------------------------
// seedFinalizedFixture — adopter with FINALIZED application + Encuentro + DAY_14 check-in
// (Plan 07 target — org-application-detail surfacing)
//
// Depends on Plan 01 (FINALIZED enum) + Plan 02 (approvedAt, encuentros,
// post_adoption_check_ins tables).
// After Plans 01+02, this seeds a fully-finalized application that has:
//   - Encuentro: completed=true, recomendacion='PROCEED', observations filled
//   - FosterPeriod: none (animal was not complex-category)
//   - PostAdoptionCheckIn: DAY_14, status=COMPLETED, responses stored
//
// Plan 07 asserts these are VISIBLE on the org application-detail page.
// ---------------------------------------------------------------------------
async function seedFinalizedFixture(orgId: string): Promise<void> {
  const userId = await findOrCreateUser({
    email: FINALIZED_ADOPTER_EMAIL,
    firstName: 'Diego',
    lastName: 'Finalizado',
  });
  report.adoptersUpserted.push(FINALIZED_ADOPTER_EMAIL);

  const animal = await ensureAnimal({
    orgId,
    name: FINALIZED_ANIMAL_NAME,
    adoptionCategory: 'SALUDABLE_ADULTO',
    status: 'ADOPTED',
  });
  report.animalsEnsured.push(`${animal.name} (id=${animal.id})`);

  // Create or refresh the FINALIZED application.
  const existingApp = await superClient.query(
    `SELECT id FROM adoption_applications WHERE "userId" = $1 AND "animalId" = $2 LIMIT 1`,
    [userId, animal.id],
  );

  let appId: string;
  if (existingApp.rows.length === 0) {
    const appRow = await superClient.query(
      `INSERT INTO adoption_applications
         (id, "userId", "organizationId", "animalId", status, "approvedAt", "submittedAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, $2, $3, 'FINALIZED', $4, NOW() - INTERVAL '7 days', NOW())
       RETURNING id`,
      [userId, orgId, animal.id, FINALIZED_APPROVED_AT],
    );
    appId = appRow.rows[0].id;
    report.finalizedAppId = appId;
    console.log(`  [FINALIZED] application created: id=${appId}`);
  } else {
    appId = existingApp.rows[0].id;
    report.finalizedAppId = appId;
    await superClient.query(
      `UPDATE adoption_applications
       SET status='FINALIZED', "approvedAt"=$1, "updatedAt"=NOW()
       WHERE id=$2`,
      [FINALIZED_APPROVED_AT, appId],
    );
    console.log(`  [FINALIZED] application already exists: id=${appId} (refreshed)`);
  }

  // Seed Encuentro (from Plan 02 encuentros table).
  const existingEncuentro = await superClient.query(
    `SELECT id FROM encuentros WHERE "applicationId" = $1 LIMIT 1`,
    [appId],
  );
  if (existingEncuentro.rows.length === 0) {
    await superClient.query(
      `INSERT INTO encuentros
         (id, "applicationId", completed, recomendacion, observations, "scheduledAt", "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, true, 'PROCEED',
          'Excelente encuentro. El adoptante demostró mucha responsabilidad y paciencia con el animal.',
          NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')`,
      [appId],
    );
    report.encuentroCreated = true;
    console.log(`  [FINALIZED] Encuentro created (completed=true, recomendacion=PROCEED)`);
  } else {
    console.log(`  [FINALIZED] Encuentro already exists`);
  }

  // Seed PostAdoptionCheckIn — DAY_14, COMPLETED with stored responses.
  const existingCheckIn = await superClient.query(
    `SELECT id FROM post_adoption_check_ins WHERE "applicationId" = $1 AND "scheduleType" = 'DAY_14' LIMIT 1`,
    [appId],
  );

  // DAY_14 responses — 3 hardcoded es-SV behavioral-specificity questions (D-15 draft):
  //   1. ¿Cómo se ha adaptado el animal a su nuevo hogar? (observacional)
  //   2. ¿Ha presentado algún problema de salud o comportamiento? (observacional)
  //   3. ¿Necesita apoyo del refugio? (accionable)
  const day14Responses = [
    {
      questionId: 'check-in-d14-q1',
      question: '¿Cómo ha sido la adaptación de tu nuevo compañero durante estas dos semanas?',
      answer: 'Muy bien, ya come y duerme sin problema. Se lleva muy bien con mis otros animales.',
    },
    {
      questionId: 'check-in-d14-q2',
      question: '¿Ha presentado algún problema de salud o comportamiento que te preocupe?',
      answer: 'No, está saludable y tranquilo.',
    },
    {
      questionId: 'check-in-d14-q3',
      question: '¿Necesitás apoyo del refugio en algún tema relacionado con la adopción?',
      answer: 'Todo está bien, gracias.',
    },
  ];

  if (existingCheckIn.rows.length === 0) {
    await superClient.query(
      `INSERT INTO post_adoption_check_ins
         (id, "applicationId", "scheduleType", status, "scheduledFor", "completedAt",
          token, responses, "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, 'DAY_14', 'COMPLETED',
          $2, $3,
          NULL, $4::jsonb, NOW(), NOW())`,
      [
        appId,
        new Date(FINALIZED_AT.getTime() + 14 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 1 * 60 * 60 * 1000), // completed 1h ago
        JSON.stringify(day14Responses),
      ],
    );
    report.checkInCreated = true;
    console.log(`  [FINALIZED] PostAdoptionCheckIn DAY_14 COMPLETED created with 3 responses`);
  } else {
    console.log(`  [FINALIZED] PostAdoptionCheckIn DAY_14 already exists`);
  }

  // Seed DAY_60 as PENDING (SAFEGUARD-05: D60 row created at FINALIZED, optional).
  const existingDay60 = await superClient.query(
    `SELECT id FROM post_adoption_check_ins WHERE "applicationId" = $1 AND "scheduleType" = 'DAY_60' LIMIT 1`,
    [appId],
  );
  if (existingDay60.rows.length === 0) {
    await superClient.query(
      `INSERT INTO post_adoption_check_ins
         (id, "applicationId", "scheduleType", status, "scheduledFor",
          token, responses, "createdAt", "updatedAt")
       VALUES
         (gen_random_uuid(), $1, 'DAY_60', 'PENDING',
          $2,
          NULL, NULL, NOW(), NOW())`,
      [
        appId,
        new Date(FINALIZED_AT.getTime() + 60 * 24 * 60 * 60 * 1000),
      ],
    );
    console.log(`  [FINALIZED] PostAdoptionCheckIn DAY_60 PENDING created`);
  } else {
    console.log(`  [FINALIZED] PostAdoptionCheckIn DAY_60 already exists`);
  }
}

// ---------------------------------------------------------------------------
// seedOrgStaff — ORG_STAFF member for the org-detail page login (Plan 07)
// ---------------------------------------------------------------------------
async function seedOrgStaff(orgId: string): Promise<void> {
  const userId = await findOrCreateUser({
    email: ORG_STAFF_EMAIL,
    firstName: 'Paula',
    lastName: 'Personal',
    role: 'ORG_STAFF',
  });
  report.adoptersUpserted.push(ORG_STAFF_EMAIL);

  // Ensure the user has an OrgMembership for DameTuPataSV.
  const existingMembership = await superClient.query(
    `SELECT id FROM org_memberships WHERE "userId" = $1 AND "organizationId" = $2 LIMIT 1`,
    [userId, orgId],
  );
  if (existingMembership.rows.length === 0) {
    await superClient.query(
      `INSERT INTO org_memberships (id, "userId", "organizationId", role, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_STAFF', NOW(), NOW())`,
      [userId, orgId],
    );
    // Also set user orgId for JWT context
    await superClient.query(
      `UPDATE users SET "orgId" = $1 WHERE id = $2`,
      [orgId, userId],
    );
    report.staffCreated = true;
    console.log(`  [ORG_STAFF] e2e-staff-phase17 created and assigned to DameTuPataSV`);
  } else {
    console.log(`  [ORG_STAFF] e2e-staff-phase17 already a member of DameTuPataSV`);
  }
}

// ---------------------------------------------------------------------------
// printReport
// ---------------------------------------------------------------------------
function printReport(): void {
  console.log('');
  console.log('========================================');
  console.log('seed-phase17-fixtures — Summary');
  console.log('========================================');
  console.log(`Org found:                   ${report.orgFound ? 'YES' : 'NO'}`);
  console.log(`Adopters/staff upserted:     ${report.adoptersUpserted.length}`);
  report.adoptersUpserted.forEach((e) => console.log(`  - ${e}`));
  console.log(`Animals ensured:             ${report.animalsEnsured.length}`);
  report.animalsEnsured.forEach((a) => console.log(`  - ${a}`));
  console.log(`IN_REFLECTION app id:        ${report.reflexionAppId ?? 'N/A'}`);
  console.log(`FINALIZED app id:            ${report.finalizedAppId ?? 'N/A'}`);
  console.log(`Encuentro created:           ${report.encuentroCreated}`);
  console.log(`DAY_14 check-in created:     ${report.checkInCreated}`);
  console.log(`Org staff created:           ${report.staffCreated}`);
  console.log('');
  console.log('Test credentials (all passwords: Password1234!):');
  console.log(`  IN_REFLECTION_ADOPTER_EMAIL=${IN_REFLECTION_ADOPTER_EMAIL}`);
  console.log(`  FINALIZED_ADOPTER_EMAIL    =${FINALIZED_ADOPTER_EMAIL}`);
  console.log(`  ORG_STAFF_EMAIL            =${ORG_STAFF_EMAIL}`);
  console.log('');
  console.log('Next step (after Plan 06/07 un-skip their e2e blocks):');
  console.log('  docker compose exec api npx tsx scripts/seed-phase17-fixtures.ts');
  console.log('  docker compose exec web npx playwright test --grep @phase17 --reporter=line');
  console.log('');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log('Phase 17 fixture seeder — starting');
  console.log('');
  console.log('NOTE: This seeder requires Plan 01 (enum migration) + Plan 02 (schema migration)');
  console.log('      to have run. It will fail if IN_REFLECTION/FINALIZED enum values or the');
  console.log('      encuentros/post_adoption_check_ins tables do not exist yet.');
  console.log('');

  await superClient.connect();

  // 1. Find DameTuPataSV org
  const orgId = await findDameTuPataOrg();
  if (!orgId) {
    console.error(
      '[ERROR] DameTuPataSV organization not found (slug=dametupatasv). ' +
        'Run `docker compose exec api npx prisma db seed` first.',
    );
    process.exit(1);
  }
  report.orgFound = true;
  console.log(`DameTuPataSV org found: id=${orgId}`);
  console.log('');

  // 2. Seed IN_REFLECTION fixture (reflexión-banner target, Plan 06)
  console.log('=== Seeding IN_REFLECTION fixture (Plan 06 target) ===');
  await seedReflexionFixture(orgId);

  // 3. Seed FINALIZED fixture (org-surfacing target, Plan 07)
  console.log('');
  console.log('=== Seeding FINALIZED fixture (Plan 07 target) ===');
  await seedFinalizedFixture(orgId);

  // 4. Seed ORG_STAFF (needed to log into org-detail page, Plan 07)
  console.log('');
  console.log('=== Seeding org staff (Plan 07 login) ===');
  await seedOrgStaff(orgId);

  printReport();
}

main()
  .then(async () => {
    await superClient.end();
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('seed-phase17-fixtures failed:', err);
    await superClient.end().catch(() => {});
    await prisma.$disconnect();
    process.exit(1);
  });
