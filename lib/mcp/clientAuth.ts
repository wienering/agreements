import { constantTimeEqualString } from '@/lib/mcp/crypto';
import { getMcpClientId, getMcpClientSecret } from '@/lib/mcp/config';

export function parseClientCredentials(request: Request, body: URLSearchParams): {
  clientId: string;
  clientSecret: string;
} | null {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
      const idx = decoded.indexOf(':');
      if (idx === -1) return null;
      return {
        clientId: decodeURIComponent(decoded.slice(0, idx)),
        clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
      };
    } catch {
      return null;
    }
  }

  const clientId = body.get('client_id') || '';
  const clientSecret = body.get('client_secret') || '';
  if (!clientId) return null;
  return { clientId, clientSecret };
}

export function verifyPreRegisteredClient(clientId: string, clientSecret: string): boolean {
  const expectedId = getMcpClientId();
  const expectedSecret = getMcpClientSecret();
  if (!expectedId || !expectedSecret) return false;
  return (
    constantTimeEqualString(clientId, expectedId) &&
    constantTimeEqualString(clientSecret, expectedSecret)
  );
}
