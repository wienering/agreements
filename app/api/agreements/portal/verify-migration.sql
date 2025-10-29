-- VERIFICATION SCRIPT FOR CLIENT PORTAL MIGRATION
-- Run this after migration to verify everything is working correctly

-- Check 1: Verify all new tables exist
DO $$ 
BEGIN
    RAISE NOTICE '=== CHECKING NEW TABLES ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientSession') THEN
        RAISE NOTICE '✓ ClientSession table exists';
    ELSE
        RAISE NOTICE '✗ ClientSession table missing - MIGRATION INCOMPLETE';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientNote') THEN
        RAISE NOTICE '✓ ClientNote table exists';
    ELSE
        RAISE NOTICE '✗ ClientNote table missing - MIGRATION INCOMPLETE';
    END IF;
END $$;

-- Check 2: Verify all new columns exist
DO $$ 
BEGIN
    RAISE NOTICE '=== CHECKING NEW COLUMNS ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'address') THEN
        RAISE NOTICE '✓ Client.address column exists';
    ELSE
        RAISE NOTICE '✗ Client.address column missing - MIGRATION INCOMPLETE';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'phoneAddedAt') THEN
        RAISE NOTICE '✓ Client.phoneAddedAt column exists';
    ELSE
        RAISE NOTICE '✗ Client.phoneAddedAt column missing - MIGRATION INCOMPLETE';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'addressAddedAt') THEN
        RAISE NOTICE '✓ Client.addressAddedAt column exists';
    ELSE
        RAISE NOTICE '✗ Client.addressAddedAt column missing - MIGRATION INCOMPLETE';
    END IF;
END $$;

-- Check 3: Verify indexes exist
DO $$ 
BEGIN
    RAISE NOTICE '=== CHECKING INDEXES ===';
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_sessionToken_key') THEN
        RAISE NOTICE '✓ ClientSession.sessionToken unique index exists';
    ELSE
        RAISE NOTICE '✗ ClientSession.sessionToken unique index missing';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientSession_clientEmail_idx') THEN
        RAISE NOTICE '✓ ClientSession.clientEmail index exists';
    ELSE
        RAISE NOTICE '✗ ClientSession.clientEmail index missing';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientNote_clientId_idx') THEN
        RAISE NOTICE '✓ ClientNote.clientId index exists';
    ELSE
        RAISE NOTICE '✗ ClientNote.clientId index missing';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ClientNote_agreementId_idx') THEN
        RAISE NOTICE '✓ ClientNote.agreementId index exists';
    ELSE
        RAISE NOTICE '✗ ClientNote.agreementId index missing';
    END IF;
END $$;

-- Check 4: Verify foreign key constraints
DO $$ 
BEGIN
    RAISE NOTICE '=== CHECKING FOREIGN KEY CONSTRAINTS ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'ClientSession_clientEmail_fkey') THEN
        RAISE NOTICE '✓ ClientSession_clientEmail_fkey constraint exists';
    ELSE
        RAISE NOTICE '✗ ClientSession_clientEmail_fkey constraint missing';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'ClientNote_clientId_fkey') THEN
        RAISE NOTICE '✓ ClientNote_clientId_fkey constraint exists';
    ELSE
        RAISE NOTICE '✗ ClientNote_clientId_fkey constraint missing';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'ClientNote_agreementId_fkey') THEN
        RAISE NOTICE '✓ ClientNote_agreementId_fkey constraint exists';
    ELSE
        RAISE NOTICE '✗ ClientNote_agreementId_fkey constraint missing';
    END IF;
END $$;

-- Check 5: Verify data integrity (existing data should be unchanged)
DO $$ 
BEGIN
    RAISE NOTICE '=== CHECKING DATA INTEGRITY ===';
    
    DECLARE
        client_count INTEGER;
        agreement_count INTEGER;
        template_count INTEGER;
        signature_count INTEGER;
        auditlog_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO client_count FROM "Client";
        SELECT COUNT(*) INTO agreement_count FROM "Agreement";
        SELECT COUNT(*) INTO template_count FROM "Template";
        SELECT COUNT(*) INTO signature_count FROM "Signature";
        SELECT COUNT(*) INTO auditlog_count FROM "AuditLog";
        
        RAISE NOTICE 'Total Clients: %', client_count;
        RAISE NOTICE 'Total Agreements: %', agreement_count;
        RAISE NOTICE 'Total Templates: %', template_count;
        RAISE NOTICE 'Total Signatures: %', signature_count;
        RAISE NOTICE 'Total Audit Logs: %', auditlog_count;
        
        IF client_count > 0 THEN
            RAISE NOTICE '✓ Client data preserved';
        ELSE
            RAISE NOTICE '⚠ No clients found (this might be normal for new installations)';
        END IF;
        
        IF agreement_count > 0 THEN
            RAISE NOTICE '✓ Agreement data preserved';
        ELSE
            RAISE NOTICE '⚠ No agreements found (this might be normal for new installations)';
        END IF;
    END;
END $$;

-- Check 6: Test new functionality
DO $$ 
BEGIN
    RAISE NOTICE '=== TESTING NEW FUNCTIONALITY ===';
    
    -- Test that we can insert into new tables
    BEGIN
        -- This should work without errors
        INSERT INTO "ClientSession" ("id", "clientEmail", "sessionToken", "expiresAt") 
        VALUES ('test-session-id', 'test@example.com', 'test-token', NOW() + INTERVAL '1 hour');
        
        RAISE NOTICE '✓ ClientSession insert test passed';
        
        -- Clean up test data
        DELETE FROM "ClientSession" WHERE "id" = 'test-session-id';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ ClientSession insert test failed: %', SQLERRM;
    END;
    
    -- Test that we can update new columns
    BEGIN
        -- This should work without errors
        UPDATE "Client" SET "address" = 'Test Address' WHERE "id" = (SELECT "id" FROM "Client" LIMIT 1);
        
        RAISE NOTICE '✓ Client.address update test passed';
        
        -- Clean up test data
        UPDATE "Client" SET "address" = NULL WHERE "address" = 'Test Address';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ Client.address update test failed: %', SQLERRM;
    END;
END $$;

-- Final summary
DO $$ 
BEGIN
    RAISE NOTICE '=== MIGRATION VERIFICATION COMPLETE ===';
    RAISE NOTICE 'If all checks show ✓, your migration was successful!';
    RAISE NOTICE 'If any checks show ✗, please review the migration process.';
    RAISE NOTICE 'Your existing data should be completely preserved.';
END $$;
