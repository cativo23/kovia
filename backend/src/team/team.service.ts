import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailDispatcher } from '../mail/mail-dispatcher.service';
import { TeamInviteMail } from '../mail/mailables/team-invite.mail';
import { AuthService } from '../auth/auth.service';
import { CreateTeamInviteDto } from './dto/create-team-invite.dto';

// D-06: statuses that block a team invite (applicant has ongoing adoption at inviting org)
const PENDING_APPLICATION_STATUSES = [
  'ENVIADA',
  'REVISANDO',
  'APROBADA',
  'SEGUIMIENTO',
] as const;

type Role = 'ORG_ADMIN' | 'ORG_STAFF';

@Injectable()
export class TeamService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prisma: any,
    // `rlsPrisma` is the app_user-bound PrismaService (subject to RLS). Use
    // for callsites where RLS enforcement is desirable (e.g. the caller's
    // own row, RLS-disabled tables). For cross-org admin reads, cross-tenant
    // lookups, or post-auth state mutations that depend on stale CLS context,
    // use `rlsBypassPrisma` (PublicPrismaService, superuser connection).
    private readonly rlsPrisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly mailDispatcher: MailDispatcher,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly rlsBypassPrisma: PublicPrismaService,
  ) {}

  async createInvite(dto: CreateTeamInviteDto, userId: string, orgId: string) {
    // 1. Pending invite uniqueness check for (orgId, email)
    const existing = await this.prisma.teamInvite.findFirst({
      where: {
        orgId,
        email: dto.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe una invitación pendiente para este correo',
      );
    }

    // 2. D-06 conflict-of-interest — block if invitee has a pending application at this org.
    // Must bypass RLS: the invitee may be an ADOPTER in no tenant (org admin
    // has no RLS visibility to them) and the application row is cross-tenant
    // from the caller's CLS context. Going through the RLS-bound client
    // silently returns null and the guard is bypassed (D-06 failure).
    const invitee = await this.rlsBypassPrisma.user.findUnique({
      where: { email: dto.email },
    });
    if (invitee) {
      const conflicting = await this.rlsBypassPrisma.adoptionApplication.findFirst({
        where: {
          userId: invitee.id,
          organizationId: orgId,
          status: { in: PENDING_APPLICATION_STATUSES as any },
        },
      });
      if (conflicting) {
        throw new ConflictException(
          'este usuario tiene una solicitud pendiente en tu organización — resuélvela antes de invitarlo',
        );
      }
    }

    // 3. Token + 7-day expiry.
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 4. Create invite row.
    const invite = await this.prisma.teamInvite.create({
      data: {
        orgId,
        email: dto.email,
        role: dto.role as Role,
        token,
        expiresAt,
        invitedById: userId,
      },
    });

    // 5. Dispatch mail.
    await this.dispatchInviteMail(orgId, userId, dto.email, dto.role as Role, token);

    // 6. Audit.
    await this.auditService.log('team_invite_created', userId, {
      email: dto.email,
      role: dto.role,
      inviteId: invite.id,
    });

    return invite;
  }

  async listInvites(orgId: string) {
    const invites = await this.prisma.teamInvite.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((invite: any) => ({
      ...invite,
      status: this.computeInviteStatus(invite),
    }));
  }

  async resendInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new NotFoundException('Invitación no encontrada');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.teamInvite.update({
      where: { id: inviteId },
      data: { token, expiresAt },
    });

    await this.dispatchInviteMail(invite.orgId, userId, invite.email, invite.role, token);
    await this.auditService.log('team_invite_resent', userId, {
      inviteId,
      email: invite.email,
    });

    return updated;
  }

  async revokeInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) {
      throw new NotFoundException('Invitación no encontrada');
    }
    await this.prisma.teamInvite.delete({ where: { id: inviteId } });
    await this.auditService.log('team_invite_revoked', userId, {
      inviteId,
      email: invite.email,
    });
    return { id: inviteId };
  }

  async validateToken(token: string) {
    // team_invites has RLS disabled so either client works, but standardize
    // on rlsBypassPrisma for all team-related lookups (see class constructor).
    // Do NOT include the org join here — `organizations` is under RLS, and
    // pre-auth callers have no app.current_user_id, so an RLS-bound join
    // would silently drop the row. Org name is fetched separately below.
    const invite = await this.rlsBypassPrisma.teamInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invitación no encontrada');
    }
    if ((invite as any).acceptedAt) {
      throw new BadRequestException('Esta invitación ya fue aceptada');
    }
    if ((invite as any).expiresAt < new Date()) {
      throw new BadRequestException('Esta invitación ha expirado');
    }

    const anyInvite = invite as any;

    // Fetch org name via the genuine RLS-bypass client (postgres superuser
    // connection). This is safe: we only expose the org name to a caller who
    // already holds the invite token.
    const organization = await this.rlsBypassPrisma.organization.findUnique({
      where: { id: anyInvite.orgId },
      select: { name: true },
    });

    return {
      id: anyInvite.id,
      email: anyInvite.email,
      role: anyInvite.role,
      orgId: anyInvite.orgId,
      orgName: organization?.name ?? '',
      expiresAt: anyInvite.expiresAt,
    };
  }

  async acceptInvite(token: string, currentUserId: string) {
    // 1. Load + validate invite. Standardized on rlsBypassPrisma for team
    // lookups (see class constructor); team_invites has RLS disabled so
    // either client is functionally equivalent here.
    const invite = await this.rlsBypassPrisma.teamInvite.findUnique({
      where: { token },
      include: { org: { select: { name: true } } },
    } as any);

    if (!invite) {
      throw new NotFoundException('Invitación no encontrada');
    }
    const anyInvite = invite as any;
    if (anyInvite.acceptedAt) {
      throw new BadRequestException('Esta invitación ya fue aceptada');
    }
    if (anyInvite.expiresAt < new Date()) {
      throw new BadRequestException('Esta invitación ha expirado');
    }

    // 2. Email-match check — prevents T-09-02-01 elevation of privilege.
    // Use RLS-bypass: the caller's CLS context may not yet carry orgId
    // (they were an ADOPTER pre-accept), and owner_isolation via the RLS
    // client is fragile across pooled connections. Bypass is safe — we
    // only read by the authenticated currentUserId.
    const currentUser = await this.rlsBypassPrisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (
      (currentUser as any).email?.toLowerCase() !==
      anyInvite.email?.toLowerCase()
    ) {
      throw new BadRequestException(
        'El correo de la invitación no coincide con tu cuenta',
      );
    }

    // 3. Transactional upgrade (D-05 upgrade in place) + mark invite accepted.
    // Bypass RLS: the user being updated is transitioning into a new orgId
    // that is not yet reflected in CLS; a UPDATE via the RLS client would
    // be filtered by owner_isolation in some pooled-connection scenarios.
    await this.rlsBypassPrisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: currentUserId },
        data: { role: anyInvite.role, orgId: anyInvite.orgId },
      });
      await tx.teamInvite.update({
        where: { id: anyInvite.id },
        data: { acceptedAt: new Date() },
      });
    });

    await this.auditService.log('team_invite_accepted', currentUserId, {
      inviteId: anyInvite.id,
      orgId: anyInvite.orgId,
      role: anyInvite.role,
    });

    // 4. Re-issue tokens with the new role + orgId claim.
    // Bypass RLS: CLS context for the current request still carries the
    // pre-accept tenant, so an RLS read of the just-updated row can be
    // filtered. Bypass is safe — lookup is by the authenticated user id.
    const updatedUser = await this.rlsBypassPrisma.user.findUnique({
      where: { id: currentUserId },
    });
    const tokens = await (this.authService as any).generateTokens(updatedUser);

    return { accessToken: tokens.accessToken };
  }

  async listMembers(orgId: string) {
    // Must bypass RLS: no RLS policy on `users` allows an ORG_ADMIN to
    // read other users in their org — `owner_isolation` limits reads to
    // the caller's own row, and there is no `org_admin_read` policy.
    // Controller-level @Roles('ORG_ADMIN') + the orgId passed from the
    // caller's CurrentUser context gate this endpoint correctly; the
    // query itself scopes by orgId so cross-tenant exposure is not a risk.
    return this.rlsBypassPrisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async changeRole(targetUserId: string, newRole: Role, actorId: string) {
    // SERIALIZABLE isolation guards against concurrent last-admin demotions (Pitfall P-3 / Assumption A1).
    // Must bypass RLS: target user ≠ caller, so owner_isolation blocks the
    // findUnique/update. Controller-level @Roles('ORG_ADMIN') gates access.
    return this.rlsBypassPrisma.$transaction(
      async (tx: any) => {
        const target = await tx.user.findUnique({ where: { id: targetUserId } });
        if (!target) {
          throw new NotFoundException('Usuario no encontrado');
        }
        if (target.role === 'ORG_ADMIN' && newRole !== 'ORG_ADMIN') {
          const adminCount = await tx.user.count({
            where: { orgId: target.orgId, role: 'ORG_ADMIN' },
          });
          if (adminCount <= 1) {
            throw new ConflictException('no puedes remover al único administrador');
          }
        }
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: { role: newRole },
        });
        await this.auditService.log('team_role_changed', actorId, {
          targetUserId,
          from: target.role,
          to: newRole,
        });
        return updated;
      },
      { isolationLevel: 'Serializable' } as any,
    );
  }

  async removeMember(targetUserId: string, actorId: string) {
    // Same reasoning as changeRole: target user ≠ caller.
    return this.rlsBypassPrisma.$transaction(
      async (tx: any) => {
        const target = await tx.user.findUnique({ where: { id: targetUserId } });
        if (!target) {
          throw new NotFoundException('Usuario no encontrado');
        }
        if (target.role === 'ORG_ADMIN') {
          const adminCount = await tx.user.count({
            where: { orgId: target.orgId, role: 'ORG_ADMIN' },
          });
          if (adminCount <= 1) {
            throw new ConflictException('no puedes remover al único administrador');
          }
        }
        // D-15: preserve User row + authored notes/applications. Flip role → ADOPTER, clear orgId.
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: { role: 'ADOPTER', orgId: null },
        });
        await this.auditService.log('team_member_removed', actorId, {
          targetUserId,
          previousRole: target.role,
        });
        return updated;
      },
      { isolationLevel: 'Serializable' } as any,
    );
  }

  // Helpers ----------------------------------------------------------------

  private computeInviteStatus(invite: {
    acceptedAt: Date | null;
    expiresAt: Date;
  }): string {
    if (invite.acceptedAt) return 'accepted';
    if (invite.expiresAt < new Date()) return 'expired';
    return 'pending';
  }

  private roleLabel(role: Role): string {
    if (role === 'ORG_ADMIN') return 'Administrador';
    return 'Staff';
  }

  private async dispatchInviteMail(
    orgId: string,
    inviterId: string,
    toEmail: string,
    role: Role,
    token: string,
  ) {
    // Bypass RLS: dispatchInviteMail is called post-createInvite where the
    // caller's CLS org context is set, but standardize on the bypass client
    // for both org + inviter lookups so mail dispatch is robust even if
    // CLS context is unset (background worker, retry, etc.).
    const org = await this.rlsBypassPrisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const inviter = await this.rlsBypassPrisma.user.findUnique({
      where: { id: inviterId },
      select: { firstName: true, lastName: true },
    });

    const inviterName = [inviter?.firstName, inviter?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'El administrador';

    await this.mailDispatcher.send(
      new TeamInviteMail(toEmail, {
        orgName: org?.name ?? '',
        inviterName,
        roleLabel: this.roleLabel(role),
        inviteUrl: `${this.config.get<string>('APP_URL')}/team/accept/${token}`,
      }),
    );
  }
}
