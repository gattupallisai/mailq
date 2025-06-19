import { pgTable, uuid, varchar, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['admin', 'employee']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  email: varchar('email', { length: 255 }).unique().notNull(), 
  password: varchar('password', { length: 255 }).notNull(),
  firstname: varchar('firstname', { length: 100 }).notNull(),
  lastname: varchar('lastname', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  profilePicture: varchar('profile_picture', { length: 255 }),
  status: varchar('status', { length: 50 }),
  employee_id: varchar('employee_id', { length: 50 }).unique().notNull(),
  role: userRoleEnum('role').default('employee'),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
  deleted_at: timestamp('deleted_at'),
});
