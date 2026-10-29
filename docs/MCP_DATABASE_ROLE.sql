-- Optional separate Postgres role for MCP traffic (Phase 1 read-only tools + OAuth).
-- Review before applying. Do not run until approved.
--
-- Replace YOUR_PASSWORD and reconnect MCP_DATABASE_URL as:
--   postgresql://mcp_claude:YOUR_PASSWORD@HOST/neondb?sslmode=require&...
--
-- Covered reads (four tools + Connected apps when MCP_DATABASE_URL is set):
--   search_clients / get_client  -> Client, Event
--   search_agreements            -> Agreement, Client, Event
--   get_agreement                -> Agreement, Client, Event, Template
--   Connected apps list/revoke   -> McpOAuthGrant (+ token tables on revoke)
-- OAuth authorize/token/MCP auth -> Mcp* tables
-- Cron attempt-log cleanup uses the app DATABASE_URL role, not mcp_claude.

BEGIN;

CREATE ROLE mcp_claude LOGIN PASSWORD 'YOUR_PASSWORD';

GRANT CONNECT ON DATABASE neondb TO mcp_claude;
GRANT USAGE ON SCHEMA public TO mcp_claude;

GRANT SELECT ON TABLE
  "Client",
  "Event",
  "Agreement",
  "Template",
  "McpOAuthGrant",
  "McpAuthCode",
  "McpAccessToken",
  "McpRefreshToken",
  "McpAuthAttemptLog"
TO mcp_claude;

-- OAuth token lifecycle + Connected apps revoke + grant rate-limit counters.
GRANT INSERT, UPDATE ON TABLE
  "McpOAuthGrant",
  "McpAuthCode",
  "McpAccessToken",
  "McpRefreshToken",
  "McpAuthAttemptLog"
TO mcp_claude;

COMMIT;
