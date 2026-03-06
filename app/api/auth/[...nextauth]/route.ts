import NextAuth from 'next-auth';
import { devLog } from '@/lib/logger';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Test database connection
prisma.$connect()
  .then(() => devLog('Database connected successfully'))
  .catch((error) => console.error('Database connection failed:', error));

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };



