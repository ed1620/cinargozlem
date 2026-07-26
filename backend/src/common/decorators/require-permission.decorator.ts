import { SetMetadata } from '@nestjs/common';
import { ModuleCode, PermissionAction } from '@prisma/client';

export const PERMISSION_KEY = 'kg_required_permission';

export interface RequiredPermission {
  module: ModuleCode;
  action: PermissionAction;
}

/**
 * Bir route handler için gereken modül + işlem yetkisini tanımlar.
 * PermissionsGuard bu metadata'yı okuyup RBAC matrisine göre denetler.
 *
 * @example
 *   @RequirePermission('FINANCE', 'CREATE')
 *   @Post()
 *   create(...) {}
 */
export const RequirePermission = (
  module: ModuleCode,
  action: PermissionAction,
) => SetMetadata(PERMISSION_KEY, { module, action } as RequiredPermission);
