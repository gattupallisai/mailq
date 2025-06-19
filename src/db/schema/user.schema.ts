import { pgTable, varchar, pgEnum } from 'drizzle-orm/pg-core';
export const domainEnum = pgEnum('domain', ['@camelq.in', '@camelq.com']);
export const user = pgTable('user', {
  id: varchar('id', { length: 36 }).primaryKey().notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  domain: domainEnum('domain').notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  personalGmail: varchar('personal_gmail', { length: 255 }).notNull(),
});
