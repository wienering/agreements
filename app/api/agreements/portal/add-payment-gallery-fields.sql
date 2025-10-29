-- SAFE DATABASE MIGRATION FOR CLIENT PORTAL ENHANCEMENTS
-- This migration adds new tables and columns WITHOUT affecting existing data
-- Run this script to safely add payment tracking, gallery links, and backdrop management features

-- Step 1: Add new columns to Agreement table (all nullable to preserve existing data)
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

-- Step 2: Create BackdropLink table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "BackdropLink" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackdropLink_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes (only if they don't exist)
DO $$ 
BEGIN
    -- BackdropLink indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'BackdropLink_displayOrder_idx') THEN
        CREATE INDEX "BackdropLink_displayOrder_idx" ON "BackdropLink"("displayOrder");
        RAISE NOTICE 'Created index on BackdropLink.displayOrder';
    END IF;

    -- Agreement backdrop link index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Agreement_backdropLinkId_idx') THEN
        CREATE INDEX "Agreement_backdropLinkId_idx" ON "Agreement"("backdropLinkId");
        RAISE NOTICE 'Created index on Agreement.backdropLinkId';
    END IF;
END $$;

-- Step 4: Add foreign key constraint (only if it doesn't exist)
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
END $$;

-- Step 5: Insert some default backdrop links (optional - remove if not needed)
INSERT INTO "BackdropLink" ("id", "name", "url", "displayOrder")
VALUES 
    ('default-backdrop-1', 'Standard Backdrops', 'https://www.photoboothguys.ca/backdrops/standard', 1),
    ('default-backdrop-2', 'Premium Backdrops', 'https://www.photoboothguys.ca/backdrops/premium', 2),
    ('default-backdrop-3', 'Custom Backdrops', 'https://www.photoboothguys.ca/backdrops/custom', 3)
ON CONFLICT ("id") DO NOTHING;

RAISE NOTICE 'Migration completed successfully!';

