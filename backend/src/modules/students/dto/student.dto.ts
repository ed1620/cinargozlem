import { PartialType } from '@nestjs/mapped-types';
import { RecordStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class CreateStudentDto {
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsOptional() @IsString() tcNo?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsString() parentName?: string;
  @IsOptional() @IsString() parentPhone?: string;
  @IsOptional() @IsString() parentEmail?: string;
  @IsOptional() @IsString() parentAddress?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsDateString() registrationDate!: string;
}
export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class StudentListQuery extends ListQueryDto {
  @IsOptional() @IsEnum(RecordStatus) status?: RecordStatus;
}

export class CreateActivityDto {
  @IsDateString() date!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() targetGains?: string;
  @IsOptional() @IsString() evaluationNote?: string;
}
export class UpdateActivityDto extends PartialType(CreateActivityDto) {}
