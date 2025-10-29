-- ============================================
-- MIGRATION VERIFICATION SCRIPT FOR NEON
-- Run this in your Neon SQL Editor
-- ============================================

-- This script will check if all migration changes were applied correctly
-- It will output SUCCESS or FAILURE messages for each check

DO $$ 
DECLARE
    agreement_cols INTEGER;
    backdrop_exists BOOLEAN;
    email_unique BOOLEAN;
    session_email BOOLEAN;
    session_clientid BOOLEAN;
    fk_backdrop INTEGER;
    fk_session INTEGER;
    backdrop_count INTEGER;
    index_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '    MIGRATION VERIFICATION REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- ========================================
    -- 1. Check Agreement table new columns
    -- ========================================
    RAISE NOTICE '1. CHECKING AGREEMENT TABLE COLUMNS...';
    
    SELECT COUNT(*) INTO agreement_cols
    FROM information_schema.columns 
    WHERE table_name = 'Agreement' 
    AND column_name IN ('paymentStatus', 'stripePaymentLink', 'stripeReceiptLink', 
                        'galleryLink', 'nextAction', 'backdropLinkId');
    
    IF agreement_cols = 6 THEN
        RAISE NOTICE '   ✓ SUCCESS: All 6 new columns added to Agreement table';
    ELSE
        RAISE NOTICE '   ✗ FAILURE: Only %/6 columns found in Agreement table', agreement_cols;
        RAISE NOTICE '   Missing columns - run this to see which:';
        RAISE NOTICE '   SELECT column_name FROM information_schema.columns WHERE table_name = ''Agreement'';';
    END IF;
    RAISE NOTICE '';
    
    -- ========================================
    -- 2. Check BackdropLink table exists
    -- ========================================
    RAISE NOTICE '2. CHECKING BACKDROPLINK TABLE...';
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'BackdropLink'
    ) INTO backdrop_exists;
    
    IF backdrop_exists THEN
        RAISE NOTICE '   ✓ SUCCESS: BackdropLink table exists';
        
        -- Check BackdropLink structure
        DECLARE
            backdrop_cols INTEGER;
        BEGIN
            SELECT COUNT(*) INTO backdrop_cols
            FROM information_schema.columns
            WHERE table_name = 'BackdropLink'
            AND column_name IN ('id', 'name', 'url', 'displayOrder', 'createdAt', 'updatedAt');
            
            IF backdrop_cols = 6 THEN
                RAISE NOTICE '   ✓ SUCCESS: BackdropLink has all required columns';
            ELSE
                RAISE NOTICE '   ✗ WARNING: BackdropLink has %/6 required columns', backdrop_cols;
            END IF;
        END;
    ELSE
        RAISE NOTICE '   ✗ FAILURE: BackdropLink table does not exist';
    END IF;
    RAISE NOTICE '';
    
    -- ========================================
    -- 3. Check Client.email is unique
    -- ========================================
    RAISE NOTICE '3. CHECKING CLIENT.EMAIL UNIQUE CONSTRAINT...';
    
    SELECT EXISTS(
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Client_email_key'
    ) INTO email_unique;
    
    IF email_unique THEN
        RAISE NOTICE '   ✓ SUCCESS: Client.email has unique constraint';
    ELSE
        RAISE NOTICE '   ✗ FAILURE: Client.email is not unique';
        RAISE NOTICE '   Check for duplicate emails:';
        RAISE NOTICE '   SELECT email, COUNT(*) FROM "Client" GROUP BY email HAVING COUNT(*) > 1;';
    END IF;
    RAISE NOTICE '';
    
    -- ========================================
    -- 4. Check ClientSession migration
    -- ========================================
    RAISE NOTICE '4. CHECKING CLIENTSESSION TABLE...';
    
    -- Check if new clientEmail column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ClientSession' AND column_name = 'clientEmail'
    ) INTO session_email;
    
    -- Check if old clientId column still exists (should not)
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ClientSession' AND column_name = 'clientId'
    ) INTO session_clientid;
    
    IF session_email AND NOT session_clientid THEN
        RAISE NOTICE '   ✓ SUCCESS: ClientSession migrated to use clientEmail';
    ELSIF session_email AND session_clientid THEN
        RAISE NOTICE '   ⚠ PARTIAL: ClientSession has both clientEmail and clientId';
        RAISE NOTICE '   Migration may be incomplete - clientId should be removed';
    ELSIF NOT session_email AND session_clientid THEN
        RAISE NOTICE '   ✗ FAILURE: ClientSession still uses old clientId column';
    ELSE
        RAISE NOTICE '   ✗ CRITICAL: ClientSession has neither clientEmail nor clientId!';
    END IF;
    RAISE NOTICE '';
    
    -- ========================================
    -- 5. Check Foreign Key Constraints
    -- ========================================
    RAISE NOTICE '5. CHECKING FOREIGN KEY CONSTRAINTS...';
    
    -- Check Agreement -> BackdropLink FK
    SELECT COUNT(*) INTO fk_backdrop
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'Agreement_backdropLinkId_fkey';
    
    IF fk_backdrop > 0 THEN
        RAISE NOTICE '   ✓ SUCCESS: Agreement -> BackdropLink foreign key exists';
    ELSE
        RAISE NOTICE '   ✗ FAILURE: Agreement -> BackdropLink foreign key missing';
    END IF;
    
    -- Check ClientSession -> Client FK
    SELECT COUNT(*) INTO fk_session
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'ClientSession_clientEmail_fkey';
    
    IF fk_session > 0 THEN
        RAISE NOTICE '   ✓ SUCCESS: ClientSession -> Client foreign key exists';
    ELSIF email_unique THEN
        RAISE NOTICE '   ✗ FAILURE: ClientSession -> Client foreign key missing';
        RAISE NOTICE '   (Client.email is unique, so FK should be possible)';
    ELSE
        RAISE NOTICE '   ⚠ SKIPPED: ClientSession FK not created (Client.email not unique)';
    END IF;
    RAISE NOTICE '';
    
    -- ========================================
    -- 6. Check Indexes
    -- ========================================
    RAISE NOTICE '6. CHECKING INDEXES...';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE indexname IN (
        'BackdropLink_displayOrder_idx',
        'Agreement_backdropLinkId_idx',
        'ClientSession_clientEmail_idx'
    );
    
    RAISE NOTICE '   ✓ Found %/3 expected indexes', index_count;
    
    IF index_count < 3 THEN
        RAISE NOTICE '   Missing indexes. Run this to see which:';
        RAISE NOTICE '   SELECT indexname FROM pg_indexes WHERE tablename IN (''BackdropLink'', ''Agreement'', ''ClientSession'');';
    END IF;
    RAISE NOTICE '';
    
    -- ========================================
    -- 7. Check BackdropLink sample data
    -- ========================================
    RAISE NOTICE '7. CHECKING BACKDROP LINKS DATA...';
    
    IF backdrop_exists THEN
        SELECT COUNT(*) INTO backdrop_count FROM "BackdropLink";
        
        IF backdrop_count > 0 THEN
            RAISE NOTICE '   ✓ SUCCESS: % backdrop link(s) created', backdrop_count;
        ELSE
            RAISE NOTICE '   ⚠ WARNING: No backdrop links found (may be intentional)';
        END IF;
    ELSE
        RAISE NOTICE '   ✗ SKIPPED: BackdropLink table does not exist';
    END IF;
    RAISE NOTICE '';
    
    -- ========================================
    -- FINAL SUMMARY
    -- ========================================
    RAISE NOTICE '========================================';
    RAISE NOTICE '           SUMMARY';
    RAISE NOTICE '========================================';
    
    IF agreement_cols = 6 
       AND backdrop_exists 
       AND email_unique 
       AND session_email 
       AND NOT session_clientid 
       AND fk_backdrop > 0 
       AND (fk_session > 0 OR NOT email_unique) THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 ALL CHECKS PASSED!';
        RAISE NOTICE '';
        RAISE NOTICE 'Your migration was successful. The portal';
        RAISE NOTICE 'enhancements are ready to use!';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  SOME CHECKS FAILED';
        RAISE NOTICE '';
        RAISE NOTICE 'Review the messages above to see what';
        RAISE NOTICE 'needs to be fixed. You may need to re-run';
        RAISE NOTICE 'the migration script.';
        RAISE NOTICE '';
    END IF;
    
    RAISE NOTICE '========================================';
    
END $$;

-- ============================================
-- DETAILED INSPECTION QUERIES
-- Run these individually if you want more details
-- ============================================

-- Show all Agreement columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'Agreement'
-- ORDER BY ordinal_position;

-- Show all BackdropLink data
-- SELECT * FROM "BackdropLink" ORDER BY "displayOrder";

-- Show ClientSession structure
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'ClientSession';

-- Check for duplicate emails
-- SELECT email, COUNT(*) as count
-- FROM "Client" 
-- GROUP BY email 
-- HAVING COUNT(*) > 1;

-- Show all foreign keys
-- SELECT 
--     tc.constraint_name, 
--     tc.table_name, 
--     kcu.column_name,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
-- AND tc.table_name IN ('Agreement', 'ClientSession');

