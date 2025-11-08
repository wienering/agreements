-- Verification script for whitelist client feature
-- This script checks that all required database columns exist and are configured correctly

-- Check if isWhitelistClient column exists in Client table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Client' 
        AND column_name = 'isWhitelistClient'
    ) THEN
        RAISE NOTICE '✓ isWhitelistClient column exists in Client table';
    ELSE
        RAISE EXCEPTION '✗ isWhitelistClient column is MISSING in Client table';
    END IF;
END $$;

-- Check isWhitelistClient column properties
DO $$
DECLARE
    col_type TEXT;
    col_default TEXT;
    col_nullable TEXT;
BEGIN
    SELECT 
        data_type,
        column_default,
        is_nullable
    INTO col_type, col_default, col_nullable
    FROM information_schema.columns
    WHERE table_name = 'Client' 
    AND column_name = 'isWhitelistClient';
    
    IF col_type = 'boolean' THEN
        RAISE NOTICE '✓ isWhitelistClient has correct type: boolean';
    ELSE
        RAISE EXCEPTION '✗ isWhitelistClient has incorrect type: % (expected boolean)', col_type;
    END IF;
    
    IF col_default LIKE '%false%' OR col_default = 'false' THEN
        RAISE NOTICE '✓ isWhitelistClient has correct default: false';
    ELSE
        RAISE WARNING '⚠ isWhitelistClient default is: % (expected false)', col_default;
    END IF;
    
    IF col_nullable = 'NO' THEN
        RAISE NOTICE '✓ isWhitelistClient is NOT NULL (correct)';
    ELSE
        RAISE WARNING '⚠ isWhitelistClient is nullable (should be NOT NULL)';
    END IF;
END $$;

-- Check if eventName column exists in Event table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Event' 
        AND column_name = 'eventName'
    ) THEN
        RAISE NOTICE '✓ eventName column exists in Event table';
    ELSE
        RAISE EXCEPTION '✗ eventName column is MISSING in Event table';
    END IF;
END $$;

-- Check eventName column properties
DO $$
DECLARE
    col_type TEXT;
    col_nullable TEXT;
BEGIN
    SELECT 
        data_type,
        is_nullable
    INTO col_type, col_nullable
    FROM information_schema.columns
    WHERE table_name = 'Event' 
    AND column_name = 'eventName';
    
    IF col_type = 'text' THEN
        RAISE NOTICE '✓ eventName has correct type: text';
    ELSE
        RAISE EXCEPTION '✗ eventName has incorrect type: % (expected text)', col_type;
    END IF;
    
    IF col_nullable = 'YES' THEN
        RAISE NOTICE '✓ eventName is nullable (correct)';
    ELSE
        RAISE WARNING '⚠ eventName is NOT NULL (should be nullable)';
    END IF;
END $$;

-- Check if eventPhone column exists in Event table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Event' 
        AND column_name = 'eventPhone'
    ) THEN
        RAISE NOTICE '✓ eventPhone column exists in Event table';
    ELSE
        RAISE EXCEPTION '✗ eventPhone column is MISSING in Event table';
    END IF;
END $$;

-- Check eventPhone column properties
DO $$
DECLARE
    col_type TEXT;
    col_nullable TEXT;
BEGIN
    SELECT 
        data_type,
        is_nullable
    INTO col_type, col_nullable
    FROM information_schema.columns
    WHERE table_name = 'Event' 
    AND column_name = 'eventPhone';
    
    IF col_type = 'text' THEN
        RAISE NOTICE '✓ eventPhone has correct type: text';
    ELSE
        RAISE EXCEPTION '✗ eventPhone has incorrect type: % (expected text)', col_type;
    END IF;
    
    IF col_nullable = 'YES' THEN
        RAISE NOTICE '✓ eventPhone is nullable (correct)';
    ELSE
        RAISE WARNING '⚠ eventPhone is NOT NULL (should be nullable)';
    END IF;
END $$;

-- Summary: Show all whitelist-related columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE (table_name = 'Client' AND column_name = 'isWhitelistClient')
   OR (table_name = 'Event' AND column_name IN ('eventName', 'eventPhone'))
ORDER BY table_name, column_name;

-- Count whitelist clients
SELECT 
    COUNT(*) as total_clients,
    COUNT(*) FILTER (WHERE "isWhitelistClient" = true) as whitelist_clients,
    COUNT(*) FILTER (WHERE "isWhitelistClient" = false) as regular_clients
FROM "Client";

-- Count events with event name/phone
SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE "eventName" IS NOT NULL) as events_with_name,
    COUNT(*) FILTER (WHERE "eventPhone" IS NOT NULL) as events_with_phone,
    COUNT(*) FILTER (WHERE "eventName" IS NOT NULL AND "eventPhone" IS NOT NULL) as events_with_both
FROM "Event";

-- Final verification message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification complete!';
    RAISE NOTICE 'All required columns for whitelist client feature are present.';
    RAISE NOTICE '========================================';
END $$;

