# Features Documentation

## Overview

This document provides both high-level overview and detailed technical documentation for all major features of the Photobooth Guys Agreements system.

---

## Templates System

### Overview

The Templates system allows administrators to create reusable agreement templates with HTML content and smart field placeholders. Templates can be customized with field definitions and ordered for display.

### High-Level Flow

1. Admin creates template with HTML content
2. Template includes smart field placeholders (e.g., `{{client.firstName}}`)
3. When agreement is created, template is linked
4. Smart fields are replaced with actual data when:
   - Agreement is sent via email
   - Agreement is displayed to client
   - PDF is generated
   - Agreement is signed (snapshot created)

### Technical Implementation

**Database Model**: `Template`

**Key Files**:
- `app/api/templates/route.ts` - CRUD operations
- `app/api/agreements/portal/shared/agreement-utils.ts` - Smart field processing

**Smart Field Processing**:

```typescript
function processHtmlContent(html: string, client: any, agreementId: string, event: any = null): string {
  let processedHtml = html;
  
  // Client fields
  processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
  processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
  // ... more replacements
  
  // Event fields (prefer event model, fallback to client)
  const eventDate = event ? event.eventDate : client.eventDate;
  processedHtml = processedHtml.replace(/\{\{client\.eventDate\}\}/g, 
    eventDate ? new Date(eventDate).toLocaleDateString() : '');
  
  return processedHtml;
}
```

**Field Types**:
- Text fields
- Date fields (formatted)
- Price fields (formatted as currency)
- Optional fields (empty string if not provided)

**Template Ordering**:
- Templates have an `order` field
- New templates get highest order + 1
- Can be reordered via `/api/templates/reorder`

---

## Agreements Flow

### Overview

Agreements are the core entity linking clients, templates, and events. They progress through statuses: DRAFT → LIVE → SIGNED → COMPLETED.

### High-Level Lifecycle

```
1. CREATE
   Admin creates agreement (DRAFT status)
   ├─ Links to Client
   ├─ Links to Template
   └─ Optionally links to Event

2. SEND
   Admin sends agreement to client
   ├─ Processes template HTML (smart fields)
   ├─ Generates unique access link
   ├─ Sends email via SMTP
   └─ Updates status to LIVE

3. VIEW
   Client views agreement
   ├─ Validates token & expiration
   ├─ Processes template HTML
   └─ Tracks view (firstViewedAt, viewCount)

4. SIGN
   Client signs agreement
   ├─ Validates client info (name, email)
   ├─ Creates HTML snapshot (mergedHtml)
   ├─ Updates status to SIGNED
   ├─ Saves signature metadata (IP, timestamp)
   └─ Sends notification emails

5. COMPLETE
   Admin marks as completed
   ├─ Updates status to COMPLETED
   └─ Auto-archives agreement
```

### Technical Implementation

**Status Enum**:
```typescript
enum AgreementStatus {
  DRAFT      // Initial state
  LIVE       // Sent to client
  SIGNED     // Digitally signed
  COMPLETED  // Event completed
  CANCELLED  // Cancelled
  VOID       // Invalid
}
```

**Key Endpoints**:
- `POST /api/agreements` - Create
- `POST /api/agreements/send` - Send email
- `POST /api/agreements/sign` - Sign agreement
- `PUT /api/agreements/update-status` - Update status

**HTML Snapshot**:
When an agreement is signed, the processed HTML is saved to `mergedHtml` field. This ensures:
- Signed agreements cannot be tampered with
- PDF generation uses exact signed content
- Historical record of what was signed

**Expiration Handling**:
- Agreements can have optional `expiresAt` date
- Expired agreements cannot be signed (except SIGNED agreements)
- Expiration is checked on view and sign operations

**Email Tracking**:
- `emailSendCount` - Tracks number of emails sent
- `lastEmailedAt` - Last email timestamp
- Email content changes based on send count (first, reminder, final notice)

---

## Client Portal

### Overview

The Client Portal allows clients to access their agreements, update information, and manage their account without admin intervention.

### High-Level Features

1. **Email-based Authentication**
   - Client requests access with email
   - Receives 6-digit verification code
   - Enters code to create session

2. **Dashboard**
   - View all agreements
   - Filter by status
   - Search agreements
   - View agreement details

3. **Self-Service**
   - Update phone/address
   - Add notes to agreements
   - Download PDFs
   - Export data

### Technical Implementation

**Authentication Flow**:

```typescript
// 1. Request access
POST /api/agreements/portal/request-access
// Generates 6-digit code, stores in memory (production: Redis)
// Sends email with code

// 2. Verify code
POST /api/agreements/portal/verify-access
// Validates code
// Creates ClientSession with 90-minute expiration
// Returns session token

// 3. Use token
Authorization: Bearer <session_token>
```

**Session Management**:
- Sessions stored in `ClientSession` table
- Token: 32-byte hex string
- Expiration: 90 minutes
- Auto-refresh: Extends if expires within 15 minutes
- Last activity tracking

**Rate Limiting**:
- 5 verification requests per 15 minutes per IP
- Prevents abuse and spam
- Returns 429 status with retry-after header

**Verification Code Storage**:
- Currently: In-memory Map
- Production recommendation: Redis with TTL
- Code expiration: 15 minutes
- Code format: 6-digit numeric

**Security Considerations**:
- Codes are single-use
- Codes expire after 15 minutes
- Rate limiting prevents brute force
- Session tokens are cryptographically random
- IP tracking for audit

---

## Admin Dashboard

### Overview

The Admin Dashboard provides comprehensive analytics, business intelligence, and management tools for administrators.

### High-Level Features

1. **Overview Dashboard**
   - Total agreements, clients, templates
   - Status distribution
   - Recent activity
   - Upcoming events
   - Trend indicators

2. **Enhanced Dashboard** (Business Intelligence)
   - Revenue analytics
   - Client retention metrics
   - Audit log analysis
   - Pipeline conversion rates

3. **Pipeline Analytics**
   - Stage-by-stage breakdown
   - Conversion rates
   - Drop-off analysis
   - Average time to sign

### Technical Implementation

**Analytics Endpoints**:
- `GET /api/analytics` - Overview
- `GET /api/analytics/pipeline` - Pipeline metrics
- `GET /api/analytics/revenue` - Revenue tracking
- `GET /api/analytics/retention` - Client retention
- `GET /api/analytics/audit` - Audit analysis
- `GET /api/analytics/warnings` - System warnings

**Data Aggregation**:
- Uses Prisma groupBy for status counts
- Calculates conversion rates between stages
- Tracks time-based metrics (days to sign, etc.)
- Supports time period filtering (week, month, year)

**Revenue Tracking**:
- Aggregates `packagePrice` from Events
- Calculates total and average revenue
- Groups by month for trends
- Identifies top revenue clients

**Pipeline Metrics**:
```typescript
// Conversion rates
draftToLiveRate = (live + signed + completed) / total * 100
liveToSignedRate = signed / (live + signed + completed) * 100
signedToCompletedRate = completed / signed * 100

// Average time to sign
avgTimeToSign = average(signedAt - lastEmailedAt) in days
```

**Charts and Visualization**:
- Uses Recharts library
- Monthly/weekly/yearly breakdowns
- Status distribution pie charts
- Timeline visualizations

---

## E-Signature

### Overview

The E-Signature system provides legally binding digital signatures with full audit trail and content snapshotting.

### Overview

1. Client verifies identity (name + email)
2. System creates HTML snapshot
3. Signature metadata saved
4. Status updated to SIGNED
5. Notification emails sent

### Technical Implementation

**Signature Process** (`POST /api/agreements/sign`):

```typescript
// 1. Validate token and expiration
const agreement = await prisma.agreement.findFirst({
  where: {
    uniqueToken: token,
    expiresAt: { gte: new Date() }
  }
});

// 2. Verify client information
const clientName = `${agreement.client.firstName} ${agreement.client.lastName}`.toLowerCase();
if (clientName !== providedName.toLowerCase()) {
  return error('Client information does not match');
}

// 3. Check if already signed
if (agreement.status === 'SIGNED') {
  return error('Already signed');
}

// 4. Create HTML snapshot
const signedHtmlContent = processHtmlContent(
  agreement.template.htmlContent,
  agreement.client,
  agreement.id,
  agreement.event
);

// 5. Update agreement
await prisma.agreement.update({
  where: { id: agreement.id },
  data: {
    status: 'SIGNED',
    signedAt: new Date(),
    signedFromIP: clientIP,
    mergedHtml: signedHtmlContent // Snapshot
  }
});
```

**Signature Model**:
- Stores signer name and email
- Records IP address
- Records user agent
- Timestamp (Toronto timezone)
- Optional: signature image URL (for drawn signatures)
- Optional: content hash for verification

**Security Measures**:
- Client identity verification (name + email must match)
- IP address tracking
- Content snapshot prevents tampering
- Signed agreements cannot be modified (except status to COMPLETED/CANCELLED)
- Audit trail in AuditLog

**Legal Considerations**:
- Email verification required
- Identity confirmation
- Timestamp recording
- IP address logging
- Content preservation

---

## Email System

### Overview

The Email System handles all email communications including agreement sending, notifications, and portal access codes.

### High-Level Features

1. **Agreement Emails**
   - Initial send with agreement link
   - Reminder emails (2nd send)
   - Final notice emails (3rd+ sends)
   - Different messaging based on send count

2. **Notification Emails**
   - Agreement signed notification (to admin)
   - Client thank you email (after signing)
   - View tracking alerts (first view)

3. **Portal Emails**
   - Verification code emails
   - Access confirmation

### Technical Implementation

**SMTP Configuration**:
```typescript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});
```

**Email Templates**:
- HTML-based templates
- Responsive design
- Branded with Photobooth Guys styling
- Includes action buttons
- Timezone-aware (America/Toronto)

**Email Types**:

1. **Agreement Send Email**:
   - Subject varies by send count
   - Includes agreement preview
   - Prominent "Review & Sign" button
   - Expiration date warning
   - Urgency messaging based on send count

2. **Signed Notification** (to admin):
   - Agreement details
   - Client information
   - Signature metadata
   - Link to view agreement

3. **Thank You Email** (to client):
   - Confirmation of signing
   - Agreement summary
   - Next steps
   - Portal access information

4. **Verification Code Email**:
   - 6-digit code prominently displayed
   - Security notice
   - Expiration information

**Error Handling**:
- SMTP connection verification before sending
- Timeout handling (15 seconds)
- Graceful fallback (returns link if email fails)
- Logging for debugging

**Email Tracking**:
- `emailSendCount` incremented on each send
- `lastEmailedAt` updated
- Different content based on send count

---

## PDF Generation

### Overview

The PDF Generation system creates downloadable PDF documents from signed agreements.

### High-Level Flow

1. Client or admin requests PDF
2. System loads agreement (must be SIGNED)
3. Uses saved HTML snapshot (mergedHtml)
4. Converts HTML to PDF
5. Returns PDF file

### Technical Implementation

**Library**: jsPDF 3.0.3

**PDF Generation Process**:

```typescript
// 1. Load agreement
const agreement = await prisma.agreement.findFirst({
  where: {
    uniqueToken: token,
    status: 'SIGNED'
  }
});

// 2. Use snapshot or process template
let processedHtml;
if (agreement.status === 'SIGNED' && agreement.mergedHtml) {
  processedHtml = agreement.mergedHtml; // Use snapshot
} else {
  processedHtml = processHtmlContent(...); // Process template
}

// 3. Convert HTML to text
const formattedText = convertHtmlToText(processedHtml);

// 4. Generate PDF
const doc = new jsPDF('p', 'mm', 'letter');
// Add content with proper formatting
// Include client info, event details, agreement content, signature info

// 5. Return PDF
return new NextResponse(pdfBuffer, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="agreement-...pdf"`
  }
});
```

**HTML to Text Conversion**:
- Removes HTML tags
- Preserves structure (paragraphs, lists)
- Formats headings
- Handles line breaks

**PDF Content**:
- Header: "AGREEMENT DOCUMENT"
- Client Information section
- Event Details section
- Agreement Content (formatted text)
- Digital Signature section (metadata)
- Footer: Legal notice

**File Naming**:
- Format: `agreement-{firstName}-{lastName}-{id}.pdf`
- Sanitized for filesystem compatibility

**Limitations**:
- Only works for SIGNED agreements
- HTML formatting is simplified (text-based)
- Images not supported (text only)
- Complex layouts may not render perfectly

---

## Event Management

### Overview

The Event Management system tracks event details separately from client information, allowing multiple events per client.

### High-Level Features

1. **Event Creation**
   - Link to client
   - Store event details (date, type, location, etc.)
   - Package and pricing information

2. **Event Linking**
   - Agreements can link to specific events
   - Smart fields use event data when available
   - Fallback to client data for backward compatibility

3. **Event Archiving**
   - Soft delete (archived flag)
   - Preserves historical data
   - Filters active events in queries

### Technical Implementation

**Event Model**:
- `clientId` - Foreign key to Client
- Event details (date, type, location, etc.)
- Package information (name, price)
- Notes field
- Archive flag

**Data Priority**:
When processing smart fields:
1. Use Event data if `agreement.eventId` exists
2. Fallback to Client event fields (deprecated)
3. Use empty string if neither available

**Event Creation**:
- Can be created via `/api/events` endpoint
- Can be created automatically via Bookly webhook
- Can be created when creating/updating client with event data

**Backward Compatibility**:
- Client model still has deprecated event fields
- System checks Event model first, then Client fields
- Migration path: Move data from Client to Event model

---

## Analytics & Reporting

### Overview

The Analytics system provides comprehensive business intelligence and reporting capabilities.

### High-Level Features

1. **Overview Analytics**
   - Total counts (agreements, clients, templates)
   - Status distribution
   - Conversion rates
   - Trend indicators

2. **Pipeline Analytics**
   - Stage-by-stage breakdown
   - Conversion rates between stages
   - Drop-off analysis
   - Average time metrics

3. **Revenue Analytics**
   - Total and average revenue
   - Revenue by time period
   - Top revenue clients

4. **Retention Analytics**
   - New vs returning clients
   - Retention rate
   - Client lifetime value

5. **Audit Analytics**
   - Action tracking
   - Activity breakdown
   - Recent actions timeline

### Technical Implementation

**Data Aggregation**:
- Uses Prisma `groupBy` for counts
- Calculates percentages and rates
- Time-based filtering (days parameter)
- Period grouping (week, month, year)

**Pipeline Metrics**:
```typescript
// Stage counts
const statusCounts = await prisma.agreement.groupBy({
  by: ['status'],
  where: { createdAt: { gte: startDate }, archived: false },
  _count: { id: true }
});

// Conversion rates
const draftToLiveRate = (live + signed + completed) / total * 100;
const liveToSignedRate = signed / (live + signed + completed) * 100;

// Average time to sign
const avgTimeToSign = average(signedAt - lastEmailedAt) in days;
```

**Revenue Calculation**:
- Aggregates `packagePrice` from Events
- Filters by date range
- Groups by month for trends
- Calculates totals and averages

**Performance Considerations**:
- Efficient database queries with indexes
- Pagination for large datasets
- Caching opportunities (future enhancement)
- Time-based filtering to limit data

**Visualization**:
- Chart data formatted for Recharts
- Status distribution for pie charts
- Time series data for line charts
- Metric cards for key indicators

---

## Additional Features

### Backdrop Links

- Admin can manage backdrop options
- Clients can select backdrops for agreements
- Stored in `BackdropLink` model
- Ordered display via `displayOrder`

### Client Notes

- Notes can be attached to clients or agreements
- Stored in `ClientNote` model
- Can be added via admin or client portal
- Timestamped and linked to creator

### Audit Logging

- All significant actions logged
- Stored in `AuditLog` model
- Includes actor, action, metadata
- Used for analytics and compliance

### Quick Actions

- Admin can perform bulk operations
- Status updates
- Batch email sending
- Export functionality

### View Tracking

- Tracks when agreements are viewed
- First view timestamp
- View count
- Last view timestamp
- Email alerts on first view

