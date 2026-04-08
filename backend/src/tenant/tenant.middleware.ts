import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // Extract tenant context from JWT claims (set by auth guard)
    // The JWT payload is attached to req.user by Passport
    const user = req.user as
      | {
          sub?: string;
          organizationId?: string;
          role?: string;
        }
      | undefined;

    if (user) {
      if (user.sub) {
        this.cls.set('userId', user.sub);
      }
      if (user.organizationId) {
        this.cls.set('organizationId', user.organizationId);
      }
      if (user.role === 'PLATFORM_ADMIN') {
        this.cls.set('isAdmin', true);
      }
    }

    next();
  }
}
