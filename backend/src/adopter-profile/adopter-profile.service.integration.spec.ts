/**
 * AdopterProfileService Integration Tests — Phase 16 PROFILE-01.
 *
 * Real-DB regression locks for:
 *   - RLS isolation: adopter A cannot see adopter B's profile (T-16-03-01)
 *   - Idempotent upsert on userId unique constraint (PROFILE-01)
 *   - Photo ownership enforcement: B cannot delete A's photo (T-16-03-03)
 *   - completionPct integration: fully-populated profile + 1 photo = 100%
 *
 * Harness template: backend/src/adopters/adopters.service.integration.spec.ts
 * (SUPERUSER_CONNECTION, makeClsStub, beforeAll, afterAll patterns copied verbatim)
 *
 * Note: AdopterProfileService is single-client (rlsPrisma only per RESEARCH.md Q2).
 * PATTERN-03 CI enforcement (check-integration-specs.ts) does not require this spec,
 * but the plan mandates it for empirical RLS proof.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { ClsService } from 'nestjs-cls';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createRlsExtension } from '../prisma/prisma-rls.extension';
import { AdopterProfileService } from './adopter-profile.service';

const { Client } = pg;

const SUPERUSER_CONNECTION = {
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kovia',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

let superClient: InstanceType<typeof Client>;
let prismaServiceA: PrismaService;
let prismaServiceB: PrismaService;
let serviceA: AdopterProfileService;
let serviceB: AdopterProfileService;

let adopterAId: string;
let adopterBId: string;
let adopterAProfileId: string;
let adopterAPhotoId: string;

const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adopterAEmail = `profile-int-a-${tag}@test.local`;
const adopterBEmail = `profile-int-b-${tag}@test.local`;

const PW_HASH = '$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV';

// Copy of harness helper from adopters.service.integration.spec.ts
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

describe('AdopterProfileService (RLS integration)', () => {
  beforeAll(async () => {
    superClient = new Client(SUPERUSER_CONNECTION);
    await superClient.connect();

    // Insert adopter A
    const rowA = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW()) RETURNING id`,
      [adopterAEmail, PW_HASH],
    );
    adopterAId = rowA.rows[0].id;

    // Insert adopter B
    const rowB = await superClient.query(
      `INSERT INTO users (id, email, "passwordHash", role, "emailVerified", "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADOPTER', true, true, NOW(), NOW()) RETURNING id`,
      [adopterBEmail, PW_HASH],
    );
    adopterBId = rowB.rows[0].id;

    // Insert an adopter_profile for A only (B's profile will be auto-created by service)
    const profileA = await superClient.query(
      `INSERT INTO adopter_profiles (id, "userId", phone, occupation, "birthDate", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, '+50312345678', 'Engineer', '1990-01-01', NOW(), NOW()) RETURNING id`,
      [adopterAId],
    );
    adopterAProfileId = profileA.rows[0].id;

    // Insert a photo for A's profile
    const photoA = await superClient.query(
      `INSERT INTO profile_photos (id, "profileId", url, key, position, "createdAt")
       VALUES (gen_random_uuid(), $1, 'http://minio/photo.jpg', 'profiles/photo.jpg', 0, NOW()) RETURNING id`,
      [adopterAProfileId],
    );
    adopterAPhotoId = photoA.rows[0].id;

    // Instantiate two separate RLS-extended clients, one per adopter CLS context
    prismaServiceA = new PrismaService();
    await prismaServiceA.onModuleInit();
    prismaServiceB = new PrismaService();
    await prismaServiceB.onModuleInit();

    const clsA = makeClsStub(adopterAId);
    const clsB = makeClsStub(adopterBId);

    const rlsA = createRlsExtension(prismaServiceA as any, clsA as any);
    const rlsB = createRlsExtension(prismaServiceB as any, clsB as any);

    serviceA = new AdopterProfileService(rlsA as any);
    serviceB = new AdopterProfileService(rlsB as any);
  }, 30000);

  afterAll(async () => {
    if (superClient) {
      // FK-safe DELETE order: profile_photos -> adopter_profiles -> users
      await superClient.query(
        `DELETE FROM profile_photos WHERE "profileId" IN (
           SELECT id FROM adopter_profiles WHERE "userId" IN ($1, $2)
         )`,
        [adopterAId, adopterBId],
      );
      await superClient.query(
        `DELETE FROM adopter_profiles WHERE "userId" IN ($1, $2)`,
        [adopterAId, adopterBId],
      );
      await superClient.query(
        `DELETE FROM users WHERE email IN ($1, $2)`,
        [adopterAEmail, adopterBEmail],
      );
      await superClient.end();
    }
    if (prismaServiceA) await prismaServiceA.onModuleDestroy();
    if (prismaServiceB) await prismaServiceB.onModuleDestroy();
  }, 30000);

  it('[PROFILE-01] RLS isolation — serviceA.getMyProfile returns A\'s profile; serviceB auto-creates B\'s own profile (not A\'s)', async () => {
    const profileA = await serviceA.getMyProfile(adopterAId);
    expect(profileA).toBeDefined();
    expect(profileA.id).toBe(adopterAProfileId);
    expect(profileA.phone).toBe('+50312345678');

    // B's getMyProfile auto-creates B's profile (no row existed before)
    const profileB = await serviceB.getMyProfile(adopterBId);
    expect(profileB).toBeDefined();
    expect(profileB.id).not.toBe(adopterAProfileId);
    // B's profile starts empty (just created)
    expect(profileB.completionPct).toBe(0);
    expect(profileB.phone).toBeNull();

    // Cross-check: the profile returned for B is NOT A's profile
    const profileBAgain = await serviceB.getMyProfile(adopterBId);
    expect(profileBAgain.id).not.toBe(adopterAProfileId);
  });

  it('[PROFILE-01] upsert is idempotent on userId uniqueness — re-running updateSection does not create a second profile row', async () => {
    await serviceA.updateSection(adopterAId, {
      section: 'datos-basicos',
      phone: '+50399999999',
      occupation: 'Designer',
      birthDate: '1992-05-15',
    } as any);

    // Call again — should UPDATE, not INSERT
    await serviceA.updateSection(adopterAId, {
      section: 'datos-basicos',
      phone: '+50388888888',
      occupation: 'Architect',
      birthDate: '1992-05-15',
    } as any);

    // Assert only ONE profile row for adopterA exists (no duplicate)
    const rows = await superClient.query(
      `SELECT COUNT(*)::int AS cnt FROM adopter_profiles WHERE "userId" = $1`,
      [adopterAId],
    );
    expect(rows.rows[0].cnt).toBe(1);

    // Assert the second upsert's values are present (the update worked)
    const profile = await serviceA.getMyProfile(adopterAId);
    expect(profile.phone).toBe('+50388888888');
    expect(profile.occupation).toBe('Architect');
  });

  it('[PROFILE-01] photo ownership enforcement — serviceB.removePhoto on A\'s photo throws NotFoundException; photo still exists', async () => {
    // B tries to delete A's photo — should throw NotFoundException (T-16-03-03)
    await expect(
      serviceB.removePhoto(adopterBId, adopterAPhotoId),
    ).rejects.toThrow(NotFoundException);

    // Verify A's photo was NOT deleted (superClient bypasses RLS)
    const photoCheck = await superClient.query(
      `SELECT id FROM profile_photos WHERE id = $1`,
      [adopterAPhotoId],
    );
    expect(photoCheck.rows.length).toBe(1);
  });

  it('[PROFILE-01] completionPct integration — fully-populated profile + 1 photo returns 100%, deleting photo returns 80%', async () => {
    // Update B's profile to be fully populated via superClient
    const fullProfile = await superClient.query(
      `UPDATE adopter_profiles
       SET phone = '+50312345678',
           occupation = 'Engineer',
           "birthDate" = '1990-01-01',
           city = 'San Salvador',
           "housingType" = 'casa',
           ownership = 'propio',
           adults = 2,
           children = 0,
           "activityLevel" = 'alta',
           "hoursAlone" = 4,
           "adoptionReason" = 'compania',
           "speciesExperience" = true,
           "updatedAt" = NOW()
       WHERE "userId" = $1
       RETURNING id`,
      [adopterBId],
    );
    const profileBId = fullProfile.rows[0].id;

    // Insert 1 photo for B
    const photoInsert = await superClient.query(
      `INSERT INTO profile_photos (id, "profileId", url, key, position, "createdAt")
       VALUES (gen_random_uuid(), $1, 'http://minio/b-photo.jpg', 'profiles/b-photo.jpg', 0, NOW()) RETURNING id`,
      [profileBId],
    );
    const photoBId = photoInsert.rows[0].id;

    // Fully populated + 1 photo = 100%
    const profileFull = await serviceB.getMyProfile(adopterBId);
    expect(profileFull.completionPct).toBe(100);

    // Delete the photo via superClient, then re-fetch — should be 80%
    await superClient.query(`DELETE FROM profile_photos WHERE id = $1`, [photoBId]);

    const profileNoPhoto = await serviceB.getMyProfile(adopterBId);
    expect(profileNoPhoto.completionPct).toBe(80);
  });
});
