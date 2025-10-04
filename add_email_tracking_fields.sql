-- Add email tracking fields to Agreement table
ALTER TABLE "Agreement" ADD COLUMN "lastEmailedAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN "emailSendCount" INTEGER NOT NULL DEFAULT 0;
