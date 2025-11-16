# Deployment Documentation

## Overview

This document provides both quick deployment overview and detailed deployment instructions for the Photobooth Guys Agreements system.

---

## Quick Deployment Overview

### Recommended Platform

**Vercel** (recommended for Next.js applications)

### Quick Steps

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy database (Neon, Supabase, or managed PostgreSQL)
5. Run migrations
6. Configure SMTP
7. Deploy

**Estimated Time**: 15-30 minutes

---

## Detailed Deployment Instructions

### Prerequisites

- Node.js 18+ installed locally
- Git repository
- PostgreSQL database (Neon, Supabase, or managed)
- SMTP email service (SendGrid, AWS SES, Gmail, etc.)
- Domain name (optional, for production)

### Step 1: Database Setup

#### Option A: Neon (Recommended)

1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Set as `DATABASE_URL` environment variable

#### Option B: Supabase

1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string
5. Set as `DATABASE_URL` environment variable

#### Option C: Managed PostgreSQL

1. Create PostgreSQL instance (AWS RDS, DigitalOcean, etc.)
2. Get connection string
3. Set as `DATABASE_URL` environment variable

**Connection String Format**:
```
postgresql://user:password@host:port/database?schema=public
```

### Step 2: Environment Variables

Create `.env.local` file (for local development) or set in deployment platform:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# NextAuth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000  # or your production URL

# Admin Authentication
ADMIN_EMAIL=admin@photoboothguys.ca

# SMTP Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@photoboothguys.ca

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # or your production URL

# Optional: Bookly Integration
BOOKLY_WEBHOOK_SECRET=your-webhook-secret
BOOKLY_DEFAULT_TEMPLATE_ID=template-id

# Optional: Stripe (if implementing)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
```

### Step 3: Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd agreements

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

Application will be available at `http://localhost:3000`

### Step 4: Deploy to Vercel

#### Method 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set production environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... add all environment variables
```

#### Method 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import Git repository
4. Configure project:
   - Framework Preset: Next.js
   - Build Command: `prisma generate && next build`
   - Output Directory: `.next`
5. Add environment variables (see Step 2)
6. Deploy

**Vercel Build Settings**:
- Build Command: `prisma generate && next build`
- Install Command: `npm install`
- Output Directory: `.next`

### Step 5: Database Migrations

After deployment, run migrations:

```bash
# Via Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Or via Vercel Functions
# Create vercel.json with postinstall script
```

**Alternative**: Use Prisma Migrate in production:

```bash
# Set DATABASE_URL in environment
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy
```

### Step 6: Post-Deployment Verification

1. **Health Check**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Database Connection**:
   - Access admin panel
   - Create test client
   - Verify data appears in database

3. **Email Configuration**:
   - Send test agreement
   - Verify email received
   - Check SMTP logs

4. **Authentication**:
   - Test admin login
   - Verify session works
   - Test portal access

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXTAUTH_SECRET` | NextAuth encryption key | `base64-string` |
| `NEXTAUTH_URL` | Application base URL | `https://yourdomain.com` |
| `ADMIN_EMAIL` | Admin email for authentication | `admin@example.com` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `your-email@example.com` |
| `SMTP_PASS` | SMTP password | `your-password` |
| `SMTP_FROM` | From email address | `noreply@example.com` |
| `NEXT_PUBLIC_BASE_URL` | Public base URL | `https://yourdomain.com` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOOKLY_WEBHOOK_SECRET` | Bookly webhook signature secret | `secret-string` |
| `BOOKLY_DEFAULT_TEMPLATE_ID` | Default template for Bookly | `template-id` |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `VERIFICATION_EMAIL_TEMPLATE` | Email template style | `default` or `minimal` |

---

## Database Migrations Guide

### Running Migrations

**Development**:
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

**Production**:
```bash
# Apply pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Migration Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** in staging first
3. **Review migration SQL** before applying
4. **Use transactions** for data migrations
5. **Keep migrations small** and focused
6. **Never edit** existing migrations

### Rollback Migrations

Prisma doesn't support automatic rollbacks. To rollback:

1. Create new migration that reverses changes
2. Or manually restore from backup
3. Or use `prisma migrate reset` (development only)

---

## SMTP Configuration

### Gmail Setup

1. Enable 2-factor authentication
2. Generate app password:
   - Go to Google Account → Security
   - App passwords → Generate
3. Use app password as `SMTP_PASS`

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### SendGrid Setup

1. Create SendGrid account
2. Generate API key:
   - Settings → API Keys → Create API Key
3. Use API key as `SMTP_PASS`

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-api-key
SMTP_FROM=noreply@yourdomain.com
```

### AWS SES Setup

1. Create AWS account
2. Verify email/domain in SES
3. Create SMTP credentials:
   - SES → SMTP Settings → Create SMTP Credentials
4. Use credentials

```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM=verified-email@yourdomain.com
```

---

## Troubleshooting Guide

### Database Connection Issues

**Error**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Verify network/firewall allows connections
4. Check SSL requirements (add `?sslmode=require`)

**Error**: `Migration failed`

**Solutions**:
1. Check database permissions
2. Verify migration files are present
3. Check for conflicting migrations
4. Review migration SQL for errors

### Email Issues

**Error**: `Email service not configured`

**Solutions**:
1. Verify all SMTP environment variables set
2. Test SMTP connection:
   ```typescript
   const transporter = nodemailer.createTransport({...});
   await transporter.verify();
   ```
3. Check SMTP credentials
4. Verify SMTP server allows connections

**Error**: `Email timeout`

**Solutions**:
1. Increase timeout values
2. Check SMTP server status
3. Verify network connectivity
4. Try different SMTP port (465 vs 587)

### Authentication Issues

**Error**: `NextAuth session invalid`

**Solutions**:
1. Verify `NEXTAUTH_SECRET` is set
2. Check `NEXTAUTH_URL` matches actual URL
3. Clear cookies and try again
4. Verify `ADMIN_EMAIL` matches login email

**Error**: `Portal session expired`

**Solutions**:
1. Request new verification code
2. Check session expiration settings
3. Verify database connection (sessions stored in DB)
4. Clear browser storage

### Build/Deployment Issues

**Error**: `Prisma Client not generated`

**Solutions**:
1. Add to build command: `prisma generate && next build`
2. Verify `postinstall` script in package.json
3. Check Prisma schema is valid
4. Run `npx prisma generate` manually

**Error**: `Module not found`

**Solutions**:
1. Run `npm install` to install dependencies
2. Check `package.json` for all dependencies
3. Verify Node.js version (18+)
4. Clear `.next` cache and rebuild

### Performance Issues

**Slow database queries**:

**Solutions**:
1. Add database indexes (see `docs/DATABASE.md`)
2. Use connection pooling
3. Optimize Prisma queries (use `select` to limit fields)
4. Consider database scaling

**Slow page loads**:

**Solutions**:
1. Enable Vercel Edge caching
2. Optimize images
3. Use Next.js Image component
4. Enable compression
5. Consider CDN for static assets

---

## Production Considerations

### Security

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Always use HTTPS in production
3. **Secrets**: Use secure secret management (Vercel, AWS Secrets Manager)
4. **Database**: Use SSL connections
5. **CORS**: Configure CORS properly
6. **Rate Limiting**: Implement rate limiting for public endpoints

### Monitoring

1. **Error Tracking**: Set up error tracking (Sentry, etc.)
2. **Logging**: Use structured logging
3. **Uptime Monitoring**: Set up uptime monitoring
4. **Database Monitoring**: Monitor database performance
5. **Email Monitoring**: Track email delivery rates

### Backup Strategy

1. **Database Backups**: Enable automated database backups
2. **Migration History**: Keep migration files in version control
3. **Data Exports**: Regular data exports
4. **Recovery Plan**: Document recovery procedures

### Scaling

1. **Database**: Use connection pooling
2. **Caching**: Implement caching for frequently accessed data
3. **CDN**: Use CDN for static assets
4. **Load Balancing**: Consider load balancing for high traffic
5. **Database Replication**: Consider read replicas

### Maintenance

1. **Updates**: Keep dependencies updated
2. **Migrations**: Test migrations before production
3. **Monitoring**: Regular health checks
4. **Backups**: Verify backups regularly
5. **Documentation**: Keep documentation updated

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Database created and accessible
- [ ] SMTP configured and tested
- [ ] `NEXTAUTH_SECRET` generated
- [ ] Code pushed to repository
- [ ] Tests passing (if applicable)

### Deployment

- [ ] Repository connected to deployment platform
- [ ] Environment variables set in platform
- [ ] Build command configured
- [ ] Database migrations run
- [ ] Deployment successful

### Post-Deployment

- [ ] Health check endpoint working
- [ ] Admin login working
- [ ] Database connection verified
- [ ] Email sending tested
- [ ] Portal access tested
- [ ] Agreement creation tested
- [ ] Agreement signing tested

### Production Readiness

- [ ] HTTPS enabled
- [ ] Domain configured
- [ ] Error tracking set up
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Documentation updated
- [ ] Team trained

---

## Alternative Deployment Platforms

### Netlify

1. Connect Git repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Set environment variables
5. Deploy

### Railway

1. Connect Git repository
2. Add PostgreSQL service
3. Set environment variables
4. Deploy

### AWS (EC2/ECS)

1. Build Docker image
2. Deploy to EC2 or ECS
3. Configure RDS database
4. Set up load balancer
5. Configure domain

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build
docker build -t agreements .

# Run
docker run -p 3000:3000 --env-file .env agreements
```

---

## Support and Resources

- **Documentation**: See other docs in `/docs` folder
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs

