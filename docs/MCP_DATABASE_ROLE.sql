-- Optional separate Postgres role for MCP traffic.
-- Review before applying. Do not run until approved.
--
-- Replace YOUR_PASSWORD and reconnect MCP_DATABASE_URL as:
--   postgresql://mcp_claude:YOUR_PASSWORD@HOST/neondb?sslmode=require&...
--
-- Phase 1 reads (four tools + Connected apps when MCP_DATABASE_URL is set):
--   search_clients / get_client  -> Client, Event
--   search_agreements            -> Agreement, Client, Event, BackdropLink, Attendant
--   get_agreement                -> Agreement, Client, Event, Template, BackdropLink, Attendant
--   Connected apps list/revoke   -> McpOAuthGrant (+ token tables on revoke)
-- Phase 2 writes also need:
--   Client, Event, Agreement, ClientNote, AgreementActivity, AuditLog, Settings (conflict buffers)
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
  "ClientNote",
  "AgreementActivity",
  "AuditLog",
  "Settings",
  "BackdropLink",
  "Attendant",
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

-- Phase 2 write tools (one record per call; no DELETE).
GRANT INSERT, UPDATE ON TABLE
  "Client",
  "Event",
  "Agreement",
  "ClientNote",
  "AgreementActivity",
  "AuditLog"
TO mcp_claude;

COMMIT;
