import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceIntegrationService } from './finance-integration.service';
import { FinanceService } from './finance.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceIntegrationService],
  // Entegrasyon servisi diğer modüllere (personel, araç) açılır.
  exports: [FinanceIntegrationService],
})
export class FinanceModule {}
