import { PartialType } from '@nestjs/mapped-types';
import {
  CategoryType,
  PaymentMethod,
  RecordStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

// --- Kategori ---
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(RecordStatus)
  status?: RecordStatus;
}

// --- Gelir ---
export class CreateIncomeDto {
  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  incomeType!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsUUID()
  studentId?: string;
}
export class UpdateIncomeDto extends PartialType(CreateIncomeDto) {}

// --- Gider ---
export class CreateExpenseDto {
  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  expenseType!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

// --- Liste filtreleri ---
export class FinanceListQuery extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  month?: number;
}
