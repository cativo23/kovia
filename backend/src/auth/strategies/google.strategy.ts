import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'placeholder-client-id',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder-client-secret',
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;
    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;

    // Check if user exists by googleId
    let user = await this.prisma.user.findFirst({
      where: { googleId },
    });

    if (user) {
      return user;
    }

    // Check if user exists by email (link accounts)
    user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (user) {
      // Link Google account to existing user
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId, emailVerified: true },
      });
      return updated;
    }

    // Create new user -- first user gets PLATFORM_ADMIN
    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? 'PLATFORM_ADMIN' : 'ADOPTER';

    const newUser = await this.prisma.user.create({
      data: {
        email: email!,
        googleId,
        firstName,
        lastName,
        emailVerified: true,
        role: role as any,
      },
    });

    return newUser;
  }
}
