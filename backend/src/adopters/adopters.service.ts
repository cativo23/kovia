import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PRISMA_RLS, PRISMA_PUBLIC } from '../prisma/prisma.module';

@Injectable()
export class AdoptersService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prismaRls: any,
    @Inject(PRISMA_PUBLIC) private readonly prismaPublic: any,
    private readonly cls: ClsService,
  ) {}

  async getHistory(userId: string) {
    const currentOrgId = this.cls.get('organizationId');

    // Authorization: confirm this adopter has ever applied to the current org
    const ownOrgCount = await this.prismaRls.adoptionApplication.count({
      where: { userId, organizationId: currentOrgId },
    });
    if (ownOrgCount === 0) {
      throw new NotFoundException('Adopter not found in this organization');
    }

    // Fetch ALL applications across ALL orgs using superuser connection (D-21)
    const allApplications = await this.prismaPublic.adoptionApplication.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      include: {
        animal: {
          include: { species: true },
        },
      },
    });

    // Compute summary totals
    const summary = {
      totalApplications: allApplications.length,
      adopted: allApplications.filter((a: any) => a.status === 'ADOPTADA').length,
      returned: allApplications.filter((a: any) => a.status === 'DEVUELTA').length,
    };

    // Project applications: full data for current org, summaries for other orgs (per D-21)
    const applications = allApplications.map((app: any) => {
      if (app.organizationId === currentOrgId) {
        return {
          id: app.id,
          status: app.status,
          animalName: app.animal?.name ?? null,
          animalSpecies: app.animal?.species?.name ?? null,
          submittedAt: app.submittedAt,
          updatedAt: app.updatedAt,
          score: app.score,
          isOwnOrg: true,
        };
      } else {
        return {
          id: app.id,
          status: app.status,
          animalName: null,
          animalSpecies: app.animal?.species?.name ?? null,
          submittedAt: app.submittedAt,
          updatedAt: app.updatedAt,
          score: null,
          isOwnOrg: false,
        };
      }
    });

    return { summary, applications };
  }

  async getSummary(userId: string) {
    const currentOrgId = this.cls.get('organizationId');

    // Authorization: confirm this adopter has ever applied to the current org
    const ownOrgCount = await this.prismaRls.adoptionApplication.count({
      where: { userId, organizationId: currentOrgId },
    });
    if (ownOrgCount === 0) {
      throw new NotFoundException('Adopter not found in this organization');
    }

    // Counts across ALL orgs using superuser connection (D-21 global history)
    const [totalApplications, adopted, returned] = await Promise.all([
      this.prismaPublic.adoptionApplication.count({ where: { userId } }),
      this.prismaPublic.adoptionApplication.count({ where: { userId, status: 'ADOPTADA' } }),
      this.prismaPublic.adoptionApplication.count({ where: { userId, status: 'DEVUELTA' } }),
    ]);

    return { totalApplications, adopted, returned };
  }
}
