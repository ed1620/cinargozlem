import { Injectable, NotFoundException } from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinanceIntegrationService } from '../finance/finance-integration.service';
import {
  CreateFuelDto,
  CreateMaintenanceDto,
  UpdateFuelDto,
  UpdateMaintenanceDto,
} from './dto/vehicle.dto';

export const AUTO_EXPENSE_FUEL = 'AUTO_EXPENSE_FROM_FUEL';
export const AUTO_EXPENSE_MAINTENANCE = 'AUTO_EXPENSE_FROM_MAINTENANCE';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class VehicleCostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: FinanceIntegrationService,
  ) {}

  // ================= AKARYAKIT =================
  async listFuel(vehicleId: string) {
    const rows = await this.prisma.fuelRecord.findMany({
      where: { vehicleId, status: RecordStatus.ACTIVE },
      orderBy: { date: 'desc' },
    });
    return rows.map((r) => this.mapFuel(r));
  }

  async addFuel(vehicleId: string, dto: CreateFuelDto) {
    await this.assertVehicle(vehicleId);
    const totalAmount = round2(dto.liters * dto.pricePerLiter);
    const created = await this.prisma.fuelRecord.create({
      data: {
        vehicleId,
        date: new Date(dto.date),
        time: dto.time,
        fuelType: dto.fuelType,
        liters: dto.liters,
        pricePerLiter: dto.pricePerLiter,
        totalAmount,
        odometer: dto.odometer,
        paymentMethod: dto.paymentMethod,
        receiptUrl: dto.receiptUrl,
        note: dto.note,
      },
      include: { vehicle: { select: { plate: true } } },
    });
    if (await this.integration.isEnabled(AUTO_EXPENSE_FUEL)) {
      await this.integration.createExpenseFrom({
        sourceModule: 'VEHICLE_FUEL',
        sourceEntityId: created.id,
        date: created.date,
        amount: totalAmount,
        expenseType: 'Akaryakıt',
        description: `${created.vehicle.plate} — ${dto.liters} L`,
        categoryName: 'Akaryakıt',
      });
    }
    return this.mapFuel(created);
  }

  async updateFuel(id: string, dto: UpdateFuelDto) {
    const cur = await this.getFuel(id);
    const liters = dto.liters ?? Number(cur.liters);
    const price = dto.pricePerLiter ?? Number(cur.pricePerLiter);
    const totalAmount = round2(liters * price);
    const updated = await this.prisma.fuelRecord.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        fuelType: dto.fuelType,
        liters,
        pricePerLiter: price,
        totalAmount,
        odometer: dto.odometer,
        paymentMethod: dto.paymentMethod,
        receiptUrl: dto.receiptUrl,
        note: dto.note,
      },
    });
    return this.mapFuel(updated);
  }

  async removeFuel(id: string) {
    await this.getFuel(id);
    await this.integration.removeExpenseFrom('VEHICLE_FUEL', id);
    await this.prisma.fuelRecord.delete({ where: { id } });
    return { deleted: true };
  }

  // ================= BAKIM =================
  async listMaintenance(vehicleId: string) {
    const rows = await this.prisma.maintenanceRecord.findMany({
      where: { vehicleId, status: RecordStatus.ACTIVE },
      orderBy: { date: 'desc' },
    });
    return rows.map((r) => this.mapMaint(r));
  }

  async addMaintenance(vehicleId: string, dto: CreateMaintenanceDto) {
    await this.assertVehicle(vehicleId);
    // KDV'siz tutar = ödenen / (1 + KDV/100)
    const netAmount = round2(dto.totalAmount / (1 + dto.vatRate / 100));
    const created = await this.prisma.maintenanceRecord.create({
      data: {
        vehicleId,
        date: new Date(dto.date),
        time: dto.time,
        company: dto.company,
        description: dto.description,
        odometer: dto.odometer,
        totalAmount: dto.totalAmount,
        vatRate: dto.vatRate,
        netAmount,
        paymentMethod: dto.paymentMethod,
        receiptUrl: dto.receiptUrl,
        note: dto.note,
      },
      include: { vehicle: { select: { plate: true } } },
    });
    if (await this.integration.isEnabled(AUTO_EXPENSE_MAINTENANCE)) {
      await this.integration.createExpenseFrom({
        sourceModule: 'VEHICLE_MAINTENANCE',
        sourceEntityId: created.id,
        date: created.date,
        amount: dto.totalAmount,
        expenseType: 'Bakım',
        description: `${created.vehicle.plate} — ${dto.company ?? 'bakım'}`,
        categoryName: 'Bakım',
      });
    }
    return this.mapMaint(created);
  }

  async updateMaintenance(id: string, dto: UpdateMaintenanceDto) {
    const cur = await this.getMaint(id);
    const total = dto.totalAmount ?? Number(cur.totalAmount);
    const vat = dto.vatRate ?? Number(cur.vatRate);
    const updated = await this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        time: dto.time,
        company: dto.company,
        description: dto.description,
        odometer: dto.odometer,
        totalAmount: total,
        vatRate: vat,
        netAmount: round2(total / (1 + vat / 100)),
        paymentMethod: dto.paymentMethod,
        receiptUrl: dto.receiptUrl,
        note: dto.note,
      },
    });
    return this.mapMaint(updated);
  }

  async removeMaintenance(id: string) {
    await this.getMaint(id);
    await this.integration.removeExpenseFrom('VEHICLE_MAINTENANCE', id);
    await this.prisma.maintenanceRecord.delete({ where: { id } });
    return { deleted: true };
  }

  // ================= yardımcılar =================
  private async assertVehicle(id: string) {
    const c = await this.prisma.vehicle.count({ where: { id } });
    if (!c) throw new NotFoundException('Araç bulunamadı');
  }
  private async getFuel(id: string) {
    const f = await this.prisma.fuelRecord.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('Akaryakıt kaydı bulunamadı');
    return f;
  }
  private async getMaint(id: string) {
    const m = await this.prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Bakım kaydı bulunamadı');
    return m;
  }
  private mapFuel(f: any) {
    return {
      ...f,
      liters: Number(f.liters),
      pricePerLiter: Number(f.pricePerLiter),
      totalAmount: Number(f.totalAmount),
    };
  }
  private mapMaint(m: any) {
    return {
      ...m,
      totalAmount: Number(m.totalAmount),
      vatRate: Number(m.vatRate),
      netAmount: Number(m.netAmount),
    };
  }
}
