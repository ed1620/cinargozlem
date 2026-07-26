import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { VehicleCostsService } from './vehicle-costs.service';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [FinanceModule], // akaryakıt/bakım/sigorta → otomatik gider
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleCostsService],
})
export class VehiclesModule {}
