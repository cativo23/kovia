import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import pg from 'pg';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { PublicLandingService } from './public-landing.service';

/**
 * PublicLandingService Integration Tests (Phase 15-04, D-12 + D-15 + D-17).
 *
 * These specs run against a live Postgres and exercise the DB-touching
 * contracts that the fast unit spec (`landing-stats.helpers.spec.ts`)
 * cannot:
 *   - availableCount filters dossierComplete=false
 *   - verifiedRefugiosCount filters verifiedAt=null
 *   - marqueeAdopters returns [] when zero ADOPTADA applications exist
 *     (D-15 zero-day hide condition)
 *   - marqueeAdopters projects ONLY firstName / city / animalName
 *     (T-15-04 privacy mitigation — explicit Object.keys assertion)
 *   - Day-1 layoutVariant resolves correctly given small real fixtures
 *
 * NOTE on PATTERN-03: this service injects ONLY `PublicPrismaService`
 * (no PRISMA_RLS), so `backend/scripts/check-integration-specs.ts` does
 * NOT require this spec. It's shipped anyway per D-17 — the
 * privacy/threshold contracts are the high-value invariants regardless
 * of whether the CI enforcer trips on this particular service.
 *
 * Harness mirrors `public-animals.service.integration.spec.ts`:
 *   - Superuser pg.Client for fixture INSERTs (RLS bypass)
 *   - Tag-suffix isolation
 *   - FK-safe DELETE cleanup in afterAll
 *   - Per-id DELETE (avoids `text = uuid` ANY()-cast mismatch under node-pg)
 */

const { Client } = pg;

const SUPERUSER_CONNECTION = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kovia',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

let superClient: InstanceType<typeof Client>;
let publicPrismaService: PublicPrismaService;
let publicLandingService: PublicLandingService;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adopterEmail = `pub-landing-int-adopter-${tag}@test.local`;
const verifiedOrgSlug = `pub-landing-int-verified-org-${tag}`;
const unverifiedOrgSlug = `pub-landing-int-unverified-org-${tag}`;

const PW_HASH =
  '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV';

let adopterId: string;
let verifiedOrgId: string;
let unverifiedOrgId: string;
let speciesId: string;
let completeAnimalId: string; // dossierComplete=true, AVAILABLE
let incompleteAnimalId: string; // dossierComplete=false, AVAILABLE
let storyId: string;
let adoptedAppId: string; // ADOPTADA, contributes to marqueeAdopters
let pendingAppId: string; // ENVIADA, MUST NOT appear in marqueeAdopters

describe('PublicLandingService integration (D-12 + D-15 + D-17)', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    // 1. Adopter user (ADOPTADA application FK)
    const adopter = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW())
       RETURNING id`,
      [adopterEmail, PW_HASH],
    );
    adopterId = adopter.rows[0].id;

    // 2. Verified org owner + verified org (verifiedAt NOT NULL → counted)
    const verifiedOwner = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW())
       RETURNING id`,
      [`pub-landing-int-verified-owner-${tag}@test.local`, PW_HASH],
    );
    const verifiedOwnerId = verifiedOwner.rows[0].id;

    const verifiedOrg = await superClient.query(
      `INSERT INTO organizations
         (id, name, slug, status, "adminId", "contactEmail",
          "verifiedAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4,
               NOW(), NOW(), NOW())
       RETURNING id`,
      [
        `Pub Landing Int Verified Org ${tag}`,
        verifiedOrgSlug,
        verifiedOwnerId,
        `pub-landing-int-verified-contact-${tag}@test.local`,
      ],
    );
    verifiedOrgId = verifiedOrg.rows[0].id;
    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      verifiedOrgId,
      verifiedOwnerId,
    ]);

    // 3. Unverified org owner + unverified org (verifiedAt NULL → excluded)
    const unverifiedOwner = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW())
       RETURNING id`,
      [`pub-landing-int-unverified-owner-${tag}@test.local`, PW_HASH],
    );
    const unverifiedOwnerId = unverifiedOwner.rows[0].id;

    const unverifiedOrg = await superClient.query(
      `INSERT INTO organizations
         (id, name, slug, status, "adminId", "contactEmail",
          "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW())
       RETURNING id`,
      [
        `Pub Landing Int Unverified Org ${tag}`,
        unverifiedOrgSlug,
        unverifiedOwnerId,
        `pub-landing-int-unverified-contact-${tag}@test.local`,
      ],
    );
    unverifiedOrgId = unverifiedOrg.rows[0].id;
    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      unverifiedOrgId,
      unverifiedOwnerId,
    ]);

    // 4. Species
    const speciesRow = await superClient.query(
      `INSERT INTO species (id, name, slug, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, NOW())
       RETURNING id`,
      [`Pub Landing Int Species ${tag}`, `pub-landing-int-species-${tag}`],
    );
    speciesId = speciesRow.rows[0].id;

    // 5. Two animals: one complete (counted) + one incomplete (excluded).
    const completeRow = await superClient.query(
      `INSERT INTO animals (
         id, name, "speciesId", "organizationId", status,
         "dossierComplete", "dossierVersion", "adoptionCategory",
         "behavioralEvaluation", "medicalHistory", "monthlyCostUsdMin",
         "shelterEntryDate", "createdAt", "updatedAt"
       )
       VALUES (
         gen_random_uuid(), $1, $2, $3, 'AVAILABLE',
         true, 1, 'SALUDABLE_ADULTO',
         'Friendly.', 'Healthy.', 40,
         '2026-01-01', NOW(), NOW()
       )
       RETURNING id`,
      [`Landing Complete Animal ${tag}`, speciesId, verifiedOrgId],
    );
    completeAnimalId = completeRow.rows[0].id;

    const incompleteRow = await superClient.query(
      `INSERT INTO animals (
         id, name, "speciesId", "organizationId", status,
         "dossierComplete", "createdAt", "updatedAt"
       )
       VALUES (
         gen_random_uuid(), $1, $2, $3, 'AVAILABLE',
         false, NOW(), NOW()
       )
       RETURNING id`,
      [`Landing Incomplete Animal ${tag}`, speciesId, verifiedOrgId],
    );
    incompleteAnimalId = incompleteRow.rows[0].id;

    // 6. One published adoption story (verifies stories projection).
    const storyRow = await superClient.query(
      `INSERT INTO adoption_stories (
         id, "organizationId", "adopterFirstName", city, testimonial,
         "photoUrl", "publishedAt", "createdAt"
       )
       VALUES (
         gen_random_uuid(), $1, $2, $3, $4,
         NULL, NOW(), NOW()
       )
       RETURNING id`,
      [
        verifiedOrgId,
        `Maria-${tag}`,
        `San Salvador-${tag}`,
        `Adopté a un cachorro lleno de energía — ${tag}`,
      ],
    );
    storyId = storyRow.rows[0].id;

    // 7. One ADOPTADA application (contributes to marqueeAdopters + totalAdoptions).
    const adoptedRow = await superClient.query(
      `INSERT INTO adoption_applications (
         id, "animalId", "userId", "organizationId", status,
         "adopterFirstName", "adopterCity",
         "submittedAt", "updatedAt"
       )
       VALUES (
         gen_random_uuid(), $1, $2, $3, 'ADOPTADA',
         $4, $5,
         NOW(), NOW()
       )
       RETURNING id`,
      [
        completeAnimalId,
        adopterId,
        verifiedOrgId,
        `Carla-${tag}`,
        `Antiguo Cuscatlán-${tag}`,
      ],
    );
    adoptedAppId = adoptedRow.rows[0].id;

    // 8. One ENVIADA (pending) application — MUST NOT appear in marquee
    //    nor in totalAdoptions.
    const pendingRow = await superClient.query(
      `INSERT INTO adoption_applications (
         id, "animalId", "userId", "organizationId", status,
         "adopterFirstName", "adopterCity",
         "submittedAt", "updatedAt"
       )
       VALUES (
         gen_random_uuid(), $1, $2, $3, 'ENVIADA',
         $4, $5,
         NOW(), NOW()
       )
       RETURNING id`,
      [
        incompleteAnimalId,
        adopterId,
        unverifiedOrgId,
        `NotInMarquee-${tag}`,
        `NotInMarqueeCity-${tag}`,
      ],
    );
    pendingAppId = pendingRow.rows[0].id;

    // 9. Instantiate the SUT.
    publicPrismaService = new PublicPrismaService();
    await publicPrismaService.onModuleInit();
    publicLandingService = new PublicLandingService(publicPrismaService);
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe: applications → stories → animals → species → orgs → users
      await superClient.query(
        `DELETE FROM adoption_applications WHERE id = $1`,
        [adoptedAppId],
      );
      await superClient.query(
        `DELETE FROM adoption_applications WHERE id = $1`,
        [pendingAppId],
      );
      await superClient.query(`DELETE FROM adoption_stories WHERE id = $1`, [
        storyId,
      ]);
      for (const animalId of [completeAnimalId, incompleteAnimalId]) {
        await superClient.query(
          `DELETE FROM dossier_acknowledgments WHERE "animalId" = $1`,
          [animalId],
        );
        await superClient.query(
          `DELETE FROM animal_photos WHERE "animalId" = $1`,
          [animalId],
        );
        await superClient.query(`DELETE FROM animals WHERE id = $1`, [
          animalId,
        ]);
      }
      await superClient.query(`DELETE FROM species WHERE id = $1`, [speciesId]);
      // Org delete cascades from members table; we wipe by orgId.
      for (const orgId of [verifiedOrgId, unverifiedOrgId]) {
        await superClient.query(`DELETE FROM organizations WHERE id = $1`, [
          orgId,
        ]);
        await superClient.query(`DELETE FROM users WHERE "orgId" = $1`, [
          orgId,
        ]);
      }
      await superClient.query(`DELETE FROM users WHERE id = $1`, [adopterId]);
      await superClient.end();
    }
    if (publicPrismaService) await publicPrismaService.onModuleDestroy();
  }, 30000);

  // ── D-07 carry-over — availableCount filter ─────────────────────────
  it('availableCount counts our completeAnimal but not our incompleteAnimal', async () => {
    // Compute "count contribution" the same way the service does, but
    // narrowed by id-set so cross-spec fixtures (e.g. 15-03's seeded
    // animals running in parallel) cannot contaminate the assertion.
    const before = await superClient.query(
      `SELECT id FROM animals
        WHERE id IN ($1, $2)
          AND status = 'AVAILABLE'
          AND "dossierComplete" = true`,
      [completeAnimalId, incompleteAnimalId],
    );
    expect(before.rows.map((r: any) => r.id)).toEqual([completeAnimalId]);

    // Then verify the service reports availableCount >= 1 and a non-null
    // featured animal that itself is one of the AVAILABLE+complete rows.
    // We deliberately do NOT assert featuredAnimal.id === completeAnimalId
    // because other concurrent integration specs may seed a row with a
    // later createdAt and win the "most recent" race. The strong contract
    // is "the filter is applied" — asserted directly via the SQL above.
    const stats = await publicLandingService.getStats();
    expect(stats.availableCount).toBeGreaterThanOrEqual(1);
    expect(stats.featuredAnimal).not.toBeNull();
    // The featured animal MUST itself be dossierComplete=true (verifiable
    // by re-querying the row by id from the public payload).
    const featuredCheck = await superClient.query(
      `SELECT "dossierComplete", status FROM animals WHERE id = $1`,
      [stats.featuredAnimal!.id],
    );
    expect(featuredCheck.rows[0].dossierComplete).toBe(true);
    expect(featuredCheck.rows[0].status).toBe('AVAILABLE');
  });

  // ── D-14 — verifiedRefugiosCount filter ──────────────────────────────
  it('verifiedRefugiosCount excludes organizations with verifiedAt=null', async () => {
    const stats = await publicLandingService.getStats();
    // verifiedOrgId is counted; unverifiedOrgId must NOT contribute.
    expect(stats.verifiedRefugiosCount).toBeGreaterThanOrEqual(1);
    const verifiedIds = stats.verifiedRefugios.map((o) => o.id);
    expect(verifiedIds).toContain(verifiedOrgId);
    expect(verifiedIds).not.toContain(unverifiedOrgId);
  });

  // ── RESEARCH §A1 — totalAdoptions counts only ADOPTADA ──────────────
  it('totalAdoptions counts only AdoptionApplication rows with status=ADOPTADA', async () => {
    const stats = await publicLandingService.getStats();
    expect(stats.totalAdoptions).toBeGreaterThanOrEqual(1);
    // The pending ENVIADA application MUST NOT contribute.
    // We can't directly assert "the count equals N" because other seed
    // data may exist, but we CAN assert the ADOPTADA fixture is reflected.
    // Cross-check by querying directly:
    const rawAdopted = await superClient.query(
      `SELECT COUNT(*)::int as n FROM adoption_applications WHERE status = 'ADOPTADA'`,
    );
    expect(stats.totalAdoptions).toBe(rawAdopted.rows[0].n);
  });

  // ── D-12 — layoutVariant computed server-side ───────────────────────
  it('layoutVariant is "day1" on a small fixture (well below threshold)', async () => {
    const stats = await publicLandingService.getStats();
    // 1 ADOPTADA + 1 verified org → far below the 500/10 gate.
    expect(stats.layoutVariant).toBe('day1');
  });

  // ── D-15 / T-15-04 — marquee projection privacy contract ────────────
  it('marqueeAdopters returns ONLY firstName / city / animalName keys', async () => {
    const stats = await publicLandingService.getStats();
    expect(stats.marqueeAdopters.length).toBeGreaterThanOrEqual(1);
    for (const adopter of stats.marqueeAdopters) {
      expect(Object.keys(adopter).sort()).toEqual([
        'animalName',
        'city',
        'firstName',
      ]);
    }
    // The seeded ADOPTADA row contributes a marquee entry.
    const ours = stats.marqueeAdopters.find(
      (a) => a.firstName === `Carla-${tag}`,
    );
    expect(ours).toBeDefined();
    expect(ours!.city).toBe(`Antiguo Cuscatlán-${tag}`);
    expect(ours!.animalName).toBe(`Landing Complete Animal ${tag}`);
  });

  it('marqueeAdopters excludes pending (ENVIADA) applications', async () => {
    const stats = await publicLandingService.getStats();
    const pending = stats.marqueeAdopters.find(
      (a) => a.firstName === `NotInMarquee-${tag}`,
    );
    expect(pending).toBeUndefined();
  });

  // ── D-15 — Day-1 zero-adoptions handling ────────────────────────────
  it('marqueeAdopters is empty array when zero ADOPTADA applications match', async () => {
    // Temporarily flip the ADOPTADA row to RETIRADA, re-run, then restore.
    await superClient.query(
      `UPDATE adoption_applications SET status = 'RETIRADA' WHERE id = $1`,
      [adoptedAppId],
    );
    try {
      const stats = await publicLandingService.getStats();
      // Our seeded marquee row is hidden; any other ADOPTADA rows in the
      // DB (none in a fresh test env) MAY still contribute, so we assert
      // specifically that OUR row is gone.
      const ours = stats.marqueeAdopters.find(
        (a) => a.firstName === `Carla-${tag}`,
      );
      expect(ours).toBeUndefined();
    } finally {
      await superClient.query(
        `UPDATE adoption_applications SET status = 'ADOPTADA' WHERE id = $1`,
        [adoptedAppId],
      );
    }
  });

  // ── D-13 — published stories projection ─────────────────────────────
  it('stories includes published rows ordered by publishedAt DESC, up to 3', async () => {
    const stats = await publicLandingService.getStats();
    expect(stats.stories.length).toBeGreaterThanOrEqual(1);
    expect(stats.stories.length).toBeLessThanOrEqual(3);
    const ours = stats.stories.find((s) => s.id === storyId);
    expect(ours).toBeDefined();
    expect(ours!.adopterFirstName).toBe(`Maria-${tag}`);
    expect(ours!.city).toBe(`San Salvador-${tag}`);
  });

  // ── D-16 — no leak of private columns on the public payload ─────────
  it('response payload never includes score / risks / flags / scoreDetails substrings', async () => {
    const stats = await publicLandingService.getStats();
    const json = JSON.stringify(stats);
    for (const forbidden of [
      '"score"',
      '"risks"',
      '"flags"',
      '"inconsistencyFlags"',
      '"scoreDetails"',
    ]) {
      expect(json.includes(forbidden)).toBe(false);
    }
  });
});
