import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { MailModule } from './mail/mail.module';
import { UserModule } from './user/user.module';


@Module({
  imports: [AuthModule,UsersModule,EmailModule,MailModule,UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
