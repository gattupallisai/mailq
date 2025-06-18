import { Controller, Post, Get, Body, UseGuards, Request, Param, Delete, Patch } from '@nestjs/common';
import { EmailAccountsService } from './email-accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('email-accounts')
@UseGuards(JwtAuthGuard)
export class EmailAccountsController {
  constructor(private emailAccountsService: EmailAccountsService) {}

  @Post()
  async addEmailAccount(
    @Request() req,
    @Body() data: { email: string; appPassword: string; isDefault?: boolean }
  ) {
    return this.emailAccountsService.addEmailAccount(
      req.user.id,
      data.email,
      data.appPassword,
      data.isDefault
    );
  }

  @Get()
  async getEmailAccounts(@Request() req) {
    return this.emailAccountsService.getEmailAccounts(req.user.id);
  }

  @Get('default')
  async getDefaultEmailAccount(@Request() req) {
    return this.emailAccountsService.getDefaultEmailAccount(req.user.id);
  }

  @Patch(':id/default')
  async setDefaultEmailAccount(
    @Request() req,
    @Param('id') emailAccountId: string
  ) {
    return this.emailAccountsService.setDefaultEmailAccount(
      req.user.id,
      parseInt(emailAccountId)
    );
  }

  @Delete(':id')
  async deleteEmailAccount(
    @Request() req,
    @Param('id') emailAccountId: string
  ) {
    return this.emailAccountsService.deleteEmailAccount(
      req.user.id,
      parseInt(emailAccountId)
    );
  }
} 