# System Architecture

## Overview

The Photobooth Guys Agreements system is a Next.js 15 application built with TypeScript, Prisma ORM, and PostgreSQL. It provides a comprehensive agreement management platform with e-signature capabilities, client portal, analytics, and third-party integrations.

## Technology Stack

### Core Framework
- **Next.js 15.1.3** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type-safe JavaScript

### Backend & Database
- **Prisma 6.16.3** - ORM for database management
- **PostgreSQL** - Primary database (via Prisma)
- **NextAuth 4.24.10** - Authentication system

### Key Libraries
- **Zod 3.23.8** - Schema validation
- **Nodemailer 6.10.1** - Email sending
- **jsPDF 3.0.3** - PDF generation
- **@react-pdf/renderer 4.3.1** - Alternative PDF rendering
- **Stripe 17.3.1** - Payment processing
- **Recharts 3.2.1** - Data visualization
- **Framer Motion 12.23.22** - Animations
- **@dnd-kit** - Drag and drop functionality

### Styling
- **Tailwind CSS 3.4.18** - Utility-first CSS framework
- **PostCSS 8.5.6** - CSS processing

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Admin Portal │  │ Client Portal│  │ Agreement Page│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │      Next.js Application Server      │
          │  ┌────────────────────────────────┐ │
          │  │      API Routes (App Router)    │ │
          │  │  ┌──────────────────────────┐  │ │
          │  │  │ Authentication (NextAuth)│  │ │
          │  │  └──────────────────────────┘  │ │
          │  │  ┌──────────────────────────┐  │ │
          │  │  │ Agreement Management     │  │ │
          │  │  └──────────────────────────┘  │ │
          │  │  ┌──────────────────────────┐  │ │
          │  │  │ Client Portal Auth       │  │ │
          │  │  └──────────────────────────┘  │ │
          │  │  ┌──────────────────────────┐  │ │
          │  │  │ Analytics & Reporting    │  │ │
          │  │  └──────────────────────────┘  │ │
          │  └────────────────────────────────┘ │
          │  ┌────────────────────────────────┐ │
          │  │      Prisma Client             │ │
          │  └────────────────────────────────┘ │
          └──────────────────┬──────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌──────▼──────┐    ┌──────▼──────┐
    │ PostgreSQL│      │   SMTP      │    │   Stripe   │
    │  Database │      │   Server    │    │   API      │
    └───────────┘      └─────────────┘    └────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Bookly Webhook   │
                    │   (WordPress)      │
                    └───────────────────┘
```

## Application Structure

### Directory Layout

```
agreements/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin interface pages
│   │   ├── agreements/          # Agreement management
│   │   ├── clients/              # Client management
│   │   ├── templates/           # Template management
│   │   ├── dashboard/           # Analytics dashboard
│   │   └── enhanced-dashboard/ # Business intelligence
│   ├── agreement/               # Public agreement pages
│   │   └── [token]/             # Agreement viewing/signing
│   ├── portal/                   # Client portal
│   │   ├── dashboard/           # Client dashboard
│   │   └── login/               # Portal authentication
│   ├── api/                      # API routes
│   │   ├── agreements/          # Agreement endpoints
│   │   ├── clients/             # Client endpoints
│   │   ├── templates/           # Template endpoints
│   │   ├── events/              # Event endpoints
│   │   ├── analytics/           # Analytics endpoints
│   │   └── auth/                # Authentication endpoints
│   ├── components/              # React components
│   ├── contexts/                # React contexts
│   └── providers.tsx            # App providers
├── lib/                          # Shared utilities
│   ├── prisma.ts                # Prisma client
│   ├── auth.ts                  # NextAuth configuration
│   └── memory-adapter.ts       # NextAuth adapter
├── prisma/                       # Database schema & migrations
│   ├── schema.prisma            # Prisma schema
│   └── migrations/              # Database migrations
└── public/                       # Static assets
```

## Data Flow

### Agreement Creation Flow

```
1. Admin creates agreement
   └─> POST /api/agreements
       └─> Validates clientId, templateId
           └─> Creates Agreement record (status: DRAFT)
               └─> Generates uniqueToken
                   └─> Returns agreement with client/template data
```

### Agreement Sending Flow

```
1. Admin sends agreement
   └─> POST /api/agreements/send
       └─> Loads agreement with client/template/event
           └─> Processes HTML template (smart field replacement)
               └─> Generates client link
                   └─> Sends email via SMTP
                       └─> Updates status to SENT
                           └─> Tracks email send count
```

### Agreement Signing Flow

```
1. Client accesses agreement
   └─> GET /agreement/[token]
       └─> Validates token & expiration
           └─> Processes template HTML
               └─> Displays agreement
                   └─> Client enters name/email
                       └─> POST /api/agreements/sign
                           └─> Validates client info
                               └─> Creates HTML snapshot
                                   └─> Updates status to SIGNED
                                       └─> Saves signature metadata
                                           └─> Sends notification emails
```

### Client Portal Authentication Flow

```
1. Client requests access
   └─> POST /api/agreements/portal/request-access
       └─> Validates email exists
           └─> Generates verification code
               └─> Sends code via email
                   └─> Client enters code
                       └─> POST /api/agreements/portal/verify-access
                           └─> Validates code
                               └─> Creates ClientSession
                                   └─> Returns session token
                                       └─> Client stores token
                                           └─> Uses token for authenticated requests
```

## Authentication Architecture

### Admin Authentication (NextAuth)

- **Provider**: Email-based magic link
- **Strategy**: JWT sessions
- **Adapter**: Custom memory adapter (can be switched to Prisma)
- **Middleware**: Protects `/admin/*` routes
- **Configuration**: `lib/auth.ts`

### Client Portal Authentication

- **Method**: Email verification code
- **Session**: Database-backed (ClientSession model)
- **Token**: Bearer token in Authorization header
- **Expiration**: 90 minutes (auto-refreshes)
- **Storage**: In-memory verification codes (production: Redis recommended)

## Database Architecture

### Core Models

1. **User** - Admin users (NextAuth)
2. **Client** - Customer information
3. **Event** - Event details (linked to clients)
4. **Template** - Agreement templates
5. **Agreement** - Agreement instances
6. **AgreementField** - Template field definitions
7. **AgreementFieldValue** - Agreement-specific field values
8. **Signature** - E-signature metadata
9. **AuditLog** - Activity tracking
10. **ClientSession** - Portal session management
11. **ClientNote** - Notes attached to clients/agreements
12. **BackdropLink** - Backdrop selection options

### Relationships

```
Client ──┬──> Event (1:many)
         └──> Agreement (1:many)
                ├──> Template (many:1)
                ├──> Event (many:1, optional)
                ├──> Signature (1:1)
                ├──> AgreementFieldValue (1:many)
                └──> AuditLog (1:many)

Template ──> AgreementField (1:many)
```

## Request/Response Flow

### API Request Processing

```
1. HTTP Request
   └─> Next.js Route Handler
       └─> Middleware (if applicable)
           └─> Authentication Check
               └─> Request Validation (Zod)
                   └─> Business Logic
                       └─> Database Operation (Prisma)
                           └─> Response Formatting
                               └─> HTTP Response
```

### Error Handling

- **Validation Errors**: 400 with Zod error details
- **Authentication Errors**: 401 with error code
- **Not Found**: 404 with descriptive message
- **Server Errors**: 500 with error logging

## Component Relationships

### Frontend Components

- **DarkModeContext** - Global dark mode state
- **RichTextEditor** - Template content editing
- **SearchableSelect** - Client/template selection
- **Toast** - Notification system

### Page Components

- **Admin Pages**: Server components with client-side data fetching
- **Portal Pages**: Client components with session management
- **Agreement Pages**: Hybrid (server for initial load, client for interaction)

## Security Considerations

1. **Token-based Authentication**: Secure random tokens for agreements
2. **Email Verification**: Required for portal access
3. **IP Tracking**: Records IP addresses for signatures
4. **Content Snapshotting**: Saves signed agreement HTML to prevent tampering
5. **Session Expiration**: Automatic session cleanup
6. **Middleware Protection**: Route-level authentication

## Performance Optimizations

1. **Prisma Connection Pooling**: Reuses database connections
2. **Selective Field Loading**: Only loads required fields
3. **Pagination**: Limits large result sets
4. **Caching**: Session token caching
5. **Lazy Loading**: Components loaded on demand

## Deployment Architecture

- **Platform**: Vercel (recommended) or similar serverless platform
- **Database**: PostgreSQL (Neon, Supabase, or managed PostgreSQL)
- **Email**: SMTP server (SendGrid, AWS SES, etc.)
- **Storage**: File system or cloud storage for PDFs
- **CDN**: Automatic via Vercel Edge Network

## Environment Configuration

See `docs/DEPLOYMENT.md` for complete environment variable documentation.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth encryption key
- `SMTP_*` - Email server configuration
- `NEXT_PUBLIC_BASE_URL` - Application base URL
- `ADMIN_EMAIL` - Admin email for authentication

