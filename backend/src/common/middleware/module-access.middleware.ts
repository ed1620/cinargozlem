import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { resolveModuleFromPath } from './module-context';

/**
 * Modül-filtre middleware'i.
 *
 * İstek yolundan hedef modülü çözer ve `req.moduleContext` olarak işaretler.
 * Böylece:
 *  - Audit log hangi modülde işlem yapıldığını bilir,
 *  - Controller/guard katmanı modül bağlamına erişebilir.
 *
 * Not: Asıl "yetkisiz modül → 403" enforcement'ı PermissionsGuard tarafından
 * yapılır (JWT passport strategy guard aşamasında çalıştığı için kullanıcı
 * kimliği middleware aşamasında henüz mevcut değildir). Yetkisiz modüllerin
 * menüde hiç görünmemesi ise /api/me/modules üzerinden sağlanır.
 */
@Injectable()
export class ModuleAccessMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    req.moduleContext = resolveModuleFromPath(req.baseUrl || req.originalUrl);
    next();
  }
}
