import { PartialType } from '@nestjs/mapped-types';
import {
  LeaveType,
  PaymentStatus,
  RecordStatus,
  SalaryType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

// ===== Personel =====
export class CreatePersonnelDto {
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsOptional() @IsString() tcNo?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsDateString() startDate!: string;
  @IsOptional() @IsEnum(SalaryType) salaryType?: SalaryType;
  @IsOptional() @IsString() note?: string;
}
export class UpdatePersonnelDto extends PartialType(CreatePersonnelDto) {}

export class PersonnelListQuery extends ListQueryDto {
  @IsOptional() @IsEnum(RecordStatus) status?: RecordStatus;
  @IsOptional() @IsString() title?: string;
}

// ===== Bordro =====
export class CreatePayrollDto {
  @IsString() @IsNotEmpty() personnelId!: string;
  @IsInt() @Min(2000) @Max(2100) year!: number;
  @IsInt() @Min(1) @Max(12) month!: number;
  @IsNumber() @Min(0) grossSalary!: number;
  @IsOptional() @IsNumber() @Min(0) deductions?: number;
  @IsOptional() @IsNumber() @Min(0) additions?: number;
  /** Verilmezse brüt - kesinti + ek ödeme olarak hesaplanır. */
  @IsOptional() @IsNumber() @Min(0) netSalary?: number;
  @IsOptional() @IsString() deductionNote?: string;
  @IsOptional() @IsString() additionNote?: string;
  @IsOptional() @IsEnum(PaymentStatus) paymentStatus?: PaymentStatus;
  @IsOptional() @IsDateString() paymentDate?: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdatePayrollDto extends PartialType(CreatePayrollDto) {}

// ===== İzin =====
export class CreateLeaveDto {
  @IsString() @IsNotEmpty() personnelId!: string;
  @IsOptional() @IsEnum(LeaveType) type?: LeaveType;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}

export class SetEntitlementDto {
  @IsInt() @Min(2000) @Max(2100) year!: number;
  @IsInt() @Min(0) @Max(365) entitledDays!: number;
}
