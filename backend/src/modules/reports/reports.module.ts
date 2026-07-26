import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PdfService],
  exports: [PdfService, ReportsService],
})
export class ReportsModule {}
