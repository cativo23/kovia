/**
 * AdopterProfileService Unit Tests — Phase 16 PROFILE-01.
 *
 * Tests computeCompletionPct logic with a minimal mock Prisma client (no real DB).
 * Integration spec (adopter-profile.service.integration.spec.ts) covers
 * real-DB scenarios: RLS isolation, idempotent upsert, photo ownership.
 */

import { describe, it, expect, vi } from 'vitest';
import { AdopterProfileService } from './adopter-profile.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// -------------------------------------------------------------------
// Mock factory — returns a partial AdopterProfile shape for unit tests.
// Photos array must always be provided (service uses photos.length).
// -------------------------------------------------------------------
function makeMockProfile(overrides: Record<string, any> = {}): any {
  return {
    id: 'profile-id-1',
    userId: 'user-id-1',
    phone: null,
    occupation: null,
    birthDate: null,
    city: null,
    housingType: null,
    ownership: null,
    exteriorSpace: null,
    petPermission: null,
    adults: null,
    children: null,
    currentPets: null,
    activityLevel: null,
    hoursAlone: null,
    adoptionReason: null,
    speciesExperience: null,
    previousPets: null,
    additionalContext: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    photos: [],
    ...overrides,
  };
}

// -------------------------------------------------------------------
// Mock rlsPrisma factory — minimal stub for unit tests
// -------------------------------------------------------------------
function makeMockRlsPrisma(profileFactory: () => any) {
  return {
    adopterProfile: {
      upsert: vi.fn(async () => profileFactory()),
    },
    profilePhoto: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('AdopterProfileService', () => {
  describe('computeCompletionPct', () => {
    it('[PROFILE-01] returns 0 for empty profile (all sections null/missing)', async () => {
      const emptyProfile = makeMockProfile();
      const mockRls = makeMockRlsPrisma(() => emptyProfile);
      const service = new AdopterProfileService(mockRls as any);
      const result = await service.getMyProfile('user-id-1');
      expect(result.completionPct).toBe(0);
    });

    it('[PROFILE-01] returns 20 when only datos básicos section is complete (phone + occupation + birthDate non-null)', async () => {
      const profile = makeMockProfile({
        phone: '+50312345678',
        occupation: 'Engineer',
        birthDate: new Date('1990-01-01'),
      });
      const mockRls = makeMockRlsPrisma(() => profile);
      const service = new AdopterProfileService(mockRls as any);
      const result = await service.getMyProfile('user-id-1');
      expect(result.completionPct).toBe(20);
    });

    it('[PROFILE-01] returns 40 when datos básicos + hogar sections are both complete', async () => {
      const profile = makeMockProfile({
        phone: '+50312345678',
        occupation: 'Engineer',
        birthDate: new Date('1990-01-01'),
        housingType: 'casa',
        ownership: 'propio',
        adults: 2,
      });
      const mockRls = makeMockRlsPrisma(() => profile);
      const service = new AdopterProfileService(mockRls as any);
      const result = await service.getMyProfile('user-id-1');
      expect(result.completionPct).toBe(40);
    });

    it('[PROFILE-01] returns 60 when datos básicos + hogar + estilo de vida sections are all complete', async () => {
      const profile = makeMockProfile({
        phone: '+50312345678',
        occupation: 'Engineer',
        birthDate: new Date('1990-01-01'),
        housingType: 'casa',
        ownership: 'propio',
        adults: 2,
        activityLevel: 'alta',
        hoursAlone: 4,
        adoptionReason: 'companía',
      });
      const mockRls = makeMockRlsPrisma(() => profile);
      const service = new AdopterProfileService(mockRls as any);
      const result = await service.getMyProfile('user-id-1');
      expect(result.completionPct).toBe(60);
    });

    it('[PROFILE-01] returns 80 when 4 of 5 sections are complete (datos básicos + hogar + estilo de vida + experiencia general)', async () => {
      const profile = makeMockProfile({
        phone: '+50312345678',
        occupation: 'Engineer',
        birthDate: new Date('1990-01-01'),
        housingType: 'casa',
        ownership: 'propio',
        adults: 2,
        activityLevel: 'alta',
        hoursAlone: 4,
        adoptionReason: 'companía',
        speciesExperience: true,
      });
      const mockRls = makeMockRlsPrisma(() => profile);
      const service = new AdopterProfileService(mockRls as any);
      const result = await service.getMyProfile('user-id-1');
      expect(result.completionPct).toBe(80);
    });

    it('[PROFILE-01] returns 100 when all 5 sections are complete including fotos del hogar (photos.length >= 1)', async () => {
      const profile = makeMockProfile({
        phone: '+50312345678',
        occupation: 'Engineer',
        birthDate: new Date('1990-01-01'),
        housingType: 'casa',
        ownership: 'propio',
        adults: 2,
        activityLevel: 'alta',
        hoursAlone: 4,
        adoptionReason: 'companía',
        speciesExperience: true,
        photos: [{ id: 'photo-1', url: 'http://minio/photo.jpg', key: 'profiles/photo.jpg', position: 0 }],
      });
      const mockRls = makeMockRlsPrisma(() => profile);
      const service = new AdopterProfileService(mockRls as any);
      const result = await service.getMyProfile('user-id-1');
      expect(result.completionPct).toBe(100);
    });

    it('[PROFILE-01] fotos del hogar section requires photos.length >= 1 (not just profile fields)', async () => {
      // All 4 other sections complete, but photos empty — should be 80 not 100
      const profile = makeMockProfile({
        phone: '+50312345678',
        occupation: 'Engineer',
        birthDate: new Date('1990-01-01'),
        housingType: 'casa',
        ownership: 'propio',
        adults: 2,
        activityLevel: 'alta',
        hoursAlone: 4,
        adoptionReason: 'companía',
        speciesExperience: true,
        photos: [],
      });
      const mockRls = makeMockRlsPrisma(() => profile);
      const service = new AdopterProfileService(mockRls as any);
      const result = await service.getMyProfile('user-id-1');
      expect(result.completionPct).toBe(80);
    });
  });

  describe('updateSection', () => {
    it('[PROFILE-01] upserts profile on userId uniqueness — second call updates existing row, does not insert duplicate', async () => {
      const profileBase = makeMockProfile({ phone: '+50312345678', occupation: 'Engineer', birthDate: new Date('1990-01-01') });
      const mockRls = {
        adopterProfile: {
          upsert: vi.fn(async () => profileBase),
        },
        profilePhoto: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
      };
      const service = new AdopterProfileService(mockRls as any);
      const dto1 = { section: 'datos-basicos', phone: '+50312345678', occupation: 'Engineer', birthDate: '1990-01-01' };
      const dto2 = { section: 'datos-basicos', phone: '+50399999999', occupation: 'Designer', birthDate: '1990-01-01' };

      await service.updateSection('user-id-1', dto1 as any);
      await service.updateSection('user-id-1', dto2 as any);

      // Both calls should use upsert (not insert twice)
      expect(mockRls.adopterProfile.upsert).toHaveBeenCalledTimes(2);
      // upsert is called with { where: { userId }, create: {...}, update: {...} }
      const calls = mockRls.adopterProfile.upsert.mock.calls as Array<any[]>;
      const firstCall = calls[0]?.[0] as any;
      expect(firstCall?.where).toEqual({ userId: 'user-id-1' });
      expect(firstCall).toHaveProperty('create');
      expect(firstCall).toHaveProperty('update');
    });

    it('[PROFILE-01] returns full profile with recomputed completionPct after upsert', async () => {
      const profileAfterUpsert = makeMockProfile({
        phone: '+50312345678',
        occupation: 'Engineer',
        birthDate: new Date('1990-01-01'),
      });
      const mockRls = makeMockRlsPrisma(() => profileAfterUpsert);
      const service = new AdopterProfileService(mockRls as any);
      const dto = { section: 'datos-basicos', phone: '+50312345678', occupation: 'Engineer', birthDate: '1990-01-01' };
      const result = await service.updateSection('user-id-1', dto as any);
      // Section 1 complete — 20%
      expect(result.completionPct).toBe(20);
      expect(result.phone).toBe('+50312345678');
      expect(result.occupation).toBe('Engineer');
    });
  });

  describe('removePhoto', () => {
    it('[PROFILE-01] throws NotFoundException when photo belongs to a different user', async () => {
      const mockRls = {
        adopterProfile: { upsert: vi.fn() },
        profilePhoto: {
          findUnique: vi.fn(async () => ({
            id: 'photo-1',
            profile: { userId: 'other-user-id' },
          })),
          create: vi.fn(),
          delete: vi.fn(),
        },
      };
      const service = new AdopterProfileService(mockRls as any);
      await expect(service.removePhoto('user-id-1', 'photo-1')).rejects.toThrow(NotFoundException);
    });

    it('[PROFILE-01] throws NotFoundException when photo does not exist', async () => {
      const mockRls = {
        adopterProfile: { upsert: vi.fn() },
        profilePhoto: {
          findUnique: vi.fn(async () => null),
          create: vi.fn(),
          delete: vi.fn(),
        },
      };
      const service = new AdopterProfileService(mockRls as any);
      await expect(service.removePhoto('user-id-1', 'nonexistent-photo')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPhoto', () => {
    it('[PROFILE-01] throws BadRequestException when profile already has 5 photos', async () => {
      const profileWith5Photos = makeMockProfile({
        photos: [
          { id: 'p1', position: 0 },
          { id: 'p2', position: 1 },
          { id: 'p3', position: 2 },
          { id: 'p4', position: 3 },
          { id: 'p5', position: 4 },
        ],
      });
      const mockRls = makeMockRlsPrisma(() => profileWith5Photos);
      const service = new AdopterProfileService(mockRls as any);
      await expect(service.addPhoto('user-id-1', 'key', 'http://url')).rejects.toThrow(BadRequestException);
    });
  });
});
