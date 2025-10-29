# Client Portal API

This directory contains the API endpoints for the client portal functionality. The portal allows clients to log in with email verification, view their agreements, and add missing information.

## Authentication Flow

1. **Request Access** (`POST /api/agreements/portal/request-access`)
   - Client enters their email address
   - System generates a 6-digit verification code
   - Code is sent via email (expires in 15 minutes)

2. **Verify Access** (`POST /api/agreements/portal/verify-access`)
   - Client enters email and verification code
   - System validates code and creates session
   - Returns session token (expires in 90 minutes)

3. **Session Management**
   - All subsequent requests require `Authorization: Bearer <sessionToken>` header
   - Sessions auto-expire after 90 minutes of inactivity
   - Use `/api/agreements/portal/session` to validate session

## API Endpoints

### Authentication

#### `POST /api/agreements/portal/request-access`
Request a verification code for portal access.

**Request Body:**
```json
{
  "email": "client@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent to your email address."
}
```

#### `POST /api/agreements/portal/verify-access`
Verify the code and create a session.

**Request Body:**
```json
{
  "email": "client@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "abc123...",
  "expiresAt": "2024-01-01T12:00:00Z",
  "client": {
    "id": "client-id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "client@example.com",
    "phone": null,
    "address": null,
    "phoneAddedAt": null,
    "addressAddedAt": null,
    "agreementsCount": 3
  }
}
```

#### `GET /api/agreements/portal/session`
Validate current session and get client info.

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Response:**
```json
{
  "success": true,
  "session": {
    "token": "abc123...",
    "expiresAt": "2024-01-01T12:00:00Z",
    "lastActivityAt": "2024-01-01T11:30:00Z"
  },
  "client": { ... }
}
```

#### `POST /api/agreements/portal/logout`
Log out and invalidate session.

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Data Access

#### `GET /api/agreements/portal/dashboard`
Get all agreements for the authenticated client.

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Response:**
```json
{
  "success": true,
  "agreements": [
    {
      "id": "agreement-id",
      "status": "SIGNED",
      "uniqueToken": "token123",
      "createdAt": "2024-01-01T10:00:00Z",
      "signedAt": "2024-01-01T11:00:00Z",
      "summary": {
        "templateTitle": "Photobooth Service Agreement",
        "status": "SIGNED",
        "isSigned": true,
        "canSign": false,
        "isExpired": false
      },
      "template": {
        "title": "Photobooth Service Agreement",
        "htmlContent": "<html>...</html>"
      }
    }
  ],
  "client": { ... }
}
```

### Client Information Updates

#### `POST /api/agreements/portal/update-client-info`
Add missing client information (phone, address). Once added, fields cannot be edited.

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Request Body:**
```json
{
  "phone": "+1234567890",
  "address": "123 Main St, City, State"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client information updated successfully",
  "client": {
    "id": "client-id",
    "phone": "+1234567890",
    "address": "123 Main St, City, State",
    "phoneAddedAt": "2024-01-01T12:00:00Z",
    "addressAddedAt": "2024-01-01T12:00:00Z"
  }
}
```

### Notes

#### `POST /api/agreements/portal/add-note`
Add a note (append-only).

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Request Body:**
```json
{
  "content": "This is a note about the agreement",
  "agreementId": "agreement-id" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Note added successfully",
  "note": {
    "id": "note-id",
    "content": "This is a note about the agreement",
    "agreementId": "agreement-id",
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

#### `GET /api/agreements/portal/notes`
Get all notes for the client.

**Headers:**
```
Authorization: Bearer <sessionToken>
```

**Query Parameters:**
- `agreementId` (optional): Filter notes for specific agreement

**Response:**
```json
{
  "success": true,
  "notes": [
    {
      "id": "note-id",
      "content": "This is a note about the agreement",
      "agreementId": "agreement-id",
      "createdAt": "2024-01-01T12:00:00Z",
      "agreement": {
        "id": "agreement-id",
        "uniqueToken": "token123",
        "templateTitle": "Photobooth Service Agreement"
      }
    }
  ],
  "totalCount": 1
}
```

## Security Features

- **Email Verification**: 6-digit codes with 15-minute expiration
- **Session Management**: 90-minute session timeout with activity tracking
- **Field Protection**: Once phone/address added, cannot be changed via portal
- **Data Isolation**: Clients can only see their own agreements
- **Audit Trail**: Track when fields are added via timestamp fields
- **Rate Limiting**: Consider implementing rate limits on verification requests

## Maintenance

### Session Cleanup

Run the cleanup utility periodically to remove expired sessions:

```bash
# Run cleanup script
npx ts-node portal/cleanup-sessions.ts

# Or import and use in your application
import { cleanupExpiredSessions } from './portal/cleanup-sessions';
await cleanupExpiredSessions();
```

### Database Migration

After updating the Prisma schema, run:

```bash
npx prisma generate
npx prisma db push
```

## Enhanced Features (Nice-to-Have)

### Session Auto-Refresh
Sessions automatically extend when they expire within 15 minutes of the current time.

**Endpoint:** `POST /api/agreements/portal/session`
- Manually refresh session
- Extends session by 90 minutes

### Rate Limiting
Verification code requests are rate-limited to prevent abuse:
- 5 requests per 15-minute window per IP address
- Returns `429` status with retry information

### Advanced Dashboard Features
**Enhanced filtering and search:**
- Filter by agreement status
- Search by template title
- Sort by various fields (date, status, template)
- Pagination support
- Status summary counts

**Query Parameters:**
- `status` - Filter by status (DRAFT, SENT, SIGNED, etc.)
- `search` - Search in template titles
- `sortBy` - Sort field (createdAt, status, template)
- `sortOrder` - Sort direction (asc, desc)
- `page` - Page number for pagination
- `limit` - Items per page

### Export Functionality
**Endpoint:** `GET /api/agreements/portal/export`

Export agreements in multiple formats:
- JSON (default)
- CSV
- PDF/TXT

**Query Parameters:**
- `format` - Export format (json, csv, pdf)
- `agreementId` - Export single agreement
- `includeHtml` - Include processed HTML content

### User Preferences
**Endpoint:** `GET/POST /api/agreements/portal/preferences`

Manage user preferences:
- Email/SMS notifications
- Theme (light/dark/auto)
- Language and timezone
- Dashboard layout
- Auto-refresh settings

### Notifications System
**Endpoint:** `GET /api/agreements/portal/notifications`

Smart notifications for:
- Agreements expiring soon
- Pending signatures
- Missing profile information
- System announcements

**Notification Types:**
- `warning` - High priority (expiring agreements)
- `info` - Medium priority (pending signatures)
- `success` - Low priority (welcome messages)

### Enhanced Email Templates
Customizable email templates with:
- Responsive design
- Mobile-friendly layout
- Security notices
- Branded styling

**Template Options:**
- Default enhanced template
- Minimal template
- Custom templates via environment variables

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/expired session)
- `404`: Not Found
- `429`: Too Many Requests (rate limiting)
- `500`: Internal Server Error

Error responses include descriptive messages and error codes:

```json
{
  "error": "Session has expired",
  "code": "SESSION_EXPIRED",
  "details": ["Additional error details if applicable"]
}
```

**Common Error Codes:**
- `MISSING_AUTH` - Authorization header required
- `INVALID_SESSION` - Invalid session token
- `SESSION_EXPIRED` - Session has expired
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal server error
