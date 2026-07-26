import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { resolveModuleFromPath } from './module-context';

const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

/**
 * Audit logging middleware'i. Değişiklik yapan (POST/PUT/PATCH/DELETE) ve
 * başarılı sonuçlanan istekleri kim/ne zaman/IP/kaynak bilgisiyle kaydeder.
 * Yanıt tamamlandığında (`finish`) çalışır — bu noktada `req.user` guard
 * tarafından doldurulmuş olur.
 */
@Injectable()
export class AuditLogMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const action = ACTION_BY_METHOD[req.method];
    if (!action) return next();

    res.on('finish', () => {
      // Yalnızca başarılı mutasyonları logla.
      if (res.statusCode >= 400) return;

      const user = req.user as AuthUser | undefined;
      const path = req.originalUrl.split('?')[0];
      const segments = path.replace(/^\/?api\//, '').split('/');
      const resource = segments[0] || 'unknown';
      const resourceId = segments[1] || null;

      void this.prisma.auditLog
        .create({
          data: {
            userId: user?.userId ?? null,
            action,
            module: resolveModuleFromPath(path) ?? null,
            resource,
            resourceId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']?.slice(0, 255),
          },
        })
        .catch(() => undefined); // audit hatası ana akışı bozmamalı
    });

    next();
  }
}
