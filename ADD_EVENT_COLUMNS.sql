-- Copy and paste this SQL into your database to add event fields
-- This will fix the issue where event fields aren't being saved

ALTER TABLE "Client" 
ADD COLUMN "eventType" TEXT,
ADD COLUMN "eventLocation" TEXT,
ADD COLUMN "eventStartTime" TEXT,
ADD COLUMN "eventDuration" TEXT,
ADD COLUMN "eventPackage" TEXT;
