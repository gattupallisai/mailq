import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { EmailAccountsController } from './email-accounts.controller';
import { EmailAccountsService } from './email-accounts.service';
import { db } from '../config/database.config';

@Module({
  providers: [
    MailService,
    EmailAccountsService,
    { provide: 'DB', useValue: db }
  ],
  controllers: [MailController, EmailAccountsController],
  exports: [MailService, EmailAccountsService],
})
export class MailModule {}
