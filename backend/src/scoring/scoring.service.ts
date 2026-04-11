import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { scoreApplication } from './engine';
import { ScoringResult } from './engine.types';

@Injectable()
export class ScoringService {
  constructor(private readonly publicPrisma: PrismaService) {}

  async rescore(applicationId: string): Promise<ScoringResult> {
    const application = await this.publicPrisma.adoptionApplication.findUnique({
      where: { id: applicationId },
      include: {
        animal: { include: { species: true } },
        photos: true,
      },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const returnCount = await this.publicPrisma.adoptionApplication.count({
      where: { userId: application.userId, status: 'DEVUELTA' as any },
    });

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

    // Write score with admin context
    // Wrapped in $transaction so set_config and UPDATE share the same connection/transaction
    await this.publicPrisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`;
      await tx.adoptionApplication.update({
        where: { id: applicationId },
        data: { score: result.total, scoreDetails: result as any },
      });
    });

    return result;
  }
}
