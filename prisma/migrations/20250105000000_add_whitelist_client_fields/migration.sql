-- Add isWhitelistClient to Client table
ALTER TABLE "Client" ADD COLUMN "isWhitelistClient" BOOLEAN NOT NULL DEFAULT false;

-- Add eventName and eventPhone to Event table
ALTER TABLE "Event" ADD COLUMN "eventName" TEXT;
ALTER TABLE "Event" ADD COLUMN "eventPhone" TEXT;




