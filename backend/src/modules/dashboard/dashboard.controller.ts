import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

/** Dashboard, giriş yapmış her kullanıcıya açıktır (rol bazlı içerik frontend'de). */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }
}
