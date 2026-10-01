# Photobooth Guys Agreements

A comprehensive agreement management system built with Next.js, featuring e-signature capabilities, client portal, analytics, and third-party integrations.

## Overview

This system enables Photobooth Guys to create, send, and manage client agreements digitally. Clients can review and sign agreements online, with full tracking and analytics for administrators.

### Key Features

- **Template Management**: Create reusable agreement templates with smart field placeholders
- **E-Signature**: Legally binding digital signatures with full audit trail
- **Client Portal**: Self-service portal for clients to view agreements and update information
- **Email Notifications**: Automated email sending with tracking
- **Analytics Dashboard**: Comprehensive business intelligence and reporting
- **PDF Generation**: Download signed agreements as PDFs
- **Event Management**: Track events separately from client information
- **Third-Party Integrations**: Bookly webhook, Stripe payments, SMTP email

## Tech Stack

- **Framework**: Next.js 15.5.7 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL with Prisma ORM 6.16.3
- **Authentication**: NextAuth 4.24.10
- **Styling**: Tailwind CSS 3.4.18
- **Email**: Nodemailer 6.10.1
- **PDF**: jsPDF 3.0.3

## Quick Start

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- SMTP email service (Gmail, SendGrid, AWS SES, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agreements
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up database**
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate deploy
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Admin: http://localhost:3000/admin
   - Client Portal: http://localhost:3000/portal
   - Public Agreement: http://localhost:3000/agreement/[token]

## Environment Variables

### Required

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# NextAuth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Admin
ADMIN_EMAIL=admin@photoboothguys.ca

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@photoboothguys.ca

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Optional

```bash
# Bookly Integration
BOOKLY_WEBHOOK_SECRET=your-webhook-secret
BOOKLY_DEFAULT_TEMPLATE_ID=template-id

# Stripe (if implementing)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

See [Deployment Documentation](docs/DEPLOYMENT.md) for detailed setup instructions.

## Project Structure

```
agreements/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin interface
│   ├── agreement/         # Public agreement pages
│   ├── portal/            # Client portal
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── contexts/          # React contexts
├── lib/                    # Shared utilities
│   ├── prisma.ts          # Prisma client
│   └── auth.ts            # NextAuth config
├── prisma/                 # Database schema & migrations
│   ├── schema.prisma      # Prisma schema
│   └── migrations/        # Database migrations
└── docs/                   # Documentation
```

## Documentation

Comprehensive documentation is available in the `/docs` folder:

- **[Architecture](docs/ARCHITECTURE.md)** - System architecture, tech stack, data flow
- **[API Reference](docs/API.md)** - Complete API endpoint documentation
- **[Database Schema](docs/DATABASE.md)** - Database models, relationships, migrations
- **[Features](docs/FEATURES.md)** - Detailed feature documentation
- **[Workflows](docs/WORKFLOWS.md)** - Business and technical workflows
- **[Integrations](docs/INTEGRATIONS.md)** - Third-party integrations guide
- **[Deployment](docs/DEPLOYMENT.md)** - Deployment instructions and troubleshooting

## Key Workflows

### Creating and Sending an Agreement

1. Admin creates client (or uses existing)
2. Admin creates agreement from template
3. Admin sends agreement to client via email
4. Client receives email with link
5. Client views and signs agreement
6. Admin receives notification
7. Agreement is signed

### Client Portal Access

1. Client requests access with email
2. System sends 6-digit verification code
3. Client enters code
4. Session created (90 minutes)
5. Client can view agreements, update info, download PDFs

## Development

### Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

### Database Management

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# View database in browser
npx prisma studio
```

## Deployment

### Recommended: Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy database (Neon, Supabase, etc.)
5. Run migrations
6. Deploy

See [Deployment Documentation](docs/DEPLOYMENT.md) for detailed instructions.

## Features in Detail

### Templates System

Create reusable agreement templates with smart field placeholders:
- `{{client.firstName}}` - Client first name
- `{{client.lastName}}` - Client last name
- `{{event.type}}` - Event type
- `{{event.date}}` - Event date
- And more...

See [Features Documentation](docs/FEATURES.md#templates-system) for complete list.

### E-Signature

Legally binding digital signatures with:
- Client identity verification
- IP address tracking
- Content snapshotting (prevents tampering)
- Full audit trail
- Email notifications

### Analytics

Comprehensive analytics including:
- Agreement pipeline metrics
- Conversion rates
- Revenue tracking
- Client retention
- Audit logs

### Integrations

- **Bookly**: Automatic client/event creation from bookings
- **Stripe**: Payment link storage (extensible)
- **SMTP**: Email sending (Gmail, SendGrid, AWS SES, etc.)

## Security

- Email-based authentication for admin
- Verification code system for client portal
- Session management with expiration
- IP address tracking for signatures
- Content snapshotting for signed agreements
- Rate limiting on public endpoints

## Support

For issues, questions, or contributions:

1. Check the [Documentation](docs/) folder
2. Review [Troubleshooting Guide](docs/DEPLOYMENT.md#troubleshooting-guide)
3. Check existing issues in the repository

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]

---

**Built for Photobooth Guys** | Agreement Management System

