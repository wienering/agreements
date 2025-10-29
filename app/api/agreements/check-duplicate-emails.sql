-- Check for duplicate emails in Client table
-- Run this before applying the unique constraint

SELECT 
    email, 
    COUNT(*) as duplicate_count,
    STRING_AGG(id, ', ') as client_ids
FROM "Client" 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- If this query returns no rows, it's safe to add the unique constraint
-- If it returns rows, you need to handle the duplicates first
