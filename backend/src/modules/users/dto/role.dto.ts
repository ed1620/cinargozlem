import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ModuleCode, PermissionAction } from '@prisma/client';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PermissionItemDto {
  @IsEnum(ModuleCode)
  module!: ModuleCode;

  @IsEnum(PermissionAction)
  action!: PermissionAction;
}

export class SetPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions!: PermissionItemDto[];
}
