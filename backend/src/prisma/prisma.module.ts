import { Global, Module } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from './prisma.service';
import { PublicPrismaService } from './public-prisma.service';
import { createRlsExtension } from './prisma-rls.extension';

export const PRISMA_RLS = 'PRISMA_RLS';
export const PRISMA_PUBLIC = 'PRISMA_PUBLIC';

@Global()
@Module({
  providers: [
    PrismaService,
    PublicPrismaService,
    {
      provide: PRISMA_RLS,
      inject: [PrismaService, ClsService],
      useFactory: (prisma: PrismaService, cls: ClsService) => {
        return createRlsExtension(prisma, cls);
      },
    },
    {
      provide: PRISMA_PUBLIC,
      useExisting: PublicPrismaService,
    },
  ],
  exports: [PrismaService, PublicPrismaService, PRISMA_RLS, PRISMA_PUBLIC],
})
export class PrismaModule {}
