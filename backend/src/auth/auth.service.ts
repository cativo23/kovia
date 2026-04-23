import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Profile } from 'passport-google-oauth20';
import { UsersService } from '../users/users.service';
import { MailDispatcher } from '../mail/mail-dispatcher.service';
import { VerificationMail } from '../mail/mailables/verification.mail';
import { ResetPasswordMail } from '../mail/mailables/reset-password.mail';
import { WelcomeMail } from '../mail/mailables/welcome.mail';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailDispatcher: MailDispatcher,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    // Check for duplicate email
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('El correo electronico ya esta registrado');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // First user gets PLATFORM_ADMIN role
    const userCount = await this.prisma.user.count();
    const role: UserRole = userCount === 0 ? UserRole.PLATFORM_ADMIN : UserRole.ADOPTER;

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      emailVerified: false,
    });

    // Generate verification token
    const verificationToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'email-verification' },
      {
        secret: this.config.getOrThrow<string>('JWT_VERIFICATION_SECRET'),
        expiresIn: '1h',
      },
    );

    // Queue verification email
    await this.mailDispatcher.send(
      new VerificationMail(dto.email, {
        firstName: dto.firstName,
        verificationUrl: `${this.config.get<string>('APP_URL')}/verify-email?token=${verificationToken}`,
      }),
    );

    return {
      message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.',
      userId: user.id,
    };
  }

  async verifyEmail(token: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_VERIFICATION_SECRET'),
      });
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'El enlace de verificacion ha expirado',
          error: 'TOKEN_EXPIRED',
        });
      }
      throw new UnauthorizedException('Token de verificacion invalido');
    }

    if (payload.type !== 'email-verification') {
      throw new UnauthorizedException('Token de verificacion invalido');
    }

    const user = await this.usersService.findById(payload.sub);

    // Mark email as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Dispatch welcome email — AFTER prisma.user.update commits (D-11 convention)
    await this.mailDispatcher.send(
      new WelcomeMail(user.email, { firstName: user.firstName || '' }),
    );

    // Auto-login: generate tokens (magic link pattern per CONTEXT.md)
    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return user;
  }

  async login(user: any) {
    if (!user.emailVerified) {
      throw new ForbiddenException('Debes verificar tu correo electronico antes de iniciar sesion');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Tu cuenta ha sido desactivada');
    }

    return this.generateTokens(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'Si el correo existe, recibiras un enlace para restablecer tu contrasena' };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'password-reset' },
      {
        secret: this.config.getOrThrow<string>('JWT_VERIFICATION_SECRET'),
        expiresIn: '1h',
      },
    );

    await this.mailDispatcher.send(
      new ResetPasswordMail(email, {
        firstName: user.firstName || '',
        resetUrl: `${this.config.get<string>('APP_URL')}/reset-password?token=${resetToken}`,
      }),
    );

    return { message: 'Si el correo existe, recibiras un enlace para restablecer tu contrasena' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_VERIFICATION_SECRET'),
      });
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          message: 'El enlace ha expirado',
          error: 'TOKEN_EXPIRED',
        });
      }
      throw new UnauthorizedException('Token invalido');
    }

    if (payload.type !== 'password-reset') {
      throw new UnauthorizedException('Token invalido');
    }

    const user = await this.usersService.findById(payload.sub);

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Auto-login: generate tokens (magic link pattern per CONTEXT.md)
    return this.generateTokens(user);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    // Find the user's stored refresh token
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: { userId },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token de refresco invalido');
    }

    // Compare the provided token with the stored hash
    const isValid = await bcrypt.compare(refreshToken, storedToken.token);
    if (!isValid) {
      throw new UnauthorizedException('Token de refresco invalido');
    }

    // Check expiry
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de refresco expirado');
    }

    const user = await this.usersService.findById(userId);

    // Delete old token (rotation)
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new pair
    return this.generateTokens(user);
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerified) {
      return { message: 'Si el correo necesita verificacion, se ha enviado un nuevo enlace' };
    }

    const verificationToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'email-verification' },
      {
        secret: this.config.getOrThrow<string>('JWT_VERIFICATION_SECRET'),
        expiresIn: '1h',
      },
    );

    await this.mailDispatcher.send(
      new VerificationMail(email, {
        firstName: user.firstName || '',
        verificationUrl: `${this.config.get<string>('APP_URL')}/verify-email?token=${verificationToken}`,
      }),
    );

    return { message: 'Se ha enviado un nuevo enlace de verificacion' };
  }

  async loginWithGoogle(profile: Profile): Promise<{
    accessToken: string;
    refreshToken: string;
    isNew: boolean;
    isLinked: boolean;
  }> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('Google profile missing email');
    }

    const googleId = profile.id;
    const firstName = profile.name?.givenName ?? null;
    const lastName = profile.name?.familyName ?? null;

    // 1. Returning user: find by googleId
    let user = await this.prisma.user.findFirst({ where: { googleId } });
    let isNew = false;
    let isLinked = false;

    if (!user) {
      // 2. Link branch: find by email
      user = await this.prisma.user.findFirst({ where: { email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, emailVerified: true },
        });
        isLinked = true;
      } else {
        // 3. Create branch: first user gets PLATFORM_ADMIN, otherwise ADOPTER
        const userCount = await this.prisma.user.count();
        const role: UserRole = userCount === 0 ? UserRole.PLATFORM_ADMIN : UserRole.ADOPTER;
        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            firstName,
            lastName,
            emailVerified: true,
            role,
          },
        });
        isNew = true;
        // Dispatch WelcomeMail AFTER create completes (D-11 convention: never inside $transaction)
        await this.mailDispatcher.send(
          new WelcomeMail(email, { firstName: firstName ?? '' }),
        );
      }
    }

    // 4. D-02 fix: use DB value, never override
    if (!user.isActive) {
      throw new ForbiddenException('Tu cuenta ha sido desactivada');
    }

    const tokens = await this.generateTokens(user);
    return { ...tokens, isNew, isLinked };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    // Single source of truth: User.orgId (Phase 9 Plan 09-01 Task 3).
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      organizationId: (user as any).orgId ?? null,
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    return { message: 'Sesion cerrada exitosamente' };
  }

  decodeRefreshToken(token: string): { sub: string } | null {
    try {
      return this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      return null;
    }
  }

  private async generateTokens(user: any) {
    // Single source of truth: User.orgId (backfilled in multi_role_permissions migration).
    // ORG_ADMIN and ORG_STAFF both carry orgId; ADOPTER/PLATFORM_ADMIN have it as null.
    const organizationId: string | null = user.orgId ?? null;

    const payload: Record<string, any> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    };
    if (organizationId) {
      payload.organizationId = organizationId;
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    // Store hashed refresh token in DB
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Delete any existing tokens for this user (rotation), then create fresh
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: hashedRefresh, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
