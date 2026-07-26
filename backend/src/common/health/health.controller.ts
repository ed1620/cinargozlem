import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sağlık kontrolü — Docker healthcheck ve orkestrasyon için.
 * Kimlik doğrulaması ve rate-limit dışıdır. DB erişilemezse 503 döner.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up', time: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded', db: 'down' });
    }
  }
}
