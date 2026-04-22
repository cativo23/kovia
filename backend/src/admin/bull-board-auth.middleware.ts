import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BullBoardAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token: string | null =
      authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (req.query?.token as string | undefined) ?? null;

    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const payload = this.jwtService.verify<{ role: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.role !== 'PLATFORM_ADMIN') {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }

      next();
    } catch {
      res.status(401).json({ message: 'Unauthorized' });
    }
  }
}
