-- ROLLBACK SCRIPT FOR CLIENT PORTAL MIGRATION
-- Use this ONLY if you need to undo the migration
-- WARNING: This will remove the new tables and columns

-- Step 1: Drop foreign key constraints first
DO $$ 
BEGIN
    -- Drop ClientNote foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'ClientNote_agreementId_fkey') THEN
        ALTER TABLE "ClientNote" DROP CONSTRAINT "ClientNote_agreementId_fkey";
        RAISE NOTICE 'Dropped ClientNote_agreementId_fkey constraint';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'ClientNote_clientId_fkey') THEN
        ALTER TABLE "ClientNote" DROP CONSTRAINT "ClientNote_clientId_fkey";
        RAISE NOTICE 'Dropped ClientNote_clientId_fkey constraint';
    END IF;

    -- Drop ClientSession foreign key
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'ClientSession_clientEmail_fkey') THEN
        ALTER TABLE "ClientSession" DROP CONSTRAINT "ClientSession_clientEmail_fkey";
        RAISE NOTICE 'Dropped ClientSession_clientEmail_fkey constraint';
    END IF;
END $$;

-- Step 2: Drop indexes
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientNote_agreementId_idx') THEN
        DROP INDEX "ClientNote_agreementId_idx";
        RAISE NOTICE 'Dropped ClientNote_agreementId_idx index';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientNote_clientId_idx') THEN
        DROP INDEX "ClientNote_clientId_idx";
        RAISE NOTICE 'Dropped ClientNote_clientId_idx index';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_clientEmail_idx') THEN
        DROP INDEX "ClientSession_clientEmail_idx";
        RAISE NOTICE 'Dropped ClientSession_clientEmail_idx index';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_sessionToken_key') THEN
        DROP INDEX "ClientSession_sessionToken_key";
        RAISE NOTICE 'Dropped ClientSession_sessionToken_key index';
    END IF;
END $$;

-- Step 3: Drop new tables
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientNote') THEN
        DROP TABLE "ClientNote";
        RAISE NOTICE 'Dropped ClientNote table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientSession') THEN
        DROP TABLE "ClientSession";
        RAISE NOTICE 'Dropped ClientSession table';
    END IF;
END $$;

-- Step 4: Remove new columns from Client table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Client' AND column_name = 'addressAddedAt') THEN
        ALTER TABLE "Client" DROP COLUMN "addressAddedAt";
        RAISE NOTICE 'Dropped addressAddedAt column from Client table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Client' AND column_name = 'phoneAddedAt') THEN
        ALTER TABLE "Client" DROP COLUMN "phoneAddedAt";
        RAISE NOTICE 'Dropped phoneAddedAt column from Client table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Client' AND column_name = 'address') THEN
        ALTER TABLE "Client" DROP COLUMN "address";
        RAISE NOTICE 'Dropped address column from Client table';
    END IF;
END $$;

-- Step 5: Verify rollback
DO $$ 
BEGIN
    RAISE NOTICE '=== ROLLBACK VERIFICATION ===';
    
    -- Check that new columns are gone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'address') THEN
        RAISE NOTICE '✓ Client.address column removed';
    ELSE
        RAISE NOTICE '✗ Client.address column still exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'phoneAddedAt') THEN
        RAISE NOTICE '✓ Client.phoneAddedAt column removed';
    ELSE
        RAISE NOTICE '✗ Client.phoneAddedAt column still exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'addressAddedAt') THEN
        RAISE NOTICE '✓ Client.addressAddedAt column removed';
    ELSE
        RAISE NOTICE '✗ Client.addressAddedAt column still exists';
    END IF;

    -- Check that new tables are gone
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientSession') THEN
        RAISE NOTICE '✓ ClientSession table removed';
    ELSE
        RAISE NOTICE '✗ ClientSession table still exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientNote') THEN
        RAISE NOTICE '✓ ClientNote table removed';
    ELSE
        RAISE NOTICE '✗ ClientNote table still exists';
    END IF;

    -- Verify existing data is intact
    RAISE NOTICE '=== DATA INTEGRITY CHECK ===';
    RAISE NOTICE 'Total Clients: %', (SELECT COUNT(*) FROM "Client");
    RAISE NOTICE 'Total Agreements: %', (SELECT COUNT(*) FROM "Agreement");
    RAISE NOTICE 'Total Templates: %', (SELECT COUNT(*) FROM "Template");
    
    RAISE NOTICE '=== ROLLBACK COMPLETED ===';
END $$;
