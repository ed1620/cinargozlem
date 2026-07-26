import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileUrl, multerOptions } from './multer.config';

/**
 * Genel dosya yükleme. Fiş/fatura ve poliçe belgeleri buradan yüklenip
 * dönen `url` ilgili kaydın (gider, akaryakıt, sigorta...) alanına yazılır.
 * Yalnızca kimlik doğrulaması gerekir (global JwtAuthGuard).
 */
@Controller('uploads')
export class UploadsController {
  @Post('receipt')
  @UseInterceptors(FileInterceptor('file', multerOptions('receipts')))
  uploadReceipt(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya gönderilmedi');
    return {
      url: fileUrl('receipts', file.filename),
      fileName: file.originalname,
      size: file.size,
    };
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', multerOptions('documents')))
  uploadDocument(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Dosya gönderilmedi');
    return {
      url: fileUrl('documents', file.filename),
      fileName: file.originalname,
      size: file.size,
    };
  }
}
