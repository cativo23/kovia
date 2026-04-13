import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('ADOPTER')
  async findAll(@Req() req: any) {
    const userId = req.user.id;
    const [notifications, unreadCount] = await Promise.all([
      this.notificationsService.findByUser(userId),
      this.notificationsService.countUnreadByUser(userId),
    ]);
    return { notifications, unreadCount };
  }

  @Post(':id/read')
  @Roles('ADOPTER')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  @Roles('ADOPTER')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    const count = await this.notificationsService.markAllAsRead(userId);
    return { count };
  }
}
