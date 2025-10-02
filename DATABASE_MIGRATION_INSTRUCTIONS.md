# Database Migration Instructions

## Problem
The event fields (eventType, eventLocation, eventStartTime, eventDuration, eventPackage) are not being saved because the database columns don't exist yet.

## Solution
You need to run a database migration to add these columns to the Client table.

## Steps to Fix

### Option 1: Using Prisma (Recommended)
1. Update your database password in the `.env` file
2. Run: `npx prisma migrate dev --name add_event_fields_to_client`

### Option 2: Manual SQL (If Prisma doesn't work)
1. Connect to your database using your preferred database admin tool
2. Run this SQL:

```sql
ALTER TABLE "Client" 
ADD COLUMN "eventType" TEXT,
ADD COLUMN "eventLocation" TEXT,
ADD COLUMN "eventStartTime" TEXT,
ADD COLUMN "eventDuration" TEXT,
ADD COLUMN "eventPackage" TEXT;
```

### Option 3: Using the provided SQL file
1. Open `run-migration.sql` in this directory
2. Copy the SQL and run it in your database

## After Migration
Once the migration is complete:
1. The event fields will be saved properly
2. All smart fields will work correctly
3. The preview will show actual client data

## Verification
After running the migration, test by:
1. Creating a new client with event fields
2. Editing an existing client with event fields
3. Checking that the data persists after page refresh
