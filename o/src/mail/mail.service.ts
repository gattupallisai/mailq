import { and, eq } from 'drizzle-orm';
import { emails } from '../db/schema';
import { Database } from '../db/database';

class MailService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getInboxEmails(userId: number) {
    return await this.db.select()
      .from(emails)
      .where(and(
        eq(emails.userId, userId),
        eq(emails.isSent, false)
      ))
      .orderBy(emails.createdAt);
  }

  async getSentEmails(userId: number) {
    return await this.db.select()
      .from(emails)
      .where(and(
        eq(emails.userId, userId),
        eq(emails.isSent, true)
      ))
      .orderBy(emails.createdAt);
  }
}

export default MailService; 