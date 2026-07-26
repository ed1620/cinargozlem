import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoryType, ModuleCode, PermissionAction } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  CreateCategoryDto,
  CreateExpenseDto,
  CreateIncomeDto,
  FinanceListQuery,
  UpdateCategoryDto,
  UpdateExpenseDto,
  UpdateIncomeDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

const M = ModuleCode.FINANCE;

@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  // --- Kategoriler ---
  @Get('categories')
  @RequirePermission(M, PermissionAction.VIEW)
  categories(@Query('type') type?: CategoryType) {
    return this.finance.listCategories(type);
  }

  @Post('categories')
  @RequirePermission(M, PermissionAction.CREATE)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.finance.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.finance.updateCategory(id, dto);
  }

  // --- Bakiye ---
  @Get('balance')
  @RequirePermission(M, PermissionAction.VIEW)
  balance(@Query('year') year?: string, @Query('month') month?: string) {
    return this.finance.balance(
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  // --- Gelir ---
  @Get('incomes')
  @RequirePermission(M, PermissionAction.VIEW)
  incomes(@Query() q: FinanceListQuery) {
    return this.finance.listIncomes(q);
  }

  @Post('incomes')
  @RequirePermission(M, PermissionAction.CREATE)
  createIncome(@Body() dto: CreateIncomeDto, @CurrentUser() u: AuthUser) {
    return this.finance.createIncome(dto, u.userId);
  }

  @Patch('incomes/:id')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateIncome(@Param('id') id: string, @Body() dto: UpdateIncomeDto) {
    return this.finance.updateIncome(id, dto);
  }

  @Delete('incomes/:id')
  @RequirePermission(M, PermissionAction.DELETE)
  removeIncome(@Param('id') id: string) {
    return this.finance.removeIncome(id);
  }

  // --- Gider ---
  @Get('expenses')
  @RequirePermission(M, PermissionAction.VIEW)
  expenses(@Query() q: FinanceListQuery) {
    return this.finance.listExpenses(q);
  }

  @Post('expenses')
  @RequirePermission(M, PermissionAction.CREATE)
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() u: AuthUser) {
    return this.finance.createExpense(dto, u.userId);
  }

  @Patch('expenses/:id')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.finance.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  @RequirePermission(M, PermissionAction.DELETE)
  removeExpense(@Param('id') id: string) {
    return this.finance.removeExpense(id);
  }
}
