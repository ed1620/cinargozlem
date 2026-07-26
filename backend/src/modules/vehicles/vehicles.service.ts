import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RecordStatus } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Paginated } from '../../common/dto/list-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinanceIntegrationService } from '../finance/finance-integration.service';
import {
  CreateInspectionDto,
  CreateInsuranceDto,
  CreateVehicleDto,
  UpdateInsuranceDto,
  UpdateVehicleDto,
  VehicleListQuery,
} from './dto/vehicle.dto';

export const AUTO_EXPENSE_INSURANCE = 'AUTO_EXPENSE_FROM_INSURANCE';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly integration: FinanceIntegrationService,
  ) {}

  // ================= ARAÇ =================
  async list(q: VehicleListQuery): Promise<Paginated<any>> {
    const where: Prisma.VehicleWhereInput = {
      status: q.status,
      ...(q.search
        ? {
            OR: [
              { plate: { contains: q.search, mode: 'insensitive' } },
              { brand: { contains: q.search, mode: 'insensitive' } },
              { model: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total, active, passive] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: { responsible: { select: { firstName: true, lastName: true } } },
        orderBy: { plate: 'asc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.count({ where: { status: RecordStatus.ACTIVE } }),
      this.prisma.vehicle.count({ where: { status: RecordStatus.PASSIVE } }),
    ]);
    return {
      items: rows,
      total,
      page: q.page,
      limit: q.limit,
      ...({ counts: { active, passive, all: active + passive } } as any),
    };
  }

  async get(id: string) {
    const v = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true } },
        insurances: { orderBy: { endDate: 'desc' } },
        inspections: { orderBy: { expiryDate: 'desc' } },
      },
    });
    if (!v) throw new NotFoundException('Araç bulunamadı');
    return {
      ...v,
      insurances: v.insurances.map((i) => ({
        ...i,
        amount: i.amountEnc ? this.crypto.decryptNumber(i.amountEnc) : null,
      })),
    };
  }

  create(dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data: dto });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.assertVehicle(id);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async setStatus(id: string, status: RecordStatus) {
    await this.assertVehicle(id);
    return this.prisma.vehicle.update({ where: { id }, data: { status } });
  }

  async remove(id: string) {
    await this.assertVehicle(id);
    // Bu araca ait otomatik giderleri temizle, sonra araç + alt kayıtları (cascade) sil.
    const [ins, fuel, maint] = await Promise.all([
      this.prisma.insurancePolicy.findMany({ where: { vehicleId: id }, select: { id: true } }),
      this.prisma.fuelRecord.findMany({ where: { vehicleId: id }, select: { id: true } }),
      this.prisma.maintenanceRecord.findMany({ where: { vehicleId: id }, select: { id: true } }),
    ]);
    await this.prisma.expense.deleteMany({
      where: {
        OR: [
          { sourceModule: 'VEHICLE_INSURANCE', sourceEntityId: { in: ins.map((x) => x.id) } },
          { sourceModule: 'VEHICLE_FUEL', sourceEntityId: { in: fuel.map((x) => x.id) } },
          { sourceModule: 'VEHICLE_MAINTENANCE', sourceEntityId: { in: maint.map((x) => x.id) } },
        ],
      },
    });
    await this.prisma.vehicle.delete({ where: { id } });
    return { deleted: true };
  }

  // ================= SİGORTA / KASKO =================
  async addInsurance(vehicleId: string, dto: CreateInsuranceDto) {
    await this.assertVehicle(vehicleId);
    const created = await this.prisma.insurancePolicy.create({
      data: {
        vehicleId,
        type: dto.type,
        company: dto.company,
        policyNo: dto.policyNo,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        amountEnc: dto.amount != null ? this.crypto.encrypt(dto.amount) : null,
        documentUrl: dto.documentUrl,
        note: dto.note,
      },
    });
    if (dto.amount != null && (await this.integration.isEnabled(AUTO_EXPENSE_INSURANCE))) {
      await this.integration.createExpenseFrom({
        sourceModule: 'VEHICLE_INSURANCE',
        sourceEntityId: created.id,
        date: created.startDate,
        amount: dto.amount,
        expenseType: dto.type === 'KASKO' ? 'Kasko' : 'Trafik Sigortası',
        description: `${dto.company} — poliçe ${dto.policyNo ?? ''}`.trim(),
        categoryName: 'Sigorta',
      });
    }
    return created;
  }

  async updateInsurance(id: string, dto: UpdateInsuranceDto) {
    await this.getInsurance(id);
    return this.prisma.insurancePolicy.update({
      where: { id },
      data: {
        type: dto.type,
        company: dto.company,
        policyNo: dto.policyNo,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        amountEnc:
          dto.amount !== undefined ? this.crypto.encrypt(dto.amount) : undefined,
        documentUrl: dto.documentUrl,
        note: dto.note,
      },
    });
  }

  async removeInsurance(id: string) {
    await this.getInsurance(id);
    await this.integration.removeExpenseFrom('VEHICLE_INSURANCE', id);
    await this.prisma.insurancePolicy.delete({ where: { id } });
    return { deleted: true };
  }

  // ================= MUAYENE =================
  /** Yeni muayene: eski (aktif) kayıtları arşivler (PASSIVE), yenisini ekler. */
  async addInspection(vehicleId: string, dto: CreateInspectionDto) {
    await this.assertVehicle(vehicleId);
    await this.prisma.inspection.updateMany({
      where: { vehicleId, status: RecordStatus.ACTIVE },
      data: { status: RecordStatus.PASSIVE },
    });
    return this.prisma.inspection.create({
      data: {
        vehicleId,
        inspectionDate: new Date(dto.inspectionDate),
        expiryDate: new Date(dto.expiryDate),
        note: dto.note,
      },
    });
  }

  async removeInspection(id: string) {
    const i = await this.prisma.inspection.findUnique({ where: { id } });
    if (!i) throw new NotFoundException('Muayene kaydı bulunamadı');
    await this.prisma.inspection.delete({ where: { id } });
    return { deleted: true };
  }

  // ================= yardımcılar =================
  private async assertVehicle(id: string) {
    const c = await this.prisma.vehicle.count({ where: { id } });
    if (!c) throw new NotFoundException('Araç bulunamadı');
  }
  private async getInsurance(id: string) {
    const i = await this.prisma.insurancePolicy.findUnique({ where: { id } });
    if (!i) throw new NotFoundException('Sigorta kaydı bulunamadı');
    return i;
  }
}
