-- Backfill existing client event data into Event table
-- This script converts existing event fields on Client records into Event records
-- Note: IDs will be generated using Prisma's default CUID format when inserted through the API
-- This script is for reference - run the backfill through Prisma or a Node.js script for proper ID generation

-- Alternative: Use this SQL with UUID extension (enable with: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";)
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
    uuid_generate_v4()::text as "id",
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
    "updatedAt"
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

