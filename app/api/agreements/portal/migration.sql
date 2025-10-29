-- Migration script for Client Portal features
-- Run this after updating the Prisma schema

-- Add new fields to Client table
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "phoneAddedAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "addressAddedAt" TIMESTAMP(3);

-- Create ClientSession table
CREATE TABLE IF NOT EXISTS "ClientSession" (
    "id" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- Create unique index for sessionToken
CREATE UNIQUE INDEX IF NOT EXISTS "ClientSession_sessionToken_key" ON "ClientSession"("sessionToken");

-- Create index for clientEmail
CREATE INDEX IF NOT EXISTS "ClientSession_clientEmail_idx" ON "ClientSession"("clientEmail");

-- Create ClientNote table
CREATE TABLE IF NOT EXISTS "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agreementId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- Create indexes for ClientNote
CREATE INDEX IF NOT EXISTS "ClientNote_clientId_idx" ON "ClientNote"("clientId");
CREATE INDEX IF NOT EXISTS "ClientNote_agreementId_idx" ON "ClientNote"("agreementId");

-- Add foreign key constraints
ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_clientEmail_fkey" 
    FOREIGN KEY ("clientEmail") REFERENCES "Client"("email") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" 
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_agreementId_fkey" 
    FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add relation to Agreement table for notes
-- (This is handled by Prisma schema, but adding comment for reference)
-- Agreement.notes -> ClientNote[]
