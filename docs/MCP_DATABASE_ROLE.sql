-- Optional separate Postgres role for MCP traffic (Phase 1 read-only).
-- Review before applying. Do not run until approved.
--
-- Replace YOUR_PASSWORD and reconnect MCP_DATABASE_URL as:
--   postgresql://mcp_claude:YOUR_PASSWORD@HOST/DB?sslmode=require&...
--
-- Phase 1: SELECT only on tables the read tools need.
-- Phase 2 can add column-scoped UPDATE grants later.

BEGIN;

CREATE ROLE mcp_claude LOGIN PASSWORD 'YOUR_PASSWORD';

GRANT CONNECT ON DATABASE current_database() TO mcp_claude;
GRANT USAGE ON SCHEMA public TO mcp_claude;

GRANT SELECT ON TABLE
  "Client",
  "Event",
  "Agreement",
  "McpOAuthGrant",
  "McpAuthCode",
  "McpAccessToken",
  "McpRefreshToken",
  "McpAuthAttemptLog"
TO mcp_claude;

-- OAuth token lifecycle needs writes on MCP tables only.
GRANT INSERT, UPDATE ON TABLE
  "McpOAuthGrant",
  "McpAuthCode",
  "McpAccessToken",
  "McpRefreshToken",
  "McpAuthAttemptLog"
TO mcp_claude;

COMMIT;
