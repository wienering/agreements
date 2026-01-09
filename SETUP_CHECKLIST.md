# Setup Checklist - Photobooth Guys Agreements System

This checklist helps ensure all required applications and services are properly configured.

## ✅ Completed Items

- [x] Node.js installed (v24.11.1 - meets requirement of 18+)
- [x] npm packages installed (`node_modules/` directory exists)
- [x] Next.js framework configured (v15.1.3)
- [x] Project structure verified

## ⚠️ Configuration Required

### 1. Database Setup

- [ ] **PostgreSQL Database**
  - [ ] Create database (Neon, Supabase, or managed PostgreSQL)
  - [ ] Set `DATABASE_URL` environment variable
  - [ ] Verify Prisma schema exists (`prisma/schema.prisma`)
  - [ ] Run `npx prisma generate` to generate Prisma Client
  - [ ] Run `npx prisma migrate deploy` or `npx prisma db push` to sync schema
  - [ ] Test connection with `npx prisma studio`

**Note:** The `prisma/` directory appears empty. You may need to:
- Create `prisma/schema.prisma` file
- Or restore from backup/migrations
- Or initialize with `npx prisma init`

### 2. Authentication Setup

- [ ] **NextAuth Configuration**
  - [ ] Generate `NEXTAUTH_SECRET` (run: `openssl rand -base64 32`)
  - [ ] Set `NEXTAUTH_URL` (e.g., `http://localhost:3000` or production URL)
  - [ ] Set `ADMIN_EMAIL` to your admin email address

### 3. Email Service Setup

- [ ] **SMTP Configuration**
  - [ ] Choose SMTP provider (Gmail, SendGrid, AWS SES, etc.)
  - [ ] Set `SMTP_HOST` (e.g., `smtp.gmail.com`)
  - [ ] Set `SMTP_PORT` (typically `587` or `465`)
  - [ ] Set `SMTP_USER` (your email address)
  - [ ] Set `SMTP_PASS` (password or app password)
  - [ ] Set `SMTP_FROM` (e.g., `noreply@photoboothguys.ca`)
  - [ ] Test email sending

**Gmail Setup:**
- Enable 2-factor authentication
- Generate app password: https://myaccount.google.com/apppasswords
- Use app password as `SMTP_PASS`

**SendGrid Setup:**
- Create account at https://sendgrid.com
- Create API key
- Use `smtp.sendgrid.net` as host
- Use API key as password

### 4. Stripe Setup

- [ ] **Stripe Account**
  - [ ] Create Stripe account at https://stripe.com
  - [ ] Get API keys from dashboard
  - [ ] Set `STRIPE_SECRET_KEY` (starts with `sk_`)
  - [ ] Set `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)
  - [ ] Configure webhook endpoint: `/api/webhooks/stripe`
  - [ ] Test invoice creation

**Webhook Setup:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events: `invoice.paid`, `invoice.payment_succeeded`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Google Drive Setup

- [ ] **Google OAuth2 Configuration**
  - [ ] Create Google Cloud Project
  - [ ] Enable Google Drive API
  - [ ] Create OAuth2 credentials
  - [ ] Set `GOOGLE_DRIVE_CLIENT_ID`
  - [ ] Set `GOOGLE_DRIVE_CLIENT_SECRET`
  - [ ] Generate refresh token (use `generate-refresh-token.js`)
  - [ ] Set `GOOGLE_DRIVE_REFRESH_TOKEN`
  - [ ] Create root folder in Google Drive
  - [ ] Set `GOOGLE_DRIVE_FOLDER_ID`
  - [ ] Test file upload

**OAuth2 Setup Steps:**
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Use `generate-refresh-token.js` to get refresh token

### 6. Application Configuration

- [ ] **Base URL**
  - [ ] Set `NEXT_PUBLIC_BASE_URL` (e.g., `http://localhost:3000` or production URL)

### 7. Optional Integrations

- [ ] **Bookly Integration** (Optional)
  - [ ] Set `BOOKLY_WEBHOOK_SECRET` (optional but recommended)
  - [ ] Set `BOOKLY_DEFAULT_TEMPLATE_ID` (optional)
  - [ ] Configure WordPress plugin
  - [ ] Test webhook endpoint

## 📝 Environment Variables Template

Create a `.env.local` file in the project root with:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# NextAuth
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@photoboothguys.ca

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@photoboothguys.ca

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google Drive
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Bookly (Optional)
BOOKLY_WEBHOOK_SECRET=your-webhook-secret
BOOKLY_DEFAULT_TEMPLATE_ID=template-id
```

## 🧪 Testing Checklist

After configuration, test each component:

- [ ] **Database**
  - [ ] Run `npx prisma studio` - should open database viewer
  - [ ] Create test client via admin interface
  - [ ] Verify data appears in database

- [ ] **Authentication**
  - [ ] Visit `/admin/login`
  - [ ] Enter admin email
  - [ ] Check email for magic link
  - [ ] Click link and verify login

- [ ] **Email**
  - [ ] Send test agreement via admin interface
  - [ ] Verify email is received
  - [ ] Check email formatting

- [ ] **Stripe**
  - [ ] Create test invoice
  - [ ] Verify invoice appears in Stripe dashboard
  - [ ] Test payment (use Stripe test card: `4242 4242 4242 4242`)
  - [ ] Verify webhook updates payment status

- [ ] **Google Drive**
  - [ ] Upload test file via admin interface
  - [ ] Verify file appears in Google Drive
  - [ ] Check file permissions and sharing

## 🚨 Critical Issues Found

1. **Prisma Schema Missing**
   - The `prisma/` directory appears empty
   - **Action Required:** Create or restore `prisma/schema.prisma`
   - Check if schema exists elsewhere or needs to be created from migrations

2. **Environment Variables Not Verified**
   - No `.env` files found (may be gitignored, which is correct)
   - **Action Required:** Create `.env.local` with all required variables

## 📚 Helpful Commands

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate Prisma Client
npx prisma generate

# Sync database schema
npx prisma db push

# View database
npx prisma studio

# Run migrations
npx prisma migrate deploy

# Start development server
npm run dev

# Build for production
npm run build
```

## 📖 Documentation

- **Full Review:** See `APPLICATIONS_REVIEW.md`
- **Deployment Guide:** `docs/DEPLOYMENT.md`
- **Database Schema:** `docs/DATABASE.md`
- **Integrations:** `docs/INTEGRATIONS.md`
- **Webhook Setup:** `WEBHOOK_CONFIGURATION_GUIDE.md`

---

**Last Updated:** 2025-12-01





