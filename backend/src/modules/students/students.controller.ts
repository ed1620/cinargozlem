import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ModuleCode, PermissionAction, RecordStatus } from '@prisma/client';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { multerOptions } from '../../common/uploads/multer.config';
import { ActivityService } from './activity.service';
import {
  CreateActivityDto,
  CreateStudentDto,
  StudentListQuery,
  UpdateActivityDto,
  UpdateStudentDto,
} from './dto/student.dto';
import { StudentsService } from './students.service';

const M = ModuleCode.STUDENTS;

@Controller('students')
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly activities: ActivityService,
  ) {}

  // --- Öğrenci ---
  @Get()
  @RequirePermission(M, PermissionAction.VIEW)
  list(@Query() q: StudentListQuery) {
    return this.students.list(q);
  }

  @Get(':id')
  @RequirePermission(M, PermissionAction.VIEW)
  get(@Param('id') id: string) {
    return this.students.get(id);
  }

  @Post()
  @RequirePermission(M, PermissionAction.CREATE)
  create(@Body() dto: CreateStudentDto) {
    return this.students.create(dto);
  }

  @Patch(':id')
  @RequirePermission(M, PermissionAction.UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.students.update(id, dto);
  }

  @Patch(':id/status/:status')
  @RequirePermission(M, PermissionAction.UPDATE)
  setStatus(@Param('id') id: string, @Param('status') status: RecordStatus) {
    return this.students.setStatus(id, status);
  }

  @Delete(':id')
  @RequirePermission(M, PermissionAction.DELETE)
  remove(@Param('id') id: string) {
    return this.students.remove(id);
  }

  // --- Aktiviteler ---
  @Get(':id/activities')
  @RequirePermission(M, PermissionAction.VIEW)
  activityList(
    @Param('id') id: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.activities.list(
      id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  @Post(':id/activities')
  @RequirePermission(M, PermissionAction.CREATE)
  addActivity(@Param('id') id: string, @Body() dto: CreateActivityDto) {
    return this.activities.create(id, dto);
  }

  @Patch('activities/:actId')
  @RequirePermission(M, PermissionAction.UPDATE)
  updateActivity(@Param('actId') actId: string, @Body() dto: UpdateActivityDto) {
    return this.activities.update(actId, dto);
  }

  @Delete('activities/:actId')
  @RequirePermission(M, PermissionAction.DELETE)
  removeActivity(@Param('actId') actId: string) {
    return this.activities.remove(actId);
  }

  // --- Aktivite fotoğrafları (çoklu yükleme) ---
  @Get('activities/:actId/images')
  @RequirePermission(M, PermissionAction.VIEW)
  images(@Param('actId') actId: string) {
    return this.activities.listImages(actId);
  }

  @Post('activities/:actId/images')
  @RequirePermission(M, PermissionAction.UPDATE)
  @UseInterceptors(FilesInterceptor('images', 10, multerOptions('students')))
  addImages(
    @Param('actId') actId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.activities.addImages(actId, files);
  }

  @Delete('activities/images/:imageId')
  @RequirePermission(M, PermissionAction.DELETE)
  removeImage(@Param('imageId') imageId: string) {
    return this.activities.removeImage(imageId);
  }
}
