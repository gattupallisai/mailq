export class SendMailDto {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
}
