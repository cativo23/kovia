import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import pg from 'pg';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { TeamService } from './team.service';
import { ConflictException } from '@nestjs/common';

/**
 * Team Service RLS Integration Tests
 *
 * Reproduces UAT-surfaced RLS-blindness bugs in TeamService:
 *   - D-06 invite conflict-of-interest silently bypassed.
 *   - listMembers returning only the caller's own row.
 *   - changeRole / removeMember failing to see the target user.
 *
 * Uses a real Postgres (as configured for the backend container) and
 * constructs TeamService with the real Prisma clients + a stubbed
 * ClsService that carries the logged-in ORG_ADMIN context.
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
let teamService: TeamService;

let adminId: string;
let staffId: string;
let adopterId: string;
let orgId: string;
let applicationId: string;
let speciesId: string;
let animalId: string;

const tag = Date.now().toString();
const adminEmail = `rls-team-admin-${tag}@test.local`;
const staffEmail = `rls-team-staff-${tag}@test.local`;
const adopterEmail = `rls-team-adopter-${tag}@test.local`;
const orgSlug = `rls-team-org-${tag}`;

function makeClsStub(userId: string, organizationId: string): ClsService {
  // TeamService depends on PRISMA_RLS which is built with createRlsExtension(prisma, cls).
  // Only `get` is used by the extension; the rest can be no-ops.
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

describe('TeamService RLS integration', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    // Bcrypt hash for 'password123!' — value not exercised here.
    const PW_HASH =
      '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV';

    const admin = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW()) RETURNING id`,
      [adminEmail, PW_HASH],
    );
    adminId = admin.rows[0].id;

    const staff = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_STAFF', true, true, NOW(), NOW()) RETURNING id`,
      [staffEmail, PW_HASH],
    );
    staffId = staff.rows[0].id;

    const adopter = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW()) RETURNING id`,
      [adopterEmail, PW_HASH],
    );
    adopterId = adopter.rows[0].id;

    const org = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW()) RETURNING id`,
      [`RLS Team Org ${tag}`, orgSlug, adminId, `contact-${tag}@test.local`],
    );
    orgId = org.rows[0].id;

    // Attach admin + staff to org.
    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id IN ($2, $3)`, [
      orgId,
      adminId,
      staffId,
    ]);

    // Create a minimal species + animal so the adoption application FK holds.
    const speciesRow = await superClient.query(
      `INSERT INTO species (id, name, slug, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id`,
      [`RLS Species ${tag}`, `rls-species-${tag}`],
    );
    speciesId = speciesRow.rows[0].id;

    const animalRow = await superClient.query(
      `INSERT INTO animals (id, name, "speciesId", "organizationId", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'AVAILABLE', NOW(), NOW()) RETURNING id`,
      [`RLS Animal ${tag}`, speciesId, orgId],
    );
    animalId = animalRow.rows[0].id;

    // Pending ENVIADA application at the org for the adopter — feeds D-06 test.
    const app = await superClient.query(
      `INSERT INTO adoption_applications (id, "userId", "organizationId", "animalId", status, "submittedAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'ENVIADA', NOW(), NOW()) RETURNING id`,
      [adopterId, orgId, animalId],
    );
    applicationId = app.rows[0].id;

    // Build the real services — wires the exact DI the Nest module uses.
    prismaService = new PrismaService();
    await prismaService.onModuleInit();
    publicPrismaService = new PublicPrismaService();
    await publicPrismaService.onModuleInit();

    const cls = makeClsStub(adminId, orgId);
    const rlsExtended = createRlsExtension(prismaService as any, cls as any);

    const auditStub: any = { log: vi.fn().mockResolvedValue(undefined) };
    const mailStub: any = { send: vi.fn().mockResolvedValue(undefined) };
    const configStub: any = { get: vi.fn().mockReturnValue('http://localhost:3000') };
    const authStub: any = {
      generateTokens: vi
        .fn()
        .mockResolvedValue({ accessToken: 'jwt', refreshToken: 'rt' }),
    };

    // NOTE: we wire BOTH the PRISMA_RLS-extended client and the legacy
    // `publicPrisma` (which is PrismaService-bound, app_user, RLS-enforced)
    // through the extended client in the test harness. In production, the
    // non-extended PrismaService can still leak CLS-set `SET LOCAL` context
    // across a pooled connection when the same adapter connection was
    // recently used by the extended client (empirically confirmed by live
    // UAT: D-06 bypassed, listMembers blind, changeRole blind). Using the
    // extended client for both reproduces that production RLS exposure
    // deterministically under test.
    teamService = new TeamService(
      rlsExtended as any,
      rlsExtended as any,
      auditStub,
      mailStub,
      configStub,
      authStub,
      publicPrismaService,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // Clean up in FK-safe order.
      await superClient.query(
        `DELETE FROM team_invites WHERE "orgId" = $1`,
        [orgId],
      );
      await superClient.query(
        `DELETE FROM adoption_applications WHERE id = $1`,
        [applicationId],
      );
      await superClient.query(`DELETE FROM animals WHERE id = $1`, [animalId]);
      await superClient.query(`DELETE FROM species WHERE id = $1`, [speciesId]);
      await superClient.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
      await superClient.query(
        `DELETE FROM users WHERE email IN ($1, $2, $3)`,
        [adminEmail, staffEmail, adopterEmail],
      );
      await superClient.end();
    }
    if (prismaService) await prismaService.onModuleDestroy();
    if (publicPrismaService) await publicPrismaService.onModuleDestroy();
  }, 30000);

  it('Test A: D-06 conflict-of-interest — invite of applicant with pending application is blocked', async () => {
    await expect(
      teamService.createInvite(
        { email: adopterEmail, role: 'ORG_STAFF' },
        adminId,
        orgId,
      ),
    ).rejects.toThrow(
      /este usuario tiene una solicitud pendiente en tu organización — resuélvela antes de invitarlo/,
    );
  });

  it('Test B: listMembers returns both admin and staff for the org', async () => {
    const members = await teamService.listMembers(orgId);
    const ids = members.map((m: any) => m.id);
    expect(ids).toContain(adminId);
    expect(ids).toContain(staffId);
    expect(members.length).toBeGreaterThanOrEqual(2);
  });

  it('Test C: changeRole promotes target staff member to ORG_ADMIN', async () => {
    const result = await teamService.changeRole(staffId, 'ORG_ADMIN', adminId);
    expect(result).toBeDefined();
    expect((result as any).id).toBe(staffId);
    expect((result as any).role).toBe('ORG_ADMIN');

    // Verify persisted via direct superuser read.
    const persisted = await superClient.query(
      `SELECT role FROM users WHERE id = $1`,
      [staffId],
    );
    expect(persisted.rows[0].role).toBe('ORG_ADMIN');

    // Reset for idempotency of the suite.
    await superClient.query(`UPDATE users SET role = 'ORG_STAFF' WHERE id = $1`, [
      staffId,
    ]);
  });
});
