import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from 'mcp-handler';
import {
  getMcpIssuer,
  getMcpResourceUrl,
  isMcpEnabled,
  mcpDisabledResponse,
} from '@/lib/mcp/config';

const corsHandler = metadataCorsOptionsRequestHandler();

function handler(req: Request) {
  if (!isMcpEnabled()) {
    return mcpDisabledResponse();
  }

  return protectedResourceHandler({
    authServerUrls: [getMcpIssuer()],
    resourceUrl: getMcpResourceUrl(),
  })(req);
}

export { handler as GET, corsHandler as OPTIONS };
