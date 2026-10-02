-- Backfill existing client event data into Event table
-- This script converts existing event fields on Client records into Event records
-- 
-- INSTRUCTIONS:
-- 1. First, run the migration.sql file to create the Event table
-- 2. Then run this script to migrate existing client event data
-- 3. This script can be run multiple times safely (it won't create duplicates)
--
-- For Neon PostgreSQL, use gen_random_uuid() which is available by default
-- For other PostgreSQL databases, you may need to enable uuid-ossp extension first:
--   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO "Event" (
    "id",
    "clientId",
    "eventDate",
    "eventType",
    "eventLocation",
    "eventStartTime",
    "eventDuration",
    "eventPackage",
    "packagePrice",
    "notes",
    "archived",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid()::text as "id",
    "id" as "clientId",
    "eventDate",
    "eventType",
    "eventLocation",
    "eventStartTime",
    "eventDuration",
    "eventPackage",
    "packagePrice",
    NULL as "notes",  -- Client notes stay on Client, not copied to Event
    false as "archived",
    "createdAt",
    COALESCE("updatedAt", "createdAt") as "updatedAt"
FROM "Client"
WHERE 
    ("eventDate" IS NOT NULL 
    OR "eventType" IS NOT NULL 
    OR "eventLocation" IS NOT NULL
    OR "eventStartTime" IS NOT NULL
    OR "eventDuration" IS NOT NULL
    OR "eventPackage" IS NOT NULL
    OR "packagePrice" IS NOT NULL)
    AND NOT EXISTS (
        SELECT 1 FROM "Event" WHERE "Event"."clientId" = "Client"."id"
    );

-- Note: We're not linking existing agreements to events because:
-- 1. We don't know which event each agreement was for historically
-- 2. New agreements will be linked to events going forward
-- 3. Existing agreements remain valid and unchanged

