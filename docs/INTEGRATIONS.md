# Integrations Documentation

## Overview

This document describes all third-party integrations used in the Photobooth Guys Agreements system, including both high-level overview and detailed technical implementation.

---

## Bookly Webhook Integration

### Overview

Bookly is a WordPress booking plugin. This integration automatically creates clients, events, and optionally agreements when bookings are created in Bookly.

**What it does**:
- Receives booking data from Bookly WordPress plugin
- Creates or updates client records
- Creates event records with booking details
- Optionally creates agreements automatically

### Technical Implementation

**Endpoint**: `POST /api/agreements/bookly-webhook`

**Configuration**:
1. Set webhook URL in Bookly settings: `https://yourdomain.com/api/agreements/bookly-webhook`
2. Optionally set `BOOKLY_WEBHOOK_SECRET` for signature verification
3. Optionally set `BOOKLY_DEFAULT_TEMPLATE_ID` for auto-agreement creation

**Webhook Payload** (Flexible Schema):

Bookly can send data in various formats. The integration supports:

```json
// Format 1: Root level fields
{
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "123-456-7890",
  "bookingDate": "2024-12-25",
  "bookingTime": "10:00",
  "serviceName": "Photography Session",
  "location": "123 Main St",
  "duration": "2 hours",
  "price": 500,
  "notes": "Special requests"
}

// Format 2: Nested objects
{
  "customer": {
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "appointment": {
    "date": "2024-12-25",
    "time": "10:00",
    "location": "123 Main St"
  },
  "service": {
    "name": "Photography Session",
    "duration": "2 hours",
    "price": 500
  }
}

// Format 3: Mixed
{
  "email": "customer@example.com",
  "fullName": "John Doe",
  "appointment": {
    "startDate": "2024-12-25",
    "startTime": "10:00"
  }
}
```

**Field Mapping**:

The integration maps various field names to standard fields:

| Bookly Field | Mapped To |
|--------------|-----------|
| `email`, `customer.email` | Client.email |
| `firstName`, `customer.firstName`, `fullName` (split) | Client.firstName |
| `lastName`, `customer.lastName`, `fullName` (split) | Client.lastName |
| `phone`, `customer.phone` | Client.phone |
| `bookingDate`, `appointmentDate`, `appointment.date` | Event.eventDate |
| `bookingTime`, `appointmentTime`, `appointment.time` | Event.eventStartTime |
| `serviceName`, `serviceType`, `eventType`, `service.name` | Event.eventType |
| `location`, `eventLocation`, `address`, `appointment.location` | Event.eventLocation |
| `duration`, `eventDuration`, `appointment.duration` | Event.eventDuration |
| `eventPackage` | Event.eventPackage |
| `price`, `packagePrice`, `service.price` | Event.packagePrice |
| `notes`, `customerNotes`, `customer.notes` | Event.notes |

**Signature Verification** (Optional):

```typescript
// If BOOKLY_WEBHOOK_SECRET is set
const signature = request.headers.get('x-bookly-signature') || 
                 request.headers.get('x-signature') ||
                 payload.signature;

if (signature && webhookSecret) {
  const hmac = createHmac('sha256', webhookSecret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return 401, { error: 'Invalid signature' };
  }
}
```

**Processing Flow**:

1. **Receive Webhook**: POST request with JSON payload
2. **Validate Signature** (if configured)
3. **Parse Payload**: Flexible schema handles various formats
4. **Map Data**: Convert Bookly fields to Client/Event model
5. **Upsert Client**: Create or update by email
6. **Create Event**: If event data provided
7. **Create Agreement** (optional): If templateId provided
8. **Return Response**: Success with created IDs

**Error Handling**:

- Invalid JSON: 400 with error details
- Missing email: 400
- Invalid signature: 401
- Database errors: 500 (logged, generic response)

**Response Format**:

```json
{
  "success": true,
  "message": "Booking data processed successfully",
  "client": {
    "id": "clx...",
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "agreement": {
    "id": "agx...",
    "status": "DRAFT",
    "uniqueToken": "abc123..."
  }
}
```

**Setup Instructions**:

1. In Bookly WordPress plugin, go to Settings → Webhooks
2. Add new webhook:
   - URL: `https://yourdomain.com/api/agreements/bookly-webhook`
   - Method: POST
   - Events: Select "Appointment Created" or "Booking Created"
3. (Optional) Set webhook secret in Bookly
4. Set `BOOKLY_WEBHOOK_SECRET` environment variable to match
5. (Optional) Set `BOOKLY_DEFAULT_TEMPLATE_ID` to auto-create agreements

**Testing**:

```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/agreements/bookly-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "bookingDate": "2024-12-25",
    "serviceName": "Test Service"
  }'
```

---

## Stripe Integration

### Overview

Stripe integration allows linking payment information to agreements and automatically tracking payment status when clients pay invoices.

**What it does**:
- Creates Stripe invoices from agreements
- Stores Stripe payment links on agreements
- Stores Stripe receipt links automatically when payments are received
- Tracks payment status automatically via webhooks
- Supports multiple invoice types (deposit, remaining balance, full amount, custom amount)

### Technical Implementation

**Database Fields** (on Agreement model):
- `paymentStatus`: String - Payment status (e.g., "Not Paid", "Deposit Paid", "Balance Paid", "Fully Paid")
- `stripePaymentLink`: String - Stripe payment link URL
- `stripeReceiptLink`: String - Stripe receipt link URL (automatically updated when payment received)

**API Endpoints**:

```typescript
// Create Stripe invoice
POST /api/agreements/create-stripe-invoice
{
  "agreementId": "agreement-id",
  "invoiceType": "default" | "total-only" | "total-minus-deposit" | "custom-amount",
  "customAmount": 650.00 // Optional, required if invoiceType is "custom-amount"
}

// Update payment info manually (optional, usually handled by webhook)
PUT /api/agreements/update-payment-info
{
  "agreementId": "agreement-id",
  "paymentStatus": "paid",
  "stripePaymentLink": "https://pay.stripe.com/...",
  "stripeReceiptLink": "https://pay.stripe.com/receipts/..."
}

// Webhook endpoint (called by Stripe automatically)
POST /api/webhooks/stripe
```

**Invoice Types**:

1. **Default (Deposit + Remaining)**:
   - If event date is > 7 days away: $100 deposit due today, remaining amount due 7 days before event
   - If event date is ≤ 7 days away: Full amount due today

2. **Total Amount Only**:
   - Single invoice for full amount, due 1 week before event date

3. **Total Amount Minus $100 Deposit**:
   - Single invoice for total amount minus $100 (assuming deposit paid outside Stripe), due 1 week before event date

4. **Custom Amount**:
   - Single invoice for custom amount specified, due 1 week before event date

**Payment Status Values**:

- `"Not Paid"` - Invoice created but not yet paid
- `"Deposit Paid"` - Deposit invoice has been paid
- `"Balance Paid"` - Remaining balance invoice paid (but no deposit was created)
- `"Fully Paid"` - Full amount paid (either single full invoice or both deposit + remaining paid)
- `"Paid"` - Generic paid status (used for unknown invoice types)

**Webhook Processing**:

The webhook endpoint automatically:
- Listens for `invoice.paid` and `invoice.payment_succeeded` events
- Extracts `agreementId` from invoice metadata
- Updates payment status based on invoice type
- Stores receipt link from Stripe
- Handles multiple invoices (deposit + remaining) to track partial vs. full payment

**Setup Instructions**:

1. **Create Stripe Account**:
   - Sign up at https://stripe.com
   - Get your API keys from the Stripe Dashboard

2. **Set Environment Variables**:
   ```
   STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
   STRIPE_WEBHOOK_SECRET=whsec_... (get this from webhook endpoint configuration)
   ```

3. **Configure Webhook Endpoint in Stripe Dashboard**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
   - Select events to listen for:
     - `invoice.paid`
     - `invoice.payment_succeeded`
   - Copy the "Signing secret" (starts with `whsec_`) and set it as `STRIPE_WEBHOOK_SECRET`
   - Save the webhook endpoint

4. **Test Webhook** (Optional):
   - Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Or use Stripe Dashboard to send test events

**Testing**:

```bash
# Test webhook endpoint (should return endpoint info)
curl https://yourdomain.com/api/webhooks/stripe

# Test invoice creation
curl -X POST https://yourdomain.com/api/agreements/create-stripe-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "agreementId": "agreement-id",
    "invoiceType": "default"
  }'
```

---

## SMTP Email Integration

### Overview

SMTP integration handles all email communications including agreement sending, notifications, and portal access codes.

**What it does**:
- Sends agreement emails to clients
- Sends notification emails to admins
- Sends verification codes for portal access
- Handles email templates and formatting

### Technical Implementation

**Library**: Nodemailer 6.10.1

**Configuration**:

```typescript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});
```

**Environment Variables**:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@photoboothguys.ca
```

**Supported Providers**:

- **Gmail**: `smtp.gmail.com:587` (requires app password)
- **SendGrid**: `smtp.sendgrid.net:587`
- **AWS SES**: `email-smtp.region.amazonaws.com:587`
- **Mailgun**: `smtp.mailgun.org:587`
- **Custom SMTP**: Any SMTP server

**Email Types**:

1. **Agreement Send Emails**:
   - HTML templates with branding
   - Responsive design
   - Action buttons
   - Varies by send count (first, reminder, final notice)

2. **Notification Emails**:
   - Agreement signed notifications (to admin)
   - View tracking alerts
   - System warnings

3. **Portal Emails**:
   - Verification code emails
   - Access confirmation

**Error Handling**:

```typescript
// Check SMTP configuration
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  return 503, {
    error: 'Email service not configured',
    fallback: { clientLink: '...' }
  };
}

// Verify connection before sending
await transporter.verify();

// Send with timeout
await Promise.race([
  transporter.sendMail(mailOptions),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Email timeout')), 15000)
  )
]);
```

**Setup Instructions**:

1. **Gmail**:
   - Enable 2-factor authentication
   - Generate app password
   - Use app password as `SMTP_PASS`

2. **SendGrid**:
   - Create SendGrid account
   - Generate API key
   - Use API key as `SMTP_PASS`

3. **AWS SES**:
   - Create AWS account
   - Verify email/domain
   - Create SMTP credentials
   - Use credentials in config

4. **Custom SMTP**:
   - Get SMTP server details from provider
   - Configure host, port, credentials
   - Test connection

**Testing**:

```typescript
// Test SMTP connection
const transporter = nodemailer.createTransport({...});
await transporter.verify();
console.log('SMTP connection verified');
```

---

## NextAuth Integration

### Overview

NextAuth provides authentication for the admin interface using email-based magic links.

**What it does**:
- Handles admin login
- Sends magic link emails
- Manages JWT sessions
- Protects admin routes

### Technical Implementation

**Configuration** (`lib/auth.ts`):

```typescript
export const authOptions: NextAuthOptions = {
  adapter: memoryAdapter, // Can be switched to Prisma adapter
  providers: [
    EmailProvider({
      from: process.env.SMTP_FROM,
      sendVerificationRequest: async ({ identifier, url }) => {
        // Only allow admin email
        if (identifier.toLowerCase() !== 
            (process.env.ADMIN_EMAIL || '').toLowerCase()) {
          return;
        }
        // Send magic link email
        await transporter.sendMail({
          to: identifier,
          subject: 'Your sign-in link',
          html: `<a href="${url}">${url}</a>`
        });
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      // Only allow admin email
      return user.email?.toLowerCase() === 
             (process.env.ADMIN_EMAIL || '').toLowerCase();
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
```

**Environment Variables**:

```
NEXTAUTH_SECRET=your-secret-key-here
ADMIN_EMAIL=admin@photoboothguys.ca
SMTP_FROM=noreply@photoboothguys.ca
```

**Middleware Protection** (`middleware.ts`):

```typescript
export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  if (url.pathname.startsWith('/admin') && 
      !url.pathname.startsWith('/admin/login')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}
```

**Session Management**:

- **Strategy**: JWT (stateless)
- **Storage**: Cookies (httpOnly, secure in production)
- **Expiration**: Default NextAuth settings
- **Adapter**: Memory adapter (can switch to Prisma for multi-user)

**Setup Instructions**:

1. Generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

2. Set `ADMIN_EMAIL` to admin email address

3. Configure SMTP (see SMTP Integration section)

4. (Optional) Switch to Prisma adapter for multi-user support:
   ```typescript
   import { PrismaAdapter } from '@next-auth/prisma-adapter';
   
   export const authOptions: NextAuthOptions = {
     adapter: PrismaAdapter(prisma),
     // ... rest of config
   };
   ```

**Usage**:

```typescript
// In server components
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);

// In client components
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
```

---

## Database Integration (Prisma)

### Overview

Prisma ORM provides type-safe database access and migrations.

**What it does**:
- Generates type-safe database client
- Manages database schema
- Handles migrations
- Provides query builder

### Technical Implementation

**Schema Definition** (`prisma/schema.prisma`):

```prisma
datasource db {
  provider     = "postgresql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"
}

generator client {
  provider = "prisma-client-js"
}

model Client {
  id        String   @id @default(cuid())
  email     String   @unique
  // ... fields
}
```

**Client Usage** (`lib/prisma.ts`):

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Connection String**:

```
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
```

**Supported Databases**:

- PostgreSQL (primary)
- Can be adapted for MySQL, SQLite, etc.

**Migrations**:

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

**Setup Instructions**:

1. Create PostgreSQL database
2. Set `DATABASE_URL` environment variable
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

---

## Additional Integrations

### PDF Generation (jsPDF)

**Library**: jsPDF 3.0.3

**Usage**: Server-side PDF generation from HTML content

**Features**:
- Text-based PDF generation
- Page breaks
- Formatting options
- File download

See `docs/FEATURES.md` for detailed implementation.

### Data Visualization (Recharts)

**Library**: Recharts 3.2.1

**Usage**: Analytics charts and graphs

**Features**:
- Line charts
- Pie charts
- Bar charts
- Responsive design

### Drag and Drop (@dnd-kit)

**Library**: @dnd-kit/core, @dnd-kit/sortable

**Usage**: Template reordering, drag-and-drop interfaces

**Features**:
- Sortable lists
- Drag handles
- Touch support

---

## Integration Best Practices

1. **Error Handling**: Always handle integration failures gracefully
2. **Rate Limiting**: Implement rate limiting for webhooks
3. **Signature Verification**: Verify webhook signatures when possible
4. **Logging**: Log all integration events for debugging
5. **Fallbacks**: Provide fallback options when integrations fail
6. **Testing**: Test integrations in development before production
7. **Monitoring**: Monitor integration health and errors
8. **Documentation**: Keep integration documentation up to date

---

## Future Integration Opportunities

1. **Calendar Integration**: Google Calendar, Outlook
2. **CRM Integration**: HubSpot, Salesforce
3. **Accounting Integration**: QuickBooks, Xero
4. **Storage Integration**: AWS S3, Google Cloud Storage
5. **Communication**: Twilio SMS, Slack notifications
6. **Analytics**: Google Analytics, Mixpanel

