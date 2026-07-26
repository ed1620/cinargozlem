import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ModuleCode, PermissionAction, RecordStatus } from '@prisma/client';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  AssignRolesDto,
  CreateUserDto,
  ResetPasswordDto,
  SetUserOverridesDto,
  UpdateUserDto,
} from './dto/user.dto';
import { UsersService } from './users.service';

const M = ModuleCode.USERS;

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermission(M, PermissionAction.VIEW)
  list() {
    return this.users.list();
  }

  @Get(':id')
  @RequirePermission(M, PermissionAction.VIEW)
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post()
  @RequirePermission(M, PermissionAction.CREATE)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @RequirePermission(M, PermissionAction.UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(':id/status/:status')
  @RequirePermission(M, PermissionAction.UPDATE)
  setStatus(@Param('id') id: string, @Param('status') status: RecordStatus) {
    return this.users.setStatus(id, status);
  }

  @Put(':id/roles')
  @RequirePermission(M, PermissionAction.UPDATE)
  assignRoles(@Param('id') id: string, @Body() dto: AssignRolesDto) {
    return this.users.assignRoles(id, dto);
  }

  @Put(':id/overrides')
  @RequirePermission(M, PermissionAction.UPDATE)
  setOverrides(@Param('id') id: string, @Body() dto: SetUserOverridesDto) {
    return this.users.setOverrides(id, dto);
  }

  @Patch(':id/password')
  @RequirePermission(M, PermissionAction.UPDATE)
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(id, dto.password);
  }

  @Delete(':id')
  @RequirePermission(M, PermissionAction.DELETE)
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
