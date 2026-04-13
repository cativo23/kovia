import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { NotificationType } from '../generated/prisma/client';

export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  { title: string; bodyFn: (ctx: any) => string }
> = {
  APPLICATION_SUBMITTED: {
    title: 'Nueva solicitud enviada',
    bodyFn: (ctx: any) => `Para ${ctx.animalName}`,
  },
  STATUS_CHANGED: {
    title: 'Estado de solicitud actualizado',
    bodyFn: (ctx: any) =>
      `Tu solicitud para ${ctx.animalName} cambió a ${ctx.newStatus}`,
  },
  NOTE_ADDED: {
    title: 'Nueva nota en tu solicitud',
    bodyFn: (ctx: any) => `En tu solicitud para ${ctx.animalName}`,
  },
  SCORED: {
    title: 'Tu solicitud ha sido evaluada',
    bodyFn: (ctx: any) => `Para ${ctx.animalName}`,
  },
  WITHDRAWN: {
    title: 'Solicitud retirada',
    bodyFn: (ctx: any) => `Retiraste tu solicitud para ${ctx.animalName}`,
  },
  DEVUELTA: {
    title: 'Mascota devuelta',
    bodyFn: (ctx: any) => `La mascota ${ctx.animalName} fue devuelta`,
  },
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRISMA_RLS) private readonly prismaRls: any,
  ) {}

  async createForAdopter(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    applicationId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Admin bypass for creating notifications
      await tx.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`;
      return tx.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          applicationId,
        },
      });
    });
  }

  async findByUser(userId: string, limit = 20) {
    return this.prismaRls.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countUnreadByUser(userId: string) {
    return this.prismaRls.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prismaRls.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta notificación',
      );
    }

    return this.prismaRls.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prismaRls.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }
}
