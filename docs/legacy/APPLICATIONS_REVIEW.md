# Applications & Services Review Checklist

**Date:** 2025-12-01  
**Project:** Photobooth Guys Agreements System  
**Node.js Version:** v24.11.1 ✅ (Required: 18+)

---

## ✅ Core Infrastructure

### Node.js
- **Status:** ✅ Installed
- **Version:** v24.11.1
- **Requirement:** Node.js 18+ 
- **Location:** System-wide installation

### Next.js Framework
- **Status:** ✅ Configured
- **Version:** 15.1.3 (from package.json)
- **Location:** `package.json`

### npm Packages
- **Status:** ✅ Installed
- **Location:** `node_modules/` directory exists
- **Note:** All dependencies from `package.json` should be installed

---

## 🔐 Authentication & Security

### NextAuth.js
- **Status:** ⚠️ Configuration Required
- **Version:** 4.24.10 (from package.json)
- **Required Environment Variables:**
  - `NEXTAUTH_SECRET` - Secret key for session encryption
  - `NEXTAUTH_URL` - Application URL (e.g., `http://localhost:3000` or production URL)
  - `ADMIN_EMAIL` - Admin email address for authentication
- **Configuration File:** `lib/auth.ts`
- **Note:** Email-based authentication using SMTP

---

## 🗄️ Database Services

### PostgreSQL Database
- **Status:** ⚠️ Configuration Required
- **Required Environment Variable:**
  - `DATABASE_URL` - PostgreSQL connection string
    - Format: `postgresql://user:password@host:port/database?schema=public`
- **Providers:** Neon, Supabase, or managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
- **Configuration File:** `lib/prisma.ts`

### Prisma ORM
- **Status:** ⚠️ Schema Review Needed
- **Version:** 6.16.3 (from package.json)
- **Prisma Directory:** `prisma/` (exists but appears empty)
- **Action Required:** 
  - Verify `prisma/schema.prisma` exists
  - Run `npx prisma generate` to generate Prisma Client
  - Run `npx prisma migrate deploy` or `npx prisma db push` to sync schema

---

## 📧 Email Services

### Nodemailer
- **Status:** ⚠️ Configuration Required
- **Version:** 6.10.1 (from package.json)
- **Required Environment Variables:**
  - `SMTP_HOST` - SMTP server hostname (e.g., `smtp.gmail.com`, `smtp.sendgrid.net`)
  - `SMTP_PORT` - SMTP port (typically `587` or `465`)
  - `SMTP_USER` - SMTP username/email address
  - `SMTP_PASS` - SMTP password or app password
  - `SMTP_FROM` - From email address (e.g., `noreply@photoboothguys.ca`)
- **Configuration Files:**
  - `lib/auth.ts` (NextAuth email provider)
  - `app/api/agreements/email/route.ts` (Email sending)
  - `app/api/agreements/send-gallery-ready-email/route.ts`
- **Supported Providers:** Gmail, SendGrid, AWS SES, or any SMTP service

---

## 💳 Payment Processing

### Stripe
- **Status:** ⚠️ Configuration Required
- **Version:** 17.3.1 (from package.json)
- **Required Environment Variables:**
  - `STRIPE_SECRET_KEY` - Stripe secret API key (starts with `sk_`)
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (starts with `whsec_`) - **Required for webhooks**
- **Configuration Files:**
  - `app/api/agreements/create-stripe-invoice/route.ts` - Invoice creation
  - `app/api/webhooks/stripe/route.ts` - Payment webhook handler
- **Features:**
  - Invoice creation with deposit/remaining balance options
  - Payment status tracking
  - Webhook handling for payment events

---

## 📁 Google Drive Integration

### Google APIs (OAuth2)
- **Status:** ⚠️ Configuration Required
- **Version:** 166.0.0 (from package.json - googleapis)
- **Required Environment Variables:**
  - `GOOGLE_DRIVE_CLIENT_ID` - OAuth2 client ID
  - `GOOGLE_DRIVE_CLIENT_SECRET` - OAuth2 client secret
  - `GOOGLE_DRIVE_REFRESH_TOKEN` - OAuth2 refresh token
  - `GOOGLE_DRIVE_FOLDER_ID` - Root folder ID in Google Drive
  - `GOOGLE_DRIVE_REDIRECT_URI` - OAuth2 redirect URI (optional, defaults to `http://localhost:3000/api/auth/google/callback`)
- **Configuration File:** `lib/google-drive.ts`
- **Setup Files:**
  - `app/api/auth/google/callback/route.ts` - OAuth callback handler
  - `generate-refresh-token.js` - Script to generate refresh token
- **Features:**
  - File upload to Google Drive
  - Client folder creation
  - File sharing and link generation

---

## 🔗 Third-Party Integrations

### Bookly Integration (WordPress)
- **Status:** ⚠️ Configuration Required (Optional)
- **Required Environment Variables:**
  - `BOOKLY_WEBHOOK_SECRET` - Webhook secret for security (optional but recommended)
  - `BOOKLY_DEFAULT_TEMPLATE_ID` - Default template ID for auto-created agreements (optional)
- **Configuration Files:**
  - `app/api/agreements/bookly-webhook/route.ts` - Webhook endpoint
  - `app/api/agreements/bookly-agreements-integration/` - WordPress plugin files
- **Documentation:** `WEBHOOK_CONFIGURATION_GUIDE.md`

---

## ⚙️ Application Configuration

### Base URL
- **Status:** ⚠️ Configuration Required
- **Required Environment Variable:**
  - `NEXT_PUBLIC_BASE_URL` - Public application URL (e.g., `http://localhost:3000` or production URL)
- **Usage:** Used for generating links in emails and redirects

### Magic Link Secret (Optional)
- **Status:** ⚠️ Configuration Optional
- **Environment Variable:**
  - `MAGIC_LINK_SECRET` - Falls back to `NEXTAUTH_SECRET` if not set
- **Configuration File:** `lib/magicToken.ts`

---

## 📋 Environment Variables Summary

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# NextAuth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000  # or production URL
ADMIN_EMAIL=admin@photoboothguys.ca

# SMTP Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@photoboothguys.ca

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # or production URL

# Stripe (Required for invoicing)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Required for webhooks

# Google Drive (Required for file uploads)
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback  # Optional
```

### Optional Variables

```bash
# Bookly Integration
BOOKLY_WEBHOOK_SECRET=your-webhook-secret
BOOKLY_DEFAULT_TEMPLATE_ID=template-id

# Magic Link (falls back to NEXTAUTH_SECRET)
MAGIC_LINK_SECRET=...
```

---

## 🔍 Verification Checklist

### Immediate Actions Required

- [ ] **Create `.env.local` file** (for local development) or configure environment variables in deployment platform
- [ ] **Set up PostgreSQL database** (Neon, Supabase, or managed PostgreSQL)
- [ ] **Configure `DATABASE_URL`** environment variable
- [ ] **Run Prisma migrations** (`npx prisma migrate deploy` or `npx prisma db push`)
- [ ] **Generate Prisma Client** (`npx prisma generate`)
- [ ] **Set up SMTP email service** (Gmail, SendGrid, AWS SES, etc.)
- [ ] **Configure all SMTP environment variables**
- [ ] **Set up Stripe account** and configure API keys
- [ ] **Configure Google Drive OAuth2** credentials
- [ ] **Set `NEXTAUTH_SECRET`** (generate with `openssl rand -base64 32`)
- [ ] **Set `ADMIN_EMAIL`** to your admin email address
- [ ] **Set `NEXT_PUBLIC_BASE_URL`** to your application URL

### Testing Checklist

- [ ] **Test database connection** (`npx prisma studio`)
- [ ] **Test email sending** (send test email from admin interface)
- [ ] **Test Stripe invoice creation** (create test invoice)
- [ ] **Test Google Drive upload** (upload test file)
- [ ] **Test admin authentication** (login with admin email)
- [ ] **Test Bookly webhook** (if using Bookly integration)

---

## 📚 Documentation References

- **Main README:** `README.md`
- **Deployment Guide:** `docs/DEPLOYMENT.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Database Schema:** `docs/DATABASE.md`
- **Integrations:** `docs/INTEGRATIONS.md`
- **Webhook Configuration:** `WEBHOOK_CONFIGURATION_GUIDE.md`

---

## 🚨 Critical Missing Components

Based on this review, the following are **critical** and must be configured:

1. **PostgreSQL Database** - Required for all data storage
2. **DATABASE_URL** - Required for database connection
3. **Prisma Schema** - Need to verify `prisma/schema.prisma` exists
4. **SMTP Configuration** - Required for email functionality
5. **Stripe API Keys** - Required for invoice creation
6. **NEXTAUTH_SECRET** - Required for authentication
7. **ADMIN_EMAIL** - Required for admin access

---

## 📝 Notes

- Environment variables are typically stored in `.env.local` for local development
- For production (Vercel, Netlify, etc.), set environment variables in the platform's dashboard
- Never commit `.env` files to version control
- Some services (Google Drive, Bookly) are optional but enhance functionality
- Stripe webhook secret is required if you want automatic payment status updates

---

**Last Updated:** 2025-12-01

