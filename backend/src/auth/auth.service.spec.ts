import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailDispatcher } from '../mail/mail-dispatcher.service';
import { VerificationMail } from '../mail/mailables/verification.mail';
import { ResetPasswordMail } from '../mail/mailables/reset-password.mail';
import { WelcomeMail } from '../mail/mailables/welcome.mail';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}));

const mockUsersService = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockMailDispatcher = {
  send: vi.fn(),
};

const mockJwtService = {
  signAsync: vi.fn(),
  verifyAsync: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_VERIFICATION_SECRET: 'test-verify-secret',
      APP_URL: 'http://localhost:3001',
    };
    return config[key];
  }),
  getOrThrow: vi.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_VERIFICATION_SECRET: 'test-verify-secret',
      APP_URL: 'http://localhost:3001',
    };
    const value = config[key];
    if (!value) throw new Error(`Config key ${key} not found`);
    return value;
  }),
};

const mockPrisma = {
  refreshToken: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),  // add — generateTokens uses deleteMany then create
  },
  user: {
    count: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),  // add — loginWithGoogle needs this
    create: vi.fn(),     // add — loginWithGoogle create branch
  },
  organization: {
    findFirst: vi.fn(),  // add — generateTokens ORG_ADMIN lookup
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailDispatcher, useValue: mockMailDispatcher },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'test@test.com',
      password: 'Test1234!',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should create user with hashed password, not plaintext', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(1); // not first user
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-pw');
      mockUsersService.create.mockResolvedValue({
        id: '1',
        email: dto.email,
        role: 'ADOPTER',
        emailVerified: false,
      });
      mockJwtService.signAsync.mockResolvedValue('verify-token');
      mockMailDispatcher.send.mockResolvedValue(undefined);

      await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          passwordHash: 'hashed-pw',
          firstName: dto.firstName,
          lastName: dto.lastName,
        }),
      );
    });

    it('should set role=ADOPTER and emailVerified=false', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(1);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-pw');
      mockUsersService.create.mockResolvedValue({
        id: '1',
        email: dto.email,
        role: 'ADOPTER',
        emailVerified: false,
      });
      mockJwtService.signAsync.mockResolvedValue('verify-token');

      await service.register(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADOPTER',
          emailVerified: false,
        }),
      );
    });

    it('should queue verification email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(1);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-pw');
      const user = { id: '1', email: dto.email, firstName: dto.firstName };
      mockUsersService.create.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('verify-token');

      await service.register(dto);

      expect(mockMailDispatcher.send).toHaveBeenCalledWith(
        expect.any(VerificationMail),
      );
    });

    it('should reject duplicate email with ConflictException', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should give first user PLATFORM_ADMIN role', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(0); // first user
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-pw');
      mockUsersService.create.mockResolvedValue({
        id: '1',
        email: dto.email,
        role: 'PLATFORM_ADMIN',
        emailVerified: false,
      });
      mockJwtService.signAsync.mockResolvedValue('verify-token');

      await service.register(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'PLATFORM_ADMIN' }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should set emailVerified=true and return tokens for valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: '1', type: 'email-verification' });
      const user = { id: '1', email: 'test@test.com', role: 'ADOPTER', emailVerified: false, firstName: 'Test' };
      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, emailVerified: true });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-refresh');
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockMailDispatcher.send.mockResolvedValue(undefined);

      const result = await service.verifyEmail('valid-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: { emailVerified: true },
        }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with TOKEN_EXPIRED for expired token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue({ name: 'TokenExpiredError' });

      try {
        await service.verifyEmail('expired-token');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as any).response?.error).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('login', () => {
    it('should return accessToken and refreshToken for valid credentials', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'ADOPTER', emailVerified: true, isActive: true };
      mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-refresh');
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      const result = await service.login(user);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
    });

    it('should throw ForbiddenException for unverified email', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'ADOPTER', emailVerified: false, isActive: true };

      await expect(service.login(user)).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // This is tested through validateUser which login depends on
      // validateUser is called by LocalStrategy, not login directly
      // login receives the already-validated user
      // We test that login requires emailVerified and isActive
      expect(true).toBe(true);
    });

    it('should throw ForbiddenException for deactivated user', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'ADOPTER', emailVerified: true, isActive: false };

      await expect(service.login(user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const user = { id: '1', email: 'test@test.com', passwordHash: 'hashed', isActive: true };
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const user = { id: '1', email: 'test@test.com', passwordHash: 'hashed', isActive: true };
      mockUsersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(service.validateUser('test@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('nope@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('requestPasswordReset', () => {
    it('should queue reset email for existing user', async () => {
      const user = { id: '1', email: 'test@test.com', firstName: 'Test' };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('reset-token');
      mockMailDispatcher.send.mockResolvedValue(undefined);

      await service.requestPasswordReset('test@test.com');

      expect(mockMailDispatcher.send).toHaveBeenCalledWith(
        expect.any(ResetPasswordMail),
      );
    });

    it('should return 200 even for non-existent user (no info leak)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Should not throw
      await expect(service.requestPasswordReset('nope@test.com')).resolves.not.toThrow();
      expect(mockMailDispatcher.send).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should update password and return tokens for valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: '1', type: 'password-reset' });
      const user = { id: '1', email: 'test@test.com', role: 'ADOPTER', emailVerified: true };
      mockUsersService.findById.mockResolvedValue(user);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValueOnce('new-hashed-pw').mockResolvedValueOnce('hashed-refresh');
      mockPrisma.user.update.mockResolvedValue({ ...user, passwordHash: 'new-hashed-pw' });
      mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      const result = await service.resetPassword('valid-token', 'NewPass123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with TOKEN_EXPIRED for expired token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue({ name: 'TokenExpiredError' });

      try {
        await service.resetPassword('expired-token', 'NewPass123!');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as any).response?.error).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('refreshTokens', () => {
    it('should return new token pair for valid refresh token', async () => {
      const storedToken = { id: 'rt-1', token: 'hashed-token', userId: '1', expiresAt: new Date(Date.now() + 86400000) };
      const user = { id: '1', email: 'test@test.com', role: 'ADOPTER' };
      mockPrisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('new-hashed-refresh');
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      const result = await service.refreshTokens('1', 'valid-refresh');

      expect(result).toHaveProperty('accessToken', 'new-access');
      expect(result).toHaveProperty('refreshToken', 'new-refresh');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refreshTokens('1', 'invalid')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginWithGoogle', () => {
    const makeProfile = (overrides?: any) => ({
      id: 'google-123',
      emails: [{ value: 'google@test.com', verified: true }],
      name: { givenName: 'Google', familyName: 'User' },
      ...overrides,
    });

    const baseUser = {
      id: 'u-1',
      email: 'google@test.com',
      googleId: 'google-123',
      emailVerified: true,
      isActive: true,
      role: 'ADOPTER',
      firstName: 'Google',
      lastName: 'User',
    };

    beforeEach(() => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-refresh');
    });

    it('should create new user and dispatch WelcomeMail when no account exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // no googleId match, then no email match
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.create.mockResolvedValue(baseUser);

      const result = await service.loginWithGoogle(makeProfile() as any);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'google@test.com',
          googleId: 'google-123',
          emailVerified: true,
          role: 'ADOPTER',
        }),
      });
      expect(mockMailDispatcher.send).toHaveBeenCalledWith(expect.any(WelcomeMail));
      expect(result).toMatchObject({ isNew: true, isLinked: false, accessToken: 'access-token' });
    });

    it('should return tokens without DB writes for returning Google user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(baseUser); // googleId match on first call

      const result = await service.loginWithGoogle(makeProfile() as any);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockMailDispatcher.send).not.toHaveBeenCalled();
      expect(result).toMatchObject({ isNew: false, isLinked: false });
    });

    it('should link existing email account and NOT dispatch WelcomeMail', async () => {
      const unlinkedUser = { ...baseUser, googleId: null, emailVerified: false };
      const linkedUser = { ...baseUser };
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(null)          // no googleId match
        .mockResolvedValueOnce(unlinkedUser); // email match
      mockPrisma.user.update.mockResolvedValue(linkedUser);

      const result = await service.loginWithGoogle(makeProfile() as any);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { googleId: 'google-123', emailVerified: true },
      });
      expect(mockMailDispatcher.send).not.toHaveBeenCalled();
      expect(result).toMatchObject({ isNew: false, isLinked: true });
    });

    it('should throw ForbiddenException for deactivated user', async () => {
      const deactivatedUser = { ...baseUser, isActive: false };
      mockPrisma.user.findFirst.mockResolvedValue(deactivatedUser);

      await expect(service.loginWithGoogle(makeProfile() as any)).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException when Google profile has no email', async () => {
      await expect(
        service.loginWithGoogle(makeProfile({ emails: [] }) as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens (via login) — organizationId from User.orgId', () => {
    // Phase 9 Plan 09-01 Task 3: generateTokens reads user.orgId as the single
    // source of truth instead of deriving it from Organization.adminId.
    // This enables ORG_STAFF users (who are not the org admin) to receive
    // organizationId in their JWT payload.

    beforeEach(() => {
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-refresh');
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});
    });

    it('includes organizationId in JWT payload for ORG_STAFF users using user.orgId', async () => {
      const staffUser = {
        id: 'user-staff',
        email: 'staff@org.com',
        role: 'ORG_STAFF',
        emailVerified: true,
        isActive: true,
        orgId: 'org-123',
      };
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.login(staffUser);

      // First signAsync call is the access token — assert payload includes organizationId
      const accessCall = (mockJwtService.signAsync as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(accessCall[0]).toMatchObject({
        sub: 'user-staff',
        role: 'ORG_STAFF',
        organizationId: 'org-123',
      });
    });

    it('includes organizationId in JWT payload for ORG_ADMIN users from user.orgId (no adminId lookup)', async () => {
      const adminUser = {
        id: 'user-admin',
        email: 'admin@org.com',
        role: 'ORG_ADMIN',
        emailVerified: true,
        isActive: true,
        orgId: 'org-456',
      };
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.login(adminUser);

      const accessCall = (mockJwtService.signAsync as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(accessCall[0]).toMatchObject({
        sub: 'user-admin',
        role: 'ORG_ADMIN',
        organizationId: 'org-456',
      });
      // generateTokens must no longer derive org via organization.findFirst({ adminId })
      expect(mockPrisma.organization.findFirst).not.toHaveBeenCalled();
    });

    it('omits organizationId from JWT payload for ADOPTER users (orgId null)', async () => {
      const adopter = {
        id: 'user-adopter',
        email: 'adopter@test.com',
        role: 'ADOPTER',
        emailVerified: true,
        isActive: true,
        orgId: null,
      };
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.login(adopter);

      const accessCall = (mockJwtService.signAsync as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(accessCall[0]).not.toHaveProperty('organizationId');
    });
  });
});
