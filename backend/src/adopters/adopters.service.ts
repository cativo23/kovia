import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AdoptersService {
  constructor(
    private readonly publicPrisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async getHistory(userId: string) {
    const currentOrgId = this.cls.get('orgId');

    // Authorization: confirm this adopter has ever applied to the current org
    const ownOrgCount = await this.publicPrisma.adoptionApplication.count({
      where: { userId, organizationId: currentOrgId },
    });
    if (ownOrgCount === 0) {
      throw new NotFoundException('Adopter not found in this organization');
    }

    // Fetch ALL applications for this adopter across ALL orgs using publicPrisma (no RLS)
    const allApplications = await this.publicPrisma.adoptionApplication.findMany({
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
      adopted: allApplications.filter(a => a.status === 'ADOPTADA').length,
      returned: allApplications.filter(a => a.status === 'DEVUELTA').length,
    };

    // Project applications: full data for current org, summaries for other orgs (per D-21)
    const applications = allApplications.map(app => {
      if (app.organizationId === currentOrgId) {
        // Full data for own org
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
        // Outcome summary only for other orgs (D-21)
        return {
          id: app.id,
          status: app.status,
          animalName: null, // NOT exposed cross-org
          animalSpecies: app.animal?.species?.name ?? null,
          submittedAt: app.submittedAt,
          updatedAt: app.updatedAt,
          score: null, // NOT exposed cross-org
          isOwnOrg: false,
        };
      }
    });

    return { summary, applications };
  }

  async getSummary(userId: string) {
    const currentOrgId = this.cls.get('orgId');

    // Authorization: confirm this adopter has ever applied to the current org
    const ownOrgCount = await this.publicPrisma.adoptionApplication.count({
      where: { userId, organizationId: currentOrgId },
    });
    if (ownOrgCount === 0) {
      throw new NotFoundException('Adopter not found in this organization');
    }

    // Lightweight version for the inline card — just counts
    const [totalApplications, adopted, returned] = await Promise.all([
      this.publicPrisma.adoptionApplication.count({ where: { userId } }),
      this.publicPrisma.adoptionApplication.count({ where: { userId, status: 'ADOPTADA' } }),
      this.publicPrisma.adoptionApplication.count({ where: { userId, status: 'DEVUELTA' } }),
    ]);

    return { totalApplications, adopted, returned };
  }
}
