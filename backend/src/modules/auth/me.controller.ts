import { Controller, Get } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { PermissionsService } from './permissions/permissions.service';

/**
 * Giriş yapmış kullanıcının profili ve yetkileri.
 * Frontend, dinamik Sidebar'ı ve buton görünürlüklerini buradan besler.
 */
@Controller('me')
export class MeController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthUser) {
    return user;
  }

  /** Menüde gösterilecek modüller (yetkisiz modüller hiç dönmez). */
  @Get('modules')
  getModules(@CurrentUser() user: AuthUser) {
    return this.permissions.getAccessibleModules(user.userId);
  }

  /** Modül → izin verilen işlemler matrisi (buton/aksiyon görünürlüğü). */
  @Get('permissions')
  getPermissions(@CurrentUser() user: AuthUser) {
    return this.permissions.getPermissionMatrix(user.userId);
  }
}
