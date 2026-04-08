import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      APP_URL: 'http://localhost:3001',
    };
    return config[key];
  }),
};

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  const makeProfile = (overrides?: Partial<{
    id: string;
    emails: Array<{ value: string; verified: boolean }>;
    name: { givenName: string; familyName: string };
    photos: Array<{ value: string }>;
  }>) => ({
    id: 'google-123',
    emails: [{ value: 'google@test.com', verified: true }],
    name: { givenName: 'Google', familyName: 'User' },
    photos: [{ value: 'https://photo.url' }],
    ...overrides,
  });

  describe('validate', () => {
    it('should create new user with googleId for new Google user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(1); // not first user
      const newUser = {
        id: '1',
        email: 'google@test.com',
        googleId: 'google-123',
        emailVerified: true,
        role: 'ADOPTER',
        firstName: 'Google',
        lastName: 'User',
      };
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await strategy.validate('access', 'refresh', makeProfile());

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'google@test.com',
          googleId: 'google-123',
          emailVerified: true,
          role: 'ADOPTER',
          firstName: 'Google',
          lastName: 'User',
        }),
      });
      expect(result).toEqual(newUser);
    });

    it('should link Google account to existing user with same email', async () => {
      const existingUser = {
        id: '1',
        email: 'google@test.com',
        googleId: null,
        emailVerified: false,
        role: 'ADOPTER',
      };
      mockPrisma.user.findFirst.mockResolvedValueOnce(null) // no googleId match
        .mockResolvedValueOnce(existingUser); // email match
      const updatedUser = { ...existingUser, googleId: 'google-123', emailVerified: true };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await strategy.validate('access', 'refresh', makeProfile());

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { googleId: 'google-123', emailVerified: true },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should return existing user when Google account already linked', async () => {
      const existingUser = {
        id: '1',
        email: 'google@test.com',
        googleId: 'google-123',
        emailVerified: true,
        role: 'ADOPTER',
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      const result = await strategy.validate('access', 'refresh', makeProfile());

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('should return user object suitable for token generation', async () => {
      const user = {
        id: '1',
        email: 'google@test.com',
        googleId: 'google-123',
        emailVerified: true,
        role: 'ADOPTER',
        firstName: 'Google',
        lastName: 'User',
      };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await strategy.validate('access', 'refresh', makeProfile());

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('role');
    });
  });
});
