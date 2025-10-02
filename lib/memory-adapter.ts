import type { Adapter, AdapterUser } from 'next-auth/adapters';

// Extend global type for verification tokens and users
declare global {
  var verificationTokens: Map<string, any> | undefined;
  var users: Map<string, AdapterUser> | undefined;
}

// Simple in-memory adapter for verification tokens and basic user management
// This is needed because Email provider requires an adapter
export const memoryAdapter: Adapter = {
  async createUser(user: Omit<AdapterUser, 'id'>) {
    if (!global.users) {
      global.users = new Map();
    }
    const adapterUser: AdapterUser = {
      id: user.email || `user_${Date.now()}`,
      email: user.email!,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified || null,
    };
    global.users.set(adapterUser.id, adapterUser);
    return adapterUser;
  },

  async getUser(id: string) {
    if (!global.users) {
      return null;
    }
    return global.users.get(id) || null;
  },

  async getUserByEmail(email: string) {
    if (!global.users) {
      return null;
    }
    const users = Array.from(global.users.values());
    for (const user of users) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  },

  async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
    // For email provider, we don't need this
    return null;
  },

  async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>) {
    if (!global.users) {
      return user as AdapterUser;
    }
    const existingUser = global.users.get(user.id);
    if (existingUser) {
      const updatedUser = { ...existingUser, ...user };
      global.users.set(user.id, updatedUser);
      return updatedUser;
    }
    return user as AdapterUser;
  },

  async deleteUser(userId: string) {
    if (!global.users) {
      return;
    }
    global.users.delete(userId);
  },

  async linkAccount(account: any) {
    // For email provider, we don't need this
    return account;
  },

  async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
    // For email provider, we don't need this
  },

  async createSession({ sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date }) {
    // For JWT sessions, we don't need this
    return { sessionToken, userId, expires };
  },

  async getSessionAndUser(sessionToken: string) {
    // For JWT sessions, we don't need this
    return null;
  },

  async updateSession(session: any) {
    // For JWT sessions, we don't need this
    return session;
  },

  async deleteSession(sessionToken: string) {
    // For JWT sessions, we don't need this
  },

  async createVerificationToken(verificationToken: any) {
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
  
  async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
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
};