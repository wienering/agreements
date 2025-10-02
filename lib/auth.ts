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
  debug: process.env.NODE_ENV === 'development',
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
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, profile });
      const isAdmin = user.email?.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
      console.log('Is admin:', isAdmin);
      return isAdmin;
    },
    async session({ session, user }) {
      console.log('Session callback:', { session, user });
      if (user && session.user) {
        session.user.email = user.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};



