import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UserService } from './user.service';

@Controller('user')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Post('createuser')
  async create(@Body() body: any, @Req() req: Request) {
    const user = req.user as any; // JWT-decoded user
console.log(user.role);
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create users');
    }

    return this.userService.createUser(body, user.email); // pass admin email
  }
}
