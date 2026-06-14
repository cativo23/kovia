import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import pg from 'pg';
import { NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { PublicAnimalsService } from './public-animals.service';
import { LOCKED_MEDICAL_COPY } from './guidance';

/**
 * PublicAnimalsService Integration Tests (PATTERN-03, T-15-01, D-04, D-07,
 * PUBLIC-06).
 *
 * This is the PATTERN-03-mandated sibling integration spec for a dual-
 * client service (PRISMA_RLS + PublicPrismaService). `check-integration-
 * specs.ts` fails the build if this file is missing.
 *
 * Harness mirrors `animals.service.integration.spec.ts`:
 *   - Superuser pg.Client for fixture INSERTs (RLS bypass)
 *   - Real PrismaService + PublicPrismaService for the SUT
 *   - Stubbed ClsService
 *   - Tag-suffix isolation
 *   - FK-safe DELETE cleanup in afterAll
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
let publicAnimalsService: PublicAnimalsService;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adopterEmail = `pub-animals-int-adopter-${tag}@test.local`;
const orgSlug = `pub-animals-int-org-${tag}`;

const PW_HASH =
  '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV';

let adopterId: string;
let orgId: string;
let speciesId: string;
let completeAnimalId: string;   // dossierComplete=true, MEDICO_CRONICO
let incompleteAnimalId: string; // dossierComplete=false
let healthyAnimalId: string;    // dossierComplete=true, SALUDABLE_ADULTO

function makeClsStub(userId: string, organizationId?: string): ClsService {
  const store: Record<string, any> = {
    userId,
    organizationId,
    isAdmin: false,
  };
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

describe('PublicAnimalsService integration (PATTERN-03)', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    // 1. ADOPTER user
    const adopter = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW())
       RETURNING id`,
      [adopterEmail, PW_HASH],
    );
    adopterId = adopter.rows[0].id;

    // 2. Org owner + organization (org owner needed for adminId NOT NULL FK)
    const owner = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ORG_ADMIN', true, true, NOW(), NOW())
       RETURNING id`,
      [`pub-animals-int-owner-${tag}@test.local`, PW_HASH],
    );
    const ownerId = owner.rows[0].id;

    const org = await superClient.query(
      `INSERT INTO organizations (id, name, slug, status, "adminId", "contactEmail", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, NOW(), NOW())
       RETURNING id`,
      [
        `Pub Animals Int Org ${tag}`,
        orgSlug,
        ownerId,
        `pub-animals-int-contact-${tag}@test.local`,
      ],
    );
    orgId = org.rows[0].id;
    await superClient.query(`UPDATE users SET "orgId" = $1 WHERE id = $2`, [
      orgId,
      ownerId,
    ]);

    // 3. Species
    const speciesRow = await superClient.query(
      `INSERT INTO species (id, name, slug, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, NOW())
       RETURNING id`,
      [`Pub Animals Int Species ${tag}`, `pub-animals-int-species-${tag}`],
    );
    speciesId = speciesRow.rows[0].id;

    // 4. Three animals with deterministic dossier states.
    //    completeAnimal: dossierComplete=true, adoptionCategory=MEDICO_CRONICO
    //                    → LOCKED PUBLIC-06 copy expected on detail
    //    incompleteAnimal: dossierComplete=false → must 404 / be filtered out
    //    healthyAnimal: dossierComplete=true, adoptionCategory=SALUDABLE_ADULTO
    //                   → guidance.copy must be undefined (verde, no rojo copy)
    const completeRow = await superClient.query(
      `INSERT INTO animals (
         id, name, "speciesId", "organizationId", status,
         "dossierComplete", "dossierVersion", "adoptionCategory",
         "behavioralEvaluation", "medicalHistory", "monthlyCostUsdMin",
         "monthlyCostUsdMax", "knownTriggers", "shelterEntryDate",
         "createdAt", "updatedAt"
       )
       VALUES (
         gen_random_uuid(), $1, $2, $3, 'AVAILABLE',
         true, 3, 'MEDICO_CRONICO',
         'Calm but on chronic meds.', 'Diabetic since 2024.', 80,
         120, ARRAY[]::TEXT[], '2026-01-01',
         NOW(), NOW()
       )
       RETURNING id`,
      [`Complete Dossier Animal ${tag}`, speciesId, orgId],
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
      [`Incomplete Dossier Animal ${tag}`, speciesId, orgId],
    );
    incompleteAnimalId = incompleteRow.rows[0].id;

    const healthyRow = await superClient.query(
      `INSERT INTO animals (
         id, name, "speciesId", "organizationId", status,
         "dossierComplete", "dossierVersion", "adoptionCategory",
         "behavioralEvaluation", "medicalHistory", "monthlyCostUsdMin",
         "shelterEntryDate", "createdAt", "updatedAt"
       )
       VALUES (
         gen_random_uuid(), $1, $2, $3, 'AVAILABLE',
         true, 1, 'SALUDABLE_ADULTO',
         'Friendly adult dog.', 'Healthy.', 40,
         '2026-02-15', NOW(), NOW()
       )
       RETURNING id`,
      [`Healthy Animal ${tag}`, speciesId, orgId],
    );
    healthyAnimalId = healthyRow.rows[0].id;

    // 5. Instantiate services
    prismaService = new PrismaService();
    await prismaService.onModuleInit();
    publicPrismaService = new PublicPrismaService();
    await publicPrismaService.onModuleInit();

    const clsStub = makeClsStub(adopterId);
    const rlsExtended = createRlsExtension(
      prismaService as any,
      clsStub as any,
    );

    publicAnimalsService = new PublicAnimalsService(
      rlsExtended as any,
      publicPrismaService,
    );
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe order. Delete each animal-id row individually to avoid
      // the `text = uuid` ANY()-cast mismatch under node-pg (the driver
      // returns uuids as text, so passing them back as an array would
      // require an explicit cast on every element).
      for (const animalId of [
        completeAnimalId,
        incompleteAnimalId,
        healthyAnimalId,
      ]) {
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
      await superClient.query(`DELETE FROM organizations WHERE id = $1`, [
        orgId,
      ]);
      await superClient.query(`DELETE FROM users WHERE id = $1`, [adopterId]);
      await superClient.query(`DELETE FROM users WHERE "orgId" = $1`, [orgId]);
      await superClient.end();
    }
    if (prismaService) await prismaService.onModuleDestroy();
    if (publicPrismaService) await publicPrismaService.onModuleDestroy();
  }, 30000);

  // ── T-15-01 / D-04 — no leak of private columns ─────────────────
  it('findPublic NEVER exposes score / risks / flags / inconsistencyFlags / scoreDetails', async () => {
    const result = await publicAnimalsService.findPublic({
      organization: orgSlug,
      limit: 50,
    });
    const allKeys = new Set<string>();
    for (const animal of result.data) {
      for (const k of Object.keys(animal)) allKeys.add(k);
    }
    for (const forbidden of [
      'score',
      'risks',
      'flags',
      'inconsistencyFlags',
      'scoreDetails',
    ]) {
      expect(allKeys.has(forbidden)).toBe(false);
    }
  });

  // ── D-07 — fail-closed listing filter ───────────────────────────
  it('findPublic filters out animals with dossierComplete=false', async () => {
    const result = await publicAnimalsService.findPublic({
      organization: orgSlug,
      limit: 50,
    });
    const ids = result.data.map((a) => a.id);
    expect(ids).toContain(completeAnimalId);
    expect(ids).toContain(healthyAnimalId);
    expect(ids).not.toContain(incompleteAnimalId);
  });

  // ── D-07 — fail-closed detail 404 ───────────────────────────────
  it('findById returns NotFoundException for animals with dossierComplete=false', async () => {
    await expect(
      publicAnimalsService.findById(incompleteAnimalId),
    ).rejects.toThrow(NotFoundException);
  });

  it('findById returns NotFoundException for non-existent id', async () => {
    await expect(
      publicAnimalsService.findById('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(NotFoundException);
  });

  // ── D-04 — detail surface dossier fields ────────────────────────
  it('findById returns dossierVersion + dossier fields on detail response', async () => {
    const detail = await publicAnimalsService.findById(completeAnimalId);
    expect(detail.dossierVersion).toBe(3);
    expect(detail.behavioralEvaluation).toBe('Calm but on chronic meds.');
    expect(detail.medicalHistory).toBe('Diabetic since 2024.');
    expect(detail.monthlyCostUsdMin).toBe(80);
    expect(detail.monthlyCostUsdMax).toBe(120);
    expect(detail.shelterEntryDate).toContain('2026-01-01');
  });

  // ── PUBLIC-06 — LOCKED rojo medical copy ────────────────────────
  it('guidance.copy is the LOCKED PUBLIC-06 string for MEDICO_CRONICO category', async () => {
    const detail = await publicAnimalsService.findById(completeAnimalId);
    expect(detail.guidance.color).toBe('rojo');
    expect(detail.guidance.copy).toBe(LOCKED_MEDICAL_COPY);
    expect(detail.guidance.copy).toBe(
      'Animal con condición médica activa. Conocé los detalles y costos antes de aplicar',
    );
  });

  it('guidance.copy is undefined for SALUDABLE_ADULTO (verde) category', async () => {
    const detail = await publicAnimalsService.findById(healthyAnimalId);
    expect(detail.guidance.color).toBe('verde');
    expect(detail.guidance.copy).toBeUndefined();
  });

  // ── PUBLIC-05 — acknowledgeDossier upsert ───────────────────────
  it('acknowledgeDossier upserts a row with current dossierVersion', async () => {
    const result = await publicAnimalsService.acknowledgeDossier(
      completeAnimalId,
      adopterId,
    );
    expect(result.dossierVersion).toBe(3);
    expect(result.ackedAt).toBeInstanceOf(Date);

    const rows = await superClient.query(
      `SELECT "dossierVersion" FROM dossier_acknowledgments
        WHERE "userId" = $1 AND "animalId" = $2`,
      [adopterId, completeAnimalId],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].dossierVersion).toBe(3);
  });

  it('acknowledgeDossier called twice idempotently updates ackedAt and dossierVersion', async () => {
    const first = await publicAnimalsService.acknowledgeDossier(
      completeAnimalId,
      adopterId,
    );

    // Simulate a refugio bumping the dossier version.
    await superClient.query(
      `UPDATE animals SET "dossierVersion" = 5 WHERE id = $1`,
      [completeAnimalId],
    );

    const second = await publicAnimalsService.acknowledgeDossier(
      completeAnimalId,
      adopterId,
    );

    expect(second.dossierVersion).toBe(5);
    expect(second.ackedAt.getTime()).toBeGreaterThanOrEqual(
      first.ackedAt.getTime(),
    );

    const rows = await superClient.query(
      `SELECT COUNT(*)::int as count, MAX("dossierVersion")::int as max
         FROM dossier_acknowledgments
        WHERE "userId" = $1 AND "animalId" = $2`,
      [adopterId, completeAnimalId],
    );
    expect(rows.rows[0].count).toBe(1);
    expect(rows.rows[0].max).toBe(5);

    // Restore the version so later assertions stay stable.
    await superClient.query(
      `UPDATE animals SET "dossierVersion" = 3 WHERE id = $1`,
      [completeAnimalId],
    );
  });

  it('acknowledgeDossier throws NotFoundException for incomplete dossier', async () => {
    await expect(
      publicAnimalsService.acknowledgeDossier(incompleteAnimalId, adopterId),
    ).rejects.toThrow(NotFoundException);
  });

  it('acknowledgeDossier throws NotFoundException for non-existent animal', async () => {
    await expect(
      publicAnimalsService.acknowledgeDossier(
        '00000000-0000-0000-0000-000000000000',
        adopterId,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
