import { Global, Module } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from './prisma.service';
import { createRlsExtension } from './prisma-rls.extension';

export const PRISMA_RLS = 'PRISMA_RLS';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: PRISMA_RLS,
      inject: [PrismaService, ClsService],
      useFactory: (prisma: PrismaService, cls: ClsService) => {
        return createRlsExtension(prisma, cls);
      },
    },
  ],
  exports: [PrismaService, PRISMA_RLS],
})
export class PrismaModule {}
