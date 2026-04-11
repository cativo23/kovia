import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApplicationNotesService } from './application-notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('applications/:applicationId/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationNotesController {
  constructor(private readonly notesService: ApplicationNotesService) {}

  @Post()
  @Roles('ORG_ADMIN', 'ORG_STAFF')
  async create(
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateNoteDto,
    @Req() req: any,
  ) {
    return this.notesService.create(applicationId, dto, req.user.id);
  }

  @Get()
  @Roles('ORG_ADMIN', 'ORG_STAFF')
  async findAll(@Param('applicationId') applicationId: string) {
    return this.notesService.findByApplication(applicationId);
  }
}
