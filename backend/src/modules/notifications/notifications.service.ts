import { Injectable } from '@nestjs/common';
import {
  ModuleCode,
  Notification,
  NotificationSeverity,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface EmitParams {
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  module?: ModuleCode;
  resource?: string;
  resourceId?: string;
  targetUserId?: string;
  /** Aynı olay için mükerrer üretimi engelleyen benzersiz anahtar. */
  dedupeKey?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bildirim üretir. `dedupeKey` verilirse aynı olay için yalnızca bir kayıt
   * oluşturulur (upsert) — cron her gün çalışsa da uyarı tekrarlanmaz.
   */
  async emit(params: EmitParams): Promise<Notification> {
    const data: Prisma.NotificationCreateInput = {
      type: params.type,
      severity: params.severity ?? NotificationSeverity.WARNING,
      title: params.title,
      message: params.message,
      module: params.module ?? null,
      resource: params.resource ?? null,
      resourceId: params.resourceId ?? null,
      dedupeKey: params.dedupeKey ?? null,
      ...(params.targetUserId
        ? { targetUser: { connect: { id: params.targetUserId } } }
        : {}),
    };

    if (params.dedupeKey) {
      return this.prisma.notification.upsert({
        where: { dedupeKey: params.dedupeKey },
        update: {}, // mevcutsa dokunma (okundu durumu korunur)
        create: data,
      });
    }
    return this.prisma.notification.create({ data });
  }

  /** Admin panelinde listeleme (okunmamışlar önce). */
  async list(onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: onlyUnread ? { isRead: false } : undefined,
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async unreadCount(): Promise<number> {
    return this.prisma.notification.count({ where: { isRead: false } });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead() {
    await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
