import { PartialType } from '@nestjs/mapped-types';
import {
  FuelType,
  InsuranceType,
  PaymentMethod,
  RecordStatus,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

// ===== Araç =====
export class CreateVehicleDto {
  @IsString() @IsNotEmpty() plate!: string;
  @IsString() @IsNotEmpty() brand!: string;
  @IsString() @IsNotEmpty() model!: string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) modelYear?: number;
  @IsOptional() @IsString() vehicleType?: string;
  @IsOptional() @IsString() chassisNo?: string;
  @IsOptional() @IsString() engineNo?: string;
  @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @IsOptional() @IsString() responsiblePersonnelId?: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class VehicleListQuery extends ListQueryDto {
  @IsOptional() @IsEnum(RecordStatus) status?: RecordStatus;
}

// ===== Sigorta / Kasko =====
export class CreateInsuranceDto {
  @IsEnum(InsuranceType) type!: InsuranceType;
  @IsString() @IsNotEmpty() company!: string;
  @IsOptional() @IsString() policyNo?: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() documentUrl?: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateInsuranceDto extends PartialType(CreateInsuranceDto) {}

// ===== Muayene =====
export class CreateInspectionDto {
  @IsDateString() inspectionDate!: string;
  @IsDateString() expiryDate!: string;
  @IsOptional() @IsString() note?: string;
}

// ===== Akaryakıt =====
export class CreateFuelDto {
  @IsDateString() date!: string;
  @IsOptional() @IsString() time?: string;
  @IsEnum(FuelType) fuelType!: FuelType;
  @IsNumber() @IsPositive() liters!: number;
  @IsNumber() @IsPositive() pricePerLiter!: number;
  @IsOptional() @IsInt() @Min(0) odometer?: number;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() receiptUrl?: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateFuelDto extends PartialType(CreateFuelDto) {}

// ===== Bakım =====
export class CreateMaintenanceDto {
  @IsDateString() date!: string;
  @IsOptional() @IsString() time?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) odometer?: number;
  @IsNumber() @IsPositive() totalAmount!: number;
  @IsNumber() @Min(0) @Max(100) vatRate!: number;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() receiptUrl?: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {}
