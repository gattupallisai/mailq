import { Controller, Post, Get, Body, UseGuards, Request, Param, Patch, Delete, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('mail')
@UseGuards(JwtAuthGuard)
export class MailController {
  constructor(private mailService: MailService) {}

  @Post('send')
  @UseInterceptors(FilesInterceptor('attachments', 5, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
      }
    })
  }))
  async sendEmail(
    @Request() req,
    @Body() emailData: {
      to: string | string[];
      subject: string;
      text: string;
      cc?: string | string[];
      bcc?: string | string[];
      fromEmail?: string;
    },
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    const attachments = files?.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }));

    return this.mailService.sendEmail({
      ...emailData,
      userId: req.user.id,
      attachments
    });
  }

  @Get('receive')
  async receiveEmails(@Request() req) {
    return this.mailService.receiveEmails(req.user.id);
  }

  @Get('inbox')
  async getInboxEmails(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'subject' | 'from' | 'to',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.mailService.getInboxEmails(req.user.id, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });
  }

  @Get('sent')
  async getSentEmails(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'subject' | 'from' | 'to',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.mailService.getSentEmails(req.user.id, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });
  }

  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') emailId: string) {
    return this.mailService.markAsRead(parseInt(emailId), req.user.id);
  }

  @Delete(':id')
  async deleteEmail(@Request() req, @Param('id') emailId: string) {
    return this.mailService.deleteEmail(parseInt(emailId), req.user.id);
  }
}
