import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { spawn } from 'child_process';
import { mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Otomatik veritabanı yedekleme servisi.
 * Her gün 09:00'da (BACKUP_CRON) pg_dump ile PostgreSQL yedeği alır,
 * BACKUP_DIR altına sıkıştırılmış (.dump) olarak yazar ve eski yedekleri döner.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = process.env.BACKUP_DIR ?? './storage/backups';
  private readonly keep = Number(process.env.BACKUP_KEEP ?? 14);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(process.env.BACKUP_CRON ?? '0 9 * * *', { name: 'daily-backup' })
  async scheduledBackup(): Promise<void> {
    try {
      const file = await this.runBackup();
      this.logger.log(`Yedekleme tamamlandı: ${file}`);
    } catch (err) {
      this.logger.error('Yedekleme başarısız', err as Error);
      await this.recordStatus('FAILED', String(err));
    }
  }

  /** Yedeği alır, dosya yolunu döner. Manuel de tetiklenebilir. */
  async runBackup(): Promise<string> {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL tanımlı değil');

    await mkdir(this.backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = join(this.backupDir, `kgkyp-${stamp}.dump`);

    await this.execPgDump(url, outFile);
    await this.rotateOldBackups();
    await this.recordStatus('SUCCESS', outFile);
    return outFile;
  }

  private execPgDump(url: string, outFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // -Fc: custom/compressed format (pg_restore ile geri yüklenebilir)
      const proc = spawn(
        'pg_dump',
        ['--dbname', url, '-Fc', '--no-owner', '-f', outFile],
        { stdio: ['ignore', 'ignore', 'pipe'] },
      );
      let stderr = '';
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('error', (e) =>
        reject(new Error(`pg_dump çalıştırılamadı: ${e.message}`)),
      );
      proc.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`pg_dump hata kodu ${code}: ${stderr}`)),
      );
    });
  }

  /** Son `keep` yedeği tutar, gerisini siler. */
  private async rotateOldBackups(): Promise<void> {
    const files = (await readdir(this.backupDir))
      .filter((f) => f.startsWith('kgkyp-') && f.endsWith('.dump'))
      .sort()
      .reverse();
    for (const stale of files.slice(this.keep)) {
      await unlink(join(this.backupDir, stale)).catch(() => undefined);
    }
  }

  private async recordStatus(status: string, detail: string): Promise<void> {
    const value = JSON.stringify({ status, detail, at: new Date().toISOString() });
    await this.prisma.systemSetting
      .upsert({
        where: { key: 'BACKUP_LAST_RUN' },
        update: { value },
        create: { key: 'BACKUP_LAST_RUN', value },
      })
      .catch(() => undefined);
  }
}
