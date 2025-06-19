import { Controller, Post,Patch, Body,Param, UseGuards, Request, Get, Query,BadRequestException,UnauthorizedException } from '@nestjs/common';
import { EmailsService } from './email.services';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

@Post('create')
async create(@Body() body: any, @Request() req) {
  if (!body.to || !Array.isArray(body.to) || body.to.length === 0) {
    throw new BadRequestException('Recipient "to" field is required and must be a non-empty array');
  }
  if (!body.subject || typeof body.subject !== 'string' || !body.subject.trim()) {
    throw new BadRequestException('Subject is required and must be a non-empty string');
  }
  if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
    throw new BadRequestException('Body is required and must be a non-empty string');
  }

  console.log('JWT user:', req.user); // debug user object

  // Map JWT user object to { id } expected by service
  const user = { id: req.user.userId };

  return this.emailsService.create(body, user);
}

//   @Get('inbox')
//   async findUserInbox(@Request() req) {
//     return this.emailsService.getInbox(req.user);
//   }
@Get('inbox')
async findUserInbox(@Request() req) {
  const userEmail = req.user.email;
  if (!userEmail) {
    throw new UnauthorizedException('User email missing in token');
  }
  return this.emailsService.getInbox(userEmail);
}

@Get('drafts')
async findUserDrafts(@Request() req) {
  const userEmail = req.user.email;  // get email from JWT
  return this.emailsService.getDrafts(userEmail);
}

@Get('trash')
async findUserTrash(@Request() req) {
  const userEmail = req.user.email; // Extract email from JWT
  return this.emailsService.getTrash(userEmail);
}

@Get('search-users')
async searchUsers(@Query('query') query: string) {
  return this.emailsService.searchUsersByEmail(query);
}

@Patch('archive/:id')
async archiveEmail(@Param('id') id: string, @Request() req) {
  const userEmail = req.user.email;
  if (!userEmail) throw new UnauthorizedException('Missing user email in token');
  return this.emailsService.archiveEmail(id, userEmail);
}

@Get('archived')
async getArchivedEmails(@Request() req) {
  const userEmail = req.user.email;
  if (!userEmail) throw new UnauthorizedException('Missing user email in token');
  return this.emailsService.getArchivedEmails(userEmail);
}


@Get('sent')
async getSentEmails(@Request() req) {
  const userEmail = req.user?.email;
  if (!userEmail) {
    throw new UnauthorizedException('Missing user email in token');
  }

  return this.emailsService.getSentEmails(userEmail);
}


}
