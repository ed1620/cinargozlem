import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveType, RecordStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateLeaveDto,
  SetEntitlementDto,
  UpdateLeaveDto,
} from './dto/personnel.dto';

function inclusiveDays(start: Date, end: Date): number {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Yıllık izin hakkı ----
  setEntitlement(personnelId: string, dto: SetEntitlementDto) {
    return this.prisma.leaveEntitlement.upsert({
      where: {
        personnelId_year: { personnelId, year: dto.year },
      },
      update: { entitledDays: dto.entitledDays },
      create: {
        personnelId,
        year: dto.year,
        entitledDays: dto.entitledDays,
      },
    });
  }

  /** Bir yıl için hak / kullanılan / kalan. */
  async summary(personnelId: string, year: number) {
    const [entitlement, leaves] = await Promise.all([
      this.prisma.leaveEntitlement.findUnique({
        where: { personnelId_year: { personnelId, year } },
      }),
      this.prisma.leaveRecord.findMany({
        where: {
          personnelId,
          status: RecordStatus.ACTIVE,
          type: LeaveType.ANNUAL,
          startDate: { gte: new Date(year, 0, 1) },
          endDate: { lte: new Date(year, 11, 31, 23, 59, 59) },
        },
      }),
    ]);
    const entitled = entitlement?.entitledDays ?? 0;
    const used = leaves.reduce((s, l) => s + l.totalDays, 0);
    return { year, entitled, used, remaining: entitled - used };
  }

  list(personnelId: string) {
    return this.prisma.leaveRecord.findMany({
      where: { personnelId },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(dto: CreateLeaveDto) {
    const personnel = await this.prisma.personnel.findUnique({
      where: { id: dto.personnelId },
    });
    if (!personnel) throw new NotFoundException('Personel bulunamadı');
    if (personnel.status !== RecordStatus.ACTIVE)
      throw new BadRequestException('Pasif personele izin kaydı eklenemez');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start)
      throw new BadRequestException('Bitiş tarihi başlangıçtan önce olamaz');
    const totalDays = inclusiveDays(start, end);
    const type = dto.type ?? LeaveType.ANNUAL;

    // Yıllık izinde kalan hak kontrolü
    if (type === LeaveType.ANNUAL) {
      const { remaining } = await this.summary(
        dto.personnelId,
        start.getFullYear(),
      );
      if (totalDays > remaining)
        throw new BadRequestException(
          `Yetersiz izin hakkı. Kalan: ${remaining} gün, talep: ${totalDays} gün`,
        );
    }

    return this.prisma.leaveRecord.create({
      data: {
        personnelId: dto.personnelId,
        type,
        startDate: start,
        endDate: end,
        totalDays,
        note: dto.note,
      },
    });
  }

  async update(id: string, dto: UpdateLeaveDto) {
    const current = await this.getRaw(id);
    const start = dto.startDate ? new Date(dto.startDate) : current.startDate;
    const end = dto.endDate ? new Date(dto.endDate) : current.endDate;
    if (end < start)
      throw new BadRequestException('Bitiş tarihi başlangıçtan önce olamaz');
    return this.prisma.leaveRecord.update({
      where: { id },
      data: {
        type: dto.type,
        startDate: start,
        endDate: end,
        totalDays: inclusiveDays(start, end),
        note: dto.note,
      },
    });
  }

  async remove(id: string) {
    await this.getRaw(id);
    return this.prisma.leaveRecord.update({
      where: { id },
      data: { status: RecordStatus.PASSIVE },
    });
  }

  private async getRaw(id: string) {
    const l = await this.prisma.leaveRecord.findUnique({ where: { id } });
    if (!l) throw new NotFoundException('İzin kaydı bulunamadı');
    return l;
  }
}
