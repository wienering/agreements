# Workflows Documentation

## Overview

This document describes both high-level business workflows and detailed technical implementation flows for key processes in the system.

---

## Agreement Lifecycle Workflow

### High-Level Business Flow

```
1. Admin creates agreement
   ↓
2. Admin reviews and customizes
   ↓
3. Admin sends agreement to client
   ↓
4. Client receives email
   ↓
5. Client views agreement
   ↓
6. Client signs agreement
   ↓
7. Admin receives notification
   ↓
8. Admin marks as completed (after event)
   ↓
9. Agreement archived
```

### Detailed Technical Flow

#### 1. Agreement Creation

**Actor**: Admin

**Steps**:
1. Admin navigates to Agreements page
2. Clicks "Create Agreement"
3. Selects Client (or creates new)
4. Selects Template
5. Optionally selects Event
6. Optionally sets expiration date
7. Clicks "Create"

**API Call**:
```http
POST /api/agreements
{
  "clientId": "...",
  "templateId": "...",
  "eventId": "...", // optional
  "expiresAt": "2024-12-31T23:59:59Z" // optional
}
```

**Backend Process**:
```typescript
// 1. Validate inputs
if (!clientId || !templateId) return 400;

// 2. Verify event belongs to client (if provided)
if (eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (event.clientId !== clientId) return 400;
}

// 3. Generate unique token
const uniqueToken = randomBytes(32).toString('hex');

// 4. Create agreement
const agreement = await prisma.agreement.create({
  data: {
    clientId,
    templateId,
    eventId: eventId || null,
    uniqueToken,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    status: 'DRAFT'
  }
});

// 5. Return created agreement
return 201, agreement;
```

**Result**: Agreement created with status `DRAFT`

---

#### 2. Sending Agreement

**Actor**: Admin

**Steps**:
1. Admin views agreement list
2. Clicks "Send" on agreement
3. System processes template
4. System sends email
5. Status updates to `LIVE`

**API Call**:
```http
POST /api/agreements/send
{
  "agreementId": "..."
}
```

**Backend Process**:
```typescript
// 1. Load agreement with relations
const agreement = await prisma.agreement.findUnique({
  where: { id: agreementId },
  include: { client: true, template: true, event: true }
});

// 2. Check SMTP configuration
if (!process.env.SMTP_HOST) {
  return 503, { fallback: { clientLink: "..." } };
}

// 3. Process HTML template (smart field replacement)
const processedHtml = processHtmlContent(
  agreement.template.htmlContent,
  agreement.client,
  agreement.id,
  agreement.event
);

// 4. Generate client link
const clientLink = `${baseUrl}/agreement/${agreement.uniqueToken}`;

// 5. Create email content (varies by send count)
const emailHtml = generateEmailHtml(agreement, clientLink, sendCount);

// 6. Send email via SMTP
await transporter.sendMail({
  to: agreement.client.email,
  subject: emailSubject,
  html: emailHtml
});

// 7. Update agreement
await prisma.agreement.update({
  where: { id: agreement.id },
  data: {
    status: agreement.status === 'DRAFT' ? 'LIVE' : agreement.status,
    lastEmailedAt: new Date(),
    emailSendCount: { increment: 1 }
  }
});
```

**Email Variations**:
- **First send**: "Service Agreement Ready"
- **Second send**: "Reminder: Service Agreement Pending"
- **Third+ sends**: "Final Notice: Service Agreement Signature Required"

**Result**: Email sent, status `LIVE`, send count incremented

---

#### 3. Client Views Agreement

**Actor**: Client

**Steps**:
1. Client clicks link in email
2. System validates token
3. System processes template
4. Agreement displayed
5. View tracked

**Page Load** (`GET /agreement/[token]`):
```typescript
// 1. Find agreement by token
const agreement = await prisma.agreement.findFirst({
  where: {
    uniqueToken: token,
    OR: [
      { status: 'SIGNED' }, // Signed agreements bypass expiration
      { expiresAt: null },
      { expiresAt: { gte: new Date() } }
    ]
  },
  include: { client: true, template: true, event: true }
});

// 2. Process HTML
const processedHtml = processHtmlContent(
  agreement.template.htmlContent,
  agreement.client,
  agreement.id,
  agreement.event
);

// 3. Track view (client-side)
fetch('/api/agreements/track-view', {
  method: 'POST',
  body: JSON.stringify({ token })
});
```

**View Tracking** (`POST /api/agreements/track-view`):
```typescript
// 1. Find agreement
const agreement = await prisma.agreement.findFirst({
  where: { uniqueToken: token }
});

// 2. Check if first view
const isFirstView = !agreement.firstViewedAt;

// 3. Update tracking
await prisma.agreement.update({
  where: { id: agreement.id },
  data: {
    firstViewedAt: agreement.firstViewedAt || new Date(),
    lastViewedAt: new Date(),
    viewCount: agreement.viewCount + 1
  }
});

// 4. Send email alert on first view
if (isFirstView && smtpConfigured) {
  await sendViewAlertEmail(agreement, clientIP, userAgent);
}
```

**Result**: Agreement displayed, view tracked, email alert sent (first view only)

---

#### 4. Client Signs Agreement

**Actor**: Client

**Steps**:
1. Client reviews agreement
2. Client clicks "Sign Agreement"
3. Client enters name and email
4. System validates
5. System creates snapshot
6. Status updates to `SIGNED`
7. Notification emails sent

**API Call**:
```http
POST /api/agreements/sign
{
  "token": "...",
  "clientName": "John Doe",
  "clientEmail": "john@example.com"
}
```

**Backend Process**:
```typescript
// 1. Find agreement
const agreement = await prisma.agreement.findFirst({
  where: {
    uniqueToken: token,
    expiresAt: { gte: new Date() }
  },
  include: { client: true, template: true, event: true }
});

// 2. Verify client information
const clientName = `${agreement.client.firstName} ${agreement.client.lastName}`.toLowerCase();
if (clientName !== providedName.toLowerCase()) {
  return 400, { error: 'Client information does not match' };
}

if (agreement.client.email.toLowerCase() !== providedEmail.toLowerCase()) {
  return 400, { error: 'Client information does not match' };
}

// 3. Check if already signed
if (agreement.status === 'SIGNED') {
  return 400, { error: 'Already signed' };
}

// 4. Get client IP
const clientIP = getClientIP(request);

// 5. Create HTML snapshot
const signedHtmlContent = processHtmlContent(
  agreement.template.htmlContent,
  agreement.client,
  agreement.id,
  agreement.event
);

// 6. Update agreement
const updatedAgreement = await prisma.agreement.update({
  where: { id: agreement.id },
  data: {
    status: 'SIGNED',
    signedAt: new Date(),
    signedFromIP: clientIP,
    mergedHtml: signedHtmlContent // Snapshot
  }
});

// 7. Send notification emails (non-blocking)
await sendSignedAgreementNotification(updatedAgreement, clientIP, request);
await sendClientThankYouEmail(updatedAgreement, request);
```

**Result**: Agreement signed, snapshot saved, emails sent, redirect to thank-you page

---

#### 5. Agreement Completion

**Actor**: Admin

**Steps**:
1. Event completed
2. Admin navigates to agreement
3. Admin clicks "Mark as Completed"
4. Status updates to `COMPLETED`
5. Agreement auto-archived

**API Call**:
```http
PUT /api/agreements/update-status
{
  "id": "...",
  "status": "COMPLETED"
}
```

**Backend Process**:
```typescript
// 1. Find agreement
const agreement = await prisma.agreement.findUnique({
  where: { id }
});

// 2. Update status
await prisma.agreement.update({
  where: { id },
  data: {
    status: 'COMPLETED',
    archived: true, // Auto-archive
    archivedAt: new Date()
  }
});
```

**Result**: Status `COMPLETED`, archived

---

## Authentication Workflows

### Admin Authentication (NextAuth)

#### High-Level Flow

```
1. Admin navigates to /admin
   ↓
2. Redirected to /admin/login
   ↓
3. Admin enters email
   ↓
4. System sends magic link
   ↓
5. Admin clicks link
   ↓
6. Session created
   ↓
7. Redirected to /admin
```

#### Detailed Technical Flow

**Step 1: Login Request**

```typescript
// Admin enters email on /admin/login
// NextAuth EmailProvider handles request

POST /api/auth/signin/email
{
  "email": "admin@example.com"
}
```

**Step 2: Email Verification**

```typescript
// NextAuth callback: signIn
async signIn({ user, account, profile }) {
  // Check if email matches admin email
  const isAdmin = user.email?.toLowerCase() === 
    (process.env.ADMIN_EMAIL || '').toLowerCase();
  return isAdmin; // Only allow admin email
}
```

**Step 3: Magic Link Email**

```typescript
// NextAuth sends verification email
await transporter.sendMail({
  to: email,
  subject: 'Your sign-in link',
  html: `<a href="${url}">${url}</a>`
});
```

**Step 4: Link Click**

```typescript
// User clicks link
// NextAuth verifies token
// Creates JWT session
// Redirects to /admin
```

**Step 5: Session Management**

```typescript
// Middleware checks session
export async function middleware(req: NextRequest) {
  if (url.pathname.startsWith('/admin') && 
      !url.pathname.startsWith('/admin/login')) {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.redirect('/admin/login');
    }
  }
}
```

**Session Storage**: JWT tokens (stateless)

---

### Client Portal Authentication

#### High-Level Flow

```
1. Client navigates to /portal/login
   ↓
2. Client enters email
   ↓
3. System sends verification code
   ↓
4. Client enters code
   ↓
5. System validates code
   ↓
6. Session created
   ↓
7. Client redirected to portal
```

#### Detailed Technical Flow

**Step 1: Request Access**

```typescript
// Client enters email
POST /api/agreements/portal/request-access
{
  "email": "client@example.com"
}
```

**Step 2: Rate Limiting Check**

```typescript
// Check rate limit (5 requests per 15 minutes per IP)
const rateLimit = checkRateLimit(clientIP);
if (!rateLimit.allowed) {
  return 429, { error: 'Too many requests' };
}
```

**Step 3: Client Lookup**

```typescript
// Find client
const client = await prisma.client.findFirst({
  where: { email: emailLower }
});

// Don't reveal if email exists (security)
if (!client) {
  return 200, { success: true, message: '...' };
}
```

**Step 4: Generate Code**

```typescript
// Generate 6-digit code
const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

// Store code (in-memory, production: Redis)
verificationCodeStore.set(emailLower, verificationCode, expiresAt);
```

**Step 5: Send Email**

```typescript
// Send verification email
await transporter.sendMail({
  to: emailLower,
  subject: 'Your Client Portal Access Code',
  html: generateVerificationEmail(client, verificationCode)
});
```

**Step 6: Verify Code**

```typescript
// Client enters code
POST /api/agreements/portal/verify-access
{
  "email": "client@example.com",
  "code": "123456"
}
```

**Step 7: Code Validation**

```typescript
// Get stored code
const storedCode = verificationCodeStore.get(email);

// Validate
if (!storedCode || storedCode.code !== code) {
  return 400, { error: 'Invalid code' };
}

if (new Date() > storedCode.expiresAt) {
  return 400, { error: 'Code expired' };
}
```

**Step 8: Create Session**

```typescript
// Generate session token
const sessionToken = randomBytes(32).toString('hex');
const expiresAt = new Date(Date.now() + 90 * 60 * 1000); // 90 minutes

// Create session
await prisma.clientSession.create({
  data: {
    clientEmail: email,
    sessionToken,
    expiresAt,
    lastActivityAt: new Date()
  }
});

// Clean up verification code
verificationCodeStore.delete(email);

// Return session
return 200, {
  success: true,
  sessionToken,
  expiresAt,
  client: { ... }
};
```

**Step 9: Use Session**

```typescript
// All portal API calls include token
Authorization: Bearer <session_token>

// Middleware validates
const session = await prisma.clientSession.findUnique({
  where: { sessionToken }
});

if (!session || new Date() > session.expiresAt) {
  return 401, { error: 'Session expired' };
}

// Auto-refresh if expires within 15 minutes
if (timeUntilExpiry < 15 * 60 * 1000) {
  await prisma.clientSession.update({
    where: { sessionToken },
    data: { expiresAt: new Date(Date.now() + 90 * 60 * 1000) }
  });
}
```

---

## Client Portal Access Workflow

### High-Level Flow

```
1. Client requests portal access
   ↓
2. Receives verification code
   ↓
3. Enters code
   ↓
4. Session created
   ↓
5. Client accesses dashboard
   ↓
6. Views agreements
   ↓
7. Updates information
   ↓
8. Downloads PDFs
```

### Detailed Technical Flow

**Dashboard Access**:

```typescript
// Client navigates to /portal/dashboard
// Frontend checks localStorage for session token
const token = localStorage.getItem('portal_session_token');

// If no token, redirect to login
if (!token) {
  router.push('/portal/login');
  return;
}

// Fetch dashboard data
GET /api/agreements/portal/dashboard
Headers: { Authorization: `Bearer ${token}` }
```

**Session Validation**:

```typescript
// Backend validates session
const authResult = await authenticateSession(request);

if (authResult.error) {
  return authResult.error; // 401
}

// Use session
const { session } = authResult;
// session.client contains client data
```

**Agreement Listing**:

```typescript
// Get client's agreements
const agreements = await prisma.agreement.findMany({
  where: {
    client: { email: session.client.email }
  },
  include: { template: true, event: true },
  orderBy: { createdAt: 'desc' }
});
```

**Information Update**:

```typescript
// Client updates phone/address
PUT /api/agreements/portal/update-client-info
{
  "phone": "123-456-7890",
  "address": "123 Main St"
}

// Backend updates
await prisma.client.update({
  where: { email: session.client.email },
  data: {
    phone: phone || undefined,
    address: address || undefined,
    phoneAddedAt: phone ? new Date() : undefined,
    addressAddedAt: address ? new Date() : undefined
  }
});
```

---

## Bookly Integration Workflow

### High-Level Flow

```
1. Booking created in Bookly
   ↓
2. Bookly sends webhook
   ↓
3. System receives webhook
   ↓
4. Validates payload
   ↓
5. Creates/updates client
   ↓
6. Creates event
   ↓
7. Optionally creates agreement
   ↓
8. Returns success
```

### Detailed Technical Flow

**Webhook Receipt**:

```typescript
POST /api/agreements/bookly-webhook
Headers: {
  "Content-Type": "application/json",
  "X-Bookly-Signature": "..." // optional
}
Body: { /* Bookly payload */ }
```

**Signature Verification** (optional):

```typescript
// If BOOKLY_WEBHOOK_SECRET set
const signature = request.headers.get('x-bookly-signature');
const isValid = verifyWebhookSignature(rawBody, signature, secret);

if (!isValid) {
  return 401, { error: 'Invalid signature' };
}
```

**Payload Validation**:

```typescript
// Flexible schema handles various Bookly formats
const validatedData = booklyWebhookSchema.parse(payload);

// Supports:
// - Root level fields
// - Nested customer/appointment/service objects
// - Multiple field name variations
```

**Client Upsert**:

```typescript
// Map Bookly data to Client model
const clientData = mapBooklyToClient(validatedData);

// Upsert client (create or update)
const client = await prisma.client.upsert({
  where: { email: clientData.email },
  update: {
    firstName: clientData.firstName || undefined,
    lastName: clientData.lastName || undefined,
    phone: clientData.phone || undefined
  },
  create: {
    email: clientData.email,
    firstName: clientData.firstName,
    lastName: clientData.lastName,
    phone: clientData.phone
  }
});
```

**Event Creation**:

```typescript
// Create event if event data provided
if (clientData.eventDate || clientData.eventType || ...) {
  await prisma.event.create({
    data: {
      clientId: client.id,
      eventDate: clientData.eventDate || null,
      eventType: clientData.eventType || null,
      eventLocation: clientData.eventLocation || null,
      // ... more fields
      archived: false
    }
  });
}
```

**Agreement Creation** (optional):

```typescript
// If templateId provided or BOOKLY_DEFAULT_TEMPLATE_ID set
const templateId = validatedData.templateId || 
                   process.env.BOOKLY_DEFAULT_TEMPLATE_ID;

if (templateId) {
  const uniqueToken = randomBytes(32).toString('hex');
  
  await prisma.agreement.create({
    data: {
      clientId: client.id,
      templateId,
      uniqueToken,
      status: 'DRAFT',
      expiresAt: null
    }
  });
}
```

**Response**:

```typescript
return 200, {
  success: true,
  message: 'Booking data processed successfully',
  client: { id, email, firstName, lastName },
  agreement: { id, status, uniqueToken } // if created
};
```

---

## Error Handling in Workflows

### Common Error Scenarios

1. **Validation Errors** (400):
   - Missing required fields
   - Invalid data format
   - Business rule violations

2. **Authentication Errors** (401):
   - Missing/invalid session token
   - Expired session
   - Invalid verification code

3. **Authorization Errors** (403):
   - Insufficient permissions
   - Status change not allowed

4. **Not Found Errors** (404):
   - Resource doesn't exist
   - Token invalid/expired

5. **Rate Limiting** (429):
   - Too many requests
   - Retry-After header included

6. **Server Errors** (500):
   - Database errors
   - External service failures
   - Unexpected exceptions

### Error Recovery

- **Email Failures**: Return fallback link
- **Session Expiry**: Auto-refresh or redirect to login
- **Validation Errors**: Return detailed error messages
- **Database Errors**: Log and return generic error (don't expose internals)

---

## State Transitions

### Agreement Status Transitions

```
DRAFT → LIVE (when sent)
DRAFT → VOID (admin action)
LIVE → SIGNED (client signs)
LIVE → CANCELLED (admin/client)
SIGNED → COMPLETED (admin, auto-archives)
SIGNED → CANCELLED (admin only)
COMPLETED → (terminal state)
CANCELLED → (terminal state)
VOID → (terminal state)
```

**Restrictions**:
- SIGNED agreements can only transition to COMPLETED or CANCELLED
- Once SIGNED, content cannot be modified
- COMPLETED automatically sets archived: true

### Session State Transitions

```
None → Pending (code sent)
Pending → Active (code verified)
Active → Expired (timeout)
Active → Refreshed (auto-refresh)
Expired → None (deleted)
```

