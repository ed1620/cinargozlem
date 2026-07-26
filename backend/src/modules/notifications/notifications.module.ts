import { Module } from '@nestjs/common';
import { BackupModule } from '../../common/backup/backup.module';
import { AlertEngineService } from './alert-engine.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [BackupModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, AlertEngineService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
