import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../auth.service';

const mockAuthService = {
  loginWithGoogle: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
    };
    return config[key];
  }),
  getOrThrow: vi.fn((key: string) => {
    const config: Record<string, string> = {
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
    };
    const value = config[key];
    if (!value) throw new Error(`Config key ${key} not found`);
    return value;
  }),
};

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  const makeProfile = () => ({
    id: 'google-123',
    emails: [{ value: 'google@test.com', verified: true }],
    name: { givenName: 'Google', familyName: 'User' },
  });

  describe('validate', () => {
    it('should delegate to authService.loginWithGoogle with the profile', async () => {
      const expected = {
        accessToken: 'tok',
        refreshToken: 'ref',
        isNew: false,
        isLinked: false,
      };
      mockAuthService.loginWithGoogle.mockResolvedValue(expected);

      const profile = makeProfile();
      const result = await strategy.validate('at', 'rt', profile as any);

      expect(mockAuthService.loginWithGoogle).toHaveBeenCalledOnce();
      expect(mockAuthService.loginWithGoogle).toHaveBeenCalledWith(profile);
      expect(result).toEqual(expected);
    });

    it('should propagate errors thrown by authService.loginWithGoogle', async () => {
      mockAuthService.loginWithGoogle.mockRejectedValue(new Error('forbidden'));

      await expect(
        strategy.validate('at', 'rt', makeProfile() as any)
      ).rejects.toThrow('forbidden');
    });
  });
});
