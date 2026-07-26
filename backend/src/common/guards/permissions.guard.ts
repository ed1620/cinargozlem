import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../modules/auth/permissions/permissions.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';

/**
 * RBAC matris denetimi. @RequirePermission(module, action) ile işaretli
 * handler'larda kullanıcının etkin yetkisini kontrol eder.
 * Yetkisizse 403 döner (modül/işlem gizli kalır).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Yetki metadata'sı yoksa (sadece login gerektiren route) izin ver.
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    if (!user) throw new ForbiddenException('Kimlik doğrulanmadı');
    if (user.isSuperAdmin) return true;

    const allowed = await this.permissions.can(
      user.userId,
      required.module,
      required.action,
    );
    if (!allowed) {
      throw new ForbiddenException(
        `Bu işlem için yetkiniz yok: ${required.module}/${required.action}`,
      );
    }
    return true;
  }
}
