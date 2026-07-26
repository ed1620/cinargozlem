import { Injectable } from '@nestjs/common';
import { FinanceSourceModule } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AutoExpenseInput {
  sourceModule: FinanceSourceModule;
  sourceEntityId: string;
  date: Date;
  amount: number;
  expenseType: string;
  description?: string;
  categoryName?: string; // ilgili gider kategorisi (yoksa oluşturulur)
}

/**
 * Modüller arası entegrasyon: maaş / akaryakıt / bakım / sigorta gibi
 * kaynaklardan otomatik GİDER kaydı üretir. SystemSetting bayrağı ile
 * modül bazında açılıp kapatılabilir. Aynı kaynak kayıt için mükerrer
 * gider oluşturmaz (sourceModule + sourceEntityId benzersizliği ile).
 */
@Injectable()
export class FinanceIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /** İlgili entegrasyon bayrağı açık mı? (varsayılan: açık) */
  async isEnabled(flag: string): Promise<boolean> {
    const s = await this.prisma.systemSetting.findUnique({ where: { key: flag } });
    return s ? s.value === 'true' : true;
  }

  async setEnabled(flag: string, enabled: boolean): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: flag },
      update: { value: String(enabled) },
      create: { key: flag, value: String(enabled) },
    });
  }

  private async categoryId(name: string): Promise<string> {
    const existing = await this.prisma.financeCategory.findFirst({
      where: { name, type: 'EXPENSE' },
    });
    if (existing) return existing.id;
    const created = await this.prisma.financeCategory.create({
      data: { name, type: 'EXPENSE' },
    });
    return created.id;
  }

  /** Kaynak kayıttan otomatik gider oluşturur (idempotent). */
  async createExpenseFrom(input: AutoExpenseInput): Promise<string | null> {
    const existing = await this.prisma.expense.findFirst({
      where: {
        sourceModule: input.sourceModule,
        sourceEntityId: input.sourceEntityId,
      },
    });
    if (existing) return existing.id;

    const categoryId = input.categoryName
      ? await this.categoryId(input.categoryName)
      : undefined;

    const expense = await this.prisma.expense.create({
      data: {
        date: input.date,
        expenseType: input.expenseType,
        description: input.description,
        amountEnc: this.crypto.encrypt(input.amount)!,
        categoryId,
        sourceModule: input.sourceModule,
        sourceEntityId: input.sourceEntityId,
      },
    });
    return expense.id;
  }

  /** Kaynak kayıt silinince/güncellenince otomatik gideri geri al. */
  async removeExpenseFrom(
    sourceModule: FinanceSourceModule,
    sourceEntityId: string,
  ): Promise<void> {
    await this.prisma.expense.deleteMany({
      where: { sourceModule, sourceEntityId },
    });
  }
}
