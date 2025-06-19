import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { decrypt } from '../utils/crypto.util';
import { db } from '../db/db.connection';
import { mailLogs } from '../db/schema/mail.schema';
import { SendMailDto } from '../db/dtos/send-mail.dto';
import { simpleParser } from 'mailparser';
import { eq ,asc} from 'drizzle-orm';
import { emails } from 'src/db/schema';

export type ThreadMessage = {
  subject: string;
  from: string;
  date: Date;
  body: string;
  attachments: {
    filename: string;
    contentType: string;
    size: number;
  }[];
  messageId: string;
  threadId: string;
  parentMessageId: string | null;
  replies: ThreadMessage[];
};
interface GmailMessage {
  envelope: {
    messageId?: string;
    subject?: string;
    date?: Date;
    from?: { name?: string; address?: string }[];
    inReplyTo?: string[];
    references?: string[];
  };
  gmailThreadId?: BigInt | string;
}

@Injectable()
export class MailService {
  /**
   * Sends an email using the provided SMTP configuration.
   * Falls back to .env credentials if user object is not provided.
   * 
   * @param user Optional user object containing encrypted email credentials.
   * @param dto SendMailDto object containing recipient info and email content.
   * @returns Object with success status and message ID.
   */
//  async sendMail(data: any, user: { email: string; password: string }) {
//   try {
//     console.log('SMTP User:', user.email);
//     console.log('SMTP Pass:', user.password); 
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: user.email,
//         pass: user.password,
//       },
//     });

//     const info = await transporter.sendMail({
//       from: user.email,
//       to: data.to,
//       cc: data.cc || [],
//       bcc: data.bcc || [],
//       subject: data.subject,
//       text: data.text || '',
//       html: data.html || '',
//       attachments: data.attachments || [],
//     });

//     await db.insert(mailLogs).values({
//       from: user.email,
//       to: data.to,
//       cc: data.cc || [],
//       bcc: data.bcc || [],
//       subject: data.subject,
//       text: data.text || '',
//       html: data.html || '',
//       message_id: info.messageId,
//     });

//     return { success: true, messageId: info.messageId };
//   } catch (error) {
//     console.error('Send mail failed:', error);
//     throw new InternalServerErrorException('Failed to send email');
//   }
// }
async sendMail(data: any, user: { email: string; password: string }) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.email,
        pass: user.password,
      },
       tls: {
    rejectUnauthorized: false, // <- Add this
  },
    });

    const info = await transporter.sendMail({
      from: user.email,
      to: data.to,
      cc: data.cc || [],
      bcc: data.bcc || [],
      subject: data.subject,
      text: data.text || '',
      html: data.html || '',
      attachments: data.attachments || [],
   headers: {
  ...(data.inReplyTo && { 'In-Reply-To': data.inReplyTo }),
  ...(data.references && {
    References: Array.isArray(data.references)
      ? data.references.join(' ')
      : data.references,
  }),
},
    });

    return {
      success: true,
      messageId: info.messageId,
      inReplyTo: data.inReplyTo || null,
      references: data.references || [],
    };
  } catch (error) {
    console.error('Send mail failed:', error);
    throw new InternalServerErrorException('Failed to send email');
  }
}
  /**
   * Retrieves the latest 10 emails from the inbox using IMAP.
   * Uses static credentials from environment variables.
   * 
   * @returns Array of simplified message objects (subject, from, date).
   */

// async getInbox(user: { email: string; password: string }) {
//   const client = new ImapFlow({
//     host: 'imap.gmail.com',
//     port: 993,
//     secure: true,
//     auth: {
//       user: user.email,
//       pass: user.password,
//     },
//   });

//   const messages: {
//     subject: string;
//     from: string;
//     date: Date;
//     body: string;
//     attachments: {
//       filename: string;
//       contentType: string;
//       size: number;
//     }[];
//   }[] = [];

//   try {
//     await client.connect();
//     const lock = await client.getMailboxLock('INBOX');

//     try {
//       // Get message sequence numbers
//       const messageList = await client.search({ seen: false });
//       const latest10 = messageList.slice(-10);

//       for await (const msg of client.fetch(latest10, {
//         envelope: true,
//         source: true,
//       })) {
//         const parsed = await simpleParser(msg.source);

//         messages.push({
//           subject: msg.envelope.subject || '(No Subject)',
//           from: msg.envelope.from?.[0]?.address || 'Unknown',
//           date: msg.envelope.date || new Date(),
//         body: parsed.text || parsed.html || '(No Content)',
//           attachments: parsed.attachments.map((att) => ({
//             filename: att.filename || 'unknown',
//             contentType: att.contentType,
//             size: att.size,
//           })),
//         });
//       }
//     } finally {
//       lock.release();
//     }
//   } catch (err) {
//     console.error('IMAP error:', err);
//     throw new InternalServerErrorException('Failed to fetch inbox');
//   } finally {
//     await client.logout();
//   }

//   return messages.reverse();
// }
async getInbox(user: { email: string; password: string }) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: user.email,
      pass: user.password,
    },
     logger: false,
  });

  const messages: {
    subject: string;
    from: string;
    date: Date;
    body: string;
    attachments: {
      filename: string;
      contentType: string;
      size: number;
    }[];
    messageId: string;
    parentMessageId: string | null;
    references: string | null;
    threadId: string;
  }[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const messageList = await client.search({ all: true });
      const latest10 = messageList.slice(-5);

    for await (const msg of client.fetch(latest10, {
  envelope: true,
  source: true,
  uid: true,
  flags: true,
  gmailThreadId: true,
   // ✅ this gives the actual Gmail thread ID!
})) {
  console.log('gmailThreadId:', msg.gmailThreadId);

        const parsed = await simpleParser(msg.source);

        const messageId = msg.envelope.messageId;
       const inReplyTo = Array.isArray(msg.envelope.inReplyTo)? msg.envelope.inReplyTo[0]: msg.envelope.inReplyTo;
        const references = Array.isArray(msg.envelope.references)? msg.envelope.references[0]: msg.envelope.references;

         const parentMessageId = inReplyTo || null;
      const fallbackThreadId = msg.gmailThreadId?.toString()
  || references
  || parentMessageId
  || messageId;
        messages.push({
          subject: msg.envelope.subject || '(No Subject)',
          from: msg.envelope.from?.[0]?.address || 'Unknown',
          date: msg.envelope.date || new Date(),
          body: parsed.text || parsed.html || '(No Content)',
          attachments: parsed.attachments.map((att) => ({
            filename: att.filename || 'unknown',
            contentType: att.contentType,
            size: att.size,
          })),
          messageId,
          parentMessageId,
          references: references || null,
          threadId: fallbackThreadId,
          
        });
      }
      
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('IMAP error:', err);
    throw new InternalServerErrorException('Failed to fetch inbox');
  } finally {
    await client.logout();
  }

  return messages.reverse();
}


async getThread(threadId: string, user: { email: string; password: string }) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: user.email,
      pass: user.password,
    },
  });

  const threadMessages: ThreadMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const messageList = await client.search(['ALL']);

     for await (const msg of client.fetch(messageList, {
  envelope: true,
  source: true,
  gmailThreadId: true,
})) {
  const parsed = await simpleParser(msg.source);
  const gmailThreadId = msg.gmailThreadId?.toString(); // ✅ Do NOT overwrite function param
  const messageId = msg.envelope.messageId;
  const inReplyTo = msg.envelope.inReplyTo?.[0] || null;

  // ✅ Correct thread comparison
  if (gmailThreadId === threadId) {
    threadMessages.push({
      subject: msg.envelope.subject || '(No Subject)',
      from: msg.envelope.from?.[0]?.address || 'Unknown',
      date: msg.envelope.date || new Date(),
      body: parsed.text || parsed.html || '(No Content)',
      attachments: parsed.attachments.map((att) => ({
        filename: att.filename || 'unknown',
        contentType: att.contentType,
        size: att.size,
      })),
      messageId,
      threadId: gmailThreadId,
      parentMessageId: inReplyTo,
      replies: [],
    });
  }
}

    } finally {
      lock.release();
    }
  } catch (err) {
    console.error('IMAP error:', err);
    throw new InternalServerErrorException('Failed to fetch thread messages');
  } finally {
    await client.logout();
  }

  // Organize replies
  const messageMap = new Map<string, ThreadMessage>();
  const rootMessages: ThreadMessage[] = [];

  for (const msg of threadMessages) {
    messageMap.set(msg.messageId, msg);
  }

  for (const msg of threadMessages) {
    if (msg.parentMessageId && messageMap.has(msg.parentMessageId)) {
      messageMap.get(msg.parentMessageId)!.replies.push(msg);
    } else {
      rootMessages.push(msg);
    }
  }

  return {
    threadId,
    messages: rootMessages,
  };


}


async replyToMessage(
  messageId: string,
  data: { subject: string; text?: string; html?: string },
  user: { email: string; password: string }
) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: user.email,
      pass: user.password,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    let latestMessage: GmailMessage | null = null;

    try {
      const messages = await client.search({ all: true });

      if (!messages.length) {
        throw new Error('No messages found in inbox');
      }

      // Ensure messageId is wrapped with < >
      const cleanMessageId = messageId.startsWith('<') && messageId.endsWith('>')
        ? messageId
        : `<${messageId}>`;

      for await (const msg of client.fetch(messages, {
        envelope: true,
        gmailThreadId: true,
      }) as AsyncIterable<GmailMessage>) {
       const inReplyTo = msg.envelope.inReplyTo ?? '';
const references = msg.envelope.references ?? [];

if (
  references.includes(cleanMessageId) ||
  inReplyTo === cleanMessageId ||
  msg.envelope.messageId === cleanMessageId
)
 {
          if (
            !latestMessage ||
            (msg.envelope.date && msg.envelope.date > (latestMessage.envelope.date ?? new Date(0)))
          ) {
            latestMessage = msg;
          }
        }
      }

      if (!latestMessage) {
        throw new Error(`Message with ID ${cleanMessageId} not found`);
      }

      const inReplyTo = latestMessage.envelope.messageId!;
      const references = Array.from(
        new Set([
          ...(latestMessage.envelope.references || []),
          inReplyTo,
        ])
      );

      const recipientEmail = latestMessage.envelope.from?.[0]?.address;
      if (!recipientEmail) throw new Error('Original sender not found.');

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: user.email,
          pass: user.password,
        },
        
      });

      const info = await transporter.sendMail({
        from: user.email,
        to: recipientEmail,
        subject: latestMessage.envelope.subject?.startsWith('Re:')
          ? latestMessage.envelope.subject
          : `Re: ${latestMessage.envelope.subject}`,
        text: data.text || '',
        html: data.html || '',
        inReplyTo,
        references,
        headers: {
          'In-Reply-To': inReplyTo,
          'References': references.join(' '),
        }
      });

      console.log('✅ Reply sent with headers:', {
        to: recipientEmail,
        inReplyTo,
        references,
        subject: latestMessage.envelope.subject,
      });

      return {
        success: true,
        sentTo: recipientEmail,
        messageId: info.messageId,
        repliedTo: inReplyTo,
        references,
      };

    } finally {
      lock.release();
    }

  } catch (error) {
    console.error('❌ Error replying to message:', error.message);
    throw new InternalServerErrorException('Failed to reply to message');
  } finally {
    await client.logout();
  }
}

async forwardEmail(
  messageId: string,
  {
    email,
    password,
    to,
  }: {
    email: string;
    password: string;
    to: string;
  },
) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: password,
    },
    logger: false,
  });

  try {
    await client.connect();

    // Use All Mail for better results
    await client.mailboxOpen('[Gmail]/All Mail');

    messageId = decodeURIComponent(messageId).replace(/^<|>$/g, '');
    console.log('🔍 Normalized Message-ID:', messageId);

    const uids = await client.search({ all: true });

    let matchedUID: number | null = null;

    for (const uid of uids) {
      const msg = await client.fetchOne(uid, { envelope: true });
      const currentMsgId = msg.envelope?.messageId?.replace(/^<|>$/g, '');

      if (currentMsgId === messageId) {
        matchedUID = uid;
        console.log('✅ Match found at UID:', uid);
        break;
      }
    }

    if (!matchedUID) {
      throw new Error('Message not found by scanning envelope');
    }

    // Now fetch full message
    const message = await client.fetchOne(matchedUID, {
      envelope: true,
      source: true,
    });

    if (!message?.source) {
      throw new Error('Failed to retrieve message source');
    }

    const fromObj = message.envelope.from[0];
    const fromEmail = `${fromObj.name || ''} <${fromObj.address}>`;
    const subject = `Fwd: ${message.envelope.subject || 'Email Message'}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text: 'Forwarded message is attached.',
      attachments: [
        {
          filename: 'forwarded.eml',
          content: message.source,
        },
      ],
    });

    return { message: 'Mail forwarded successfully using envelope scan' };
  } catch (err) {
    console.error('❌ Error forwarding mail:', err.message);
    throw new InternalServerErrorException(err.message);
  } finally {
    await client.logout();
  }
}


}