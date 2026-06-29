// backend/scripts/backfill-adopter-profiles.ts
//
// Phase 16 — PROFILE-03 backfill script.
//
// Seeds AdopterProfile rows from legacy AdoptionApplication blobs for adopters
// who already applied but pre-date the Phase 16 profile requirement.
//
// Strategy: for each distinct adopter, pick the most-recent non-RETIRADA
// application, extract personalInfo / housing / lifestyle blobs, and upsert
// an AdopterProfile row with `update: {}` (idempotent — re-runs are no-ops
// for already-migrated adopters, D-16 Pitfall 1).
//
// Run (inside Docker):
//   docker compose exec api npx tsx scripts/backfill-adopter-profiles.ts
//   docker compose exec api npx tsx scripts/backfill-adopter-profiles.ts --dry-run
//
// With --dry-run: prints what would be upserted without writing to the DB.
//
// Threat model (platform-admin script):
//   - Uses MIGRATION_DATABASE_URL (superuser) — bypasses RLS by design.
//   - Write scope: only AdopterProfile rows (no application mutations).
//   - Re-runnable without duplicates (upsert with empty update clause).
//   - T-16-06-Backfill: completionPct logged — ops can identify adopters who
//     need to fill in missing fields before they can apply under the new flow.

import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

// Mirror the launch-checklist-phase15.ts adapter pattern (Prisma 7 requires
// an explicit pg adapter). Uses MIGRATION_DATABASE_URL (superuser) so we can
// read across RLS policies — this is a platform-admin operational script.
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const DRY_RUN_FLAG = '--dry-run';

// ---------------------------------------------------------------------------
// completionPct — must mirror AdopterProfileService.computeCompletionPct() exactly.
// Section requirements (D-17):
//   1. datos básicos: phone + occupation + birthDate all non-null
//   2. hogar: housingType + ownership + adults !== null/undefined
//   3. estilo de vida: activityLevel + hoursAlone !== null/undefined + adoptionReason
//   4. experiencia general: speciesExperience !== null/undefined
//   5. fotos del hogar: photos.length >= 1
//
// Backfill can only populate sections 1–4 from blob data. Section 5 (photos)
// requires the adopter to upload — the script will never flip that section to
// complete, so backfilled profiles that had no photos will top out at 80%.
// ---------------------------------------------------------------------------
function computeCompletionPct(profile: {
  phone?: string | null;
  occupation?: string | null;
  birthDate?: Date | null;
  housingType?: string | null;
  ownership?: string | null;
  adults?: number | null;
  activityLevel?: string | null;
  hoursAlone?: number | null;
  adoptionReason?: string | null;
  speciesExperience?: string | null;
  photos?: unknown[];
}): number {
  let complete = 0;

  if (profile.phone && profile.occupation && profile.birthDate) complete++;

  if (
    profile.housingType &&
    profile.ownership &&
    profile.adults !== null &&
    profile.adults !== undefined
  )
    complete++;

  if (
    profile.activityLevel &&
    profile.hoursAlone !== null &&
    profile.hoursAlone !== undefined &&
    profile.adoptionReason
  )
    complete++;

  if (
    profile.speciesExperience !== null &&
    profile.speciesExperience !== undefined
  )
    complete++;

  // Section 5 (photos): backfill has no photo data — callers pass [] by default.
  if ((profile.photos ?? []).length >= 1) complete++;

  return Math.round((complete / 5) * 100);
}

// ---------------------------------------------------------------------------
// Blob field mapping — personalInfo / housing / lifestyle are untyped Json?.
// All accesses use `?.` with null fallbacks (defensive, D-16 Pitfall 2).
// ---------------------------------------------------------------------------
function extractPersonalInfo(blob: unknown): {
  phone: string | null;
  occupation: string | null;
  birthDate: Date | null;
  city: string | null;
} {
  if (!blob || typeof blob !== 'object') {
    return { phone: null, occupation: null, birthDate: null, city: null };
  }
  const b = blob as Record<string, unknown>;
  return {
    phone: typeof b['phone'] === 'string' ? b['phone'] : null,
    occupation: typeof b['occupation'] === 'string' ? b['occupation'] : null,
    birthDate: typeof b['birthDate'] === 'string' ? new Date(b['birthDate']) : null,
    city: typeof b['city'] === 'string' ? b['city'] : null,
  };
}

function extractHousing(blob: unknown): {
  housingType: string | null;
  ownership: string | null;
  exteriorSpace: boolean | null;
  petPermission: boolean | null;
  adults: number | null;
  children: number | null;
  currentPets: object | null;
} {
  if (!blob || typeof blob !== 'object') {
    return {
      housingType: null,
      ownership: null,
      exteriorSpace: null,
      petPermission: null,
      adults: null,
      children: null,
      currentPets: null,
    };
  }
  const b = blob as Record<string, unknown>;
  const rawCurrentPets = b['currentPets'];
  return {
    housingType: typeof b['housingType'] === 'string' ? b['housingType'] : null,
    ownership: typeof b['ownership'] === 'string' ? b['ownership'] : null,
    exteriorSpace: typeof b['exteriorSpace'] === 'boolean' ? b['exteriorSpace'] : null,
    petPermission: typeof b['petPermission'] === 'boolean' ? b['petPermission'] : null,
    adults: typeof b['adults'] === 'number' ? b['adults'] : null,
    children: typeof b['children'] === 'number' ? b['children'] : null,
    currentPets:
      rawCurrentPets !== null && rawCurrentPets !== undefined && typeof rawCurrentPets === 'object'
        ? (rawCurrentPets as object)
        : null,
  };
}

function extractLifestyle(blob: unknown): {
  activityLevel: string | null;
  hoursAlone: number | null;
  adoptionReason: string | null;
  speciesExperience: string | null;
  previousPets: object | null;
  additionalContext: string | null;
} {
  if (!blob || typeof blob !== 'object') {
    return {
      activityLevel: null,
      hoursAlone: null,
      adoptionReason: null,
      speciesExperience: null,
      previousPets: null,
      additionalContext: null,
    };
  }
  const b = blob as Record<string, unknown>;
  const rawPreviousPets = b['previousPets'];
  return {
    activityLevel: typeof b['activityLevel'] === 'string' ? b['activityLevel'] : null,
    hoursAlone: typeof b['hoursAlone'] === 'number' ? b['hoursAlone'] : null,
    adoptionReason: typeof b['adoptionReason'] === 'string' ? b['adoptionReason'] : null,
    speciesExperience: typeof b['speciesExperience'] === 'string' ? b['speciesExperience'] : null,
    previousPets:
      rawPreviousPets !== null && rawPreviousPets !== undefined && typeof rawPreviousPets === 'object'
        ? (rawPreviousPets as object)
        : null,
    additionalContext: typeof b['additionalContext'] === 'string' ? b['additionalContext'] : null,
  };
}

// ---------------------------------------------------------------------------
// Counters for deployment-ready logging (PROFILE-03 acceptance criteria).
// ---------------------------------------------------------------------------
interface Counters {
  adoptersSeen: number;
  profilesInserted: number;
  profilesSkipped: number; // already existed (upsert update:{} is a no-op)
  profilesIncomplete: number; // completionPct < 100 after backfill
}

async function run(dryRun: boolean): Promise<Counters> {
  // Fetch the most-recent non-RETIRADA application per adopter.
  //
  // Prisma distinct + orderBy: The combination of `distinct: ['userId']` with
  // `orderBy: [{ userId: 'asc' }, { submittedAt: 'desc' }]` returns the
  // most-recent application for each unique userId (Pitfall 3 from CONTEXT.md).
  const latestApplications = await prisma.adoptionApplication.findMany({
    where: {
      status: { not: 'RETIRADA' },
    },
    distinct: ['userId'],
    orderBy: [
      { userId: 'asc' },
      { submittedAt: 'desc' },
    ],
    select: {
      id: true,
      userId: true,
      personalInfo: true,
      housing: true,
      lifestyle: true,
      additionalContext: true, // top-level field (outside blob) — some legacy rows store it here
    },
  });

  const counters: Counters = {
    adoptersSeen: latestApplications.length,
    profilesInserted: 0,
    profilesSkipped: 0,
    profilesIncomplete: 0,
  };

  if (dryRun) {
    console.log(`[dry-run] Would process ${counters.adoptersSeen} adopter(s).`);
  }

  for (const app of latestApplications) {
    const personal = extractPersonalInfo(app.personalInfo);
    const housing = extractHousing(app.housing);
    const lifestyle = extractLifestyle(app.lifestyle);

    // additionalContext: prefer lifestyle blob, fall back to the top-level
    // application column (some legacy rows store it directly).
    const additionalContext =
      lifestyle.additionalContext ??
      (typeof app.additionalContext === 'string' ? app.additionalContext : null);

    const profileData = {
      // Section 1: datos básicos
      phone: personal.phone,
      occupation: personal.occupation,
      birthDate: personal.birthDate,
      city: personal.city,
      // Section 2: hogar
      housingType: housing.housingType,
      ownership: housing.ownership,
      exteriorSpace: housing.exteriorSpace,
      petPermission: housing.petPermission,
      adults: housing.adults,
      children: housing.children,
      currentPets: housing.currentPets,
      // Section 3: estilo de vida
      activityLevel: lifestyle.activityLevel,
      hoursAlone: lifestyle.hoursAlone,
      adoptionReason: lifestyle.adoptionReason,
      // Section 4: experiencia general
      speciesExperience: lifestyle.speciesExperience,
      previousPets: lifestyle.previousPets,
      additionalContext,
    };

    const pct = computeCompletionPct({ ...profileData, photos: [] });

    if (dryRun) {
      console.log(
        `[dry-run] userId=${app.userId} → completionPct=${pct} (applicationId=${app.id})`,
      );
      if (pct < 100) counters.profilesIncomplete++;
      // In dry-run, count as "would insert" (we don't know if row exists)
      counters.profilesInserted++;
      continue;
    }

    // Check if profile already exists so we can increment the right counter.
    const existing = await prisma.adopterProfile.findUnique({
      where: { userId: app.userId },
      select: { id: true },
    });

    // Upsert with `update: {}` — idempotent, never overwrites a profile the
    // adopter already filled in via the new wizard (D-16 Pitfall 1).
    // `as any` cast: nullable JSON fields (currentPets, previousPets) require
    // `Prisma.JsonNull` for the explicit-null form, but Prisma also accepts
    // `null` at runtime. The cast avoids the type-only mismatch in a
    // platform-admin script that is never on the request path.
    await prisma.adopterProfile.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId,
        ...(profileData as any),
      },
      update: {},
    });

    if (existing) {
      counters.profilesSkipped++;
    } else {
      counters.profilesInserted++;
    }

    if (pct < 100) counters.profilesIncomplete++;
  }

  return counters;
}

function printSummary(counters: Counters, dryRun: boolean): void {
  console.log('');
  console.log('========================================');
  console.log('backfill-adopter-profiles — Summary');
  console.log('========================================');
  if (dryRun) {
    console.log('Mode: DRY-RUN (no DB writes)');
  }
  console.log(`Adopters seen (distinct non-RETIRADA):  ${counters.adoptersSeen}`);
  console.log(`Profiles inserted (new rows):           ${counters.profilesInserted}`);
  console.log(`Profiles skipped (row already existed): ${counters.profilesSkipped}`);
  console.log(`Profiles with completionPct < 100:      ${counters.profilesIncomplete}`);
  console.log('');
  if (counters.profilesIncomplete > 0) {
    console.log(
      `ACTION REQUIRED: ${counters.profilesIncomplete} adopter(s) will be blocked from applying until they complete their profile. ` +
        'Send a re-engagement email or let the new wizard guide them through completion.',
    );
  } else {
    console.log('All backfilled profiles are 100% complete.');
  }
  console.log('');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes(DRY_RUN_FLAG);

  console.log(
    `Mode: ${dryRun ? 'DRY-RUN (pass without --dry-run to write)' : 'WRITE — upserts AdopterProfile rows'}`,
  );
  console.log('');

  const counters = await run(dryRun);
  printSummary(counters, dryRun);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error('backfill-adopter-profiles failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
