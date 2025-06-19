// import { Controller, Post, Body, Get } from '@nestjs/common';
// import { MailService } from './mail.service';
// import { SendMailDto } from '../db/dtos/send-mail.dto';

// @Controller('mail')
// export class MailController {
//   constructor(private readonly mailService: MailService) {}

// @Post('send')
// async send(@Body() dto: SendMailDto) {
//   return this.mailService.sendMail(dto);
// }


  
//   @Get('inbox') // or @Post if you still prefer POST
// async inbox() {
//   return this.mailService.getInbox();
// }

// }
// // @Post('inbox') // Change to POST to accept body
//   // async inbox(@Body() dto: { email: string; password: string }) {
//   //   return this.mailService.getInbox(dto);
//   // }
import { Controller, Post, Body, Get, UseGuards, Req ,Param} from '@nestjs/common';
import { MailService,ThreadMessage } from './mail.service';
import { JwtAuthGuard } from '../auth/jwt.guard'; // import your guard
import { Request } from 'express';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}
// @UseGuards(JwtAuthGuard)
@Post('send')
async send(@Body() data: any, @Req() req: Request) {
 // const user = req.user as { email: string; password: string };
 const user= {email : "adi.penumarthi@gmail.com",password: "dukp ushi ubdz wlsd" }
  return this.mailService.sendMail(data, user);
}

//@UseGuards(JwtAuthGuard)
@Get('inbox')
async inbox(@Req() req: Request) {
  // const user = req.user as { email: string; password: string };
  const user= {email : "adi.penumarthi@gmail.com",password: "dukp ushi ubdz wlsd" }
  return this.mailService.getInbox(user);
}

@UseGuards(JwtAuthGuard)
@Get('thread/:threadId')
async getThread(@Param('threadId') threadId: string, @Req() req: Request) {
  // const user = req.user as { email: string; password: string };
  const user= {email : "adi.penumarthi@gmail.com",password: "dukp ushi ubdz wlsd" }
  return this.mailService.getThread(threadId, user);
}


@Post('reply/:messageId')
async replyToMessage(
  @Param('messageId') messageId: string,
  @Body() body: any
) {
  const { email, password, subject, text, html } = body;

  const user = { email, password };
  const data = { subject, text, html };

  return this.mailService.replyToMessage(messageId, data, user);
}

@Post('forward/:messageId')
  async forwardMail(
    @Param('messageId') messageId: string,
    @Body()
    body: {
      to: string;
      email: string;
      password: string;
    },
  ) {
    return this.mailService.forwardEmail(messageId, body);
  }

}
