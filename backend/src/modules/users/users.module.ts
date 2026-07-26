import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [RolesController, UsersController],
  providers: [RolesService, UsersService],
  exports: [RolesService, UsersService],
})
export class UsersModule {}
