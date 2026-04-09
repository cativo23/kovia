import { PrismaClient } from '../generated/prisma/client';
import { ClsService } from 'nestjs-cls';

/**
 * RLS extension using batch transactions for SET LOCAL + query.
 * Uses the official Prisma pattern: prisma.$transaction([set_config, query(args)])
 * Both commands run on the same connection within the batch transaction.
 */
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

        // Build SET LOCAL commands for tenant context
        const setCommands: any[] = [];

        if (orgId) {
          setCommands.push(
            prisma.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`,
          );
        }
        if (userId) {
          setCommands.push(
            prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`,
          );
        }
        if (isAdmin) {
          setCommands.push(
            prisma.$executeRaw`SELECT set_config('app.is_admin', ${'true'}, true)`,
          );
        }

        // Batch transaction: SET LOCAL + query on same connection
        // Works with native Prisma engine; may not work with @prisma/adapter-pg
        return prisma.$transaction([...setCommands, query(args)] as any)
          .then((results: any[]) => results[results.length - 1]);
      },
    },
  });
}
