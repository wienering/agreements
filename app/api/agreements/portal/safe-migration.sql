-- SAFE DATABASE MIGRATION FOR CLIENT PORTAL
-- This migration adds new tables and columns WITHOUT affecting existing data
-- Run this script to safely add client portal features

-- Step 1: Add new columns to Client table (all nullable to preserve existing data)
DO $$ 
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Client' AND column_name = 'address') THEN
        ALTER TABLE "Client" ADD COLUMN "address" TEXT;
        RAISE NOTICE 'Added address column to Client table';
    ELSE
        RAISE NOTICE 'Address column already exists in Client table';
    END IF;

    -- Add phoneAddedAt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Client' AND column_name = 'phoneAddedAt') THEN
        ALTER TABLE "Client" ADD COLUMN "phoneAddedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added phoneAddedAt column to Client table';
    ELSE
        RAISE NOTICE 'phoneAddedAt column already exists in Client table';
    END IF;

    -- Add addressAddedAt column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Client' AND column_name = 'addressAddedAt') THEN
        ALTER TABLE "Client" ADD COLUMN "addressAddedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added addressAddedAt column to Client table';
    ELSE
        RAISE NOTICE 'addressAddedAt column already exists in Client table';
    END IF;
END $$;

-- Step 2: Create ClientSession table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "ClientSession" (
    "id" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create ClientNote table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agreementId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes (only if they don't exist)
DO $$ 
BEGIN
    -- ClientSession indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_sessionToken_key') THEN
        CREATE UNIQUE INDEX "ClientSession_sessionToken_key" ON "ClientSession"("sessionToken");
        RAISE NOTICE 'Created unique index on ClientSession.sessionToken';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_clientEmail_idx') THEN
        CREATE INDEX "ClientSession_clientEmail_idx" ON "ClientSession"("clientEmail");
        RAISE NOTICE 'Created index on ClientSession.clientEmail';
    END IF;

    -- ClientNote indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientNote_clientId_idx') THEN
        CREATE INDEX "ClientNote_clientId_idx" ON "ClientNote"("clientId");
        RAISE NOTICE 'Created index on ClientNote.clientId';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientNote_agreementId_idx') THEN
        CREATE INDEX "ClientNote_agreementId_idx" ON "ClientNote"("agreementId");
        RAISE NOTICE 'Created index on ClientNote.agreementId';
    END IF;
END $$;

-- Step 5: Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    -- ClientSession foreign key
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'ClientSession_clientEmail_fkey') THEN
        ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_clientEmail_fkey" 
            FOREIGN KEY ("clientEmail") REFERENCES "Client"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint ClientSession_clientEmail_fkey';
    END IF;

    -- ClientNote foreign keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'ClientNote_clientId_fkey') THEN
        ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" 
            FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint ClientNote_clientId_fkey';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'ClientNote_agreementId_fkey') THEN
        ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_agreementId_fkey" 
            FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint ClientNote_agreementId_fkey';
    END IF;
END $$;

-- Step 6: Verify migration success
DO $$ 
BEGIN
    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    
    -- Check Client table columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'address') THEN
        RAISE NOTICE '✓ Client.address column exists';
    ELSE
        RAISE NOTICE '✗ Client.address column missing';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'phoneAddedAt') THEN
        RAISE NOTICE '✓ Client.phoneAddedAt column exists';
    ELSE
        RAISE NOTICE '✗ Client.phoneAddedAt column missing';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'addressAddedAt') THEN
        RAISE NOTICE '✓ Client.addressAddedAt column exists';
    ELSE
        RAISE NOTICE '✗ Client.addressAddedAt column missing';
    END IF;

    -- Check new tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientSession') THEN
        RAISE NOTICE '✓ ClientSession table exists';
    ELSE
        RAISE NOTICE '✗ ClientSession table missing';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientNote') THEN
        RAISE NOTICE '✓ ClientNote table exists';
    ELSE
        RAISE NOTICE '✗ ClientNote table missing';
    END IF;

    -- Check existing data integrity
    RAISE NOTICE '=== DATA INTEGRITY CHECK ===';
    RAISE NOTICE 'Total Clients: %', (SELECT COUNT(*) FROM "Client");
    RAISE NOTICE 'Total Agreements: %', (SELECT COUNT(*) FROM "Agreement");
    RAISE NOTICE 'Total Templates: %', (SELECT COUNT(*) FROM "Template");
    
    RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
END $$;
