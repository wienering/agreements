-- Temporary fix: Remove the new fields that don't exist yet
-- This will allow the app to run while we add the new features

-- First, let's add the basic fields that are needed immediately
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "lastModifiedBy" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "changeSummary" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;

-- Add basic revenue tracking to Agreement
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "packagePrice" DECIMAL(10,2);
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "estimatedRevenue" DECIMAL(10,2);

-- Update existing templates to have default values
UPDATE "Template" SET "isActive" = true WHERE "isActive" IS NULL;
