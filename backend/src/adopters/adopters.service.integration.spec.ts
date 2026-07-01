import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { AdoptersService } from './adopters.service';

/**
 * AdoptersService Integration Tests (PATTERN-03)
 *
 * Proves the dual-client injection wiring is correct:
 *   - prismaPublic (@Inject(PRISMA_PUBLIC)) handles cross-org reads
 *   - prismaRls (@Inject(PRISMA_RLS)) handles org-scoped authorization checks
 *
 * Harness mirrors animals.service.integration.spec.ts exactly:
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
let adoptersService: AdoptersService;

let adopterId: string;
let orgId: string;
let orgSlug: string;
let animalId: string;
let speciesId: string;
let applicationId: string;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adopterEmail = `adopters-int-adopter-${tag}@test.local`;
const ownerEmail = `adopters-int-owner-${tag}@test.local`;

// Not a real bcrypt hash — used only as a fixture value for DB INSERT.
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

describe('AdoptersService integration (PATTERN-03)', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    // 1. INSERT one ORG_ADMIN user (org owner)
    let ownerId: string;
    const owner = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW()) RETURNING id`,
      [ownerEmail, PW_HASH],
    );
    ownerId = owner.rows[0].id;

    // 2. INSERT organization with adminId = ownerId
    orgSlug = `adopters-int-org-${tag}`;
    const org = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW()) RETURNING id`,
      [
        `Adopters Int Org ${tag}`,
        orgSlug,
        ownerId,
        `adopters-int-contact-${tag}@test.local`,
      ],
    );
    orgId = org.rows[0].id;

    // 3. UPDATE owner's orgId
    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      orgId,
      ownerId,
    ]);

    // 4. INSERT one ADOPTER user
    const adopter = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW()) RETURNING id`,
      [adopterEmail, PW_HASH],
    );
    adopterId = adopter.rows[0].id;

    // 5. INSERT one species
    const speciesRow = await superClient.query(
      `INSERT INTO species (id, name, slug, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id`,
      [`Adopters Int Species ${tag}`, `adopters-int-species-${tag}`],
    );
    speciesId = speciesRow.rows[0].id;

    // 6. INSERT one animal (AVAILABLE)
    const animalRow = await superClient.query(
      `INSERT INTO animals (id, name, "speciesId", "organizationId", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'AVAILABLE', NOW(), NOW()) RETURNING id`,
      [`Adopters Int Animal ${tag}`, speciesId, orgId],
    );
    animalId = animalRow.rows[0].id;

    // 7. INSERT one adoption application (adopter → org animal)
    const appRow = await superClient.query(
      `INSERT INTO adoption_applications (id, "userId", "animalId", "organizationId", status, "submittedAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'SUBMITTED', NOW(), NOW()) RETURNING id`,
      [adopterId, animalId, orgId],
    );
    applicationId = appRow.rows[0].id;

    // 8. Instantiate PrismaService + PublicPrismaService + createRlsExtension + clsStub
    prismaService = new PrismaService();
    await prismaService.onModuleInit();
    publicPrismaService = new PublicPrismaService();
    await publicPrismaService.onModuleInit();

    const clsStub = makeClsStub(adopterId, orgId);
    const rlsExtended = createRlsExtension(prismaService as any, clsStub as any);

    // 9. Instantiate AdoptersService — takes (prismaRls, prismaPublic, cls)
    adoptersService = new AdoptersService(
      rlsExtended as any,
      publicPrismaService as any,
      clsStub,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe order: adoption_applications → animals → species → organizations → users
      await superClient.query(
        `DELETE FROM adoption_applications WHERE id = $1`,
        [applicationId],
      );
      await superClient.query(`DELETE FROM animals WHERE id = $1`, [animalId]);
      await superClient.query(`DELETE FROM species WHERE id = $1`, [speciesId]);
      await superClient.query(`DELETE FROM organizations WHERE id = $1`, [
        orgId,
      ]);
      await superClient.query(`DELETE FROM users WHERE email IN ($1, $2)`, [
        adopterEmail,
        ownerEmail,
      ]);
      await superClient.end();
    }
    if (prismaService) await prismaService.onModuleDestroy();
    if (publicPrismaService) await publicPrismaService.onModuleDestroy();
  }, 30000);

  it('getHistory returns applications via prismaPublic path — cross-org read works', async () => {
    const result = await adoptersService.getHistory(adopterId);
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.applications).toBeDefined();
    // The seeded application should be present
    const found = result.applications.find((a: any) => a.id === applicationId);
    expect(found).toBeDefined();
    expect(found!.isOwnOrg).toBe(true);
  });

  it('getSummary returns correct counts via prismaPublic path', async () => {
    const result = await adoptersService.getSummary(adopterId);
    expect(result).toBeDefined();
    expect(typeof result.totalApplications).toBe('number');
    expect(result.totalApplications).toBeGreaterThanOrEqual(1);
    expect(typeof result.adopted).toBe('number');
    expect(typeof result.returned).toBe('number');
  });
});
