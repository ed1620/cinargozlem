import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ModuleCode, PermissionAction } from '@prisma/client';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CreateRoleDto, SetPermissionsDto } from './dto/role.dto';
import { RolesService } from './roles.service';

/** RBAC yönetimi (Kullanıcı & Yetki modülü). */
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('rbac/meta')
  @RequirePermission(ModuleCode.USERS, PermissionAction.VIEW)
  meta() {
    return this.roles.meta();
  }

  @Get('roles')
  @RequirePermission(ModuleCode.USERS, PermissionAction.VIEW)
  list() {
    return this.roles.list();
  }

  @Post('roles')
  @RequirePermission(ModuleCode.USERS, PermissionAction.CREATE)
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Put('roles/:id/permissions')
  @RequirePermission(ModuleCode.USERS, PermissionAction.UPDATE)
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto) {
    return this.roles.replacePermissions(id, dto.permissions);
  }
}
