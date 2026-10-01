# Safe Database Migration Guide

## 🛡️ Data Safety First

This migration is designed to be **100% safe** and will **NOT** affect any existing data. All new columns are nullable and all new tables are separate from existing data.

## 📋 Pre-Migration Checklist

### 1. **Create Database Backup** (Recommended)
```bash
# Create a full database backup
pg_dump your_database > backup_before_portal_migration.sql

# Or use your preferred backup method
```

### 2. **Verify Current Data**
```sql
-- Check current data counts
SELECT 'Clients' as table_name, COUNT(*) as count FROM "Client"
UNION ALL
SELECT 'Agreements', COUNT(*) FROM "Agreement"
UNION ALL
SELECT 'Templates', COUNT(*) FROM "Template"
UNION ALL
SELECT 'Signatures', COUNT(*) FROM "Signature"
UNION ALL
SELECT 'AuditLogs', COUNT(*) FROM "AuditLog";
```

### 3. **Test in Development First**
- Run the migration on a copy of your production database
- Verify all existing functionality still works
- Test the new client portal features

## 🚀 Migration Steps

### Option A: Using Prisma (Recommended)
```bash
# 1. Generate Prisma client with new schema
npx prisma generate

# 2. Push schema changes (safe, non-destructive)
npx prisma db push

# 3. Verify migration
npx prisma studio
```

### Option B: Using SQL Scripts
```bash
# 1. Run the safe migration script
psql -d your_database -f portal/safe-migration.sql

# 2. Verify the migration
psql -d your_database -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('ClientSession', 'ClientNote');"
```

## ✅ Post-Migration Verification

### 1. **Check New Tables Exist**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('ClientSession', 'ClientNote');
```

### 2. **Check New Columns Exist**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Client' 
AND column_name IN ('address', 'phoneAddedAt', 'addressAddedAt');
```

### 3. **Verify Data Integrity**
```sql
-- All existing data should be intact
SELECT 'Clients' as table_name, COUNT(*) as count FROM "Client"
UNION ALL
SELECT 'Agreements', COUNT(*) FROM "Agreement"
UNION ALL
SELECT 'Templates', COUNT(*) FROM "Template";
```

### 4. **Test New Features**
- Test client portal login
- Test session management
- Test adding notes
- Test updating client info

## 🔄 Rollback Plan (If Needed)

If you need to undo the migration:

```bash
# Run the rollback script
psql -d your_database -f portal/rollback-migration.sql
```

**Note:** This will remove all client portal data (sessions, notes) but will preserve all original data.

## 📊 What the Migration Does

### ✅ **Safe Changes (No Data Loss)**
- Adds 3 new nullable columns to `Client` table
- Creates 2 new empty tables (`ClientSession`, `ClientNote`)
- Adds indexes for performance
- Adds foreign key constraints

### ❌ **What It Does NOT Do**
- Does NOT modify existing columns
- Does NOT delete any existing data
- Does NOT change existing table structures
- Does NOT affect existing functionality

## 🚨 Important Notes

1. **All new columns are nullable** - existing records will have `NULL` values
2. **New tables start empty** - no existing data is moved
3. **Foreign keys are added safely** - they reference existing data
4. **Indexes improve performance** - they don't affect data

## 🔍 Troubleshooting

### If Migration Fails
1. Check database permissions
2. Verify database connection
3. Check for existing constraints
4. Review error messages

### If Data Seems Missing
1. Check if you're looking at the right database
2. Verify table names (case-sensitive)
3. Check for schema differences
4. Compare with backup

### If Performance Issues
1. Check if indexes were created
2. Monitor query performance
3. Consider additional indexes if needed

## 📞 Support

If you encounter any issues:
1. Check the migration logs
2. Compare with the backup
3. Use the rollback script if necessary
4. Contact support with specific error messages

## ✅ Success Criteria

Migration is successful when:
- [ ] All new tables exist (`ClientSession`, `ClientNote`)
- [ ] All new columns exist in `Client` table
- [ ] All existing data counts remain the same
- [ ] Client portal API endpoints work
- [ ] Existing functionality is unaffected

---

**Remember:** This migration is designed to be safe and reversible. Your existing data will be preserved throughout the process.
