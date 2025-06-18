import { Controller, Post, Body, Get, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('register')
  async register(@Body() registerDto: { email: string; password: string }) {
    try {
      if (!registerDto.email || !registerDto.password) {
        throw new BadRequestException('Email and password are required');
      }
      return await this.usersService.create(registerDto.email, registerDto.password);
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new BadRequestException('Email already exists');
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return await this.usersService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('emails')
  async getUserEmails(@Request() req) {
    return await this.usersService.findByEmail(req.user.email);
  }
} 