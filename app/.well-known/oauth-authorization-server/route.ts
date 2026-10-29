import { metadataCorsOptionsRequestHandler } from 'mcp-handler';
import {
  getMcpIssuer,
  getMcpPublicBaseUrl,
  isMcpEnabled,
  mcpDisabledResponse,
  MCP_PHASE1_SCOPES,
} from '@/lib/mcp/config';

const corsHandler = metadataCorsOptionsRequestHandler();

function handler() {
  if (!isMcpEnabled()) {
    return mcpDisabledResponse();
  }

  const base = getMcpPublicBaseUrl();
  const body = {
    issuer: getMcpIssuer(),
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    scopes_supported: MCP_PHASE1_SCOPES,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
  };

  return Response.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export { handler as GET, corsHandler as OPTIONS };
