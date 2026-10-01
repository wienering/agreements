import type { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { devLog } from './logger';
import EmailProvider from 'next-auth/providers/email';
import { prisma } from './prisma';
import { renderCtaButton, renderEmailLayout } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      from: process.env.SMTP_FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        if (identifier.toLowerCase() !== (process.env.ADMIN_EMAIL || '').toLowerCase()) {
          return;
        }

        const bodyHtml = `
          <p style="margin:0 0 16px 0;">Sign in to Agreements using the button below.</p>
          ${renderCtaButton({ label: 'Sign In', url, tone: 'default' })}
          <p style="margin:16px 0 0 0;font-size:13px;color:#5E5E58;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="margin:8px 0 0 0;word-break:break-all;font-size:13px;color:#1A1A18;">${url}</p>
        `;

        const html = renderEmailLayout({
          title: 'Admin Sign In',
          preheader: 'Your sign-in link for Agreements.',
          bodyHtml,
          tone: 'default',
        });

        await sendEmail({
          to: identifier,
          subject: 'Your sign-in link',
          html,
          text: `Sign in to Agreements:\n${url}`,
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
      devLog('SignIn callback:', { user, account, profile });
      const isAdmin = user.email?.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase();
      devLog('Is admin:', isAdmin);
      return isAdmin;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      devLog('Session callback:', { session, token });
      if (token && session.user) {
        session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
