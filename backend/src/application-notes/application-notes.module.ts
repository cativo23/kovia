import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApplicationNotesService } from './application-notes.service';
import { ApplicationNotesController } from './application-notes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ApplicationNotesController],
  providers: [ApplicationNotesService],
  exports: [ApplicationNotesService],
})
export class ApplicationNotesModule {}
