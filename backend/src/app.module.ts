import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BackupModule } from './common/backup/backup.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { HealthController } from './common/health/health.controller';
import { UploadsModule } from './common/uploads/uploads.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AuditLogMiddleware } from './common/middleware/audit-log.middleware';
import { ModuleAccessMiddleware } from './common/middleware/module-access.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FinanceModule } from './modules/finance/finance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PersonnelModule } from './modules/personnel/personnel.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StudentsModule } from './modules/students/students.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

// Backend domain katmanı tamamlandı. Kalan: eksik raporlar (#6) ve frontend (#2/#7).

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Rate limit: IP başına 60 sn'de 120 istek.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    CryptoModule,
    BackupModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    FinanceModule,
    PersonnelModule,
    VehiclesModule,
    StudentsModule,
    UploadsModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Sıra önemli: önce rate-limit, sonra kimlik doğrulama, sonra RBAC.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ModuleAccessMiddleware, AuditLogMiddleware)
      .forRoutes('*');
  }
}
