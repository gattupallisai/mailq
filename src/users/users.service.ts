import { Injectable,BadRequestException,UnauthorizedException } from '@nestjs/common';
import { db } from '../db/db.connection';
import { users } from '../db/schema/users.schema';
import { eq ,sql} from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  async countUsers() {
    const result = await db.select().from(users);
    return result.length;
  }

async createUser(
  data: typeof users.$inferInsert,
  decodedUser?: { role: string } // optional: undefined for first user
) {
  // ✅ Email validation
  if (!data.email.endsWith('@camelq.in')) {
    throw new BadRequestException('Email must end with @camelq.in');
  }

  const existingUsers = await db.select().from(users).limit(1);

  // ✅ First user: create as admin
  if (existingUsers.length === 0) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [inserted] = await db
      .insert(users)
      .values({
        ...data,
        password: hashedPassword,
        role: 'admin',
      })
      .returning();
    return inserted;
  }

  // ✅ All others: only admins can create
  if (!decodedUser || decodedUser.role !== 'admin') {
    throw new UnauthorizedException('Only admins can create new users');
  }

  // ✅ Duplicate check
  const duplicates = await db
    .select({
      id: users.id,
      email: users.email,
      firstname: users.firstname,
      lastname: users.lastname,
      employee_id: users.employee_id,
      displayName: users.displayName,
    })
    .from(users)
    .where(sql`
      ${users.email} = ${data.email} OR
      ${users.employee_id} = ${data.employee_id} OR
      (${users.firstname} = ${data.firstname} AND ${users.lastname} = ${data.lastname}) OR
      ${users.displayName} = ${data.displayName}
    `);

  if (duplicates.length > 0) {
    const reasons: string[] = [];

    for (const user of duplicates) {
      if (user.email === data.email) reasons.push('email');
      if (user.employee_id === data.employee_id) reasons.push('employee ID');
      if (
        user.firstname === data.firstname &&
        user.lastname === data.lastname
      ) {
        reasons.push('first name + last name');
      }
      if (user.displayName === data.displayName) reasons.push('display name');
    }

    const uniqueReasons = [...new Set(reasons)];

    throw new BadRequestException(
      `User already exists with the same ${uniqueReasons.join(', ')}.`
    );
  }

  // ✅ Create as employee
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const [inserted] = await db
    .insert(users)
    .values({
      ...data,
      password: hashedPassword,
      role: 'employee',
    })
    .returning();

  return inserted;
}


  async findAll() {
    return await db.select().from(users);
  }

  async findOne(id: string) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    const updated = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated[0];
  }

  async delete(id: string) {
    return await db.delete(users).where(eq(users.id, id)).returning();
  }
}
