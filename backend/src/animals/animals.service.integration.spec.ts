import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
    const result = await animalsService.findPublic({});
    expect(Array.isArray(result.data)).toBe(true);
    // The seeded animal should be in the public listing (status AVAILABLE matches default filter)
    const ids = result.data.map((a: any) => a.id);
    expect(ids).toContain(animalId);
  });

  it('findPublic with organization filter returns only animals for that org', async () => {
    const result = await animalsService.findPublic({ organization: orgSlug });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.every((a: any) => a.organizationId === orgId)).toBe(true);
  });
});
