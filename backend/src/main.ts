import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './common/uploads/multer.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ters proxy (nginx) arkasında gerçek istemci IP'si — rate-limit için.
  app.set('trust proxy', 1);
  // Güvenlik başlıkları (yüklenen görsellerin çapraz kaynak gösterimine izin ver).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({ origin: true, credentials: true });

  // Yüklenen dosyaları statik sun: /uploads/... (API prefix'inden bağımsız).
  // resolve(): UPLOAD_DIR mutlaksa (Docker: /app/storage) olduğu gibi, göreliyse
  // cwd'ye göre çözer — join(cwd, absolute) hatasını (/app/app/storage) önler.
  app.useStaticAssets(resolve(UPLOAD_DIR), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`KG-KYP backend çalışıyor: http://localhost:${port}/api`);
}

bootstrap();
