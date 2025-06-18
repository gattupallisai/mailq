import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { db } from '../config/database.config';

@Module({
  providers: [UsersService, { provide: 'DB', useValue: db }],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {} 