import {Controller,Get,Post,Body,Param,Delete,Put,UseGuards,BadRequestException,Req} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OptionalJwtAuthGuard } from 'src/auth/OptionalJwtAuthGuard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
 @Post('register')
  @UseGuards(OptionalJwtAuthGuard)
  async register(@Body() body: any, @Req() req: any) {
    return this.usersService.createUser(body, req.user); // req.user is null for first user
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
