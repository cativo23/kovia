import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | {
          id?: string;
          organizationId?: string;
          role?: string;
        }
      | undefined;

    if (user) {
      if (user.id) {
        this.cls.set('userId', user.id);
      }
      if (user.organizationId) {
        this.cls.set('organizationId', user.organizationId);
      }
      if (user.role === 'PLATFORM_ADMIN') {
        this.cls.set('isAdmin', true);
      }
    }

    return next.handle();
  }
}
