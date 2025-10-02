-- Run this SQL in your database to add the event fields to the Client table
-- You can run this in your database admin panel or using psql

ALTER TABLE "Client" 
ADD COLUMN "eventType" TEXT,
ADD COLUMN "eventLocation" TEXT,
ADD COLUMN "eventStartTime" TEXT,
ADD COLUMN "eventDuration" TEXT,
ADD COLUMN "eventPackage" TEXT;
