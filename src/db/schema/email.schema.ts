import {pgTable,uuid,text,timestamp,boolean,jsonb,pgEnum} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from '../schema/users.schema'; // Make sure this is correctly imported
import { varchar } from 'drizzle-orm/pg-core'; // ✅ Correct for Postgres
import { randomUUID } from 'crypto';
export const folderEnum = pgEnum('folder', ['inbox', 'sent', 'trash', 'drafts']);

export const emails = pgTable('emails', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  sender_id: uuid('sender_id').notNull().references(() => users.id),
 sender_email: varchar('sender_email', { length: 255 }).notNull().references(() => users.email),
  to: jsonb('to').notNull(),
  cc: jsonb('cc'),
  bcc: jsonb('bcc'),
  subject: text('subject'),
  body: text('body'),
  is_draft: boolean('is_draft').default(false),
  is_deleted: boolean('is_deleted').default(false),
  is_archived: boolean('is_archived').default(false), 
  folder: folderEnum('folder').default('inbox'),
  starred: boolean('starred').default(false),
  read_by: jsonb('read_by').default(sql`'[]'::jsonb`),
  message_id: varchar('message_id', { length: 255 }).notNull().unique(),
thread_id: varchar('thread_id', { length: 255 }).notNull(),
parent_message_id: varchar('parent_message_id', { length: 255 }),

  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
  deleted_at: timestamp('deleted_at'),
});

