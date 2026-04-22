import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser for refresh token
  app.use(cookieParser());

  // Bull Board auth — applied at Express level so it intercepts before the
  // ExpressAdapter-mounted router (MiddlewareConsumer cannot reach those routes)
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  const BULL_BOARD_COOKIE = 'bb_session';
  app.use('/admin/queues', (req: any, res: any, next: any) => {
    // Static assets bundled by Bull Board don't carry the token — allow them through
    if ((req.path as string).startsWith('/static/')) {
      next();
      return;
    }

    // After the initial token-authenticated load, Bull Board's SPA makes XHR
    // requests without the token. Accept a short-lived session cookie set on
    // the first valid token exchange so those subsequent requests pass through.
    const sessionCookie = req.cookies?.[BULL_BOARD_COOKIE];
    if (sessionCookie === 'authorized') {
      next();
      return;
    }

    const authHeader = req.headers['authorization'] as string | undefined;
    const token: string | null =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (req.query?.token as string | undefined) ?? null;

    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    try {
      const payload = jwtService.verify<{ role: string }>(token, {
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.role !== 'PLATFORM_ADMIN') {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      // Set a 15-minute session cookie so Bull Board's SPA XHR calls pass through
      res.cookie(BULL_BOARD_COOKIE, 'authorized', {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });
      next();
    } catch {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS for frontend (allow both host and Docker-internal origins)
  const corsOrigins = [
    process.env.APP_URL || 'http://localhost:3001',
    'http://localhost:3000', // Docker-internal web container origin (E2E tests)
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Swagger docs at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Kovia API')
    .setDescription('Smart Pet Adoption Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
