import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { db } from '../db/db.connection';
import { users } from '../db/schema/users.schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

async login(email: string, password: string) {
  // ✅ 1. Check if user exists in your database
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    throw new UnauthorizedException('User not found in database');
  }

  // ✅ 2. Try Gmail login with App Password
  const isValid = await this.verifyGmailSmtp(email, password);
  if (!isValid) {
    throw new UnauthorizedException('Invalid Gmail credentials');
  }

  // ✅ 3. Create JWT token with email and password (or encrypted password)
  const payload = { email, password,role:user.role }; // You can encrypt password if needed
  const access_token = this.jwtService.sign(payload);

  return {
    access_token,
    email,
    name: `${user.firstname} ${user.lastname}`,
    user_type: user.role,
  };
}


async verifyGmailSmtp(email: string, password: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: email, pass: password },
    });

    await transporter.verify(); // Try connecting
    return true;
  } catch {
    return false;
  }
}

}
