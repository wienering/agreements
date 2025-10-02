import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Test database connection
prisma.$connect()
  .then(() => console.log('Database connected successfully'))
  .catch((error) => console.error('Database connection failed:', error));

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };



