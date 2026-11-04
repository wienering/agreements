import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export type SendEmailOptions = {
  to: string;
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
};

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP not configured');
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // The mail server is sometimes slow to answer connections from Vercel; give it room.
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });
  }

  return cachedTransporter;
}

const RETRYABLE_CODES = new Set(['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNRESET']);

function isRetryable(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return Boolean(code && RETRYABLE_CODES.has(code)) || (error instanceof Error && error.message === 'Email send timeout');
}

/**
 * Send an HTML email via SMTP. One connection per send (no separate verify step), a 60s cap,
 * and one retry on a fresh connection when the server times out or drops the connection.
 * Throws on failure so callers can handle errors as before.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SMTPTransport.SentMessageInfo> {
  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };
  if (options.text) mailOptions.text = options.text;
  if (options.cc) mailOptions.cc = options.cc;

  const attempt = () =>
    Promise.race([
      getTransporter().sendMail(mailOptions),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Email send timeout')), 60000)),
    ]);

  try {
    return await attempt();
  } catch (error) {
    if (!isRetryable(error)) throw error;
    console.warn('[email] send failed, retrying once on a new connection:', (error as Error).message);
    cachedTransporter?.close();
    cachedTransporter = null;
    return attempt();
  }
}
