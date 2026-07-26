import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType, Prisma, RecordStatus } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Paginated } from '../../common/dto/list-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCategoryDto,
  CreateExpenseDto,
  CreateIncomeDto,
  FinanceListQuery,
  UpdateCategoryDto,
  UpdateExpenseDto,
  UpdateIncomeDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private dateRange(year?: number, month?: number) {
    if (!year) return undefined;
    const start = new Date(year, month ? month - 1 : 0, 1);
    const end = month
      ? new Date(year, month, 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59);
    return { gte: start, lte: end };
  }

  // ===================== KATEGORİ =====================
  listCategories(type?: CategoryType) {
    return this.prisma.financeCategory.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.financeCategory.create({ data: dto });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategory(id);
    return this.prisma.financeCategory.update({ where: { id }, data: dto });
  }

  private async getCategory(id: string) {
    const c = await this.prisma.financeCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Kategori bulunamadı');
    return c;
  }

  /** Pasif kategori yeni kayıtta seçilemez. */
  private async assertCategoryUsable(
    categoryId: string | undefined,
    type: CategoryType,
  ) {
    if (!categoryId) return;
    const c = await this.getCategory(categoryId);
    if (c.type !== type)
      throw new BadRequestException('Kategori türü uyuşmuyor');
    if (c.status !== RecordStatus.ACTIVE)
      throw new BadRequestException('Pasif kategori seçilemez');
  }

  // ===================== GELİR =====================
  async createIncome(dto: CreateIncomeDto, userId?: string) {
    await this.assertCategoryUsable(dto.categoryId, CategoryType.INCOME);
    if (dto.studentId) await this.assertStudentActive(dto.studentId);
    const income = await this.prisma.income.create({
      data: {
        date: new Date(dto.date),
        incomeType: dto.incomeType,
        categoryId: dto.categoryId,
        description: dto.description,
        amountEnc: this.crypto.encrypt(dto.amount)!,
        paymentMethod: dto.paymentMethod,
        studentId: dto.studentId,
        sourceModule: dto.studentId ? 'STUDENT' : 'MANUAL',
        receivedById: userId,
      },
    });
    return this.mapIncome(income);
  }

  async listIncomes(q: FinanceListQuery): Promise<Paginated<any>> {
    const where: Prisma.IncomeWhereInput = {
      status: RecordStatus.ACTIVE,
      categoryId: q.categoryId,
      date: this.dateRange(q.year, q.month),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.income.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.income.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.mapIncome(r)),
      total,
      page: q.page,
      limit: q.limit,
    };
  }

  async updateIncome(id: string, dto: UpdateIncomeDto) {
    await this.getIncome(id);
    if (dto.categoryId)
      await this.assertCategoryUsable(dto.categoryId, CategoryType.INCOME);
    const income = await this.prisma.income.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        incomeType: dto.incomeType,
        categoryId: dto.categoryId,
        description: dto.description,
        amountEnc:
          dto.amount !== undefined ? this.crypto.encrypt(dto.amount)! : undefined,
        paymentMethod: dto.paymentMethod,
      },
    });
    return this.mapIncome(income);
  }

  async removeIncome(id: string) {
    await this.getIncome(id);
    // Finansal kayıt: pasife alınır (geçmiş korunur).
    return this.prisma.income.update({
      where: { id },
      data: { status: RecordStatus.PASSIVE },
    });
  }

  private async getIncome(id: string) {
    const i = await this.prisma.income.findUnique({ where: { id } });
    if (!i) throw new NotFoundException('Gelir kaydı bulunamadı');
    return i;
  }

  // ===================== GİDER =====================
  async createExpense(dto: CreateExpenseDto, userId?: string) {
    await this.assertCategoryUsable(dto.categoryId, CategoryType.EXPENSE);
    const expense = await this.prisma.expense.create({
      data: {
        date: new Date(dto.date),
        expenseType: dto.expenseType,
        categoryId: dto.categoryId,
        description: dto.description,
        amountEnc: this.crypto.encrypt(dto.amount)!,
        paymentMethod: dto.paymentMethod,
        attachmentUrl: dto.attachmentUrl,
        paidById: userId,
      },
    });
    return this.mapExpense(expense);
  }

  async listExpenses(q: FinanceListQuery): Promise<Paginated<any>> {
    const where: Prisma.ExpenseWhereInput = {
      status: RecordStatus.ACTIVE,
      categoryId: q.categoryId,
      date: this.dateRange(q.year, q.month),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: q.skip,
        take: q.limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return {
      items: rows.map((r) => this.mapExpense(r)),
      total,
      page: q.page,
      limit: q.limit,
    };
  }

  async updateExpense(id: string, dto: UpdateExpenseDto) {
    await this.getExpense(id);
    if (dto.categoryId)
      await this.assertCategoryUsable(dto.categoryId, CategoryType.EXPENSE);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        expenseType: dto.expenseType,
        categoryId: dto.categoryId,
        description: dto.description,
        amountEnc:
          dto.amount !== undefined ? this.crypto.encrypt(dto.amount)! : undefined,
        paymentMethod: dto.paymentMethod,
        attachmentUrl: dto.attachmentUrl,
      },
    });
    return this.mapExpense(expense);
  }

  async removeExpense(id: string) {
    await this.getExpense(id);
    return this.prisma.expense.update({
      where: { id },
      data: { status: RecordStatus.PASSIVE },
    });
  }

  private async getExpense(id: string) {
    const e = await this.prisma.expense.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Gider kaydı bulunamadı');
    return e;
  }

  // ===================== KASA / BAKİYE =====================
  async balance(year?: number, month?: number) {
    const range = this.dateRange(year, month);
    const where = { status: RecordStatus.ACTIVE, date: range };
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({ where, select: { amountEnc: true } }),
      this.prisma.expense.findMany({ where, select: { amountEnc: true } }),
    ]);
    const totalIncome = incomes.reduce(
      (s, i) => s + this.crypto.decryptNumber(i.amountEnc),
      0,
    );
    const totalExpense = expenses.reduce(
      (s, e) => s + this.crypto.decryptNumber(e.amountEnc),
      0,
    );
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }

  // ===================== Yardımcılar =====================
  private async assertStudentActive(studentId: string) {
    const s = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!s) throw new NotFoundException('Öğrenci bulunamadı');
    if (s.status !== RecordStatus.ACTIVE)
      throw new BadRequestException('Pasif öğrenciye gelir kaydı bağlanamaz');
  }

  private mapIncome(i: any) {
    const { amountEnc, ...rest } = i;
    return { ...rest, amount: this.crypto.decryptNumber(amountEnc) };
  }
  private mapExpense(e: any) {
    const { amountEnc, ...rest } = e;
    return { ...rest, amount: this.crypto.decryptNumber(amountEnc) };
  }
}
