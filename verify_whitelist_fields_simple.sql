-- Simple verification script for whitelist client feature
-- Run this to quickly check if all required columns exist

-- 1. Check Client table for isWhitelistClient column
SELECT 
    'Client.isWhitelistClient' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Client' AND column_name = 'isWhitelistClient'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'Client' AND column_name = 'isWhitelistClient';

-- 2. Check Event table for eventName column
SELECT 
    'Event.eventName' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Event' AND column_name = 'eventName'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'Event' AND column_name = 'eventName';

-- 3. Check Event table for eventPhone column
SELECT 
    'Event.eventPhone' as column_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Event' AND column_name = 'eventPhone'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'Event' AND column_name = 'eventPhone';

-- 4. Summary: All whitelist-related columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN (table_name = 'Client' AND column_name = 'isWhitelistClient' AND data_type = 'boolean' AND is_nullable = 'NO') THEN '✓ CORRECT'
        WHEN (table_name = 'Event' AND column_name IN ('eventName', 'eventPhone') AND data_type = 'text' AND is_nullable = 'YES') THEN '✓ CORRECT'
        ELSE '⚠ CHECK'
    END as verification
FROM information_schema.columns
WHERE (table_name = 'Client' AND column_name = 'isWhitelistClient')
   OR (table_name = 'Event' AND column_name IN ('eventName', 'eventPhone'))
ORDER BY table_name, column_name;

-- 5. Data statistics
SELECT 
    'Client Statistics' as report_section,
    COUNT(*) as total_clients,
    COUNT(*) FILTER (WHERE "isWhitelistClient" = true) as whitelist_clients,
    COUNT(*) FILTER (WHERE "isWhitelistClient" = false) as regular_clients
FROM "Client"
UNION ALL
SELECT 
    'Event Statistics' as report_section,
    COUNT(*)::text as total_events,
    COUNT(*) FILTER (WHERE "eventName" IS NOT NULL)::text as events_with_name,
    COUNT(*) FILTER (WHERE "eventPhone" IS NOT NULL)::text as events_with_phone
FROM "Event";

