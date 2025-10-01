import type { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import nodemailer from 'nodemailer';
import { prisma } from './prisma';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      from: process.env.SMTP_FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        if (identifier.toLowerCase() !== (process.env.ADMIN_EMAIL || '').toLowerCase()) {
          return;
        }
        await transporter.sendMail({
          to: identifier,
          from: process.env.SMTP_FROM,
          subject: 'Your sign-in link',
          text: `Sign in to Agreements:\n${url}`,
          html: `<p>Sign in to Agreements:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      return user.email?.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
    },
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};



