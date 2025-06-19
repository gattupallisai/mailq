import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { db } from '../db/db.connection';
import { user } from '../db/schema/user.schema';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { and, eq } from 'drizzle-orm';
import { users } from 'src/db/schema'; // Admin users table

@Injectable()
export class UserService {
  async createUser(body: any, adminEmail: string) {
    const { full_name, domain, password, personal_gmail } = body;

    try {
      // ✅ Validate admin
      const [admin] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, adminEmail),
            eq(users.role, 'admin')
          )
        );

      if (!admin) {
        throw new Error('Access denied: Admin not found or not authorized');
      }

      // ✅ Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // ✅ Create user
      await db.insert(user).values({
        id: uuidv4(),
        fullName: full_name,
        domain,
        password: hashedPassword,
        personalGmail: personal_gmail,
      });

      // ✅ Send confirmation email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: adminEmail,
          pass: admin.password, // NOTE: Ensure this is a Gmail app password
        },
      });

      await transporter.sendMail({
  from: adminEmail,
  to: personal_gmail,
  subject: 'User Registered',
  text: `Hello ${full_name},

You have been successfully registered.

Your login credentials are:
Full Name: ${full_name}
Email: ${full_name}${domain}
Password: ${password}

Thank you,
Admin Team`,
});


      // ✅ Return response
      return {
        message: 'User created and email sent',
        fullName: full_name,
        domain: domain,
        password: password,
      };

    } catch (err) {
      console.error('Create user error:', err);
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}
