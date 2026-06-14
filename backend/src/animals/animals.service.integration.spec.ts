import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import pg from 'pg';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { AnimalsService } from './animals.service';

/**
 * AnimalsService Integration Tests (PATTERN-03)
 *
 * Proves the dual-client injection wiring is correct:
 *   - rlsBypassPrisma (PublicPrismaService) handles public reads (findPublic)
 *   - prismaRls (@Inject(PRISMA_RLS)) handles org-scoped writes
 *
 * Harness mirrors applications.service.rls.integration.spec.ts exactly:
 *   - Superuser pg.Client for fixture INSERTs (RLS-bypass)
 *   - Real PrismaService + PublicPrismaService for the SUT
 *   - Stubbed ClsService
 *   - Tag-suffix isolation (Date.now + random slice)
 *   - FK-safe DELETE in afterAll (no truncation, no transaction rollback)
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
let prismaService: PrismaService;
let publicPrismaService: PublicPrismaService;
let animalsService: AnimalsService;

let ownerId: string;
let orgId: string;
let speciesId: string;
let animalId: string;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `animals-int-owner-${tag}@test.local`;
const orgSlug = `animals-int-org-${tag}`;

const PW_HASH = '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV';

function makeClsStub(userId: string, organizationId?: string): ClsService {
  const store: Record<string, any> = { userId, organizationId, isAdmin: false };
  const stub: any = {
    get: (k: string) => store[k],
    set: (k: string, v: any) => {
      store[k] = v;
    },
    run: (_ctx: any, fn: any) => fn(),
    runWith: (_ctx: any, fn: any) => fn(),
    enter: () => {},
    exit: () => {},
    isActive: () => true,
  };
  return stub as ClsService;
}

let clsStub: ClsService;

describe('AnimalsService integration (PATTERN-03)', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    // 1. INSERT one ORG_ADMIN user (owner)
    const owner = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW()) RETURNING id`,
      [ownerEmail, PW_HASH],
    );
    ownerId = owner.rows[0].id;

    // 2. INSERT organization with adminId = ownerId
    const org = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW()) RETURNING id`,
      [
        `Animals Int Org ${tag}`,
        orgSlug,
        ownerId,
        `animals-int-contact-${tag}@test.local`,
      ],
    );
    orgId = org.rows[0].id;

    // 3. UPDATE users SET orgId = orgId for ownerId
    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      orgId,
      ownerId,
    ]);

    // 4. INSERT one species
    const speciesRow = await superClient.query(
      `INSERT INTO species (id, name, slug, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id`,
      [`Animals Int Species ${tag}`, `animals-int-species-${tag}`],
    );
    speciesId = speciesRow.rows[0].id;

    // 5. INSERT one animal (status AVAILABLE, linked to org and species)
    const animalRow = await superClient.query(
      `INSERT INTO animals (id, name, "speciesId", "organizationId", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'AVAILABLE', NOW(), NOW()) RETURNING id`,
      [`Animals Int Animal ${tag}`, speciesId, orgId],
    );
    animalId = animalRow.rows[0].id;

    // 6. Instantiate PrismaService + PublicPrismaService + createRlsExtension + clsStub
    prismaService = new PrismaService();
    await prismaService.onModuleInit();
    publicPrismaService = new PublicPrismaService();
    await publicPrismaService.onModuleInit();

    clsStub = makeClsStub(ownerId, orgId);
    const rlsExtended = createRlsExtension(prismaService as any, clsStub as any);

    // 7. Instantiate AnimalsService with all required dependencies
    const uploadStub: any = {
      getPresignedUrl: vi.fn(),
      deleteFile: vi.fn(),
      deleteObject: vi.fn(),
    };
    const auditStub: any = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    animalsService = new AnimalsService(
      rlsExtended as any,
      publicPrismaService,
      uploadStub,
      auditStub,
      clsStub,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe order: animal_photos → animals → species → organizations → users
      await superClient.query(
        `DELETE FROM animal_photos WHERE "animalId" = $1`,
        [animalId],
      );
      await superClient.query(`DELETE FROM animals WHERE id = $1`, [animalId]);
      await superClient.query(`DELETE FROM species WHERE id = $1`, [speciesId]);
      await superClient.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
      await superClient.query(`DELETE FROM users WHERE "orgId" = $1`, [orgId]);
      await superClient.end();
    }
    if (prismaService) await prismaService.onModuleDestroy();
    if (publicPrismaService) await publicPrismaService.onModuleDestroy();
  }, 30000);

  it('findPublic returns animals without RLS context — publicPrisma path works', async () => {
    // Filter by orgSlug to avoid pagination sensitivity: default limit=12 would fail
    // if >12 AVAILABLE animals exist in the DB (e.g. shared dev environment with seed data).
    const result = await animalsService.findPublic({ organization: orgSlug });
    expect(Array.isArray(result.data)).toBe(true);
    // The seeded animal should be in the result scoped to this org
    const ids = result.data.map((a: any) => a.id);
    expect(ids).toContain(animalId);
  });

  it('findPublic with organization filter returns only animals for that org', async () => {
    const result = await animalsService.findPublic({ organization: orgSlug });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.every((a: any) => a.organizationId === orgId)).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 15 plan 02 — dossier behavior assertions
  // (PATTERN-02 runtime smoke for dossierComplete + dossierVersion logic).
  // ──────────────────────────────────────────────────────────────────────────
  describe('update() dossier behavior (Phase 15 plan 02)', () => {
    // Reset the seeded animal's dossier state before every test so each
    // assertion starts from a known-blank baseline (dossierVersion=1,
    // dossierComplete=false, all dossier columns NULL / empty).
    beforeEach(async () => {
      await superClient.query(
        `UPDATE animals
            SET "adoptionCategory"     = NULL,
                "behavioralEvaluation" = NULL,
                "medicalHistory"       = NULL,
                "monthlyCostUsdMin"    = NULL,
                "monthlyCostUsdMax"    = NULL,
                "knownTriggers"        = ARRAY[]::TEXT[],
                "shelterEntryDate"     = NULL,
                "dossierComplete"      = false,
                "dossierVersion"       = 1
          WHERE id = $1`,
        [animalId],
      );
    });

    it('update() flips dossierComplete=true and bumps dossierVersion when all 5 required fields set', async () => {
      const before = await superClient.query(
        `SELECT "dossierVersion", "dossierComplete" FROM animals WHERE id = $1`,
        [animalId],
      );
      expect(before.rows[0].dossierComplete).toBe(false);
      const prevVersion = before.rows[0].dossierVersion;

      await animalsService.update(
        animalId,
        {
          adoptionCategory: 'SALUDABLE_ADULTO',
          behavioralEvaluation: 'Friendly adult dog, walks calmly on leash.',
          medicalHistory: 'Vaccinated, sterilized, no chronic conditions.',
          monthlyCostUsdMin: 50,
          shelterEntryDate: new Date('2026-04-01'),
        },
        ownerId,
      );

      const after = await superClient.query(
        `SELECT "dossierVersion", "dossierComplete" FROM animals WHERE id = $1`,
        [animalId],
      );
      expect(after.rows[0].dossierComplete).toBe(true);
      expect(after.rows[0].dossierVersion).toBe(prevVersion + 1);
    });

    it('update() leaves dossierComplete=false when only some required fields set', async () => {
      // Only 2 of 5 required fields set — completion criterion not met.
      await animalsService.update(
        animalId,
        {
          behavioralEvaluation: 'Energetic but trainable.',
          medicalHistory: 'Healthy adult.',
        },
        ownerId,
      );

      const after = await superClient.query(
        `SELECT "dossierVersion", "dossierComplete" FROM animals WHERE id = $1`,
        [animalId],
      );
      expect(after.rows[0].dossierComplete).toBe(false);
      // Version still bumped because dossier fields were touched (D-09).
      expect(after.rows[0].dossierVersion).toBe(2);
    });

    it('update() bumps dossierVersion when any dossier field changes (even optional ones)', async () => {
      // Only the optional `knownTriggers` array is touched. dossierComplete must
      // remain false (no required fields set) but the version must still bump.
      await animalsService.update(
        animalId,
        {
          knownTriggers: ['ruidos fuertes', 'visitas inesperadas'],
        },
        ownerId,
      );

      const after = await superClient.query(
        `SELECT "dossierVersion", "dossierComplete", "knownTriggers" FROM animals WHERE id = $1`,
        [animalId],
      );
      expect(after.rows[0].dossierVersion).toBe(2);
      expect(after.rows[0].dossierComplete).toBe(false);
      expect(after.rows[0].knownTriggers).toEqual([
        'ruidos fuertes',
        'visitas inesperadas',
      ]);
    });

    it('update() does NOT bump dossierVersion when no dossier fields in payload', async () => {
      // Touch a non-dossier field only.
      await animalsService.update(
        animalId,
        { name: `Animals Int Animal ${tag} renamed` },
        ownerId,
      );

      const after = await superClient.query(
        `SELECT "dossierVersion", "dossierComplete", name FROM animals WHERE id = $1`,
        [animalId],
      );
      expect(after.rows[0].dossierVersion).toBe(1); // unchanged
      expect(after.rows[0].name).toBe(`Animals Int Animal ${tag} renamed`);
    });

    it('update() ignores client-supplied dossierComplete (T-15-06 mitigation)', async () => {
      // Attempt to flip dossierComplete=true via the raw service surface
      // without filling the 5 required fields. The service must strip the key
      // before reaching Prisma, AND its server-side recompute must override
      // it with the true (computed) value, which is false here.
      const malicious = { dossierComplete: true } as any;
      await animalsService.update(animalId, malicious, ownerId);

      const after = await superClient.query(
        `SELECT "dossierVersion", "dossierComplete" FROM animals WHERE id = $1`,
        [animalId],
      );
      expect(after.rows[0].dossierComplete).toBe(false);
      // No dossier fields were touched → no version bump expected.
      expect(after.rows[0].dossierVersion).toBe(1);
    });
  });
});
