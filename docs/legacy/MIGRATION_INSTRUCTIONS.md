# Database Migration Instructions

## Quick Start

Run this single SQL file to add all portal enhancement features to your database:

```bash
psql $DATABASE_URL -f app/api/agreements/portal/complete-migration.sql
```

Or if you're using a specific database connection:

```bash
psql -h your-host -U your-user -d your-database -f app/api/agreements/portal/complete-migration.sql
```

## What This Migration Does

### 1. **Agreement Table - New Columns**
- `paymentStatus` - Track payment status (e.g., "Deposit paid", "Balance due", "Fully paid")
- `stripePaymentLink` - Link to Stripe payment page
- `stripeReceiptLink` - Link to Stripe receipt/invoice
- `galleryLink` - Link to event photo gallery
- `nextAction` - Display next step to client (e.g., "Template approval pending")
- `backdropLinkId` - Reference to backdrop selection link

### 2. **New BackdropLink Table**
Creates a table to manage flexible backdrop selection links:
- `id` - Primary key
- `name` - Display name for admin dropdown
- `url` - Actual URL to redirect to
- `displayOrder` - For sorting options
- `createdAt`, `updatedAt` - Timestamps

### 3. **Client Table Updates**
- Makes `email` column **unique** (required for portal authentication)
- ⚠️ **Important**: The migration will check for duplicate emails first!

### 4. **ClientSession Table Updates**
- Changes from `clientId` to `clientEmail` for authentication
- Updates foreign key relationship to use `Client.email`
- Automatically migrates existing session data

### 5. **Indexes & Constraints**
- Adds indexes for better query performance
- Creates foreign key constraints for data integrity
- Includes sample backdrop links (optional - can be removed)

## Pre-Migration Checklist

### ⚠️ Check for Duplicate Emails

Before running the migration, check if you have duplicate emails in the Client table:

```sql
SELECT email, COUNT(*) 
FROM "Client" 
GROUP BY email 
HAVING COUNT(*) > 1;
```

**If duplicates exist**, you need to resolve them first. Options:
1. Update duplicate emails to make them unique
2. Delete duplicate client records
3. Merge duplicate clients into one

### 📋 Backup Your Database

Always backup before running migrations:

```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use your hosting provider's backup tool
```

## Running the Migration

### Option 1: Direct SQL File

```bash
psql $DATABASE_URL -f app/api/agreements/portal/complete-migration.sql
```

### Option 2: Using Prisma Migrate (Recommended)

```bash
# Generate a migration from your schema
npx prisma migrate dev --name add_portal_enhancements

# Or apply migrations to production
npx prisma migrate deploy
```

### Option 3: Copy-Paste in Database GUI

If you're using a GUI tool (TablePlus, pgAdmin, etc.):
1. Open `app/api/agreements/portal/complete-migration.sql`
2. Copy the entire contents
3. Paste into your SQL query window
4. Execute

## Verification

After running the migration, verify everything worked:

```sql
-- Check new Agreement columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Agreement' 
AND column_name IN ('paymentStatus', 'galleryLink', 'nextAction', 'backdropLinkId');

-- Check BackdropLink table exists
SELECT * FROM "BackdropLink";

-- Check Client.email is unique
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'Client' 
AND constraint_name = 'Client_email_key';

-- Check ClientSession uses clientEmail
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'ClientSession' 
AND column_name = 'clientEmail';
```

## Rollback (If Needed)

If something goes wrong, you can rollback using your backup:

```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

## After Migration

1. **Regenerate Prisma Client** (if using Prisma):
   ```bash
   npx prisma generate
   ```

2. **Restart your application** to pick up the new schema

3. **Test the portal features**:
   - Try accessing the client portal dashboard
   - Check that agreement cards show correctly
   - Verify admin can update payment/gallery links

## Common Issues

### Issue: "Duplicate emails found"
**Solution**: Run the duplicate check query above and resolve duplicates before re-running migration

### Issue: "Foreign key constraint fails"
**Solution**: Ensure BackdropLink table is created before the foreign key constraint is added (the migration handles this automatically)

### Issue: "ClientSession data lost"
**Solution**: The migration automatically copies `clientId` data to `clientEmail` by joining with the Client table. If you have orphaned sessions (sessions without matching clients), they will remain but won't work until clientEmail is populated.

## Support

If you encounter issues:
1. Check the migration output messages (RAISE NOTICE statements)
2. Verify your PostgreSQL version is 10+ (for IF NOT EXISTS support)
3. Ensure you have sufficient privileges (CREATE TABLE, ALTER TABLE, CREATE INDEX)

## Customization

### Remove Sample Backdrop Links

If you don't want the default backdrop links, comment out or remove STEP 7 from the migration file before running.

### Add Your Own Backdrop Links

Edit STEP 7 in `complete-migration.sql` to add your custom backdrop URLs:

```sql
INSERT INTO "BackdropLink" ("id", "name", "url", "displayOrder")
VALUES 
    ('my-backdrop-1', 'My Custom Backdrop', 'https://example.com/backdrops/1', 1),
    ('my-backdrop-2', 'Another Backdrop', 'https://example.com/backdrops/2', 2)
ON CONFLICT ("id") DO NOTHING;
```

