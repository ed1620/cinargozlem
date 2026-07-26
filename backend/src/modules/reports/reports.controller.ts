import {
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ModuleCode, PermissionAction, RecordStatus } from '@prisma/client';
import { Response } from 'express';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { ReportsService } from './reports.service';

/**
 * Merkezi raporlama uç noktaları. Her rapor ilgili modülün EXPORT yetkisini
 * gerektirir ve PDF olarak (kurum başlıklı) döner.
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private send(res: Response, buffer: Buffer, filename: string): void {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"`,
    );
    res.send(buffer);
  }

  // --- Personel ---
  @Get('personnel')
  @RequirePermission(ModuleCode.PERSONNEL, PermissionAction.EXPORT)
  async personnel(
    @Res() res: Response,
    @Query('status') status?: RecordStatus,
  ) {
    this.send(res, await this.reports.personnelList(status), 'personel.pdf');
  }

  @Get('payroll')
  @RequirePermission(ModuleCode.PERSONNEL, PermissionAction.EXPORT)
  async payroll(
    @Res() res: Response,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    this.send(
      res,
      await this.reports.payrollByPeriod(Number(year), Number(month)),
      'maas-bordrosu.pdf',
    );
  }

  @Get('leaves')
  @RequirePermission(ModuleCode.PERSONNEL, PermissionAction.EXPORT)
  async leaves(@Res() res: Response, @Query('year') year: string) {
    this.send(res, await this.reports.leaveUsage(Number(year)), 'izin.pdf');
  }

  @Get('personnel/annual-salary')
  @RequirePermission(ModuleCode.PERSONNEL, PermissionAction.EXPORT)
  async personnelAnnualSalary(
    @Res() res: Response,
    @Query('personnelId') personnelId: string,
    @Query('year') year: string,
  ) {
    this.send(
      res,
      await this.reports.personnelAnnualSalary(personnelId, Number(year)),
      'yillik-maas.pdf',
    );
  }

  // --- Finans ---
  @Get('finance')
  @RequirePermission(ModuleCode.FINANCE, PermissionAction.EXPORT)
  async finance(
    @Res() res: Response,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    this.send(
      res,
      await this.reports.financeSummary(
        Number(year),
        month ? Number(month) : undefined,
      ),
      'gelir-gider.pdf',
    );
  }

  // --- Finans dağılım ---
  @Get('finance/by-category')
  @RequirePermission(ModuleCode.FINANCE, PermissionAction.EXPORT)
  async financeByCategory(
    @Res() res: Response,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    this.send(
      res,
      await this.reports.financeByCategory(Number(year), month ? Number(month) : undefined),
      'finans-kategori.pdf',
    );
  }

  @Get('finance/by-payment')
  @RequirePermission(ModuleCode.FINANCE, PermissionAction.EXPORT)
  async financeByPayment(@Res() res: Response, @Query('year') year: string) {
    this.send(res, await this.reports.financeByPaymentMethod(Number(year)), 'finans-odeme.pdf');
  }

  // --- Araç ---
  @Get('vehicles/upcoming')
  @RequirePermission(ModuleCode.VEHICLES, PermissionAction.EXPORT)
  async vehiclesUpcoming(@Res() res: Response) {
    this.send(res, await this.reports.vehicleUpcoming(), 'yaklasan-islemler.pdf');
  }

  @Get('vehicles/:id/history')
  @RequirePermission(ModuleCode.VEHICLES, PermissionAction.EXPORT)
  async vehicleHistory(@Res() res: Response, @Param('id') id: string) {
    this.send(res, await this.reports.vehicleHistory(id), 'arac-gecmis.pdf');
  }

  @Get('fuel/consumption')
  @RequirePermission(ModuleCode.VEHICLES, PermissionAction.EXPORT)
  async fuelConsumption(@Res() res: Response, @Query('vehicleId') vehicleId: string) {
    this.send(res, await this.reports.fuelConsumption(vehicleId), 'tuketim.pdf');
  }

  @Get('fuel')
  @RequirePermission(ModuleCode.VEHICLES, PermissionAction.EXPORT)
  async fuel(
    @Res() res: Response,
    @Query('vehicleId') vehicleId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    this.send(
      res,
      await this.reports.fuelReport(
        vehicleId,
        year ? Number(year) : undefined,
        month ? Number(month) : undefined,
      ),
      'akaryakit.pdf',
    );
  }

  // --- Öğrenci ---
  @Get('students/monthly')
  @RequirePermission(ModuleCode.STUDENTS, PermissionAction.EXPORT)
  async studentMonthly(
    @Res() res: Response,
    @Query('studentId') studentId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    this.send(
      res,
      await this.reports.studentMonthly(studentId, Number(year), Number(month)),
      'ogrenci-aylik.pdf',
    );
  }

  @Get('students/annual')
  @RequirePermission(ModuleCode.STUDENTS, PermissionAction.EXPORT)
  async studentAnnual(
    @Res() res: Response,
    @Query('studentId') studentId: string,
    @Query('year') year: string,
  ) {
    this.send(
      res,
      await this.reports.studentAnnual(studentId, Number(year)),
      'ogrenci-yillik.pdf',
    );
  }
}
