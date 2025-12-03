-- Verification script for Attendant Hub Pages
-- Run this in your Neon database to verify all required tables/columns exist

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ATTENDANT HUB SCHEMA VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- 1. Check if BackdropLink table exists
DO $$
BEGIN
    RAISE NOTICE '1. CHECKING BACKDROPLINK TABLE...';
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'BackdropLink'
    ) THEN
        RAISE NOTICE '   ✓ SUCCESS: BackdropLink table exists';
        
        -- Check BackdropLink structure
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'BackdropLink' 
            AND column_name IN ('id', 'name', 'url', 'displayOrder', 'createdAt', 'updatedAt')
        ) THEN
            RAISE NOTICE '   ✓ SUCCESS: BackdropLink has all required columns';
        ELSE
            RAISE NOTICE '   ✗ WARNING: BackdropLink may be missing some columns';
        END IF;
    ELSE
        RAISE NOTICE '   ✗ FAILURE: BackdropLink table does not exist';
        RAISE NOTICE '   → ACTION REQUIRED: Run the migration script to create BackdropLink table';
    END IF;
END $$;

-- 2. Check if Agreement.backdropLinkId column exists
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '2. CHECKING AGREEMENT.BACKDROPLINKID COLUMN...';
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agreement' AND column_name = 'backdropLinkId'
    ) THEN
        RAISE NOTICE '   ✓ SUCCESS: Agreement.backdropLinkId column exists';
    ELSE
        RAISE NOTICE '   ✗ FAILURE: Agreement.backdropLinkId column does not exist';
        RAISE NOTICE '   → ACTION REQUIRED: Add backdropLinkId column to Agreement table';
        RAISE NOTICE '   → SQL: ALTER TABLE "Agreement" ADD COLUMN "backdropLinkId" TEXT;';
    END IF;
END $$;

-- 3. Check foreign key constraint
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '3. CHECKING FOREIGN KEY CONSTRAINT...';
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Agreement_backdropLinkId_fkey'
    ) THEN
        RAISE NOTICE '   ✓ SUCCESS: Foreign key constraint exists';
    ELSE
        RAISE NOTICE '   ✗ WARNING: Foreign key constraint missing (optional but recommended)';
        RAISE NOTICE '   → SQL: ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_backdropLinkId_fkey"';
        RAISE NOTICE '          FOREIGN KEY ("backdropLinkId") REFERENCES "BackdropLink"("id")';
        RAISE NOTICE '          ON DELETE SET NULL ON UPDATE CASCADE;';
    END IF;
END $$;

-- 4. Check indexes
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '4. CHECKING INDEXES...';
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'Agreement_backdropLinkId_idx'
    ) THEN
        RAISE NOTICE '   ✓ SUCCESS: Agreement_backdropLinkId index exists';
    ELSE
        RAISE NOTICE '   ⚠ WARNING: Index missing (optional but recommended for performance)';
        RAISE NOTICE '   → SQL: CREATE INDEX "Agreement_backdropLinkId_idx" ON "Agreement"("backdropLinkId");';
    END IF;
END $$;

-- 5. Sample data check
DO $$
DECLARE
    backdrop_count INTEGER;
    agreement_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '5. CHECKING SAMPLE DATA...';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BackdropLink') THEN
        SELECT COUNT(*) INTO backdrop_count FROM "BackdropLink";
        RAISE NOTICE '   BackdropLink records: %', backdrop_count;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Agreement' AND column_name = 'backdropLinkId'
    ) THEN
        SELECT COUNT(*) INTO agreement_count 
        FROM "Agreement" 
        WHERE "backdropLinkId" IS NOT NULL;
        RAISE NOTICE '   Agreements with backdropLinkId: %', agreement_count;
    END IF;
END $$;

-- 6. Summary and next steps
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'If all checks passed (✓), your database is ready!';
    RAISE NOTICE 'If any checks failed (✗), run the migration script:';
    RAISE NOTICE '  app/api/agreements/portal/add-payment-gallery-fields.sql';
    RAISE NOTICE '';
END $$;

