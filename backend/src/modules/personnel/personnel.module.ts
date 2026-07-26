import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { LeaveService } from './leave.service';
import { PayrollService } from './payroll.service';
import { PersonnelController } from './personnel.controller';
import { PersonnelService } from './personnel.service';

@Module({
  imports: [FinanceModule], // maaş → otomatik gider entegrasyonu için
  controllers: [PersonnelController],
  providers: [PersonnelService, PayrollService, LeaveService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
