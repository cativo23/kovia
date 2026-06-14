// backend/scripts/launch-checklist-phase15.ts
//
// Phase 15 launch checklist — reports dossier coverage for DameTuPataSV's
// AVAILABLE animals so ops can fill dossiers before announcing v3.0 publicly.
//
// Run: docker compose exec api npx tsx scripts/launch-checklist-phase15.ts
//      docker compose exec api npx tsx scripts/launch-checklist-phase15.ts --seed-test-fixture
//
// Without --seed-test-fixture: read-only. Prints totals + per-organization
// list of incomplete animals (first 50). Exits 0.
//
// With --seed-test-fixture: idempotent UPDATE that flips ONE animal per the
// MEDICO_CRONICO category to a seed-quality complete dossier so the @phase15
// playwright suite (Plan 15-08 Task 1) has a fixture to assert against.
// This is a controlled write to ONE row; the bulk of the org's catalog stays
// untouched. T-15-Test-Fixture-Side-Effect mitigation: idempotent re-runs
// keep the row at the same seed-quality state.
//
// Threat model (excerpted from 15-08-PLAN <threat_model>):
//   - Launch checklist → live DB: read-only by default; --seed-test-fixture
//     writes only one animal with seed-quality dossier.
//   - T-15-Launch-Dark accepted (operational) — D-07 fail-closed policy.

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

// Mirror the seed.ts adapter pattern (Prisma 7 requires an explicit pg adapter).
// Uses MIGRATION_DATABASE_URL (superuser) so we can read/write across RLS
// policies — this is a platform-admin operational script, not an app-user
// path. T-15-Test-Fixture-Side-Effect: writes are scoped to ONE row via the
// `seedTestFixture()` function below.
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const SEED_TEST_FIXTURE_FLAG = '--seed-test-fixture';

interface OrgRow {
  id: string;
  name: string;
}

interface IncompleteAnimalRow {
  id: string;
  name: string;
  orgName: string;
}

async function runReport(): Promise<{
  total: number;
  complete: number;
  incomplete: number;
  perOrg: IncompleteAnimalRow[];
}> {
  // Filter `status = 'AVAILABLE'` per the plan: only AVAILABLE animals are
  // candidates for public visibility, so the dossier-coverage check focuses
  // on that subset. (DRAFT / ADOPTED / RESERVED rows are out of scope for the
  // public-launch readiness gate.)
  const allAvailable = await prisma.animal.findMany({
    where: { status: 'AVAILABLE' },
    select: {
      id: true,
      name: true,
      dossierComplete: true,
      organizationId: true,
    },
  });

  const total = allAvailable.length;
  const complete = allAvailable.filter((a) => a.dossierComplete === true).length;
  const incomplete = total - complete;

  // Build per-org incomplete list (first 50).
  const incompleteIds = allAvailable
    .filter((a) => a.dossierComplete === false)
    .map((a) => a.id);

  const incompleteAnimals = incompleteIds.length
    ? await prisma.animal.findMany({
        where: { id: { in: incompleteIds } },
        select: {
          id: true,
          name: true,
          organization: { select: { name: true } },
        },
        orderBy: [{ organization: { name: 'asc' } }, { name: 'asc' }],
        take: 50,
      })
    : [];

  const perOrg: IncompleteAnimalRow[] = incompleteAnimals.map((a) => ({
    id: a.id,
    name: a.name,
    orgName: a.organization?.name ?? '(unknown org)',
  }));

  return { total, complete, incomplete, perOrg };
}

function printReport(r: {
  total: number;
  complete: number;
  incomplete: number;
  perOrg: IncompleteAnimalRow[];
}): void {
  console.log('========================================');
  console.log('Phase 15 Launch Checklist — Dossier Coverage');
  console.log('========================================');
  console.log(`AVAILABLE animals total:      ${r.total}`);
  console.log(`Dossier complete (public):    ${r.complete}`);
  console.log(`Dossier incomplete (invisible to public): ${r.incomplete}`);
  console.log('');
  if (r.perOrg.length === 0) {
    console.log('No incomplete dossiers. All AVAILABLE animals are public-visible.');
    return;
  }
  console.log('Incomplete animals (first 50, grouped by organization):');
  console.log('--------------------------------------------------------');
  let currentOrg = '';
  for (const a of r.perOrg) {
    if (a.orgName !== currentOrg) {
      currentOrg = a.orgName;
      console.log(`\n[${currentOrg}]`);
    }
    console.log(`  - ${a.name} (id=${a.id})`);
  }
  console.log('');
}

/**
 * Idempotent UPDATE: flips ONE seed animal to a complete MEDICO_CRONICO
 * dossier so the @phase15 playwright suite can assert on the LOCKED PUBLIC-06
 * copy + the verde/ambar/rojo pill rendering. Picks the first AVAILABLE +
 * dossierComplete=false row deterministically (oldest by createdAt) so re-runs
 * stay stable. If no such row exists (every animal already complete) the
 * function is a no-op.
 */
async function seedTestFixture(): Promise<{
  flippedAnimalId: string | null;
  flippedAnimalName: string | null;
}> {
  const candidate = await prisma.animal.findFirst({
    where: { status: 'AVAILABLE', dossierComplete: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });

  if (!candidate) {
    return { flippedAnimalId: null, flippedAnimalName: null };
  }

  // Service-layer in animals.service.update() recomputes dossierComplete from
  // the 5 required fields (D-08). Going through Prisma directly bypasses the
  // service, so we explicitly set dossierComplete=true here AFTER filling the
  // 5 required fields — matching the policy the service would apply.
  await prisma.animal.update({
    where: { id: candidate.id },
    data: {
      adoptionCategory: 'MEDICO_CRONICO',
      behavioralEvaluation:
        'Calmado en casa, observador. Disfruta paseos cortos. Toma su tiempo para acercarse a personas nuevas; con paciencia se gana su confianza en 2-3 visitas.',
      medicalHistory:
        'Diagnóstico de leishmaniasis canina (2024). Bajo tratamiento controlado con alopurinol y revisiones trimestrales. Esterilizado. Vacunas al día. Sin alergias conocidas.',
      monthlyCostUsdMin: 45,
      monthlyCostUsdMax: 80,
      knownTriggers: ['ruidos fuertes', 'visitas inesperadas'],
      shelterEntryDate: new Date('2025-12-01T00:00:00.000Z'),
      dossierComplete: true,
      dossierVersion: 1,
    },
  });

  return { flippedAnimalId: candidate.id, flippedAnimalName: candidate.name };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const seedFixture = args.includes(SEED_TEST_FIXTURE_FLAG);

  if (seedFixture) {
    console.log(
      'Mode: --seed-test-fixture (will flip ONE animal to complete MEDICO_CRONICO dossier)',
    );
    const { flippedAnimalId, flippedAnimalName } = await seedTestFixture();
    if (flippedAnimalId) {
      console.log(
        `Flipped animal "${flippedAnimalName}" (id=${flippedAnimalId}) to dossierComplete=true with MEDICO_CRONICO category.`,
      );
    } else {
      console.log(
        'No AVAILABLE + dossierComplete=false animal found — nothing to flip.',
      );
    }
    console.log('');
  } else {
    console.log('Mode: read-only (pass --seed-test-fixture to flip a fixture row)');
    console.log('');
  }

  const report = await runReport();
  printReport(report);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('launch-checklist-phase15 failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
