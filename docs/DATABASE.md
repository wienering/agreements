# Database Schema Documentation

## Overview

The application uses PostgreSQL as the primary database, managed through Prisma ORM. The schema is defined in `prisma/schema.prisma` and uses Prisma's relation mode for compatibility with various PostgreSQL setups.

## Schema Configuration

```prisma
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}
```

## Models

### User

Admin users for the system (used by NextAuth).

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| email | String (unique) | User email address |
| name | String? | User's full name |
| createdAt | DateTime | Account creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relationships**: None (NextAuth manages separately)

---

### Client

Customer/client information. Each client can have multiple events and agreements.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| firstName | String | Client's first name |
| lastName | String | Client's last name |
| email | String (unique) | Client email address |
| phone | String? | Phone number |
| address | String? | Physical address |
| notes | String? | General notes |
| isWhitelabelClient | Boolean | Portal access whitelabel flag |
| addressAddedAt | DateTime? | When address was added |
| phoneAddedAt | DateTime? | When phone was added |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Deprecated Fields** (use Event model instead):
- `eventDate`, `eventType`, `eventLocation`, `eventStartTime`, `eventDuration`, `eventPackage`, `packagePrice`

**Relationships**:
- `agreements`: One-to-many with Agreement
- `sessions`: One-to-many with ClientSession
- `clientNotes`: One-to-many with ClientNote
- `events`: One-to-many with Event

**Indexes**: None explicitly defined (Prisma creates indexes for unique fields)

---

### Event

Event details linked to clients. Replaces deprecated client event fields.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| clientId | String | Foreign key to Client |
| eventDate | DateTime? | Event date/time |
| eventType | String? | Type of event |
| eventLocation | String? | Event location |
| eventStartTime | String? | Start time |
| eventDuration | String? | Duration |
| eventPackage | String? | Package name |
| packagePrice | Decimal(10,2)? | Package price |
| eventName | String? | Custom event name |
| eventPhone | String? | Event-specific phone |
| notes | String? | Event notes |
| archived | Boolean | Archive flag |
| archivedAt | DateTime? | Archive timestamp |
| createdAt | DateTime | Record creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relationships**:
- `client`: Many-to-one with Client (onDelete: Cascade)
- `agreements`: One-to-many with Agreement

**Indexes**:
- `clientId` - For efficient client queries
- `archived` - For filtering active events

---

### Template

Agreement templates with HTML content and field definitions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| title | String | Template display title |
| internalTitle | String? | Internal reference title |
| htmlContent | String | Template HTML with smart fields |
| fieldsSchema | Json | Field definitions (JSON) |
| version | Int | Template version number |
| order | Int | Display order |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relationships**:
- `agreements`: One-to-many with Agreement
- `fields`: One-to-many with AgreementField

**Indexes**: None explicitly defined

---

### Agreement

Core agreement records. Links clients, templates, and optional events.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| clientId | String | Foreign key to Client |
| templateId | String | Foreign key to Template |
| eventId | String? | Foreign key to Event (optional) |
| status | AgreementStatus | Current status (enum) |
| uniqueToken | String (unique) | Public access token |
| expiresAt | DateTime? | Expiration date/time |
| mergedHtml | String? | Snapshot of signed HTML |
| signedAt | DateTime? | Signature timestamp |
| signedFromIP | String? | IP address at signing |
| cancelledAt | DateTime? | Cancellation timestamp |
| cancelledBy | String? | Who cancelled |
| cancellationReason | String? | Cancellation reason |
| archived | Boolean | Archive flag |
| archivedAt | DateTime? | Archive timestamp |
| lastEmailedAt | DateTime? | Last email send time |
| emailSendCount | Int | Number of emails sent |
| firstViewedAt | DateTime? | First view timestamp |
| lastViewedAt | DateTime? | Last view timestamp |
| viewCount | Int | Total view count |
| paymentStatus | String? | Payment status |
| stripePaymentLink | String? | Stripe payment link |
| stripeReceiptLink | String? | Stripe receipt link |
| galleryLink | String? | Photo gallery link |
| nextAction | String? | Next action indicator |
| backdropLinkId | String? | Foreign key to BackdropLink |
| selectedBackdropName | String? | Selected backdrop name |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relationships**:
- `client`: Many-to-one with Client
- `template`: Many-to-one with Template
- `event`: Many-to-one with Event (optional, onDelete: SetNull)
- `backdropLink`: Many-to-one with BackdropLink (optional, onDelete: SetNull)
- `fields`: One-to-many with AgreementFieldValue
- `signature`: One-to-one with Signature
- `auditLogs`: One-to-many with AuditLog
- `notes`: One-to-many with ClientNote

**Indexes**: 
- `uniqueToken` - Unique index for public access

---

### AgreementStatus Enum

```prisma
enum AgreementStatus {
  DRAFT      // Being prepared. Never moved to SENT automatically.
  SENT       // Emailed to the client, not fully signed yet
  SIGNED     // Fully signed (every required signer)
  VOID       // Old value, unused. Removed in the status cleanup.
  LIVE       // Old name for SENT. Read as SENT, never written. Removed in the status cleanup.
  COMPLETED  // Signed, and the event is over
  CANCELLED  // Cancelled by admin
}
```

**Status Flow**:
```
DRAFT → SENT → SIGNED → COMPLETED
                  ↓         ↓
              CANCELLED  CANCELLED
```

- Emailing a DRAFT makes it SENT. A two-signer agreement with one signature keeps its status.
- `isSigned()` (`lib/agreementStatus.ts`) is true for SIGNED and COMPLETED; use it wherever "signed" matters.
- By hand, SIGNED and COMPLETED never go back to DRAFT or SENT. COMPLETED can go to SIGNED or CANCELLED.
- The daily balance-digest cron moves SIGNED to COMPLETED on the Toronto day after the event
  (production only). Status only: it logs `AUTO_COMPLETED` and sends nothing.

**Payment status** is one of `PAYMENT_STATUSES` in `lib/paymentStatus.ts`: Not paid, Invoice issued,
Deposit paid, Balance due, Fully paid. New agreements start as Not paid. Every writer stores the list
value; `normalizePaymentStatus()` maps other capitalisations, and the old "Paid" / "Balance Paid", to it.

**Archiving**: `archived` is separate from status. Archiving an agreement archives its Event once every
agreement on that Event is archived; unarchiving an agreement unarchives its Event (`lib/agreements/archiveSync.ts`).

---

### AgreementField

Field definitions for templates. Defines what fields can be used in templates.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| templateId | String | Foreign key to Template |
| key | String | Field key (e.g., "clientName") |
| label | String | Display label |
| type | String | Field type (text, number, date, etc.) |
| editableByClient | Boolean | Can client edit this field |
| required | Boolean | Is field required |

**Relationships**:
- `template`: Many-to-one with Template

**Constraints**:
- Unique constraint on `[templateId, key]` - prevents duplicate fields per template

---

### AgreementFieldValue

Values for agreement-specific fields. Stores actual values for each agreement.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| agreementId | String | Foreign key to Agreement |
| key | String | Field key (matches AgreementField) |
| value | String | Field value |

**Relationships**:
- `agreement`: Many-to-one with Agreement

**Constraints**:
- Unique constraint on `[agreementId, key]` - one value per field per agreement

---

### Signature

E-signature metadata and audit information.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| agreementId | String (unique) | Foreign key to Agreement |
| signerName | String | Signer's full name |
| signerEmail | String | Signer's email |
| method | String | Signature method (email, typed, drawn) |
| imageUrl | String? | Signature image URL (if drawn) |
| typedFont | String? | Font used for typed signature |
| signedAt | DateTime | Signature timestamp |
| ip | String? | IP address at signing |
| userAgent | String? | Browser user agent |
| contentHash | String? | Content hash for verification |

**Relationships**:
- `agreement`: One-to-one with Agreement

**Indexes**:
- `agreementId` - Unique index (one signature per agreement)

---

### AuditLog

Activity tracking for agreements and system actions.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| agreementId | String? | Foreign key to Agreement (optional) |
| actor | String | Who performed the action |
| action | String | Action description |
| metadata | Json? | Additional action data |
| createdAt | DateTime | Action timestamp |

**Relationships**:
- `agreement`: Many-to-one with Agreement (optional)

**Indexes**: None explicitly defined

---

### ClientSession

Client portal session management.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| clientEmail | String | Foreign key to Client.email |
| sessionToken | String (unique) | Session authentication token |
| expiresAt | DateTime | Session expiration |
| createdAt | DateTime | Session creation |
| lastActivityAt | DateTime | Last activity timestamp |

**Relationships**:
- `client`: Many-to-one with Client (via email)

**Indexes**:
- `clientEmail` - For efficient client session queries
- `sessionToken` - Unique index for authentication

---

### ClientNote

Notes attached to clients or agreements.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| clientId | String | Foreign key to Client |
| agreementId | String? | Foreign key to Agreement (optional) |
| content | String | Note content |
| createdAt | DateTime | Note creation timestamp |

**Relationships**:
- `client`: Many-to-one with Client
- `agreement`: Many-to-one with Agreement (optional)

**Indexes**:
- `clientId` - For client note queries
- `agreementId` - For agreement note queries

---

### BackdropLink

Backdrop selection options for agreements.

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| name | String | Backdrop name |
| url | String | Backdrop image/link URL |
| displayOrder | Int | Display order |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |
| attendantId | String? | Foreign key to Attendant |

**Relationships**:
- `agreements`: One-to-many with Agreement
- `attendant`: Many-to-one with Attendant (optional, onDelete: SetNull)

**Indexes**:
- `displayOrder` - For ordered display
- `attendantId` - For attendant lookups

---

### Attendant

A person who runs events. An agreement's attendant is the attendant behind its backdrop link.

| Field | Type | Description |
|-------|------|-------------|
| id | String (CUID) | Primary key |
| name | String | Display name |
| email | String? | Admin-only contact email |
| phone | String? | Admin-only contact phone |
| active | Boolean | Inactive attendants keep their history but are flagged in pickers |
| externalId | String (unique) | The attendant's ID in the backdrop selection tool. Hub, job-page and backdrop links use it, so it never changes |
| notes | String? | Admin notes |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

**Relationships**:
- `backdropLinks`: One-to-many with BackdropLink

Created from existing backdrop links by `scripts/backfill-attendants.ts` (dry run by default, `--apply` to write; safe to re-run). Double-booking buffers live in `Settings` under `attendantConflictBuffers`.

---

## Relationship Diagram

```
┌─────────┐
│  User   │ (NextAuth, separate)
└─────────┘

┌──────────┐
│  Client  │
└────┬─────┘
     │
     ├───1:N───> Event
     │
     ├───1:N───> Agreement
     │            │
     │            ├───N:1───> Template
     │            │
     │            ├───N:1───> Event (optional)
     │            │
     │            ├───1:1───> Signature
     │            │
     │            ├───1:N───> AgreementFieldValue
     │            │
     │            ├───1:N───> AuditLog
     │            │
     │            └───1:N───> ClientNote
     │
     ├───1:N───> ClientSession
     │
     └───1:N───> ClientNote

┌──────────┐
│ Template │
└────┬─────┘
     │
     ├───1:N───> Agreement
     │
     └───1:N───> AgreementField

┌──────────┐
│BackdropLink│
└────┬─────┘
     │
     └───1:N───> Agreement
```

## Query Patterns

### Common Queries

**Get agreement with all related data:**
```typescript
const agreement = await prisma.agreement.findUnique({
  where: { id: agreementId },
  include: {
    client: true,
    template: true,
    event: true,
    signature: true,
    fields: true,
    backdropLink: true
  }
});
```

**Get client with all agreements:**
```typescript
const client = await prisma.client.findUnique({
  where: { id: clientId },
  include: {
    agreements: {
      include: {
        template: true,
        event: true
      },
      orderBy: { createdAt: 'desc' }
    },
    events: {
      where: { archived: false },
      orderBy: { eventDate: 'asc' }
    }
  }
});
```

**Get agreements by status:**
```typescript
const agreements = await prisma.agreement.findMany({
  where: {
    status: 'SENT',
    archived: false,
    expiresAt: {
      gte: new Date()
    }
  },
  include: {
    client: true,
    template: true
  }
});
```

## Post-event follow-ups

Fields on `Agreement` used by the automatic gallery email and review request (`lib/followups/`):

| Field | Meaning |
|-------|---------|
| galleryEmailSentAt | When the gallery email first went out, by the cron or "Send now". Starts the 3-day review clock. Claimed atomically before sending and cleared again if the send fails. "Resend" doesn't change it |
| reviewRequestSentAt | When the one and only review request went out, automatic or manual. Claimed the same way |
| followUpsPaused | Pauses both emails. Anything that came due while paused goes out on the next 10am run after unpausing |
| reviewReceived | "Already reviewed": the review request is skipped |
| galleryHeldAlertAt | When the one-time "held, balance owing" Telegram alert went out |

The cron (`/api/cron/post-event-followups`) runs at 14:00 and 15:00 UTC and only acts in the 10am Toronto hour. Agreements with an event before `FOLLOWUPS_LAUNCH_DATE` (default in `lib/followups/rules.ts`) are never emailed automatically. Outside production (`VERCEL_ENV` not `production`), every send is a dry run.

## Migrations

`prisma/migrations/0_baseline` holds the whole schema as of 2026-10-02. Production has it recorded as applied. The 26 migrations before it are kept for reference in `prisma/migrations_archive/` (with a backup of their `_prisma_migrations` rows) and are no longer used.

`DATABASE_URL` points at the production database, so **don't run `prisma migrate dev`, `prisma migrate reset` or `prisma db push`** against it. They can drop or rewrite data. Make schema changes this way instead:

### Making a schema change

Use Neon's **direct** connection for every command below, not the pooled one. Take `DATABASE_URL`, remove `-pooler` from the hostname, and drop the `pgbouncer`, `connection_limit` and `pool_timeout` parameters (keep `sslmode`). Put it in a `DIRECT_DATABASE_URL` environment variable for your terminal session only, and never commit it.

1. **Edit `prisma/schema.prisma`.**
2. **Create a folder** for the migration, named with a UTC timestamp and a short description:
   `prisma/migrations/20261015143000_add_deposit_due_date/`
3. **Generate the SQL** by comparing the live database with the edited schema. This only reads the database:
   ```bash
   npx prisma migrate diff \
     --from-url "$DIRECT_DATABASE_URL" \
     --to-schema-datamodel prisma/schema.prisma \
     --script \
     --output prisma/migrations/20261015143000_add_deposit_due_date/migration.sql
   ```
   Use `--output` rather than `>`: in Windows PowerShell 5.1, `>` writes UTF-16 and breaks the file.
4. **Review `migration.sql`.** Make sure it only does what you intended. Look hard at any `DROP`, `ALTER COLUMN ... TYPE`, or `NOT NULL` added to an existing table, which fails or loses data if rows already exist. Edit the SQL if needed (for example, add a default or backfill before a `NOT NULL`), then commit it with the schema change.
5. **Apply it** once the change is merged and you're ready:
   ```bash
   DATABASE_URL="$DIRECT_DATABASE_URL" npx prisma migrate deploy
   ```
   In PowerShell: `$env:DATABASE_URL = $env:DIRECT_DATABASE_URL; npx prisma migrate deploy`, then close that terminal.
6. **Check** with `DATABASE_URL="$DIRECT_DATABASE_URL" npx prisma migrate status`. It should say the database schema is up to date.

Run `npx prisma generate` (part of `npm run build`) so the Prisma client matches the new schema. Vercel builds only run `prisma generate`; they never apply migrations.

## Database Best Practices

1. **Always use transactions** for multi-step operations
2. **Use select** to limit fields when possible
3. **Index frequently queried fields**
4. **Use soft deletes** (archived flag) instead of hard deletes
5. **Validate data** at the API layer (Zod) before database operations
6. **Use connection pooling** in production
7. **Monitor query performance** with Prisma logging

## Backup and Recovery

- **Automated Backups**: Configure at database provider level
- **Migration Backups**: Keep migration files in version control
- **Data Export**: Use Prisma Studio or direct SQL exports
- **Recovery**: Restore from provider backups or migration rollback

