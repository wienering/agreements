// Shared verification code storage for portal authentication
// In production, this should be replaced with Redis or a database

interface VerificationCode {
  code: string;
  expiresAt: Date;
}

// Store verification codes temporarily (in production, use Redis or similar)
const verificationCodes = new Map<string, VerificationCode>();

export const verificationCodeStore = {
  set: (email: string, code: string, expiresAt: Date) => {
    verificationCodes.set(email.toLowerCase(), { code, expiresAt });
  },

  get: (email: string): VerificationCode | undefined => {
    return verificationCodes.get(email.toLowerCase());
  },

  delete: (email: string) => {
    verificationCodes.delete(email.toLowerCase());
  },

  // Clean up expired codes
  cleanup: () => {
    const now = new Date();
    for (const [email, data] of verificationCodes.entries()) {
      if (now > data.expiresAt) {
        verificationCodes.delete(email);
      }
    }
  }
};

// Clean up expired codes every 5 minutes
setInterval(() => {
  verificationCodeStore.cleanup();
}, 5 * 60 * 1000);
