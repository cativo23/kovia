import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { ClsService } from 'nestjs-cls';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { OrganizationsService } from './organizations.service';

/**
 * OrganizationsService Integration Tests (PATTERN-03)
 *
 * Proves the dual-client injection wiring is correct:
 *   - rlsBypassPrisma (PublicPrismaService) handles org-invite lookups and public reads
 *   - prisma (@Inject(PRISMA_RLS)) handles org-scoped writes
 *
 * Harness mirrors team.service.rls.integration.spec.ts exactly:
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
let organizationsService: OrganizationsService;

let ownerId: string;
let orgId: string;
let validToken: string;
let expiredToken: string;
let orgSlug: string;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `orgs-int-owner-${tag}@test.local`;

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

describe('OrganizationsService integration (PATTERN-03)', () => {
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
    orgSlug = `orgs-int-org-${tag}`;
    const org = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW()) RETURNING id`,
      [
        `Orgs Int Org ${tag}`,
        orgSlug,
        ownerId,
        `orgs-int-contact-${tag}@test.local`,
      ],
    );
    orgId = org.rows[0].id;

    // 3. UPDATE users SET orgId = orgId for ownerId
    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      orgId,
      ownerId,
    ]);

    // 4. INSERT one org_invite with a future expiresAt (valid token)
    // org_invites schema: id, email, orgName, token, expiresAt, acceptedAt, createdAt
    validToken = `valid-token-${tag}`;
    await superClient.query(
      `INSERT INTO org_invites (id, email, "orgName", token, "expiresAt", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW() + INTERVAL '1 day', NOW())`,
      [`orgs-int-invitee-${tag}@test.local`, `Orgs Int Org ${tag}`, validToken],
    );

    // 5. INSERT one org_invite with a past expiresAt (expired token)
    expiredToken = `expired-token-${tag}`;
    await superClient.query(
      `INSERT INTO org_invites (id, email, "orgName", token, "expiresAt", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW() - INTERVAL '1 day', NOW())`,
      [
        `orgs-int-expired-${tag}@test.local`,
        `Orgs Int Org ${tag}`,
        expiredToken,
      ],
    );

    // 6. Instantiate PrismaService + PublicPrismaService + createRlsExtension + clsStub
    prismaService = new PrismaService();
    await prismaService.onModuleInit();
    publicPrismaService = new PublicPrismaService();
    await publicPrismaService.onModuleInit();

    const clsStub = makeClsStub(ownerId, orgId);
    const rlsExtended = createRlsExtension(prismaService as any, clsStub as any);

    // 7. Instantiate OrganizationsService (simplest constructor — no additional stubs)
    organizationsService = new OrganizationsService(
      rlsExtended as any,
      publicPrismaService,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe order: org_invites → organizations → users
      await superClient.query(
        `DELETE FROM org_invites WHERE token IN ($1, $2)`,
        [validToken, expiredToken],
      );
      await superClient.query(`DELETE FROM organizations WHERE id = $1`, [
        orgId,
      ]);
      await superClient.query(`DELETE FROM users WHERE "orgId" = $1`, [orgId]);
      await superClient.end();
    }
    if (prismaService) await prismaService.onModuleDestroy();
    if (publicPrismaService) await publicPrismaService.onModuleDestroy();
  }, 30000);

  it('acceptInvite returns invite for valid token — rlsBypassPrisma path works', async () => {
    const invite = await organizationsService.acceptInvite(validToken);
    expect(invite).toBeDefined();
    expect(invite.token).toBe(validToken);
  });

  it('acceptInvite throws BadRequestException for expired token', async () => {
    await expect(
      organizationsService.acceptInvite(expiredToken),
    ).rejects.toThrow(BadRequestException);
  });

  it('findBySlug returns org by slug without RLS context', async () => {
    const org = await organizationsService.findBySlug(orgSlug);
    expect(org).toBeDefined();
    expect(org.id).toBe(orgId);
  });
});
