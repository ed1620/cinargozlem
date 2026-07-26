import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './storage/uploads';
const ALLOWED = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Verilen alt klasör için Multer disk depolama seçenekleri. */
export function multerOptions(subdir: string) {
  const dest = join(UPLOAD_DIR, subdir);
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  return {
    storage: diskStorage({
      destination: dest,
      filename: (_req: any, file: Express.Multer.File, cb: any) => {
        cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED.includes(ext))
        return cb(
          new BadRequestException('Yalnızca JPG, PNG, PDF yüklenebilir'),
          false,
        );
      cb(null, true);
    },
    limits: { fileSize: MAX_BYTES },
  };
}

/** DB'de saklanacak ve statik olarak sunulacak public URL. */
export function fileUrl(subdir: string, filename: string): string {
  return `/uploads/${subdir}/${filename}`;
}

/** URL'den disk yolunu çözer (dosya silmek için). */
export function diskPathFromUrl(url: string): string | null {
  const m = url.match(/^\/uploads\/(.+)$/);
  return m ? join(UPLOAD_DIR, m[1]) : null;
}
