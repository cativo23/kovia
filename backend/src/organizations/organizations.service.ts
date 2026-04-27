import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prisma: any,
    private readonly rlsBypassPrisma: PublicPrismaService,
  ) {}

  async acceptInvite(token: string) {
    const invite = await this.rlsBypassPrisma.orgInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invitacion no encontrada');
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('Esta invitacion ya fue aceptada');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Esta invitacion ha expirado');
    }

    return invite;
  }

  async claimInvite(token: string, userId: string) {
    const invite = await this.acceptInvite(token);

    // Set user role to ORG_ADMIN
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ORG_ADMIN' as any },
    });

    // Mark invite as accepted
    await this.prisma.orgInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    return invite;
  }

  async create(dto: CreateOrganizationDto, userId: string) {
    const slug = await this.generateSlug(dto.name);

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        logoUrl: dto.logoUrl,
        contactEmail: dto.contactEmail,
        phone: dto.phone,
        instagram: dto.instagram,
        facebook: dto.facebook,
        whatsapp: dto.whatsapp,
        adminId: userId,
      },
    });

    return org;
  }

  async update(orgId: string, dto: UpdateOrganizationDto, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organizacion no encontrada');
    }

    if (org.adminId !== userId) {
      throw new ForbiddenException(
        'Solo el administrador de la organizacion puede actualizar el perfil',
      );
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    });
  }

  async findBySlug(slug: string) {
    const org = await this.rlsBypassPrisma.organization.findUnique({
      where: { slug },
    });

    if (!org) {
      throw new NotFoundException('Organizacion no encontrada');
    }

    return org;
  }

  async findByAdminId(userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { adminId: userId },
    });

    if (!org) {
      throw new NotFoundException('No tienes una organizacion asignada');
    }

    return org;
  }

  private async generateSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existing = await this.prisma.organization.findFirst({
      where: { slug: base },
    });

    if (!existing) return base;

    // Append a suffix to make it unique
    let suffix = 1;
    while (true) {
      const candidate = `${base}-${suffix}`;
      const found = await this.prisma.organization.findFirst({
        where: { slug: candidate },
      });
      if (!found) return candidate;
      suffix++;
    }
  }
}
