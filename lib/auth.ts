import type { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import nodemailer from 'nodemailer';
import { memoryAdapter } from './memory-adapter';

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
  adapter: memoryAdapter,
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
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, profile });
      const isAdmin = user.email?.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
      console.log('Is admin:', isAdmin);
      return isAdmin;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback:', { session, token });
      if (token && session.user) {
        session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};