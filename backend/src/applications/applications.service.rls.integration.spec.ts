import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import pg from 'pg';
import { ClsService } from 'nestjs-cls';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { ApplicationsService } from './applications.service';

/**
 * ApplicationsService RLS Integration Tests (D-14, TEST-02)
 *
 * Real-DB regression locks for the v2.0 B1 (cross-adopter exposure) bug class
 * AND for the partial unique index that allows withdraw → resubmit.
 *
 * Harness shape xeroxed from team.service.rls.integration.spec.ts:
 *   - Superuser pg.Client for fixture INSERTs (RLS-bypass)
 *   - Real PrismaService + PublicPrismaService for the SUT
 *   - Stubbed ClsService carrying the logged-in adopter context
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
let applicationsService: ApplicationsService;

let adopter1Id: string;
let adopter2Id: string;
let orgId: string;
let speciesId: string;
let animalId: string;
let app1Id: string;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adopter1Email = `rls-app-adopter1-${tag}@test.local`;
const adopter2Email = `rls-app-adopter2-${tag}@test.local`;
const orgSlug = `rls-app-org-${tag}`;

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

// Module-scoped CLS stub — its `userId` is mutated between tests so RLS context
// follows the test's "logged-in adopter".
let clsStub: ClsService;

const PW_HASH =
  '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV';

describe('ApplicationsService RLS integration', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    const adopter1 = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW()) RETURNING id`,
      [adopter1Email, PW_HASH],
    );
    adopter1Id = adopter1.rows[0].id;

    const adopter2 = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW()) RETURNING id`,
      [adopter2Email, PW_HASH],
    );
    adopter2Id = adopter2.rows[0].id;

    // Need an ORG_ADMIN to satisfy organizations.adminId NOT NULL — stand up a throwaway one.
    const ownerEmail = `rls-app-owner-${tag}@test.local`;
    const owner = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW()) RETURNING id`,
      [ownerEmail, PW_HASH],
    );
    const ownerId = owner.rows[0].id;

    const org = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW()) RETURNING id`,
      [`RLS App Org ${tag}`, orgSlug, ownerId, `contact-${tag}@test.local`],
    );
    orgId = org.rows[0].id;

    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      orgId,
      ownerId,
    ]);

    const speciesRow = await superClient.query(
      `INSERT INTO species (id, name, slug, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id`,
      [`RLS App Species ${tag}`, `rls-app-species-${tag}`],
    );
    speciesId = speciesRow.rows[0].id;

    const animalRow = await superClient.query(
      `INSERT INTO animals (id, name, "speciesId", "organizationId", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'AVAILABLE', NOW(), NOW()) RETURNING id`,
      [`RLS App Animal ${tag}`, speciesId, orgId],
    );
    animalId = animalRow.rows[0].id;

    // Seed application owned by adopter1 so list/detail tests have a target row.
    const app1 = await superClient.query(
      `INSERT INTO adoption_applications (id, "userId", "organizationId", "animalId", status, "submittedAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'ENVIADA', NOW(), NOW()) RETURNING id`,
      [adopter1Id, orgId, animalId],
    );
    app1Id = app1.rows[0].id;

    // Build the SUT. The `cls` userId is mutated between tests so we keep one
    // PrismaService / PublicPrismaService / extended client for the whole suite.
    prismaService = new PrismaService();
    await prismaService.onModuleInit();
    publicPrismaService = new PublicPrismaService();
    await publicPrismaService.onModuleInit();

    clsStub = makeClsStub(adopter1Id);
    const rlsExtended = createRlsExtension(prismaService as any, clsStub as any);

    const uploadStub: any = {};
    const auditStub: any = {
      log: vi.fn().mockResolvedValue(undefined),
      findByApplication: vi.fn().mockResolvedValue([]),
    };
    const queueStub: any = { add: vi.fn().mockResolvedValue(undefined) };
    const eventsStub: any = {
      emitApplicationSubmitted: vi.fn().mockResolvedValue(undefined),
      emitApplicationStatusChanged: vi.fn().mockResolvedValue(undefined),
      emitApplicationWithdrawn: vi.fn().mockResolvedValue(undefined),
      emitApplicationDevuelta: vi.fn().mockResolvedValue(undefined),
    };

    applicationsService = new ApplicationsService(
      rlsExtended as any,
      publicPrismaService,
      uploadStub,
      auditStub,
      clsStub as any,
      queueStub,
      eventsStub,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe order: notifications → photos → applications → animal → species → org → users.
      // Notifications use applicationId NULLABLE FK but we delete by userId for safety.
      await superClient.query(
        `DELETE FROM notifications WHERE "userId" IN ($1, $2)`,
        [adopter1Id, adopter2Id],
      );
      await superClient.query(
        `DELETE FROM application_photos WHERE "applicationId" IN (
           SELECT id FROM adoption_applications WHERE "userId" IN ($1, $2)
         )`,
        [adopter1Id, adopter2Id],
      );
      await superClient.query(
        `DELETE FROM adoption_applications WHERE "userId" IN ($1, $2)`,
        [adopter1Id, adopter2Id],
      );
      await superClient.query(`DELETE FROM animals WHERE id = $1`, [animalId]);
      await superClient.query(`DELETE FROM species WHERE id = $1`, [speciesId]);
      await superClient.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
      await superClient.query(
        `DELETE FROM users WHERE email IN ($1, $2) OR "orgId" = $3`,
        [adopter1Email, adopter2Email, orgId],
      );
      // Orphan owner cleanup (orgId now null after org delete cascade-restrict prevented;
      // org deleted first means owner row remains — drop by tag-derived email).
      await superClient.query(`DELETE FROM users WHERE email LIKE $1`, [
        `rls-app-owner-${tag}@%`,
      ]);
      await superClient.end();
    }
    if (prismaService) await prismaService.onModuleDestroy();
    if (publicPrismaService) await publicPrismaService.onModuleDestroy();
  }, 30000);

  it('list narrows by userId — adopter1 sees only own applications', async () => {
    clsStub.set('userId', adopter1Id);
    const result = await applicationsService.findMyApplications(adopter1Id, {});
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(
      result.data.every((r: any) => r.userId === adopter1Id),
    ).toBe(true);
  });

  it('detail allows own — findById returns application for owning adopter', async () => {
    clsStub.set('userId', adopter1Id);
    const own = await applicationsService.findById(app1Id, adopter1Id);
    expect(own.id).toBe(app1Id);
    expect(own.userId).toBe(adopter1Id);
  });

  it('blocks cross-adopter detail read — findById(app1Id, adopter2Id) throws ForbiddenException', async () => {
    clsStub.set('userId', adopter2Id);
    await expect(
      applicationsService.findById(app1Id, adopter2Id),
    ).rejects.toThrow(ForbiddenException);
  });

  it('withdraw → resubmit succeeds — RETIRADA status permits second create() per partial unique index', async () => {
    clsStub.set('userId', adopter1Id);

    // Withdraw the seeded ENVIADA application — flips it to RETIRADA.
    await applicationsService.withdraw(app1Id, adopter1Id);

    // Resubmit against the same (animalId, adopter1Id) pair.
    const resubmitted = await applicationsService.create(
      {
        animalId,
        personalInfo: { fullName: 'Resub Adopter' },
        housing: { type: 'house' },
        lifestyle: { activity: 'medium' },
      } as any,
      { id: adopter1Id, email: adopter1Email },
    );
    expect(resubmitted.id).toBeDefined();
    expect(resubmitted.id).not.toBe(app1Id);

    // Verify exactly two rows now, exactly one of which is non-RETIRADA.
    const rows = await superClient.query(
      `SELECT status FROM adoption_applications WHERE "animalId" = $1 AND "userId" = $2`,
      [animalId, adopter1Id],
    );
    expect(rows.rows.length).toBe(2);
    const activeRows = rows.rows.filter((r: any) => r.status !== 'RETIRADA');
    expect(activeRows.length).toBe(1);
  });

  it('rejects duplicate active application via partial unique index — third create() against same (animalId,userId) while one active row exists throws ConflictException', async () => {
    clsStub.set('userId', adopter1Id);

    // State at this point (preserves declaration order within the describe):
    //   Row A: status RETIRADA (the original, post-withdraw)
    //   Row B: status ENVIADA  (the resubmit)
    // A third create() against (animalId, adopter1Id) must be rejected by
    // applications.service.ts:64-80 because Row B is still active.
    await expect(
      applicationsService.create(
        {
          animalId,
          personalInfo: { fullName: 'Triple Adopter' },
          housing: { type: 'house' },
          lifestyle: { activity: 'low' },
        } as any,
        { id: adopter1Id, email: adopter1Email },
      ),
    ).rejects.toThrow(ConflictException);
  });
});
