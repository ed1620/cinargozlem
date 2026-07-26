import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { unlink } from 'fs/promises';
import { PrismaService } from '../../common/prisma/prisma.service';
import { diskPathFromUrl, fileUrl } from '../../common/uploads/multer.config';
import { CreateActivityDto, UpdateActivityDto } from './dto/student.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  list(studentId: string, year?: number, month?: number) {
    return this.prisma.activityRecord.findMany({
      where: {
        studentId,
        status: RecordStatus.ACTIVE,
        year: year ?? undefined,
        month: month ?? undefined,
      },
      include: { images: true },
      orderBy: { date: 'desc' },
    });
  }

  async create(studentId: string, dto: CreateActivityDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Öğrenci bulunamadı');
    if (student.status !== RecordStatus.ACTIVE)
      throw new BadRequestException('Pasif öğrenciye aktivite eklenemez');

    const date = new Date(dto.date);
    return this.prisma.activityRecord.create({
      data: {
        studentId,
        date,
        title: dto.title,
        description: dto.description,
        targetGains: dto.targetGains,
        evaluationNote: dto.evaluationNote,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    });
  }

  async update(id: string, dto: UpdateActivityDto) {
    const cur = await this.getRaw(id);
    const date = dto.date ? new Date(dto.date) : cur.date;
    return this.prisma.activityRecord.update({
      where: { id },
      data: {
        date,
        title: dto.title,
        description: dto.description,
        targetGains: dto.targetGains,
        evaluationNote: dto.evaluationNote,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    });
  }

  async remove(id: string) {
    await this.getRaw(id);
    const images = await this.prisma.activityImage.findMany({
      where: { activityId: id },
      select: { url: true },
    });
    await this.prisma.activityRecord.delete({ where: { id } }); // cascade images
    await Promise.all(
      images.map((i) => {
        const p = diskPathFromUrl(i.url);
        return p ? unlink(p).catch(() => undefined) : undefined;
      }),
    );
    return { deleted: true };
  }

  // ===== Fotoğraflar =====
  async addImages(activityId: string, files: Express.Multer.File[]) {
    await this.getRaw(activityId);
    if (!files?.length) throw new BadRequestException('En az bir görsel gerekli');
    const created = await this.prisma.$transaction(
      files.map((f) =>
        this.prisma.activityImage.create({
          data: {
            activityId,
            url: fileUrl('students', f.filename),
            fileName: f.originalname,
            mimeType: f.mimetype,
            sizeBytes: f.size,
          },
        }),
      ),
    );
    return created;
  }

  listImages(activityId: string) {
    return this.prisma.activityImage.findMany({ where: { activityId } });
  }

  async removeImage(imageId: string) {
    const img = await this.prisma.activityImage.findUnique({
      where: { id: imageId },
    });
    if (!img) throw new NotFoundException('Görsel bulunamadı');
    await this.prisma.activityImage.delete({ where: { id: imageId } });
    const p = diskPathFromUrl(img.url);
    if (p) await unlink(p).catch(() => undefined);
    return { deleted: true };
  }

  private async getRaw(id: string) {
    const a = await this.prisma.activityRecord.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Aktivite kaydı bulunamadı');
    return a;
  }
}
