import { PrismaClient } from '../generated/prisma/client';
import { ClsService } from 'nestjs-cls';

export function createRlsExtension(prisma: PrismaClient, cls: ClsService) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        const orgId = cls.get('organizationId') as string | undefined;
        const userId = cls.get('userId') as string | undefined;
        const isAdmin = cls.get('isAdmin') as boolean | undefined;

        // No tenant context (e.g., public routes, auth routes)
        if (!orgId && !userId && !isAdmin) {
          return query(args);
        }

        // Wrap in transaction that sets the tenant context via SET LOCAL
        return prisma.$transaction(async (tx) => {
          if (orgId) {
            await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
          }
          if (userId) {
            await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
          }
          if (isAdmin) {
            await tx.$executeRaw`SELECT set_config('app.is_admin', ${'true'}, true)`;
          }
          return query(args);
        });
      },
    },
  });
}
