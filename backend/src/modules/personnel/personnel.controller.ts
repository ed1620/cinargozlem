import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ModuleCode, PermissionAction, RecordStatus } from '@prisma/client';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  CreateLeaveDto,
  CreatePayrollDto,
  CreatePersonnelDto,
  PersonnelListQuery,
  SetEntitlementDto,
  UpdateLeaveDto,
  UpdatePayrollDto,
  UpdatePersonnelDto,
} from './dto/personnel.dto';
import { LeaveService } from './leave.service';
import { PayrollService } from './payroll.service';
import { PersonnelService } from './personnel.service';

const M = ModuleCode.PERSONNEL;

@Controller()
export class PersonnelController {
  constructor(
    private readonly personnel: PersonnelService,
    private readonly payroll: PayrollService,
    private readonly leave: LeaveService,
  ) {}

  // ============ PERSONEL ============
  @Get('personnel')
  @RequirePermission(M, PermissionAction.VIEW)
  list(@Query() q: PersonnelListQuery) {
    return this.personnel.list(q);
  }

  @Get('personnel/:id')
  @RequirePermission(M, PermissionAction.VIEW)
  get(@Param('id') id: string) {
    return this.personnel.get(id);
  }

  @Post('personnel')
  @RequirePermission(M, PermissionAction.CREATE)
  create(@Body() dto: CreatePersonnelDto) {
    return this.personnel.create(dto);
  }

  @Patch('personnel/:id')
  @RequirePermission(M, PermissionAction.UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdatePersonnelDto) {
    return this.personnel.update(id, dto);
  }

  @Patch('personnel/:id/status/:status')
  @RequirePermission(M, PermissionAction.UPDATE)
  setStatus(@Param('id') id: string, @Param('status') status: RecordStatus) {
    return this.personnel.setStatus(id, status);
  }

  @Delete('personnel/:id')
  @RequirePermission(M, PermissionAction.DELETE)
  remove(@Param('id') id: string) {
    return this.personnel.remove(id);
  }

  // ============ BORDRO ============
  @Get('personnel/:id/payrolls')
  @RequirePermission(M, PermissionAction.VIEW)
  payrolls(@Param('id') id: string) {
    return this.payroll.listByPersonnel(id);
  }

  @Post('payrolls')
  @RequirePermission(M, PermissionAction.CREATE)
  createPayroll(@Body() dto: CreatePayrollDto) {
    return this.payroll.create(dto);
  }

  @Patch('payrolls/:id')
  @RequirePermission(M, PermissionAction.UPDATE)
  updatePayroll(@Param('id') id: string, @Body() dto: UpdatePayrollDto) {
    return this.payroll.update(id, dto);
  }

  @Patch('payrolls/:id/pay')
  @RequirePermission(M, PermissionAction.UPDATE)
  markPaid(@Param('id') id: string, @Body('paymentDate') paymentDate?: string) {
    return this.payroll.markPaid(id, paymentDate);
  }

  @Delete('payrolls/:id')
  @RequirePermission(M, PermissionAction.DELETE)
  removePayroll(@Param('id') id: string) {
    return this.payroll.remove(id);
  }

  // ============ İZİN ============
  @Get('personnel/:id/leaves')
  @RequirePermission(M, PermissionAction.VIEW)
  leaves(@Param('id') id: string) {
    return this.leave.list(id);
  }

  @Get('personnel/:id/leave-summary')
  @RequirePermission(M, PermissionAction.VIEW)
  leaveSummary(@Param('id') id: string, @Query('year') year: string) {
    return this.leave.summary(id, Number(year));
  }

  @Put('personnel/:id/entitlement')
  @RequirePermission(M, PermissionAction.UPDATE)
  setEntitlement(@Param('id') id: string, @Body() dto: SetEntitlementDto) {
    return this.leave.setEntitlement(id, dto);
  }

  @Post('leaves')
  @RequirePermission(M, PermissionAction.CREATE)
  createLeave(@Body() dto: CreateLeaveDto) {
    return this.leave.create(dto);
  }

  @Patch('leaves/:id')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateLeave(@Param('id') id: string, @Body() dto: UpdateLeaveDto) {
    return this.leave.update(id, dto);
  }

  @Delete('leaves/:id')
  @RequirePermission(M, PermissionAction.DELETE)
  removeLeave(@Param('id') id: string) {
    return this.leave.remove(id);
  }
}
