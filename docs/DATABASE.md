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
  DRAFT      // Initial state, being prepared
  SENT       // Sent to client (deprecated, use LIVE)
  SIGNED     // Digitally signed by client
  VOID       // Voided/invalid
  LIVE       // Active and sent to client
  COMPLETED  // Event completed
  CANCELLED  // Cancelled by admin or client
}
```

**Status Flow**:
```
DRAFT → LIVE → SIGNED → COMPLETED
  ↓       ↓
VOID   CANCELLED
```

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

**Relationships**:
- `agreements`: One-to-many with Agreement

**Indexes**:
- `displayOrder` - For ordered display

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
    status: 'LIVE',
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

## Migrations

Migrations are located in `prisma/migrations/`. Key migrations:

1. **20251001210413_init** - Initial schema
2. **20241202000000_add_event_fields_to_client** - Added event fields (deprecated)
3. **20241202000001_add_event_fields** - Event field additions
4. **20241202000002_update_agreement_status_enum** - Status enum updates
5. **20250104000000_add_event_model** - New Event model
6. **20250105000000_add_whitelist_client_fields** - Whitelabel functionality (renamed from whitelist)

### Running Migrations

```bash
# Apply pending migrations
npx prisma migrate deploy

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset
```

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

