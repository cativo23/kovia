import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Inject } from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { MailDispatcher } from '../mail/mail-dispatcher.service';
import { OrgInviteMail } from '../mail/mailables/org-invite.mail';
import { CreateInviteDto } from './dto/create-invite.dto';


@Injectable()
export class AdminService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prisma: any,
    private readonly auditService: AuditService,
    private readonly mailDispatcher: MailDispatcher,
    private readonly config: ConfigService,
  ) {}

  async createInvite(dto: CreateInviteDto, userId: string) {
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

    await this.mailDispatcher.send(
      new OrgInviteMail(dto.email, {
        orgName: dto.orgName,
        inviteUrl: `${this.config.get<string>('APP_URL')}/invite/${token}`,
      }),
    );
    await this.auditService.log('org_invited', userId, {
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

  async resendInvite(inviteId: string, userId: string) {
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

    await this.mailDispatcher.send(
      new OrgInviteMail(invite.email, {
        orgName: invite.orgName,
        inviteUrl: `${this.config.get<string>('APP_URL')}/invite/${token}`,
      }),
    );
    await this.auditService.log('invite_resent', userId, {
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

  async updateOrgStatus(orgId: string, status: string, userId: string) {
    const result = await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: status as any },
    });

    const action = status === 'ACTIVE' ? 'org_reactivated' : 'org_deactivated';
    await this.auditService.log(action, userId, { orgId, status });

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

  async deactivateUser(targetUserId: string, userId: string) {
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
    });

    await this.auditService.log('user_deactivated', userId, {
      targetUserId,
    });
  }

  async reactivateUser(targetUserId: string, userId: string) {
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: true },
    });

    await this.auditService.log('user_reactivated', userId, {
      targetUserId,
    });
  }

  async deleteUser(targetUserId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    await this.auditService.log('user_deleted', userId, {
      targetUserId,
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
