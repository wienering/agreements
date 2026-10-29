const DEFAULT_REDIRECT_URIS = ['https://claude.ai/api/mcp/auth_callback'] as const;

export const MCP_SCOPES = ['read', 'write'] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

/** Scopes advertised in OAuth metadata and issuable to connectors. */
export const MCP_SUPPORTED_SCOPES: McpScope[] = ['read', 'write'];

/** @deprecated Use MCP_SUPPORTED_SCOPES. Kept for older imports. */
export const MCP_PHASE1_SCOPES: McpScope[] = ['read'];

export const MCP_ACTOR = 'Claude (MCP)';

export const AUTH_CODE_TTL_MS = 60_000;
export const ACCESS_TOKEN_TTL_MS = 60 * 60_000;
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60_000;

export function isMcpEnabled(): boolean {
  return process.env.MCP_ENABLED === 'true';
}

export function getMcpPublicBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export function getMcpIssuer(): string {
  return getMcpPublicBaseUrl();
}

export function getMcpResourceUrl(): string {
  return `${getMcpPublicBaseUrl()}/api/mcp`;
}

export function getMcpClientId(): string {
  return process.env.MCP_CLIENT_ID || '';
}

export function getMcpClientSecret(): string {
  return process.env.MCP_CLIENT_SECRET || '';
}

export function getAllowedRedirectUris(): string[] {
  const fromEnv = process.env.MCP_REDIRECT_URIS;
  if (!fromEnv?.trim()) {
    return [...DEFAULT_REDIRECT_URIS];
  }
  return fromEnv
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAllowedRedirectUri(uri: string): boolean {
  return getAllowedRedirectUris().includes(uri);
}

export function getMcpAllowedEmails(): string[] {
  const raw = process.env.MCP_ALLOWED_EMAILS || '';
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isMcpAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getMcpAllowedEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

export function mcpDisabledResponse(): Response {
  return new Response(null, { status: 404 });
}
