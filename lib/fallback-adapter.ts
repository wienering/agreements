import type { Adapter } from 'next-auth/adapters';

// Simple in-memory adapter for verification tokens
const verificationTokens = new Map<string, { identifier: string; token: string; expires: Date }>();

export const fallbackAdapter: Adapter = {
  createVerificationToken: async (verificationToken) => {
    const key = `${verificationToken.identifier}:${verificationToken.token}`;
    verificationTokens.set(key, verificationToken);
    return verificationToken;
  },
  useVerificationToken: async ({ identifier, token }) => {
    const key = `${identifier}:${token}`;
    const verificationToken = verificationTokens.get(key);
    
    if (!verificationToken) {
      return null;
    }
    
    // Check if expired
    if (verificationToken.expires < new Date()) {
      verificationTokens.delete(key);
      return null;
    }
    
    // Remove the token after use
    verificationTokens.delete(key);
    return verificationToken;
  },
  // Add minimal required methods (these won't be used with email provider)
  createUser: async () => null as any,
  getUser: async () => null as any,
  getUserByEmail: async () => null as any,
  getUserByAccount: async () => null as any,
  updateUser: async () => null as any,
  deleteUser: async () => null as any,
  linkAccount: async () => null as any,
  unlinkAccount: async () => null as any,
  createSession: async () => null as any,
  getSessionAndUser: async () => null as any,
  updateSession: async () => null as any,
  deleteSession: async () => null as any,
};
