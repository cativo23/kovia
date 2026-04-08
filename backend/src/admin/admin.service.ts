import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { CreateInviteDto } from './dto/create-invite.dto';

const SYSTEM_USER_ID = 'system';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailService: MailService,
  ) {}

  async createInvite(dto: CreateInviteDto) {
    // Check for existing pending invite with same email
    const existing = await this.prisma.orgInvite.findFirst({
      where: {
        email: dto.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe una invitacion pendiente para este correo',
      );
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.orgInvite.create({
      data: {
        email: dto.email,
        orgName: dto.orgName,
        token,
        expiresAt,
      },
    });

    await this.mailService.sendOrgInviteEmail(dto.email, token, dto.orgName);
    await this.auditService.log('org_invited', SYSTEM_USER_ID, {
      email: dto.email,
      orgName: dto.orgName,
      inviteId: invite.id,
    });

    return invite;
  }

  async listInvites() {
    const invites = await this.prisma.orgInvite.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => ({
      ...invite,
      status: this.computeInviteStatus(invite),
    }));
  }

  async resendInvite(inviteId: string) {
    const invite = await this.prisma.orgInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invitacion no encontrada');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.orgInvite.update({
      where: { id: inviteId },
      data: { token, expiresAt },
    });

    await this.mailService.sendOrgInviteEmail(
      invite.email,
      token,
      invite.orgName,
    );
    await this.auditService.log('invite_resent', SYSTEM_USER_ID, {
      inviteId,
      email: invite.email,
    });

    return updated;
  }

  async deleteInvite(inviteId: string) {
    const invite = await this.prisma.orgInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new NotFoundException('Invitacion no encontrada');
    }

    return this.prisma.orgInvite.delete({
      where: { id: inviteId },
    });
  }

  async listOrgs() {
    return this.prisma.organization.findMany({
      include: { admin: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrgStatus(orgId: string, status: string) {
    const result = await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: status as any },
    });

    const action = status === 'ACTIVE' ? 'org_reactivated' : 'org_deactivated';
    await this.auditService.log(action, SYSTEM_USER_ID, { orgId, status });

    return result;
  }

  async listUsers(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { organization: true },
      }),
      this.prisma.user.count(),
    ]);

    return { data, total, page, limit };
  }

  async deactivateUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.auditService.log('user_deactivated', SYSTEM_USER_ID, {
      userId,
    });
  }

  async reactivateUser(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await this.auditService.log('user_reactivated', SYSTEM_USER_ID, {
      userId,
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    await this.auditService.log('user_deleted', SYSTEM_USER_ID, {
      userId,
      email: user.email,
    });
  }

  async getStats() {
    const [totalUsers, orgs, invites, recentActivity] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.findMany({ select: { status: true } }),
      this.prisma.orgInvite.findMany({
        where: { acceptedAt: null },
        select: { expiresAt: true },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      totalUsers,
      activeOrgs: orgs.filter((o) => o.status === 'ACTIVE').length,
      inactiveOrgs: orgs.filter((o) => o.status === 'DEACTIVATED').length,
      pendingInvites: invites.filter(
        (i) => i.expiresAt > new Date(),
      ).length,
      recentActivity,
    };
  }

  async getAuditLog(pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return { data, total, page, limit };
  }

  private computeInviteStatus(invite: {
    acceptedAt: Date | null;
    expiresAt: Date;
  }): string {
    if (invite.acceptedAt) return 'accepted';
    if (invite.expiresAt < new Date()) return 'expired';
    return 'pending';
  }
}
