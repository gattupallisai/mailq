// drizzle/schema/mailLogs.ts
import { pgTable, uuid, text, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const mailLogs = pgTable('mail_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  from: varchar('from', { length: 255 }).notNull(),  // ✅ Must exist
  to: jsonb('to').notNull(),     // string[] => stored as JSON
  cc: jsonb('cc').default(sql`'[]'::jsonb`),
  bcc: jsonb('bcc').default(sql`'[]'::jsonb`),

  subject: text('subject'),
  text: text('text').notNull(),
  html: text('html').notNull(),

  message_id: varchar('message_id', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
});
