# API Reference

## Overview

The API is built using Next.js App Router route handlers. All endpoints return JSON responses and use standard HTTP status codes. Authentication is handled via NextAuth for admin routes and Bearer tokens for client portal routes.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: Set via `NEXT_PUBLIC_BASE_URL` environment variable

## Authentication

### Admin Routes

Admin routes require NextAuth session authentication. The middleware automatically redirects unauthenticated users to `/admin/login`.

### Client Portal Routes

Client portal routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <session_token>
```

Session tokens are obtained through the portal authentication flow (see Portal Authentication section).

## Error Responses

All endpoints may return the following error formats:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error
- `503` - Service Unavailable (SMTP not configured, etc.)

---

## Agreements API

### GET /api/agreements

Get all non-archived agreements.

**Authentication**: Admin (NextAuth)

**Response**:
```json
[
  {
    "id": "string",
    "clientId": "string",
    "templateId": "string",
    "eventId": "string | null",
    "status": "DRAFT | SENT | SIGNED | COMPLETED | CANCELLED",
    "uniqueToken": "string",
    "expiresAt": "string | null",
    "signedAt": "string | null",
    "client": { /* Client object */ },
    "template": { /* Template object */ },
    "event": { /* Event object | null */ }
  }
]
```

---

### POST /api/agreements

Create a new agreement.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "clientId": "string (required)",
  "templateId": "string (required)",
  "eventId": "string (optional)",
  "expiresAt": "string (ISO date, optional)"
}
```

**Response**: `201 Created`
```json
{
  "id": "string",
  "clientId": "string",
  "templateId": "string",
  "status": "DRAFT",
  "uniqueToken": "string",
  "client": { /* Client object */ },
  "template": { /* Template object */ },
  "event": { /* Event object | null */ }
}
```

**Errors**:
- `400` - Missing required fields
- `404` - Client or template not found

---

### POST /api/agreements/send

Send an agreement to a client via email.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "agreementId": "string (required)"
}
```

**Response**: `200 OK`
```json
{
  "message": "Agreement sent successfully",
  "recipientEmail": "string",
  "agreementId": "string",
  "status": "SENT"
}
```

**Errors**:
- `404` - Agreement not found
- `503` - SMTP not configured (returns fallback link)

**Fallback Response** (when SMTP not configured):
```json
{
  "error": "Email service is not configured...",
  "fallback": {
    "clientLink": "https://...",
    "message": "You can copy and share this link..."
  }
}
```

---

### POST /api/agreements/sign

Sign an agreement digitally.

**Authentication**: None (public endpoint with token validation)

**Request Body**:
```json
{
  "token": "string (required)",
  "clientName": "string (required)",
  "clientEmail": "string (required, valid email)"
}
```

**Response**: `200 OK`
```json
{
  "message": "Agreement signed successfully",
  "agreement": { /* Updated Agreement object */ }
}
```

**Errors**:
- `400` - Validation failed, client info mismatch, or already signed
- `404` - Agreement not found or expired

**Process**:
1. Validates token and expiration
2. Verifies client name and email match
3. Creates HTML snapshot of agreement
4. Updates status to SIGNED
5. Saves signature metadata (IP, timestamp)
6. Sends notification emails

---

### POST /api/agreements/track-view

Track when an agreement is viewed.

**Authentication**: None (public endpoint)

**Request Body**:
```json
{
  "token": "string (required)"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "viewCount": 5,
  "isFirstView": false
}
```

**Process**:
- Updates `firstViewedAt`, `lastViewedAt`, and `viewCount`
- Sends email alert on first view (if SMTP configured)

---

### POST /api/agreements/pdf

Generate PDF of a signed agreement.

**Authentication**: None (public endpoint with token validation)

**Request Body**:
```json
{
  "token": "string (required)"
}
```

**Response**: `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="agreement-...pdf"`

**Errors**:
- `404` - Agreement not found or not signed

**Note**: Only works for SIGNED agreements. Uses saved HTML snapshot.

---

### GET /api/agreements/[id]

Get one agreement, in the same shape as a row from the agreements list, plus `unreadNotesCount`.

**Authentication**: Admin (NextAuth)

**Response**: `200 OK`
```json
{ /* Agreement object */ }
```

**Errors**:
- `404` - Agreement not found

---

### PATCH /api/agreements/[id]

Update one or more admin fields on an agreement. Every field is optional. Unknown keys are rejected. This is the route the admin agreements page uses for single-field edits.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "expiresAt": "string (ISO date, optional)",
  "galleryLink": "string (URL or empty to clear, optional)",
  "galleryLinks": [{ "title": "string", "url": "string" }],
  "nextAction": "string (max 500 characters, optional)",
  "paymentStatus": "string (optional)",
  "stripePaymentLink": "string (URL or empty, optional)",
  "stripeReceiptLink": "string (URL or empty, optional)",
  "showPhoneNumberAlways": "boolean (optional)",
  "forceVirtualGreenScreen": "boolean (optional)",
  "chaserPaused": "boolean (optional)",
  "backdropLinkId": "string | null (optional)",
  "markNotesViewed": "boolean (optional, sets notesLastViewedAt)",
  "status": "DRAFT | SENT | SIGNED | COMPLETED | CANCELLED (optional; signed/completed never go back to DRAFT or SENT)"
}
```

**Response**: `200 OK`
```json
{ /* Updated Agreement object, same shape as GET */ }
```

**Errors**:
- `400` - Validation failed, or a database constraint rejected the status
- `403` - Cannot change the status of a signed agreement except to COMPLETED
- `404` - Agreement not found, or `backdropLinkId` does not match a backdrop link

**Status Rules**:
- A signed agreement can only move to COMPLETED
- Completing an agreement does not archive it

---

### PUT /api/agreements/update-agreement

Update agreement fields.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)",
  "expiresAt": "string (ISO date, optional)",
  "eventId": "string (optional)",
  // ... other fields
}
```

**Response**: `200 OK`
```json
{ /* Updated Agreement object */ }
```

---

### DELETE /api/agreements/delete

Delete an agreement.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)"
}
```

**Response**: `200 OK`
```json
{
  "message": "Agreement deleted successfully"
}
```

---

### POST /api/agreements/cancel

Cancel an agreement.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)",
  "reason": "string (optional)",
  "cancelledBy": "string (optional)"
}
```

**Response**: `200 OK`
```json
{ /* Updated Agreement object with status: CANCELLED */ }
```

---

### POST /api/agreements/archive

Archive an agreement.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)"
}
```

**Response**: `200 OK`
```json
{ /* Updated Agreement object with archived: true */ }
```

---

### GET /api/agreements/archived

Get all archived agreements.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `page` (optional) - Page number
- `limit` (optional) - Items per page

**Response**: `200 OK`
```json
{
  "agreements": [ /* Agreement objects */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 50,
    "totalPages": 3
  }
}
```

---

### GET /api/agreements/client

Get agreements for a specific client.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `clientId` (required) - Client ID

**Response**: `200 OK`
```json
[ /* Agreement objects */ ]
```

---

### GET /api/agreements/admin-preview

Get an agreement preview for an admin. Ignores expiration.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `token` (required) - Agreement token

**Response**: `200 OK`

The agreement record, including `client`, `template`, and `event`. `template.internalTitle` is omitted, and `template.htmlContent` stays the stored template source.

`renderedHtml` is the filled-in document:

- Signed agreement with a snapshot: `mergedHtml`
- Otherwise: custom wording when the agreement has it, then the template, with tokens filled in

```json
{
  "id": "string",
  "status": "DRAFT | SENT | SIGNED | COMPLETED | CANCELLED",
  "mergedHtml": "string | null",
  "customHtmlContent": "string | null",
  "renderedHtml": "string",
  "client": { /* Client object */ },
  "template": {
    "title": "string",
    "htmlContent": "string"
  },
  "event": { /* Event object | null */ }
}
```

---

## Templates API

### GET /api/templates

Get all templates.

**Authentication**: Admin (NextAuth)

**Response**: `200 OK`
```json
[
  {
    "id": "string",
    "title": "string",
    "internalTitle": "string | null",
    "htmlContent": "string",
    "fieldsSchema": {},
    "version": 1,
    "order": 0,
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

---

### POST /api/templates

Create a new template.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "title": "string (required)",
  "internalTitle": "string (optional)",
  "htmlContent": "string (required)",
  "fieldsSchema": {} // JSON object
}
```

**Response**: `201 Created`
```json
{ /* Template object */ }
```

---

### PUT /api/templates/update

Update a template.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)",
  "title": "string (optional)",
  "htmlContent": "string (optional)",
  "fieldsSchema": {} // optional
}
```

**Response**: `200 OK`
```json
{ /* Updated Template object */ }
```

---

### DELETE /api/templates/delete

Delete a template.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)"
}
```

**Response**: `200 OK`
```json
{
  "message": "Template deleted successfully"
}
```

---

### POST /api/templates/reorder

Reorder templates.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "templateIds": ["string"] // Array of template IDs in desired order
}
```

**Response**: `200 OK`
```json
{
  "message": "Templates reordered successfully"
}
```

---

## Clients API

### GET /api/clients

Get all clients.

**Authentication**: Admin (NextAuth)

**Response**: `200 OK`
```json
[
  {
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string | null",
    "events": [ /* Event objects */ ],
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

---

### POST /api/clients

Create or update a client.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "email": "string (required)",
  "phone": "string (optional)",
  "eventDate": "string (ISO date, optional)",
  "eventType": "string (optional)",
  "eventLocation": "string (optional)",
  "eventStartTime": "string (optional)",
  "eventDuration": "string (optional)",
  "eventPackage": "string (optional)",
  "packagePrice": "number (optional)",
  "notes": "string (optional)",
  "isWhitelabelClient": "boolean (optional)"
}
```

**Response**: `201 Created`
```json
{
  "id": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "events": [ /* Event objects */ ]
}
```

**Note**: If client exists, updates client and creates new Event record if event data provided.

---

### PUT /api/clients/update

Update a client.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "phone": "string (optional)",
  "address": "string (optional)",
  "notes": "string (optional)"
}
```

**Response**: `200 OK`
```json
{ /* Updated Client object */ }
```

---

### DELETE /api/clients/delete

Delete a client.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)"
}
```

**Response**: `200 OK`
```json
{
  "message": "Client deleted successfully"
}
```

---

## Events API

### POST /api/events

Create a new event.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "clientId": "string (required)",
  "eventDate": "string (ISO date, optional)",
  "eventType": "string (optional)",
  "eventLocation": "string (optional)",
  "eventStartTime": "string (optional)",
  "eventDuration": "string (optional)",
  "eventPackage": "string (optional)",
  "packagePrice": "number (optional)",
  "notes": "string (optional)",
  "eventName": "string (optional)",
  "eventPhone": "string (optional)"
}
```

**Response**: `201 Created`
```json
{ /* Event object */ }
```

---

### PUT /api/events/update

Update an event.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)",
  // ... same fields as POST
}
```

**Response**: `200 OK`
```json
{ /* Updated Event object */ }
```

---

### POST /api/events/archive

Archive an event.

**Authentication**: Admin (NextAuth)

**Request Body**:
```json
{
  "id": "string (required)"
}
```

**Response**: `200 OK`
```json
{ /* Updated Event object with archived: true */ }
```

---

## Analytics API

### GET /api/analytics

Get analytics overview.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `days` (optional) - Number of days for trends (default: 7)
- `period` (optional) - `week | month | year` (default: month)

**Response**: `200 OK`
```json
{
  "overview": {
    "totalAgreements": 100,
    "totalClients": 50,
    "totalTemplates": 5,
    "signedAgreements": 75,
    "draftAgreements": 10,
    "sentAgreements": 15,
    "conversionRate": 75,
    "trends": {
      "agreements": 10, // % change
      "signed": 5,
      "clients": 8
    },
    "monthlyStats": [ /* Chart data */ ]
  },
  "recentActivity": [ /* Recent agreements */ ],
  "upcomingEvents": [ /* Upcoming events */ ]
}
```

---

### GET /api/analytics/pipeline

Get pipeline analytics.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `days` (optional) - Number of days (default: 30)

**Response**: `200 OK`
```json
{
  "pipeline": {
    "stages": [
      {
        "stage": "Draft",
        "count": 10,
        "percentage": 10,
        "color": "#6b7280",
        "description": "Agreements being prepared"
      },
      // ... more stages
    ],
    "totalAgreements": 100,
    "dropOffs": [ /* Drop-off analysis */ ],
    "metrics": {
      "avgTimeToSign": 2.5, // days
      "overallConversionRate": 75,
      "activeAgreements": 50,
      "completedAgreements": 25
    }
  },
  "recentActivity": [ /* Activity timeline */ ]
}
```

---

### GET /api/analytics/revenue

Get revenue analytics.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `days` (optional) - Number of days (default: 30)

**Response**: `200 OK`
```json
{
  "revenue": {
    "totalRevenue": 50000,
    "averageRevenue": 500,
    "revenueByMonth": [ /* Monthly breakdown */ ],
    "topClients": [ /* Top revenue clients */ ]
  }
}
```

---

### GET /api/analytics/retention

Get client retention analytics.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `days` (optional) - Number of days (default: 30)

**Response**: `200 OK`
```json
{
  "retention": {
    "newClients": 20,
    "returningClients": 10,
    "retentionRate": 50,
    "clientLifetime": 180 // days
  }
}
```

---

### GET /api/analytics/audit

Get audit log analytics.

**Authentication**: Admin (NextAuth)

**Query Parameters**:
- `days` (optional) - Number of days (default: 30)

**Response**: `200 OK`
```json
{
  "audit": {
    "totalActions": 500,
    "actionsByType": { /* Action breakdown */ },
    "recentActions": [ /* Recent audit logs */ ]
  }
}
```

---

### GET /api/analytics/warnings

Get system warnings.

**Authentication**: Admin (NextAuth)

**Response**: `200 OK`
```json
{
  "warnings": [
    {
      "type": "expiring_agreements",
      "count": 5,
      "message": "5 agreements expiring soon"
    }
  ]
}
```

---

## Client Portal API

### POST /api/agreements/portal/request-access

Request portal access (send verification code).

**Authentication**: None (public)

**Request Body**:
```json
{
  "email": "string (required, valid email)"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Verification code sent to your email address.",
  "rateLimit": {
    "remaining": 4,
    "resetTime": "2024-01-01T12:00:00Z"
  }
}
```

**Errors**:
- `400` - Invalid email
- `429` - Rate limit exceeded (5 requests per 15 minutes per IP)

**Rate Limiting**: 5 requests per 15 minutes per IP address.

---

### POST /api/agreements/portal/verify-access

Verify access code and create session.

**Authentication**: None (public)

**Request Body**:
```json
{
  "email": "string (required)",
  "code": "string (required, 6 digits)"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "sessionToken": "string",
  "expiresAt": "2024-01-01T13:30:00Z",
  "client": {
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string | null",
    "address": "string | null",
    "agreementsCount": 5
  }
}
```

**Errors**:
- `400` - Invalid code, expired code, or validation error
- `404` - Client not found

**Session Duration**: 90 minutes (auto-refreshes)

---

### GET /api/agreements/portal/session

Get current session information.

**Authentication**: Bearer token

**Headers**:
```
Authorization: Bearer <session_token>
```

**Response**: `200 OK`
```json
{
  "success": true,
  "session": {
    "token": "string",
    "expiresAt": "2024-01-01T13:30:00Z",
    "lastActivityAt": "2024-01-01T12:00:00Z",
    "refreshed": false,
    "expiresInMinutes": 90
  },
  "client": {
    "id": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string | null",
    "address": "string | null",
    "agreementsCount": 5,
    "preferences": {
      "autoRefresh": true,
      "notifications": true,
      "theme": "light"
    }
  }
}
```

**Auto-Refresh**: Session automatically extends if expires within 15 minutes.

---

### POST /api/agreements/portal/session

Manually refresh session.

**Authentication**: Bearer token

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "session": {
    "token": "string",
    "expiresAt": "2024-01-01T14:00:00Z",
    "expiresInMinutes": 90
  }
}
```

---

### GET /api/agreements/portal/dashboard

Get client dashboard data.

**Authentication**: Bearer token

**Query Parameters**:
- `status` (optional) - Filter by status
- `search` (optional) - Search query
- `page` (optional) - Page number
- `limit` (optional) - Items per page

**Response**: `200 OK`
```json
{
  "agreements": [ /* Agreement objects */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 50,
    "totalPages": 3
  },
  "filters": {
    "statusSummary": { /* Status counts */ },
    "availableStatuses": [ /* Available statuses */ ]
  },
  "client": { /* Client object */ }
}
```

---

### GET /api/agreements/portal/agreement/[id]

Get specific agreement for client.

**Authentication**: Bearer token

**Response**: `200 OK`
```json
{
  "agreement": { /* Agreement object */ },
  "processedHtml": "string"
}
```

---

### POST /api/agreements/portal/logout

Logout and invalidate session.

**Authentication**: Bearer token

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### PUT /api/agreements/portal/update-client-info

Update client information.

**Authentication**: Bearer token

**Request Body**:
```json
{
  "phone": "string (optional)",
  "address": "string (optional)"
}
```

**Response**: `200 OK`
```json
{ /* Updated Client object */ }
```

---

### POST /api/agreements/portal/add-note

Add note to agreement.

**Authentication**: Bearer token

**Request Body**:
```json
{
  "agreementId": "string (required)",
  "content": "string (required)"
}
```

**Response**: `200 OK`
```json
{ /* ClientNote object */ }
```

---

### GET /api/agreements/portal/notes

Get notes for client.

**Authentication**: Bearer token

**Query Parameters**:
- `agreementId` (optional) - Filter by agreement

**Response**: `200 OK`
```json
[ /* ClientNote objects */ ]
```

---

### GET /api/agreements/portal/pdf/[id]

Get PDF of agreement.

**Authentication**: Bearer token

**Response**: `200 OK`
- Content-Type: `application/pdf`

---

### GET /api/agreements/portal/export

Export client data.

**Authentication**: Bearer token

**Query Parameters**:
- `format` (optional) - `csv | json` (default: json)

**Response**: `200 OK`
- Content-Type: `text/csv` or `application/json`

---

## Webhooks

### POST /api/agreements/bookly-webhook

Receive booking data from Bookly WordPress plugin.

**Authentication**: Optional webhook signature verification

**Request Body** (flexible schema):
```json
{
  "email": "string (required)",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "phone": "string (optional)",
  "bookingDate": "string (optional)",
  "bookingTime": "string (optional)",
  "serviceName": "string (optional)",
  "location": "string (optional)",
  "duration": "string (optional)",
  "price": "number (optional)",
  "notes": "string (optional)",
  "templateId": "string (optional)"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Booking data processed successfully",
  "client": {
    "id": "string",
    "email": "string",
    "firstName": "string",
    "lastName": "string"
  },
  "agreement": {
    "id": "string",
    "status": "DRAFT",
    "uniqueToken": "string"
  }
}
```

**Process**:
1. Validates payload
2. Creates or updates client
3. Creates Event record if event data provided
4. Optionally creates Agreement if `templateId` provided or `BOOKLY_DEFAULT_TEMPLATE_ID` set

**Webhook Signature** (optional):
- Header: `X-Bookly-Signature` or `X-Signature`
- Secret: `BOOKLY_WEBHOOK_SECRET` environment variable
- Algorithm: HMAC-SHA256

---

## Health Check

### GET /api/health

Health check endpoint.

**Authentication**: None

**Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Smart Field Replacement

Templates support smart field replacement using `{{field.path}}` syntax:

### Available Fields

**Client Fields**:
- `{{client.firstName}}`
- `{{client.lastName}}`
- `{{client.email}}`
- `{{client.phone}}`
- `{{client.address}}`
- `{{client.notes}}`
- `{{client.eventDate}}` (deprecated, use event)

**Event Fields**:
- `{{event.type}}`
- `{{event.location}}`
- `{{event.startTime}}`
- `{{event.duration}}`
- `{{event.package}}`
- `{{event.price}}`

**Agreement Fields**:
- `{{agreement.date}}`
- `{{agreement.id}}`

Fields are replaced when:
- Sending agreements via email
- Displaying agreements to clients
- Generating PDFs
- Creating signed agreement snapshots

