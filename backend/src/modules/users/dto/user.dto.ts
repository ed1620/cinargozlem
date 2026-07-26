import { PartialType } from '@nestjs/mapped-types';
import { ModuleCode, PermissionAction } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateUserDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsEmail() email!: string;
  @IsString() @IsNotEmpty() fullName!: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsBoolean() isSuperAdmin?: boolean;
  @IsOptional() @IsArray() @IsUUID('all', { each: true }) roleIds?: string[];
}

class UpdateUserBase {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() isSuperAdmin?: boolean;
}
export class UpdateUserDto extends PartialType(UpdateUserBase) {}

export class AssignRolesDto {
  @IsArray() @IsUUID('all', { each: true }) roleIds!: string[];
}

export class ResetPasswordDto {
  @IsString() @MinLength(6) password!: string;
}

export class UserPermissionOverrideDto {
  @IsEnum(ModuleCode) module!: ModuleCode;
  @IsEnum(PermissionAction) action!: PermissionAction;
  @IsBoolean() allowed!: boolean;
}

export class SetUserOverridesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionOverrideDto)
  overrides!: UserPermissionOverrideDto[];
}
