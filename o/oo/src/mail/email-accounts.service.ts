import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { emailAccounts } from '../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class EmailAccountsService {
  constructor(@Inject('DB') private db: NodePgDatabase) {}

  async addEmailAccount(userId: number, email: string, appPassword: string, isDefault: boolean = false) {
    // Check if email already exists for this user
    const existing = await this.db.select()
      .from(emailAccounts)
      .where(and(
        eq(emailAccounts.userId, userId),
        eq(emailAccounts.email, email)
      ));

    if (existing.length > 0) {
      throw new ConflictException('Email account already exists');
    }

    // If this is set as default, unset any existing default
    if (isDefault) {
      await this.db.update(emailAccounts)
        .set({ isDefault: false })
        .where(and(
          eq(emailAccounts.userId, userId),
          eq(emailAccounts.isDefault, true)
        ));
    }

    const [account] = await this.db.insert(emailAccounts)
      .values({
        userId,
        email,
        appPassword,
        isDefault
      })
      .returning();

    return account;
  }

  async getEmailAccounts(userId: number) {
    return await this.db.select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId));
  }

  async getDefaultEmailAccount(userId: number) {
    const [account] = await this.db.select()
      .from(emailAccounts)
      .where(and(
        eq(emailAccounts.userId, userId),
        eq(emailAccounts.isDefault, true)
      ));
    
    if (!account) {
      throw new NotFoundException('No default email account found');
    }
    
    return account;
  }

  async setDefaultEmailAccount(userId: number, emailAccountId: number) {
    // First verify the email account belongs to the user
    const [account] = await this.db.select()
      .from(emailAccounts)
      .where(and(
        eq(emailAccounts.id, emailAccountId),
        eq(emailAccounts.userId, userId)
      ));

    if (!account) {
      throw new NotFoundException('Email account not found');
    }

    // Unset current default
    await this.db.update(emailAccounts)
      .set({ isDefault: false })
      .where(and(
        eq(emailAccounts.userId, userId),
        eq(emailAccounts.isDefault, true)
      ));

    // Set new default
    const [updated] = await this.db.update(emailAccounts)
      .set({ isDefault: true })
      .where(eq(emailAccounts.id, emailAccountId))
      .returning();

    return updated;
  }

  async deleteEmailAccount(userId: number, emailAccountId: number) {
    const [deleted] = await this.db.delete(emailAccounts)
      .where(and(
        eq(emailAccounts.id, emailAccountId),
        eq(emailAccounts.userId, userId)
      ))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Email account not found');
    }

    return deleted;
  }
} 