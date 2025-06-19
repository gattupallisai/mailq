import { Module } from '@nestjs/common';
import { EmailsService } from './email.services';
import { EmailsController } from './email.controller';
import { EmailsGateway } from './emails.gateway'; // <-- Make sure this is imported
@Module({
  providers: [EmailsService,EmailsGateway],
  controllers: [EmailsController],
  exports: [EmailsService], // Export if used outside this module
})
export class EmailModule {}
