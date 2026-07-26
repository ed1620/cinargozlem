import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, ActivityService],
})
export class StudentsModule {}
