import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus } from '@prisma/client';
import { unlink } from 'fs/promises';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Paginated } from '../../common/dto/list-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { diskPathFromUrl } from '../../common/uploads/multer.config';
import { CreateStudentDto, StudentListQuery, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(q: StudentListQuery): Promise<Paginated<any>> {
    const where: Prisma.StudentWhereInput = {
      status: q.status,
      ...(q.search
        ? {
            OR: [
              { firstName: { contains: q.search, mode: 'insensitive' } },
              { lastName: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total, active, passive] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.student.count({ where }),
      this.prisma.student.count({ where: { status: RecordStatus.ACTIVE } }),
      this.prisma.student.count({ where: { status: RecordStatus.PASSIVE } }),
    ]);
    return {
      items: rows.map(({ tcNoEnc, ...r }) => r), // liste ekranında TC yok
      total,
      page: q.page,
      limit: q.limit,
      ...({ counts: { active, passive, all: active + passive } } as any),
    };
  }

  async get(id: string) {
    const s = await this.prisma.student.findUnique({
      where: { id },
      include: {
        _count: { select: { activities: true } },
      },
    });
    if (!s) throw new NotFoundException('Öğrenci bulunamadı');
    const { tcNoEnc, ...rest } = s;
    return { ...rest, tcNo: this.crypto.decrypt(tcNoEnc) };
  }

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        tcNoEnc: this.crypto.encrypt(dto.tcNo ?? null),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        parentName: dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        parentAddress: dto.parentAddress,
        diagnosis: dto.diagnosis,
        registrationDate: new Date(dto.registrationDate),
      },
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.assertExists(id);
    return this.prisma.student.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        tcNoEnc: dto.tcNo !== undefined ? this.crypto.encrypt(dto.tcNo) : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        parentName: dto.parentName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        parentAddress: dto.parentAddress,
        diagnosis: dto.diagnosis,
        registrationDate: dto.registrationDate
          ? new Date(dto.registrationDate)
          : undefined,
      },
    });
  }

  async setStatus(id: string, status: RecordStatus) {
    await this.assertExists(id);
    return this.prisma.student.update({ where: { id }, data: { status } });
  }

  /**
   * Silme: öğrenciye ait tüm aktivite ve fotoğraflar silinir (şema Cascade),
   * ayrıca fotoğraf DOSYALARI diskten güvenli şekilde kaldırılır.
   */
  async remove(id: string) {
    await this.assertExists(id);
    const images = await this.prisma.activityImage.findMany({
      where: { activity: { studentId: id } },
      select: { url: true },
    });
    await this.prisma.student.delete({ where: { id } }); // cascade DB temizliği
    // Diskteki dosyaları sil (hata olsa da akışı bozma).
    await Promise.all(
      images.map((img) => {
        const p = diskPathFromUrl(img.url);
        return p ? unlink(p).catch(() => undefined) : undefined;
      }),
    );
    return { deleted: true, removedImages: images.length };
  }

  private async assertExists(id: string) {
    const c = await this.prisma.student.count({ where: { id } });
    if (!c) throw new NotFoundException('Öğrenci bulunamadı');
  }
}
