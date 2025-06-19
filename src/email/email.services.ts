import {Injectable,UnauthorizedException,BadRequestException,Inject,} from '@nestjs/common';
import { db } from '../db/db.connection';
import { emails } from '../db/schema/email.schema';
import { sql, desc, eq, and, inArray } from 'drizzle-orm';
import { users } from 'src/db/schema';
import { EmailsGateway } from './emails.gateway'; // Adjust path if needed


@Injectable()
export class EmailsService {
  constructor(
    private readonly gateway: EmailsGateway, // Inject EmailsGateway
  ) {}

 async create(data: any, user: { id: string }) {
  if (!user?.id) {
    throw new UnauthorizedException('User ID missing in request');
  }

  // Step 1: Validate "to" emails exist in users table
  const toEmails: string[] = data.to;

  const matchedUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.email, toEmails));

  const matchedEmails = matchedUsers.map((u) => u.email);
  const missingEmails = toEmails.filter(
    (email) => !matchedEmails.includes(email),
  );

  if (missingEmails.length > 0) {
    throw new BadRequestException(
      `The following email addresses were not found: ${missingEmails.join(', ')}`,
    );
  }

  // Step 2: Fetch sender email (before insert)
  const [sender] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, user.id));

  if (!sender) {
    throw new UnauthorizedException('Sender not found');
  }

  // Step 3: Insert email with sender_email
 const [inserted] = await db
  .insert(emails)
  .values({
    sender_id: user.id,
    message_id: crypto.randomUUID(), // or another method of generation
    thread_id: data.thread_id || crypto.randomUUID(), // set from input or generate
    sender_email: sender.email,
    to: data.to,
    cc: data.cc || [],
    bcc: data.bcc || [],
    subject: data.subject,
    body: data.body,
    folder: data.folder ?? 'inbox',
    is_draft: data.is_draft ?? false,
    is_deleted: data.is_deleted ?? false,
    is_archived: false,
    starred: data.starred ?? false,
    read_by: [],
  })
  .returning();


  const allRecipients = [
  ...(data.to || []),
  ...(data.cc || []),
  ...(data.bcc || []),
];

if (!data.is_draft) {
  this.gateway.notifyMultipleUsers(
    allRecipients,
    'new_email',
    inserted
  );
}

  // Step 5: Return full response with sender_email
  return {
  
    ...inserted,
  };
}

  async getInbox(userEmail: string) {
    const result = await db
      .select({
        sender_email: users.email,
        subject: emails.subject,
        body: emails.body,
      })
      .from(emails)
      .innerJoin(users, eq(emails.sender_id, users.id))
      .where(sql`
        (
          ${emails.to}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
          ${emails.cc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
          ${emails.bcc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb
        )
        AND ${emails.is_draft} = false
        AND ${emails.is_deleted} = false
      `)
      .orderBy(desc(emails.created_at));

    return result;
  }

  async getDrafts(senderEmail: string) {
    const result = await db
      .select({
        to: emails.to,
        cc: emails.cc,
        bcc: emails.bcc,
        subject: emails.subject,
        body: emails.body,
        created_at: emails.created_at,
        sender_email: users.email,
      })
      .from(emails)
      .innerJoin(users, eq(emails.sender_id, users.id))
      .where(
        and(
          eq(users.email, senderEmail),
          eq(emails.is_draft, true),
          eq(emails.is_deleted, false),
        ),
      )
      .orderBy(desc(emails.created_at));

    return result;
  }

  async getTrash(userEmail: string) {
    const result = await db
      .select({
        sender_email: users.email,
        subject: emails.subject,
        body: emails.body,
        created_at: emails.created_at,
      })
      .from(emails)
      .innerJoin(users, eq(emails.sender_id, users.id))
      .where(sql`
        (
          ${emails.to}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
          ${emails.cc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
          ${emails.bcc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb
        )
        AND ${emails.is_deleted} = true
      `)
      .orderBy(desc(emails.created_at));

    return result;
  }

  async searchUsersByEmail(query: string) {
    if (!query || query.trim() === '') return [];

    return await db
      .select({
        id: users.id,
        email: users.email,
        firstname: users.firstname,
        lastname: users.lastname,
      })
      .from(users)
      .where(sql`
        ${users.email} ILIKE ${`%${query}%`} OR
        (${users.firstname} || ' ' || ${users.lastname}) ILIKE ${`%${query}%`}
      `)
      .limit(10);
  }

  async archiveEmail(id: string, userEmail: string) {
  // Ensure the user has access to the email before archiving
  const result = await db
    .update(emails)
    .set({ is_archived: true })
    .where(
      sql`
        ${emails.id} = ${id} AND (
          ${emails.to}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
          ${emails.cc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
          ${emails.bcc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb
        )
      `
    )
    .returning();

 if (!result.length) {
  throw new UnauthorizedException('You are not authorized to archive this email.');
}

await this.gateway.notifyUser(
  userEmail,
  'email_archived',
  { email_id: id }
);

return { message: 'Email archived successfully' };

}

async getArchivedEmails(userEmail: string) {
  const result = await db
    .select({
      sender_email: users.email,
      subject: emails.subject,
      body: emails.body,
      created_at: emails.created_at,
    })
    .from(emails)
    .innerJoin(users, eq(emails.sender_id, users.id))
    .where(sql`
      (
        ${emails.to}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
        ${emails.cc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb OR
        ${emails.bcc}::jsonb @> ${JSON.stringify([userEmail])}::jsonb
      )
      AND ${emails.is_archived} = true
      AND ${emails.is_deleted} = false
    `)
    .orderBy(desc(emails.created_at));

  return result;
}
async getSentEmails(userEmail: string) {
  const result = await db
    .select({
      subject: emails.subject,
      body: emails.body,
      to: emails.to,
      cc: emails.cc,
      bcc: emails.bcc,
      created_at: emails.created_at,
    })
    .from(emails)
    .innerJoin(users, eq(emails.sender_id, users.id))
    .where(sql`
      ${users.email} = ${userEmail}
      AND ${emails.is_draft} = false
      AND ${emails.is_deleted} = false
      AND ${emails.is_archived} = false
    `)
    .orderBy(desc(emails.created_at));

  // Add sender email (from JWT)
  return result.map(email => ({
    ...email,
    from: userEmail,
  }));
}



}
