import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdoptersService } from './adopters.service';
import { AdoptersController } from './adopters.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdoptersController],
  providers: [AdoptersService],
  exports: [AdoptersService],
})
export class AdoptersModule {}
