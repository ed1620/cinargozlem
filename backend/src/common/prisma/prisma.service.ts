import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Uygulama açılışında veritabanı henüz hazır değilse çökmek yerine
   * yeniden dener (auto-recovery). Böylece DB geç başlatılsa veya bağlantı
   * anlık koparsa uygulama beklemeye geçer, hazır olunca bağlanır.
   */
  async onModuleInit() {
    const maxRetries = Number(process.env.DB_CONNECT_RETRIES ?? 15);
    const delayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 3000);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Veritabanı bağlantısı kuruldu.');
        return;
      } catch (err) {
        this.logger.warn(
          `Veritabanına bağlanılamadı (deneme ${attempt}/${maxRetries}). ${delayMs}ms sonra tekrar denenecek.`,
        );
        if (attempt === maxRetries) {
          this.logger.error('Veritabanı bağlantısı kurulamadı.', err as Error);
          throw err;
        }
        await sleep(delayMs);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
