import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import pg from 'pg';
import { ClsService } from 'nestjs-cls';
import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { ApplicationsService } from './applications.service';
import { EventsService } from '../notifications/events.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';

/**
 * ApplicationsService RLS Integration Tests (D-14, TEST-02, APPLY-02, APPLY-06)
 *
 * Real-DB regression locks for:
 *   - v2.0 B1 (cross-adopter exposure) bug class
 *   - Partial unique index allowing withdraw → resubmit
 *   - Phase 16: profile completeness gate, profileSnapshot freeze, extraAnswers freeze,
 *     co-aplicante webhook_outbox row (PATTERN-02 lock)
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

/**
 * Base profile stub with completionPct=100 (default for positive tests).
 * The rejection test overrides getMyProfile to return completionPct=60.
 */
const baseCompleteProfile = {
  id: 'profile-1',
  phone: '+50312345678',
  occupation: 'Ingeniera',
  birthDate: '1990-01-15',
  city: 'San Salvador',
  housingType: 'HOUSE',
  ownership: 'OWNED',
  exteriorSpace: true,
  petPermission: true,
  adults: 2,
  children: 0,
  currentPets: [],
  activityLevel: 'HIGH',
  hoursAlone: 4,
  adoptionReason: 'Compañía y amor',
  speciesExperience: true,
  previousPets: ['Labrador retriever'],
  additionalContext: null,
  photos: [
    { id: 'photo-1', url: 'https://cdn.kovia.app/photos/home1.jpg', key: 'photos/home1.jpg', position: 0 },
  ],
  completionPct: 100,
};

/** ExtrasTemplate questions fixture for the questionText freeze test. */
const templateQuestions = [
  {
    id: 'q-rls-1',
    text: 'TEMPLATE TEXT — ¿Cuántas caminatas de más de 20 minutos hiciste la semana pasada?',
    type: 'text',
    required: true,
    criticality: 'IMPORTANTE',
  },
];

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
      emitCoAplicanteConfirmationRequested: vi.fn().mockResolvedValue(undefined),
    };

    // adopterProfileStub — completionPct=100 by default; individual tests can override.
    const adopterProfileStub: any = {
      getMyProfile: vi.fn().mockResolvedValue({ ...baseCompleteProfile }),
    };

    // extrasTemplateStub — returns deterministic template questions for freeze tests.
    const extrasTemplateStub: any = {
      findForAnimalRaw: vi.fn().mockResolvedValue(templateQuestions),
    };

    const configStub: any = {
      get: vi.fn().mockImplementation((key: string, defaultVal?: any) => {
        if (key === 'FRONTEND_URL') return 'https://kovia.app';
        return defaultVal ?? undefined;
      }),
    };

    applicationsService = new ApplicationsService(
      rlsExtended as any,
      publicPrismaService,
      uploadStub,
      auditStub,
      clsStub as any,
      queueStub,
      eventsStub,
      adopterProfileStub,
      extrasTemplateStub,
      configStub,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe order: webhook_outbox → notifications → photos → profile_photos → adopter_profiles → applications → animals (ALL for org) → species → org → users.
      // Delete ALL webhook_outbox rows for co-aplicante events (some tests may leave orphans).
      await superClient.query(
        `DELETE FROM webhook_outbox WHERE "eventType" = 'co_aplicante.confirmation_requested'`,
      );
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
        `DELETE FROM adopter_profiles WHERE "userId" IN ($1, $2)`,
        [adopter1Id, adopter2Id],
      );
      await superClient.query(
        `DELETE FROM adoption_applications WHERE "userId" IN ($1, $2)`,
        [adopter1Id, adopter2Id],
      );
      // Delete ALL animals for the test org — individual tests may create extra animals.
      await superClient.query(`DELETE FROM animals WHERE "organizationId" = $1`, [orgId]);
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

    // Resubmit against the same (animalId, adopter1Id) pair using SubmitApplicationDto shape.
    const resubmitted = await applicationsService.create(
      {
        animalId,
        extraAnswers: [{ questionId: 'q-rls-1', answer: 'Tres caminatas' }],
        coAplicanteNombre: 'María García',
        coAplicanteEmail: 'maria@test.local',
      } as SubmitApplicationDto,
      { id: adopter1Id, email: adopter1Email, firstName: 'Juan' },
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
    // the duplicate check because Row B is still active.
    await expect(
      applicationsService.create(
        {
          animalId,
          extraAnswers: [],
          coAplicanteNombre: 'Otra Persona',
          coAplicanteEmail: 'otra@test.local',
        } as SubmitApplicationDto,
        { id: adopter1Id, email: adopter1Email },
      ),
    ).rejects.toThrow(ConflictException);
  });

  // ─── Phase 16 APPLY-02 / APPLY-06 regression locks ──────────────────────────

  it('[APPLY-02] create() rejects with 422 when adopter profile completionPct < 100', async () => {
    clsStub.set('userId', adopter2Id);

    // Build a SUT with a profile stub that returns completionPct=60 for this test.
    const incompleteProfileStub: any = {
      getMyProfile: vi.fn().mockResolvedValue({ ...baseCompleteProfile, completionPct: 60 }),
    };
    const extrasStub: any = { findForAnimalRaw: vi.fn().mockResolvedValue([]) };
    const configStub: any = {
      get: vi.fn().mockReturnValue('https://kovia.app'),
    };

    // Need a fresh RLS extension scoped to adopter2 so the animal lookup passes.
    const cls2 = makeClsStub(adopter2Id);
    const rls2 = createRlsExtension(prismaService as any, cls2 as any);
    const eventsStub2: any = {
      emitApplicationSubmitted: vi.fn().mockResolvedValue(undefined),
      emitApplicationStatusChanged: vi.fn().mockResolvedValue(undefined),
      emitApplicationWithdrawn: vi.fn().mockResolvedValue(undefined),
      emitApplicationDevuelta: vi.fn().mockResolvedValue(undefined),
      emitCoAplicanteConfirmationRequested: vi.fn().mockResolvedValue(undefined),
    };
    const queueStub2: any = { add: vi.fn().mockResolvedValue(undefined) };
    const auditStub2: any = { log: vi.fn().mockResolvedValue(undefined) };
    const sut2 = new ApplicationsService(
      rls2 as any,
      publicPrismaService,
      {} as any,
      auditStub2,
      cls2 as any,
      queueStub2,
      eventsStub2,
      incompleteProfileStub,
      extrasStub,
      configStub,
    );

    await expect(
      sut2.create(
        {
          animalId,
          extraAnswers: [],
          coAplicanteNombre: 'Co Persona',
          coAplicanteEmail: 'co@test.local',
        } as SubmitApplicationDto,
        { id: adopter2Id, email: adopter2Email },
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('[APPLY-02] create() builds profileSnapshot including photo URLs (D-04)', async () => {
    clsStub.set('userId', adopter2Id);

    // Use adopter2 to avoid conflict with the active Row B for adopter1.
    // Build a separate SUT scoped to adopter2 with a complete profile.
    const profileStub: any = {
      getMyProfile: vi.fn().mockResolvedValue({ ...baseCompleteProfile }),
    };
    const extrasStub: any = { findForAnimalRaw: vi.fn().mockResolvedValue([]) };
    const configStub: any = {
      get: vi.fn().mockReturnValue('https://kovia.app'),
    };
    const cls2 = makeClsStub(adopter2Id);
    const rls2 = createRlsExtension(prismaService as any, cls2 as any);
    const eventsStub2: any = {
      emitApplicationSubmitted: vi.fn().mockResolvedValue(undefined),
      emitCoAplicanteConfirmationRequested: vi.fn().mockResolvedValue(undefined),
    };
    const queueStub2: any = { add: vi.fn().mockResolvedValue(undefined) };
    const auditStub2: any = { log: vi.fn().mockResolvedValue(undefined) };
    const sut2 = new ApplicationsService(
      rls2 as any,
      publicPrismaService,
      {} as any,
      auditStub2,
      cls2 as any,
      queueStub2,
      eventsStub2,
      profileStub,
      extrasStub,
      configStub,
    );

    const result = await sut2.create(
      {
        animalId,
        extraAnswers: [],
        coAplicanteNombre: 'Familiar García',
        coAplicanteEmail: 'familiar@test.local',
      } as SubmitApplicationDto,
      { id: adopter2Id, email: adopter2Email, firstName: 'Ana' },
    );

    // Fetch the persisted row and assert profileSnapshot.photos is a URL array.
    const row = await superClient.query(
      `SELECT "profileSnapshot" FROM adoption_applications WHERE id = $1`,
      [result.id],
    );
    expect(row.rows.length).toBe(1);
    const snapshot = row.rows[0].profileSnapshot;
    expect(Array.isArray(snapshot.photos)).toBe(true);
    expect(typeof snapshot.photos[0]).toBe('string');
    // Photo URL must match the stub's URL
    expect(snapshot.photos[0]).toBe('https://cdn.kovia.app/photos/home1.jpg');
  });

  it('[APPLY-02] create() freezes questionText from the template', async () => {
    clsStub.set('userId', adopter1Id);

    // Use a dedicated small animal for this test to avoid the duplicate-application conflict.
    // Build a SUT with a template that returns a known question text.
    const knownQuestion = {
      id: 'q-freeze-test',
      text: 'TEMPLATE TEXT — frozen verbatim (D-08)',
      type: 'text',
      required: true,
      criticality: 'CRITICA',
    };
    const profileStub: any = {
      getMyProfile: vi.fn().mockResolvedValue({ ...baseCompleteProfile }),
    };
    const extrasStub: any = {
      findForAnimalRaw: vi.fn().mockResolvedValue([knownQuestion]),
    };
    const configStub: any = { get: vi.fn().mockReturnValue('https://kovia.app') };

    // Insert a second animal so there's no conflict with the active Row B.
    const animal2Row = await superClient.query(
      `INSERT INTO animals (id, name, "speciesId", "organizationId", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'AVAILABLE', NOW(), NOW()) RETURNING id`,
      [`RLS Freeze Animal ${tag}`, speciesId, orgId],
    );
    const animal2Id = animal2Row.rows[0].id;

    const cls3 = makeClsStub(adopter1Id);
    const rls3 = createRlsExtension(prismaService as any, cls3 as any);
    const eventsStub3: any = {
      emitApplicationSubmitted: vi.fn().mockResolvedValue(undefined),
      emitCoAplicanteConfirmationRequested: vi.fn().mockResolvedValue(undefined),
    };
    const queueStub3: any = { add: vi.fn().mockResolvedValue(undefined) };
    const auditStub3: any = { log: vi.fn().mockResolvedValue(undefined) };
    const sut3 = new ApplicationsService(
      rls3 as any,
      publicPrismaService,
      {} as any,
      auditStub3,
      cls3 as any,
      queueStub3,
      eventsStub3,
      profileStub,
      extrasStub,
      configStub,
    );

    const result = await sut3.create(
      {
        animalId: animal2Id,
        // Frontend supplies a fake questionText — should be discarded and replaced by template text.
        extraAnswers: [{ questionId: 'q-freeze-test', answer: 'Frontend answer value' }],
        coAplicanteNombre: 'Freeze Tester',
        coAplicanteEmail: 'freeze@test.local',
      } as SubmitApplicationDto,
      { id: adopter1Id, email: adopter1Email, firstName: 'Juan' },
    );

    const row = await superClient.query(
      `SELECT "extraAnswers" FROM adoption_applications WHERE id = $1`,
      [result.id],
    );
    const extraAnswers = row.rows[0].extraAnswers;
    expect(Array.isArray(extraAnswers)).toBe(true);
    expect(extraAnswers[0].questionId).toBe('q-freeze-test');
    // Must match the template text verbatim — NOT whatever the frontend sent.
    expect(extraAnswers[0].questionText).toBe(knownQuestion.text);
    expect(extraAnswers[0].answer).toBe('Frontend answer value');

    // Cleanup: delete the test application and animal2.
    await superClient.query(
      `DELETE FROM adoption_applications WHERE id = $1`,
      [result.id],
    );
    await superClient.query(`DELETE FROM animals WHERE id = $1`, [animal2Id]);
  });

  // ─── Phase 17 Safeguards — skeleton blocks (Plan 04 un-skips) ───────────────
  //
  // These describe.skip blocks are Wave 0 scaffolds. They are intentionally
  // described with English enum literals (SUBMITTED/REVIEWING/APPROVED/
  // IN_REFLECTION/FINALIZED/WITHDRAWN/REJECTED/IN_FOSTER) per D-02.
  //
  // Each it() body below is a stub that will fail (expect(true).toBe(false))
  // once Plan 04 un-skips the block. Plan 04 Task 3 replaces each stub body
  // with a real assertion against the live DB.

  describe.skip('Phase 17 safeguards (Plan 04 un-skips)', () => {
    // (a) SAFEGUARD-01 — Encuentro gate
    it('[SAFEGUARD-01] APPROVED blocked without a completed Encuentro', async () => {
      // Scenario: application in REVIEWING with no completed encuentro →
      // transition to APPROVED must throw UnprocessableEntityException.
      // Plan 04 seeds an application + incomplete encuentro and asserts the gate.
      expect(true).toBe(false); // TODO(plan 04): replace with real encuentro gate assertion
    });

    it('[SAFEGUARD-01] APPROVED unblocked once Encuentro observations are logged', async () => {
      // Scenario: Encuentro has completed=true + recomendacion='PROCEED' →
      // transition to APPROVED (or IN_REFLECTION) must succeed.
      expect(true).toBe(false); // TODO(plan 04): replace with real assertion
    });

    // (b) SAFEGUARD-03 — Foster gate (fosterRequired=true path)
    it('[SAFEGUARD-03] APPROVED blocked when fosterRequired=true and no completed FosterPeriod', async () => {
      // Scenario: complex-category animal, fosterRequired=true set on encuentro,
      // no IN_FOSTER → APPROVED transition must be blocked.
      expect(true).toBe(false); // TODO(plan 04): replace with foster gate assertion
    });

    it('[SAFEGUARD-03] APPROVED unblocked once FosterPeriod outcome=PROCEED', async () => {
      // Scenario: FosterPeriod.outcome='PROCEED' on record → transition to APPROVED allowed.
      expect(true).toBe(false); // TODO(plan 04)
    });

    it('[SAFEGUARD-03] foster REJECTED → application REJECTED + animal AVAILABLE', async () => {
      // Scenario: FosterPeriod.outcome='FAIL' / counselor rejects → application transitions
      // to REJECTED and animal.status flips back to AVAILABLE.
      expect(true).toBe(false); // TODO(plan 04)
    });

    // (c) SAFEGUARD-02 — 48h reflexión gate
    it('[SAFEGUARD-02] FINALIZED blocked before approvedAt + 48h', async () => {
      // Scenario: application in IN_REFLECTION with approvedAt = now →
      // transition to FINALIZED must throw UnprocessableEntityException (gate not elapsed).
      expect(true).toBe(false); // TODO(plan 04): set approvedAt=now, assert 422
    });

    it('[SAFEGUARD-02] FINALIZED allowed after approvedAt + 48h', async () => {
      // Scenario: approvedAt = 3 days ago → FINALIZED transition allowed.
      expect(true).toBe(false); // TODO(plan 04): set approvedAt=3days_ago, assert success
    });

    // (d) D-04 — adopter self-service withdrawal during IN_REFLECTION
    it('[D-04] adopter withdraw during IN_REFLECTION → WITHDRAWN + animal AVAILABLE', async () => {
      // Scenario: application in IN_REFLECTION → adopter calls withdraw() →
      // status=WITHDRAWN, animal.status=AVAILABLE.
      expect(true).toBe(false); // TODO(plan 04)
    });

    // (e) D-19 — reservation lifecycle: animal reserved at IN_FOSTER / APPROVED
    it('[D-19] animal reserved IN_PROCESS at IN_FOSTER transition', async () => {
      // Scenario: application transitions to IN_FOSTER → animal.status flips to IN_PROCESS
      // (reserved but not yet adopted).
      expect(true).toBe(false); // TODO(plan 04)
    });

    it('[D-19] animal reserved IN_PROCESS at APPROVED transition (no prior foster)', async () => {
      // Scenario: direct REVIEWING→APPROVED (no foster path) → animal.status=IN_PROCESS.
      expect(true).toBe(false); // TODO(plan 04)
    });

    // (f) SAFEGUARD-04 / SAFEGUARD-05 — PostAdoptionCheckIn rows at FINALIZED
    it('[SAFEGUARD-04] FINALIZED creates exactly two PostAdoptionCheckIn rows (DAY_14 + DAY_60, PENDING)', async () => {
      // Scenario: transition to FINALIZED → exactly 2 rows in post_adoption_check_ins
      // with scheduleType=DAY_14 and scheduleType=DAY_60, both status=PENDING.
      expect(true).toBe(false); // TODO(plan 04)
    });

    // (g) D-19 — sibling auto-close at FINALIZED
    it('[D-19] FINALIZED auto-closes sibling applications → WITHDRAWN + animal ADOPTED', async () => {
      // Scenario: adopter1 reaches FINALIZED while adopter2 has an open REVIEWING
      // application for the same animal → adopter2's application transitions to WITHDRAWN,
      // animal.status=ADOPTED.
      expect(true).toBe(false); // TODO(plan 04)
    });
  });

  it('[APPLY-06] [PATTERN-02] create() produces a webhook_outbox row for co_aplicante.confirmation_requested', async () => {
    /**
     * PATTERN-02 MANDATE: This test uses a REAL EventsService wired to a real
     * WebhookService that creates outbox rows unconditionally (bypassing the
     * N8N_WEBHOOK_URL guard that skips silently in dev without n8n configured).
     *
     * A webhook-direct stub is used instead of the full WebhookService because
     * the full service also enqueues to BullMQ — which requires a running Redis.
     * The test scope is the Prisma write path (create outbox row), not BullMQ delivery.
     */
    const cls4 = makeClsStub(adopter1Id);
    const rls4 = createRlsExtension(prismaService as any, cls4 as any);

    // Use a third animal to avoid duplicate-application conflicts.
    const animal3Row = await superClient.query(
      `INSERT INTO animals (id, name, "speciesId", "organizationId", status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'AVAILABLE', NOW(), NOW()) RETURNING id`,
      [`RLS Outbox Animal ${tag}`, speciesId, orgId],
    );
    const animal3Id = animal3Row.rows[0].id;

    // Real PrismaService (with is_admin bypass) for the webhookService direct write.
    const adminPrisma = await (async () => {
      // We need a Prisma client that can write to webhook_outbox without RLS.
      // Use the existing prismaService with a raw admin-bypass transaction.
      return {
        $transaction: async (ops: any[]) => Promise.all(ops),
        $executeRaw: prismaService.$executeRaw.bind(prismaService),
        webhookOutbox: {
          create: async (args: any) => {
            // Bypass RLS by setting is_admin in the same connection.
            const [, row] = await prismaService.$transaction([
              prismaService.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
              prismaService.webhookOutbox.create(args),
            ]);
            return row;
          },
        },
      };
    })();

    // Webhook-direct stub: creates the outbox row unconditionally (bypasses N8N_WEBHOOK_URL guard).
    const webhookDirectStub: any = {
      enqueue: async (eventType: string, payload: object) => {
        await adminPrisma.webhookOutbox.create({
          data: {
            eventType,
            payload: payload as any,
            idempotencyKey: `test-${Date.now()}-${Math.random()}`,
            status: 'PENDING',
          },
        });
      },
    };

    // Mock mailDispatcher to avoid real email sends.
    const mailDispatcherStub: any = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    // Real EventsService — validates the full emission call chain.
    const realEventsService = new EventsService(
      prismaService as any,
      {} as any, // notificationsService — not used by emitCoAplicanteConfirmationRequested
      webhookDirectStub,
      mailDispatcherStub,
    );

    const profileStub4: any = {
      getMyProfile: vi.fn().mockResolvedValue({ ...baseCompleteProfile }),
    };
    const extrasStub4: any = { findForAnimalRaw: vi.fn().mockResolvedValue([]) };
    const configStub4: any = { get: vi.fn().mockReturnValue('https://kovia.app') };
    const auditStub4: any = { log: vi.fn().mockResolvedValue(undefined) };
    const queueStub4: any = { add: vi.fn().mockResolvedValue(undefined) };

    const sut4 = new ApplicationsService(
      rls4 as any,
      publicPrismaService,
      {} as any,
      auditStub4,
      cls4 as any,
      queueStub4,
      realEventsService,
      profileStub4,
      extrasStub4,
      configStub4,
    );

    const result = await sut4.create(
      {
        animalId: animal3Id,
        extraAnswers: [],
        coAplicanteNombre: 'Outbox Tester',
        coAplicanteEmail: 'outbox@test.local',
      } as SubmitApplicationDto,
      { id: adopter1Id, email: adopter1Email, firstName: 'Juan' },
    );

    // PATTERN-02 LOCK: assert the webhook_outbox row was created.
    const outboxRow = await superClient.query(
      `SELECT * FROM webhook_outbox WHERE "eventType" = 'co_aplicante.confirmation_requested' AND payload->>'applicationId' = $1`,
      [result.id],
    );
    expect(outboxRow.rows.length).toBe(1);
    expect(outboxRow.rows[0].status).toBe('PENDING');

    // Assert mailDispatcher was called at least once for the co-aplicante email.
    // (emitApplicationSubmitted may also call send — real EventsService runs both emissions)
    expect(mailDispatcherStub.send).toHaveBeenCalled();
    // Verify one of the calls was for a CoAplicanteConfirmationMail
    const { CoAplicanteConfirmationMail } = await import('../mail/mailables/co-aplicante-confirmation.mail');
    expect(
      mailDispatcherStub.send.mock.calls.some((call: any[]) => call[0] instanceof CoAplicanteConfirmationMail),
    ).toBe(true);

    // Cleanup: delete the outbox row and application and animal3.
    await superClient.query(
      `DELETE FROM webhook_outbox WHERE "eventType" = 'co_aplicante.confirmation_requested' AND payload->>'applicationId' = $1`,
      [result.id],
    );
    await superClient.query(
      `DELETE FROM adoption_applications WHERE id = $1`,
      [result.id],
    );
    await superClient.query(`DELETE FROM animals WHERE id = $1`, [animal3Id]);
  });
});
