-- Add event fields to Client table
ALTER TABLE "Client" 
ADD COLUMN "eventType" TEXT,
ADD COLUMN "eventLocation" TEXT,
ADD COLUMN "eventStartTime" TEXT,
ADD COLUMN "eventDuration" TEXT,
ADD COLUMN "eventPackage" TEXT;
