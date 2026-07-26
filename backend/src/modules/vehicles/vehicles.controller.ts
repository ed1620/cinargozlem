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
import { ModuleCode, PermissionAction, RecordStatus } from '@prisma/client';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  CreateFuelDto,
  CreateInspectionDto,
  CreateInsuranceDto,
  CreateMaintenanceDto,
  CreateVehicleDto,
  UpdateFuelDto,
  UpdateInsuranceDto,
  UpdateMaintenanceDto,
  UpdateVehicleDto,
  VehicleListQuery,
} from './dto/vehicle.dto';
import { VehicleCostsService } from './vehicle-costs.service';
import { VehiclesService } from './vehicles.service';

const M = ModuleCode.VEHICLES;

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly costs: VehicleCostsService,
  ) {}

  // --- Araç ---
  @Get()
  @RequirePermission(M, PermissionAction.VIEW)
  list(@Query() q: VehicleListQuery) {
    return this.vehicles.list(q);
  }

  @Get(':id')
  @RequirePermission(M, PermissionAction.VIEW)
  get(@Param('id') id: string) {
    return this.vehicles.get(id);
  }

  @Post()
  @RequirePermission(M, PermissionAction.CREATE)
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicles.create(dto);
  }

  @Patch(':id')
  @RequirePermission(M, PermissionAction.UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(id, dto);
  }

  @Patch(':id/status/:status')
  @RequirePermission(M, PermissionAction.UPDATE)
  setStatus(@Param('id') id: string, @Param('status') status: RecordStatus) {
    return this.vehicles.setStatus(id, status);
  }

  @Delete(':id')
  @RequirePermission(M, PermissionAction.DELETE)
  remove(@Param('id') id: string) {
    return this.vehicles.remove(id);
  }

  // --- Sigorta / Kasko ---
  @Post(':id/insurances')
  @RequirePermission(M, PermissionAction.CREATE)
  addInsurance(@Param('id') id: string, @Body() dto: CreateInsuranceDto) {
    return this.vehicles.addInsurance(id, dto);
  }

  @Patch('insurances/:insId')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateInsurance(@Param('insId') insId: string, @Body() dto: UpdateInsuranceDto) {
    return this.vehicles.updateInsurance(insId, dto);
  }

  @Delete('insurances/:insId')
  @RequirePermission(M, PermissionAction.DELETE)
  removeInsurance(@Param('insId') insId: string) {
    return this.vehicles.removeInsurance(insId);
  }

  // --- Muayene ---
  @Post(':id/inspections')
  @RequirePermission(M, PermissionAction.CREATE)
  addInspection(@Param('id') id: string, @Body() dto: CreateInspectionDto) {
    return this.vehicles.addInspection(id, dto);
  }

  @Delete('inspections/:inspId')
  @RequirePermission(M, PermissionAction.DELETE)
  removeInspection(@Param('inspId') inspId: string) {
    return this.vehicles.removeInspection(inspId);
  }

  // --- Akaryakıt ---
  @Get(':id/fuel')
  @RequirePermission(M, PermissionAction.VIEW)
  fuel(@Param('id') id: string) {
    return this.costs.listFuel(id);
  }

  @Post(':id/fuel')
  @RequirePermission(M, PermissionAction.CREATE)
  addFuel(@Param('id') id: string, @Body() dto: CreateFuelDto) {
    return this.costs.addFuel(id, dto);
  }

  @Patch('fuel/:fuelId')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateFuel(@Param('fuelId') fuelId: string, @Body() dto: UpdateFuelDto) {
    return this.costs.updateFuel(fuelId, dto);
  }

  @Delete('fuel/:fuelId')
  @RequirePermission(M, PermissionAction.DELETE)
  removeFuel(@Param('fuelId') fuelId: string) {
    return this.costs.removeFuel(fuelId);
  }

  // --- Bakım ---
  @Get(':id/maintenance')
  @RequirePermission(M, PermissionAction.VIEW)
  maintenance(@Param('id') id: string) {
    return this.costs.listMaintenance(id);
  }

  @Post(':id/maintenance')
  @RequirePermission(M, PermissionAction.CREATE)
  addMaintenance(@Param('id') id: string, @Body() dto: CreateMaintenanceDto) {
    return this.costs.addMaintenance(id, dto);
  }

  @Patch('maintenance/:mId')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateMaintenance(@Param('mId') mId: string, @Body() dto: UpdateMaintenanceDto) {
    return this.costs.updateMaintenance(mId, dto);
  }

  @Delete('maintenance/:mId')
  @RequirePermission(M, PermissionAction.DELETE)
  removeMaintenance(@Param('mId') mId: string) {
    return this.costs.removeMaintenance(mId);
  }
}
