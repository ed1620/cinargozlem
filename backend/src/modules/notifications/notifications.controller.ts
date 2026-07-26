import {
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ModuleCode, PermissionAction } from '@prisma/client';
import { BackupService } from '../../common/backup/backup.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AlertEngineService } from './alert-engine.service';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly alertEngine: AlertEngineService,
    private readonly backup: BackupService,
  ) {}

  @Get()
  @RequirePermission(ModuleCode.NOTIFICATIONS, PermissionAction.VIEW)
  list(@Query('unread') unread?: string) {
    return this.notifications.list(unread === 'true');
  }

  @Get('unread-count')
  @RequirePermission(ModuleCode.NOTIFICATIONS, PermissionAction.VIEW)
  async unreadCount() {
    return { count: await this.notifications.unreadCount() };
  }

  @Patch(':id/read')
  @RequirePermission(ModuleCode.NOTIFICATIONS, PermissionAction.UPDATE)
  markRead(@Param('id') id: string) {
    return this.notifications.markRead(id);
  }

  @Patch('read-all')
  @HttpCode(204)
  @RequirePermission(ModuleCode.NOTIFICATIONS, PermissionAction.UPDATE)
  async markAllRead() {
    await this.notifications.markAllRead();
  }

  /** Uyarı taramasını elle tetikle (admin). */
  @Post('run-checks')
  @HttpCode(202)
  @RequirePermission(ModuleCode.NOTIFICATIONS, PermissionAction.UPDATE)
  async runChecks() {
    await this.alertEngine.runAllChecks();
    return { status: 'ok' };
  }

  /** Elle yedek al (admin). */
  @Post('run-backup')
  @HttpCode(202)
  @RequirePermission(ModuleCode.NOTIFICATIONS, PermissionAction.UPDATE)
  async runBackup() {
    const file = await this.backup.runBackup();
    return { status: 'ok', file };
  }
}
