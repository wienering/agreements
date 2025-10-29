-- BACKUP SCRIPT FOR CLIENT PORTAL MIGRATION
-- Run this BEFORE applying the migration to create a backup

-- Create backup tables with current data
CREATE TABLE IF NOT EXISTS "Client_backup_$(date +%Y%m%d_%H%M%S)" AS 
SELECT * FROM "Client";

CREATE TABLE IF NOT EXISTS "Agreement_backup_$(date +%Y%m%d_%H%M%S)" AS 
SELECT * FROM "Agreement";

CREATE TABLE IF NOT EXISTS "Template_backup_$(date +%Y%m%d_%H%M%S)" AS 
SELECT * FROM "Template";

CREATE TABLE IF NOT EXISTS "Signature_backup_$(date +%Y%m%d_%H%M%S)" AS 
SELECT * FROM "Signature";

CREATE TABLE IF NOT EXISTS "AuditLog_backup_$(date +%Y%m%d_%H%M%S)" AS 
SELECT * FROM "AuditLog";

-- Export data to CSV files (run these commands separately)
-- \copy "Client" TO 'client_backup.csv' WITH CSV HEADER;
-- \copy "Agreement" TO 'agreement_backup.csv' WITH CSV HEADER;
-- \copy "Template" TO 'template_backup.csv' WITH CSV HEADER;
-- \copy "Signature" TO 'signature_backup.csv' WITH CSV HEADER;
-- \copy "AuditLog" TO 'auditlog_backup.csv' WITH CSV HEADER;
