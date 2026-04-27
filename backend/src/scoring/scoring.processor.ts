import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { scoreApplication } from './engine';
import { EventsService } from '../notifications/events.service';

@Processor('scoring')
export class ScoringProcessor extends WorkerHost {
  constructor(
    private readonly rlsBypassPrisma: PublicPrismaService,
    private readonly eventsService: EventsService,
  ) {
    super();
  }

  async process(job: Job<{ applicationId: string }>) {
    const { applicationId } = job.data;

    let score: number | null = null;
    let riskLevel: string | null = null;

    // Batch transactions for @prisma/adapter-pg compatibility.
    // Interactive transactions split operations into separate PG transactions,
    // breaking set_config scope. Split into: read → compute → write.

    // 1. Fetch application data with admin bypass
    const [, application] = await this.rlsBypassPrisma.$transaction([
      this.rlsBypassPrisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.rlsBypassPrisma.adoptionApplication.findUnique({
        where: { id: applicationId },
        include: {
          animal: { include: { species: true } },
          photos: true,
        },
      }),
    ]);

    if (!application) return;

    // 2. Fetch adopter history (return count) for red flag detection
    const [, returnCount] = await this.rlsBypassPrisma.$transaction([
      this.rlsBypassPrisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.rlsBypassPrisma.adoptionApplication.count({
        where: { userId: application.userId, status: 'DEVUELTA' as any },
      }),
    ]);

    // 3. Call pure scoring engine
    const result = scoreApplication({
      application: {
        personalInfo: application.personalInfo as Record<string, any> | null,
        housing: application.housing as Record<string, any> | null,
        lifestyle: application.lifestyle as Record<string, any> | null,
        socialMedia: application.socialMedia,
        additionalContext: application.additionalContext,
        photos: application.photos,
      },
      animal: {
        species: { slug: (application.animal as any).species.slug },
        energyLevel: (application.animal as any).energyLevel,
        goodWithKids: (application.animal as any).goodWithKids,
        goodWithDogs: (application.animal as any).goodWithDogs,
        goodWithCats: (application.animal as any).goodWithCats,
        size: (application.animal as any).size,
      },
      adopterHistory: { returnCount },
    });

    score = result.total;
    riskLevel = result.riskLevel;

    // 4. Write score back with admin bypass
    await this.rlsBypassPrisma.$transaction([
      this.rlsBypassPrisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.rlsBypassPrisma.adoptionApplication.update({
        where: { id: applicationId },
        data: { score: result.total, scoreDetails: result as any },
      }),
    ]);

    // Emit event AFTER scoring transaction succeeds (not in same transaction)
    if (score !== null && riskLevel !== null) {
      await this.eventsService.emitApplicationScored(applicationId, score, riskLevel);
    }
  }
}
