import type { Adapter } from 'next-auth/adapters';

// Extend global type for verification tokens
declare global {
  var verificationTokens: Map<string, any> | undefined;
}

// Simple in-memory adapter for verification tokens only
// This is needed because Email provider requires an adapter
export const memoryAdapter: Adapter = {
  async createVerificationToken(verificationToken) {
    // Store in memory (will be lost on server restart, but that's fine for magic links)
    if (!global.verificationTokens) {
      global.verificationTokens = new Map();
    }
    global.verificationTokens.set(verificationToken.identifier, {
      ...verificationToken,
      expires: verificationToken.expires,
    });
    return verificationToken;
  },
  
  async useVerificationToken({ identifier, token }) {
    if (!global.verificationTokens) {
      return null;
    }
    
    const stored = global.verificationTokens.get(identifier);
    if (!stored || stored.token !== token) {
      return null;
    }
    
    // Check if expired
    if (new Date() > new Date(stored.expires)) {
      global.verificationTokens.delete(identifier);
      return null;
    }
    
    // Remove used token
    global.verificationTokens.delete(identifier);
    return stored;
  },
  
  // All other methods are not needed for JWT sessions
  async createUser() { throw new Error('Not implemented'); },
  async getUser() { throw new Error('Not implemented'); },
  async getUserByEmail() { throw new Error('Not implemented'); },
  async getUserByAccount() { throw new Error('Not implemented'); },
  async updateUser() { throw new Error('Not implemented'); },
  async deleteUser() { throw new Error('Not implemented'); },
  async linkAccount() { throw new Error('Not implemented'); },
  async unlinkAccount() { throw new Error('Not implemented'); },
  async createSession() { throw new Error('Not implemented'); },
  async getSessionAndUser() { throw new Error('Not implemented'); },
  async updateSession() { throw new Error('Not implemented'); },
  async deleteSession() { throw new Error('Not implemented'); },
};