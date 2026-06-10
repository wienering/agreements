import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export type SendEmailOptions = {
  to: string;
  cc?: string | string[];
  subject: string;
  html: string;
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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  return cachedTransporter;
}

/**
 * Send an HTML email via SMTP. Verifies the connection first, then sends with a 15s timeout.
 * Throws on failure (timeout, auth error, etc.) so callers can handle errors as before.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SMTPTransport.SentMessageInfo> {
  const transporter = getTransporter();

  await transporter.verify();

  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  if (options.cc) {
    mailOptions.cc = options.cc;
  }

  return Promise.race([
    transporter.sendMail(mailOptions),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout')), 15000),
    ),
  ]);
}
