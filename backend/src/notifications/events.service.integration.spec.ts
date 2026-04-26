import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import pg from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from './events.service';

/**
 * EventsService Integration Tests (D-15, TEST-03 — B3 regression)
 *
 * Locks the v2.0 B3 silent-notification-drop regression by asserting that
 * each emit* method actually inserts a row into `notifications`. Read-back
 * uses the superuser pg.Client (RLS-bypass) because the production code
 * inserts via `set_config('app.is_admin', 'true', true)` inside a batch
 * transaction; the assertion's job is "did the row land?", not "can the
 * adopter read it?".
 *
 * The injected NotificationsService is stubbed minimally — emit* methods
 * call `this.prisma.notification.create(...)` directly (events.service.ts:230-235)
 * and pull templates via the value-side `NOTIFICATION_TEMPLATES` import,
 * never invoking methods on the injected instance.
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
let eventsService: EventsService;

let adopterId: string;
let ownerId: string;
let orgId: string;
let speciesId: string;
let animalId: string;
let applicationId: string;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adopterEmail = `events-adopter-${tag}@test.local`;
const ownerEmail = `events-owner-${tag}@test.local`;
const orgSlug = `events-org-${tag}`;

const PW_HASH =
  '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV';

describe('EventsService notification creation integration', () => {
  beforeAll(async () => {
    // Pitfall #6: ensure WebhookService short-circuits and writes nothing to
    // webhook_outbox. Belt-and-braces — we also stub webhookService below.
    process.env.N8N_WEBHOOK_URL = '';

    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    const adopter = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt", "firstName")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW(), $3) RETURNING id`,
      [adopterEmail, PW_HASH, 'Eve'],
    );
    adopterId = adopter.rows[0].id;

    const owner = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW()) RETURNING id`,
      [ownerEmail, PW_HASH],
    );
    ownerId = owner.rows[0].id;

    const org = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW()) RETURNING id`,
      [`Events Org ${tag}`, orgSlug, ownerId, `contact-${tag}@test.local`],
    );
    orgId = org.rows[0].id;

    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      orgId,
      ownerId,
    ]);

    const speciesRow = await superClient.query(
      `INSERT INTO species (id, name, slug, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id`,
      [`Events Species ${tag}`, `events-species-${tag}`],
    );
    speciesId = speciesRow.rows[0].id;

    const animalRow = await superClient.query(
      `INSERT INTO animals (id, name, "speciesId", "organizationId", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'AVAILABLE', NOW(), NOW()) RETURNING id`,
      [`Events Animal ${tag}`, speciesId, orgId],
    );
    animalId = animalRow.rows[0].id;

    const app = await superClient.query(
      `INSERT INTO adoption_applications (id, "userId", "organizationId", "animalId", status, "submittedAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'ENVIADA', NOW(), NOW()) RETURNING id`,
      [adopterId, orgId, animalId],
    );
    applicationId = app.rows[0].id;

    // Build the SUT — 4-arg constructor matching events.service.ts:19-24.
    prismaService = new PrismaService();
    await prismaService.onModuleInit();

    const notificationsStub: any = { createForAdopter: vi.fn() };
    const webhookStub: any = { enqueue: vi.fn().mockResolvedValue(undefined) };
    const mailStub: any = { send: vi.fn().mockResolvedValue(undefined) };

    eventsService = new EventsService(
      prismaService,
      notificationsStub,
      webhookStub,
      mailStub,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      await superClient.query(
        `DELETE FROM notifications WHERE "userId" = $1`,
        [adopterId],
      );
      await superClient.query(
        `DELETE FROM webhook_outbox WHERE payload->>'applicationId' = $1`,
        [applicationId],
      );
      await superClient.query(
        `DELETE FROM adoption_applications WHERE "userId" = $1`,
        [adopterId],
      );
      await superClient.query(`DELETE FROM animals WHERE id = $1`, [animalId]);
      await superClient.query(`DELETE FROM species WHERE id = $1`, [speciesId]);
      await superClient.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
      await superClient.query(`DELETE FROM users WHERE id IN ($1, $2)`, [
        adopterId,
        ownerId,
      ]);
      await superClient.end();
    }
    if (prismaService) await prismaService.onModuleDestroy();
  }, 30000);

  it('emitApplicationSubmitted creates a notification row for the adopter', async () => {
    const before = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'APPLICATION_SUBMITTED', applicationId],
    );
    await eventsService.emitApplicationSubmitted(applicationId);
    const after = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'APPLICATION_SUBMITTED', applicationId],
    );
    expect(after.rows[0].c - before.rows[0].c).toBe(1);
  }, 15000);

  it('emitApplicationScored creates a notification row for the adopter', async () => {
    const before = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'SCORED', applicationId],
    );
    await eventsService.emitApplicationScored(applicationId, 75, 'LOW');
    const after = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'SCORED', applicationId],
    );
    expect(after.rows[0].c - before.rows[0].c).toBe(1);
  }, 15000);

  it('emitApplicationStatusChanged creates a notification row for the adopter', async () => {
    const before = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'STATUS_CHANGED', applicationId],
    );
    await eventsService.emitApplicationStatusChanged(
      applicationId,
      'ENVIADA',
      'REVISANDO',
    );
    const after = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'STATUS_CHANGED', applicationId],
    );
    expect(after.rows[0].c - before.rows[0].c).toBe(1);
  }, 15000);

  it('emitApplicationWithdrawn creates a notification row for the adopter', async () => {
    const before = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'WITHDRAWN', applicationId],
    );
    await eventsService.emitApplicationWithdrawn(applicationId);
    const after = await superClient.query(
      `SELECT COUNT(*)::int AS c FROM notifications WHERE "userId" = $1 AND type = $2 AND "applicationId" = $3`,
      [adopterId, 'WITHDRAWN', applicationId],
    );
    expect(after.rows[0].c - before.rows[0].c).toBe(1);
  }, 15000);
});
