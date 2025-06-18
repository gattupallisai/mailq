import { pgTable, serial, varchar, timestamp, text, boolean, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const emailAccounts = pgTable('email_accounts', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id),
  email: varchar('email', { length: 255 }).notNull(),
  appPassword: varchar('app_password', { length: 255 }).notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const emails = pgTable('emails', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => users.id),
  fromEmailId: integer('from_email_id').references(() => emailAccounts.id),
  subject: varchar('subject', { length: 255 }),
  to: text('to').notNull(),
  cc: text('cc'),
  bcc: text('bcc'),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  isSent: boolean('is_sent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}); 