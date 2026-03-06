import crypto from 'crypto';
import { devLog } from '@/lib/logger';

// Use a secret from environment or generate a fallback (for development only)
const getSecret = () => {
  const secret = process.env.MAGIC_LINK_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn('Warning: No MAGIC_LINK_SECRET or NEXTAUTH_SECRET set. Using fallback for development.');
    return 'development-fallback-secret-change-in-production';
  }
  return secret;
};

interface MagicTokenPayload {
  clientId: string;
  clientEmail: string;
  purpose: 'gallery_access' | 'portal_login';
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
}

/**
 * Generate a magic login token for a client
 * @param clientId - The client's ID
 * @param clientEmail - The client's email address
 * @param purpose - The purpose of the token
 * @param expiresInDays - Number of days until token expires (default: 7)
 * @returns The generated token string
 */
export function generateMagicToken(
  clientId: string,
  clientEmail: string,
  purpose: 'gallery_access' | 'portal_login' = 'gallery_access',
  expiresInDays: number = 7
): string {
  const now = Date.now();
  const payload: MagicTokenPayload = {
    clientId,
    clientEmail: clientEmail.toLowerCase(),
    purpose,
    iat: now,
    exp: now + (expiresInDays * 24 * 60 * 60 * 1000), // Convert days to milliseconds
  };

  // Encode payload as base64
  const payloadString = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Create HMAC signature
  const secret = getSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('base64url');

  // Return token as payload.signature
  return `${payloadString}.${signature}`;
}

/**
 * Verify and decode a magic login token
 * @param token - The token to verify
 * @returns The decoded payload if valid, null if invalid or expired
 */
export function verifyMagicToken(token: string): MagicTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      devLog('Magic token verification failed: Invalid token format');
      return null;
    }

    const [payloadString, providedSignature] = parts;

    // Verify signature
    const secret = getSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('base64url');

    if (providedSignature !== expectedSignature) {
      devLog('Magic token verification failed: Invalid signature');
      return null;
    }

    // Decode and parse payload
    const payload: MagicTokenPayload = JSON.parse(
      Buffer.from(payloadString, 'base64url').toString('utf-8')
    );

    // Check expiration
    if (Date.now() > payload.exp) {
      devLog('Magic token verification failed: Token expired');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Magic token verification error:', error);
    return null;
  }
}

/**
 * Generate a magic login URL for a client
 * @param baseUrl - The base URL of the application
 * @param clientId - The client's ID
 * @param clientEmail - The client's email address
 * @param purpose - The purpose of the token
 * @returns The full magic login URL
 */
export function generateMagicLoginUrl(
  baseUrl: string,
  clientId: string,
  clientEmail: string,
  purpose: 'gallery_access' | 'portal_login' = 'gallery_access'
): string {
  const token = generateMagicToken(clientId, clientEmail, purpose);
  return `${baseUrl}/portal/login?token=${encodeURIComponent(token)}`;
}




