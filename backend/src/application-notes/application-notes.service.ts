import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { CreateNoteDto } from './dto/create-note.dto';
import { EventsService } from '../notifications/events.service';

@Injectable()
export class ApplicationNotesService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prismaRls: any,
    private readonly cls: ClsService,
    private readonly eventsService: EventsService,
  ) {}

  async create(applicationId: string, dto: CreateNoteDto, userId: string) {
    // organizationId is read from CLS context, never from body (T-04-06 mitigation)
    const organizationId = this.cls.get('organizationId') as string;

    const note = await this.prismaRls.applicationNote.create({
      data: {
        applicationId,
        organizationId,
        authorId: userId,
        body: dto.body,
      },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Emit event: notification + webhook
    await this.eventsService.emitNoteAdded(applicationId, note.id);

    return note;
  }

  async findByApplication(applicationId: string) {
    return this.prismaRls.applicationNote.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }
}
