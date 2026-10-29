import { AsyncLocalStorage } from 'async_hooks';
import type { VerifiedAccessToken } from '@/lib/mcp/tokens';

const store = new AsyncLocalStorage<VerifiedAccessToken>();

export function runWithMcpAuth<T>(auth: VerifiedAccessToken, fn: () => T): T {
  return store.run(auth, fn);
}

export function getMcpAuth(): VerifiedAccessToken | undefined {
  return store.getStore();
}

export function requireMcpWriteScope(): VerifiedAccessToken {
  const auth = store.getStore();
  if (!auth?.scopes.includes('write')) {
    throw new McpScopeError('write scope required');
  }
  return auth;
}

export class McpScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpScopeError';
  }
}
