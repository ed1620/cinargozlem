import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Paginated } from '../../common/dto/list-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePersonnelDto,
  PersonnelListQuery,
  UpdatePersonnelDto,
} from './dto/personnel.dto';

@Injectable()
export class PersonnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async list(q: PersonnelListQuery): Promise<Paginated<any>> {
    const where: Prisma.PersonnelWhereInput = {
      status: q.status,
      title: q.title ? { contains: q.title, mode: 'insensitive' } : undefined,
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
      this.prisma.personnel.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.personnel.count({ where }),
      this.prisma.personnel.count({ where: { status: RecordStatus.ACTIVE } }),
      this.prisma.personnel.count({ where: { status: RecordStatus.PASSIVE } }),
    ]);
    return {
      items: rows.map((r) => this.mask(r)),
      total,
      page: q.page,
      limit: q.limit,
      // ek özet (frontend başlığı için)
      ...( { counts: { active, passive, all: active + passive } } as any),
    };
  }

  async get(id: string) {
    const p = await this.prisma.personnel.findUnique({
      where: { id },
      include: {
        leaveEntitlements: { orderBy: { year: 'desc' } },
        leaveRecords: { orderBy: { startDate: 'desc' } },
      },
    });
    if (!p) throw new NotFoundException('Personel bulunamadı');
    const { tcNoEnc, ...rest } = p;
    return { ...rest, tcNo: this.crypto.decrypt(tcNoEnc) };
  }

  create(dto: CreatePersonnelDto) {
    return this.prisma.personnel.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        tcNoEnc: this.crypto.encrypt(dto.tcNo ?? null),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        title: dto.title,
        startDate: new Date(dto.startDate),
        salaryType: dto.salaryType,
        note: dto.note,
      },
    });
  }

  async update(id: string, dto: UpdatePersonnelDto) {
    await this.assertExists(id);
    return this.prisma.personnel.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        tcNoEnc:
          dto.tcNo !== undefined ? this.crypto.encrypt(dto.tcNo) : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        title: dto.title,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        salaryType: dto.salaryType,
        note: dto.note,
      },
    });
  }

  async setStatus(id: string, status: RecordStatus) {
    await this.assertExists(id);
    return this.prisma.personnel.update({ where: { id }, data: { status } });
  }

  /** Silme: personele ait maaş ve izin kayıtları da silinir (şema Cascade). */
  async remove(id: string) {
    await this.assertExists(id);
    // Cascade, bordroları siler ama maaştan oluşan otomatik giderleri değil;
    // önce onları temizle.
    const payrolls = await this.prisma.payroll.findMany({
      where: { personnelId: id },
      select: { id: true },
    });
    await this.prisma.expense.deleteMany({
      where: {
        sourceModule: 'PERSONNEL',
        sourceEntityId: { in: payrolls.map((p) => p.id) },
      },
    });
    await this.prisma.personnel.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertExists(id: string) {
    const c = await this.prisma.personnel.count({ where: { id } });
    if (!c) throw new NotFoundException('Personel bulunamadı');
  }

  private mask(p: any) {
    const { tcNoEnc, ...rest } = p;
    return rest; // liste ekranında TC gösterilmez
  }
}
