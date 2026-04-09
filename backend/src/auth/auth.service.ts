import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
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
    const role = userCount === 0 ? 'PLATFORM_ADMIN' : 'ADOPTER';

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: role as any,
      emailVerified: false,
    });

    // Generate verification token
    const verificationToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'email-verification' },
      {
        secret: this.config.get<string>('JWT_VERIFICATION_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    // Queue verification email
    await this.mailService.sendVerificationEmail(
      dto.email,
      verificationToken,
      dto.firstName,
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
        secret: this.config.get<string>('JWT_VERIFICATION_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET'),
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
        secret: this.config.get<string>('JWT_VERIFICATION_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    await this.mailService.sendResetPasswordEmail(
      email,
      resetToken,
      user.firstName || '',
    );

    return { message: 'Si el correo existe, recibiras un enlace para restablecer tu contrasena' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_VERIFICATION_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET'),
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
        secret: this.config.get<string>('JWT_VERIFICATION_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      },
    );

    await this.mailService.sendVerificationEmail(
      email,
      verificationToken,
      user.firstName || '',
    );

    return { message: 'Se ha enviado un nuevo enlace de verificacion' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    const org = await this.prisma.organization.findFirst({
      where: { adminId: userId },
      select: { id: true },
    });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      organizationId: org?.id ?? null,
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
    const payload = { sub: user.id, email: user.email, role: user.role };

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

    await this.prisma.refreshToken.upsert({
      where: { id: user.id }, // Use a deterministic lookup
      update: { token: hashedRefresh, expiresAt },
      create: { userId: user.id, token: hashedRefresh, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
