-- COMPLETE DATABASE MIGRATION FOR CLIENT PORTAL ENHANCEMENTS
-- This migration adds new tables, columns, and schema updates
-- Run this script to safely add all portal enhancement features

-- =============================================================================
-- STEP 1: Add new columns to Agreement table
-- =============================================================================
DO $$ 
BEGIN
    -- Add paymentStatus column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Agreement' AND column_name = 'paymentStatus') THEN
        ALTER TABLE "Agreement" ADD COLUMN "paymentStatus" TEXT;
        RAISE NOTICE 'Added paymentStatus column to Agreement table';
    ELSE
        RAISE NOTICE 'paymentStatus column already exists in Agreement table';
    END IF;

    -- Add stripePaymentLink column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Agreement' AND column_name = 'stripePaymentLink') THEN
        ALTER TABLE "Agreement" ADD COLUMN "stripePaymentLink" TEXT;
        RAISE NOTICE 'Added stripePaymentLink column to Agreement table';
    ELSE
        RAISE NOTICE 'stripePaymentLink column already exists in Agreement table';
    END IF;

    -- Add stripeReceiptLink column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Agreement' AND column_name = 'stripeReceiptLink') THEN
        ALTER TABLE "Agreement" ADD COLUMN "stripeReceiptLink" TEXT;
        RAISE NOTICE 'Added stripeReceiptLink column to Agreement table';
    ELSE
        RAISE NOTICE 'stripeReceiptLink column already exists in Agreement table';
    END IF;

    -- Add galleryLink column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Agreement' AND column_name = 'galleryLink') THEN
        ALTER TABLE "Agreement" ADD COLUMN "galleryLink" TEXT;
        RAISE NOTICE 'Added galleryLink column to Agreement table';
    ELSE
        RAISE NOTICE 'galleryLink column already exists in Agreement table';
    END IF;

    -- Add nextAction column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Agreement' AND column_name = 'nextAction') THEN
        ALTER TABLE "Agreement" ADD COLUMN "nextAction" TEXT;
        RAISE NOTICE 'Added nextAction column to Agreement table';
    ELSE
        RAISE NOTICE 'nextAction column already exists in Agreement table';
    END IF;

    -- Add backdropLinkId column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Agreement' AND column_name = 'backdropLinkId') THEN
        ALTER TABLE "Agreement" ADD COLUMN "backdropLinkId" TEXT;
        RAISE NOTICE 'Added backdropLinkId column to Agreement table';
    ELSE
        RAISE NOTICE 'backdropLinkId column already exists in Agreement table';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Create BackdropLink table
-- =============================================================================
CREATE TABLE IF NOT EXISTS "BackdropLink" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackdropLink_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- STEP 3: Make Client.email unique (required for ClientSession relation)
-- =============================================================================
DO $$ 
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Client_email_key'
    ) THEN
        -- First, check for duplicate emails
        IF EXISTS (
            SELECT email, COUNT(*) 
            FROM "Client" 
            GROUP BY email 
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE 'WARNING: Duplicate emails found in Client table. Please resolve duplicates before making email unique.';
            RAISE NOTICE 'Run this query to see duplicates: SELECT email, COUNT(*) FROM "Client" GROUP BY email HAVING COUNT(*) > 1;';
            -- Optionally, you can uncomment the next line to prevent the migration from continuing
            -- RAISE EXCEPTION 'Cannot make email unique while duplicates exist';
        ELSE
            ALTER TABLE "Client" ADD CONSTRAINT "Client_email_key" UNIQUE ("email");
            RAISE NOTICE 'Added unique constraint to Client.email';
        END IF;
    ELSE
        RAISE NOTICE 'Client.email unique constraint already exists';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Update ClientSession to use clientEmail
-- =============================================================================
DO $$ 
BEGIN
    -- Check if clientEmail column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ClientSession' AND column_name = 'clientEmail') THEN
        
        -- Add clientEmail column
        ALTER TABLE "ClientSession" ADD COLUMN "clientEmail" TEXT;
        RAISE NOTICE 'Added clientEmail column to ClientSession table';
        
        -- Populate clientEmail from Client table if there's data
        UPDATE "ClientSession" cs
        SET "clientEmail" = c.email
        FROM "Client" c
        WHERE cs."clientId" = c.id;
        
        RAISE NOTICE 'Populated clientEmail column with data from Client table';
        
        -- Drop old foreign key constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'ClientSession_clientId_fkey'
        ) THEN
            ALTER TABLE "ClientSession" DROP CONSTRAINT "ClientSession_clientId_fkey";
            RAISE NOTICE 'Dropped old ClientSession_clientId_fkey constraint';
        END IF;
        
        -- Drop old index if it exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_clientId_idx') THEN
            DROP INDEX "ClientSession_clientId_idx";
            RAISE NOTICE 'Dropped old ClientSession_clientId_idx index';
        END IF;
        
        -- Drop old clientId column
        ALTER TABLE "ClientSession" DROP COLUMN IF EXISTS "clientId";
        RAISE NOTICE 'Dropped clientId column from ClientSession table';
        
    ELSE
        RAISE NOTICE 'clientEmail column already exists in ClientSession table';
    END IF;
END $$;

-- =============================================================================
-- STEP 5: Create indexes
-- =============================================================================
DO $$ 
BEGIN
    -- BackdropLink displayOrder index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'BackdropLink_displayOrder_idx') THEN
        CREATE INDEX "BackdropLink_displayOrder_idx" ON "BackdropLink"("displayOrder");
        RAISE NOTICE 'Created index on BackdropLink.displayOrder';
    END IF;

    -- Agreement backdropLinkId index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Agreement_backdropLinkId_idx') THEN
        CREATE INDEX "Agreement_backdropLinkId_idx" ON "Agreement"("backdropLinkId");
        RAISE NOTICE 'Created index on Agreement.backdropLinkId';
    END IF;
    
    -- ClientSession clientEmail index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_clientEmail_idx') THEN
        CREATE INDEX "ClientSession_clientEmail_idx" ON "ClientSession"("clientEmail");
        RAISE NOTICE 'Created index on ClientSession.clientEmail';
    END IF;
END $$;

-- =============================================================================
-- STEP 6: Add foreign key constraints
-- =============================================================================
DO $$ 
BEGIN
    -- Agreement to BackdropLink foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Agreement_backdropLinkId_fkey'
    ) THEN
        ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_backdropLinkId_fkey" 
            FOREIGN KEY ("backdropLinkId") REFERENCES "BackdropLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Created foreign key constraint Agreement_backdropLinkId_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint Agreement_backdropLinkId_fkey already exists';
    END IF;
    
    -- ClientSession to Client foreign key (using email)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ClientSession_clientEmail_fkey'
    ) THEN
        -- Only create if Client.email is unique
        IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'Client_email_key'
        ) THEN
            ALTER TABLE "ClientSession" ADD CONSTRAINT "ClientSession_clientEmail_fkey" 
                FOREIGN KEY ("clientEmail") REFERENCES "Client"("email") ON DELETE CASCADE ON UPDATE CASCADE;
            RAISE NOTICE 'Created foreign key constraint ClientSession_clientEmail_fkey';
        ELSE
            RAISE NOTICE 'Skipping ClientSession_clientEmail_fkey - Client.email must be unique first';
        END IF;
    ELSE
        RAISE NOTICE 'Foreign key constraint ClientSession_clientEmail_fkey already exists';
    END IF;
END $$;

-- =============================================================================
-- STEP 7: Insert default backdrop links (optional - customize as needed)
-- =============================================================================
INSERT INTO "BackdropLink" ("id", "name", "url", "displayOrder")
VALUES 
    ('default-backdrop-1', 'Standard Backdrops', 'https://www.photoboothguys.ca/backdrops/standard', 1),
    ('default-backdrop-2', 'Premium Backdrops', 'https://www.photoboothguys.ca/backdrops/premium', 2),
    ('default-backdrop-3', 'Custom Backdrops', 'https://www.photoboothguys.ca/backdrops/custom', 3)
ON CONFLICT ("id") DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'New features available:';
    RAISE NOTICE '- Payment tracking (paymentStatus, stripePaymentLink, stripeReceiptLink)';
    RAISE NOTICE '- Gallery link management (galleryLink)';
    RAISE NOTICE '- Next action tracking (nextAction)';
    RAISE NOTICE '- Backdrop link management (BackdropLink table)';
    RAISE NOTICE '- ClientSession now uses email for authentication';
    RAISE NOTICE '====================================';
END $$;

