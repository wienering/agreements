-- Add selectedBackdropName column to Agreement table
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "selectedBackdropName" TEXT;

