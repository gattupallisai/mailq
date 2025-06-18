import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';
import mailConfig from '../config/mail.config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { emails, emailAccounts } from '../database/schema';
import { eq, and, like, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { EmailAccountsService } from './email-accounts.service';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  cc?: string | string[];
  bcc?: string | string[];
  userId: number;
  fromEmail?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

interface EmailMessage {
  id: number;
  subject: string;
  from: string;
  text: string;
  cc?: string;
  bcc?: string;
  isRead: boolean;
  createdAt: Date;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

interface EmailQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'subject' | 'from' | 'to';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class MailService {
  constructor(
    @Inject('DB') private db: NodePgDatabase,
    private emailAccountsService: EmailAccountsService
  ) {}

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateEmailList(emails: string | string[]): boolean {
    const emailList = Array.isArray(emails) ? emails : [emails];
    return emailList.every(email => this.validateEmail(email));
  }

  private async validateEmailAccount(userId: number, email: string) {
    const accounts = await this.emailAccountsService.getEmailAccounts(userId);
    const account = accounts.find(acc => acc.email === email);
    if (!account) {
      throw new NotFoundException(`Email account ${email} not found. Please add it first.`);
    }
    return account;
  }

  private createTransporter(email: string, password: string) {
    try {
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password
        },
        tls: {
          rejectUnauthorized: false // Only for development
        }
      });
    } catch (error) {
      throw new BadRequestException(`Failed to create email transporter: ${error.message}`);
    }
  }

  async sendEmail(options: EmailOptions) {
    try {
      // Validate email addresses
      if (!this.validateEmailList(options.to)) {
        throw new BadRequestException('Invalid recipient email address(es)');
      }
      if (options.cc && !this.validateEmailList(options.cc)) {
        throw new BadRequestException('Invalid CC email address(es)');
      }
      if (options.bcc && !this.validateEmailList(options.bcc)) {
        throw new BadRequestException('Invalid BCC email address(es)');
      }

      // Get email account
      let emailAccount;
      if (options.fromEmail) {
        emailAccount = await this.validateEmailAccount(options.userId, options.fromEmail);
      } else {
        try {
          emailAccount = await this.emailAccountsService.getDefaultEmailAccount(options.userId);
        } catch (error) {
          throw new BadRequestException('No email account specified and no default account found. Please either specify a fromEmail or set a default account.');
        }
      }

      // Create transporter and send email
      const transporter = this.createTransporter(emailAccount.email, emailAccount.appPassword);
      
      const mailOptions = {
        from: emailAccount.email,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        attachments: options.attachments
      };

      // Verify SMTP connection
      await transporter.verify();

      const info = await transporter.sendMail(mailOptions);
      
      // Save to database
      const [savedEmail] = await this.db.insert(emails).values({
        userId: options.userId,
        fromEmailId: emailAccount.id,
        subject: options.subject,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(',') : options.cc) : null,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc) : null,
        content: options.text,
        isSent: true,
      }).returning();

      return { 
        success: true, 
        messageId: info.messageId,
        emailId: savedEmail.id
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  async receiveEmails(userId: number) {
    try {
      const emailAccount = await this.emailAccountsService.getDefaultEmailAccount(userId);
      const imap = new Imap({
        ...mailConfig.imap,
        user: emailAccount.email,
        password: emailAccount.appPassword
      });

      return new Promise((resolve, reject) => {
        imap.once('ready', async () => {
          try {
            await imap.openBox('INBOX', false);
            const fetch = imap.seq.fetch(`${Math.max(1, imap.mailbox.messages.total - 10)}:*`, {
              bodies: '',
              struct: true,
            });

            const emailMessages: EmailMessage[] = [];
            
            fetch.on('message', (msg) => {
              msg.on('body', async (stream) => {
                try {
                  const parsed = await simpleParser(stream);
                  const emailMessage: EmailMessage = {
                    id: 0,
                    subject: parsed.subject || '',
                    from: parsed.from?.text || '',
                    text: parsed.text || '',
                    cc: parsed.cc?.text,
                    bcc: parsed.bcc?.text,
                    isRead: false,
                    createdAt: parsed.date || new Date(),
                    attachments: parsed.attachments?.map(att => ({
                      filename: att.filename,
                      contentType: att.contentType,
                      size: att.size
                    }))
                  };

                  const [savedEmail] = await this.db.insert(emails).values({
                    userId,
                    subject: emailMessage.subject,
                    to: parsed.to?.text || '',
                    cc: emailMessage.cc,
                    bcc: emailMessage.bcc,
                    content: emailMessage.text,
                    isRead: false,
                  }).returning();

                  emailMessage.id = savedEmail.id;
                  emailMessages.push(emailMessage);
                } catch (error) {
                  console.error('Error processing email:', error);
                }
              });
            });

            fetch.once('error', (err) => {
              reject(new BadRequestException(`IMAP fetch error: ${err.message}`));
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emailMessages);
            });
          } catch (error) {
            reject(new BadRequestException(`IMAP error: ${error.message}`));
          }
        });

        imap.once('error', (err) => {
          reject(new BadRequestException(`IMAP connection error: ${err.message}`));
        });

        imap.connect();
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to receive emails: ${error.message}`);
    }
  }

  private buildEmailQuery(userId: number, isSent: boolean, params: EmailQueryParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    let conditions = [
      eq(emails.userId, userId),
      eq(emails.isSent, isSent)
    ];

    if (params.search) {
      conditions.push(
        sql`(${emails.subject} ILIKE ${'%' + params.search + '%'} OR 
            ${emails.content} ILIKE ${'%' + params.search + '%'} OR 
            ${emails.to} ILIKE ${'%' + params.search + '%'})`
      );
    }

    if (params.startDate) {
      conditions.push(gte(emails.createdAt, new Date(params.startDate)));
    }
    if (params.endDate) {
      conditions.push(lte(emails.createdAt, new Date(params.endDate)));
    }

    const query = this.db.select({
      id: emails.id,
      subject: emails.subject,
      to: emails.to,
      cc: emails.cc,
      bcc: emails.bcc,
      content: emails.content,
      isRead: emails.isRead,
      createdAt: emails.createdAt,
      fromEmail: emailAccounts.email
    })
    .from(emails)
    .leftJoin(emailAccounts, eq(emails.fromEmailId, emailAccounts.id))
    .where(and(...conditions));

    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    
    if (sortField === 'createdAt') {
      query.orderBy(sortOrder === 'desc' ? desc(emails.createdAt) : asc(emails.createdAt));
    } else if (sortField === 'subject') {
      query.orderBy(sortOrder === 'desc' ? desc(emails.subject) : asc(emails.subject));
    } else if (sortField === 'from') {
      query.orderBy(sortOrder === 'desc' ? desc(emailAccounts.email) : asc(emailAccounts.email));
    } else if (sortField === 'to') {
      query.orderBy(sortOrder === 'desc' ? desc(emails.to) : asc(emails.to));
    }

    query.limit(limit).offset(offset);

    return query;
  }

  async getInboxEmails(userId: number, params: EmailQueryParams = {}) {
    try {
      const query = this.buildEmailQuery(userId, false, params);
      
      const countQuery = this.db.select({ count: sql<number>`count(*)` })
        .from(emails)
        .where(and(
          eq(emails.userId, userId),
          eq(emails.isSent, false)
        ));

      const [emailResults, totalCount] = await Promise.all([
        query,
        countQuery.then(result => result[0].count)
      ]);

      return {
        emails: emailResults,
        pagination: {
          total: totalCount,
          page: params.page || 1,
          limit: params.limit || 20,
          totalPages: Math.ceil(totalCount / (params.limit || 20))
        }
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get inbox emails: ${error.message}`);
    }
  }

  async getSentEmails(userId: number, params: EmailQueryParams = {}) {
    try {
      const query = this.buildEmailQuery(userId, true, params);
      
      const countQuery = this.db.select({ count: sql<number>`count(*)` })
        .from(emails)
        .where(and(
          eq(emails.userId, userId),
          eq(emails.isSent, true)
        ));

      const [emailResults, totalCount] = await Promise.all([
        query,
        countQuery.then(result => result[0].count)
      ]);

      return {
        emails: emailResults,
        pagination: {
          total: totalCount,
          page: params.page || 1,
          limit: params.limit || 20,
          totalPages: Math.ceil(totalCount / (params.limit || 20))
        }
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get sent emails: ${error.message}`);
    }
  }

  async markAsRead(emailId: number, userId: number) {
    try {
      const [updated] = await this.db.update(emails)
        .set({ isRead: true })
        .where(and(
          eq(emails.id, emailId),
          eq(emails.userId, userId)
        ))
        .returning();

      if (!updated) {
        throw new NotFoundException('Email not found or not authorized');
      }

      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to mark email as read: ${error.message}`);
    }
  }

  async deleteEmail(emailId: number, userId: number) {
    try {
      const [deleted] = await this.db.delete(emails)
        .where(and(
          eq(emails.id, emailId),
          eq(emails.userId, userId)
        ))
        .returning();

      if (!deleted) {
        throw new NotFoundException('Email not found or not authorized');
      }

      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete email: ${error.message}`);
    }
  }
}
