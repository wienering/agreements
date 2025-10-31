# Webhook URL and API Key Configuration Guide

## 🔗 Webhook URL

### What is the Webhook URL?

The webhook URL is the full URL to your Agreements app endpoint that receives booking data from Bookly.

### How to Find/Construct Your Webhook URL

The endpoint we created is: `/api/agreements/bookly-webhook`

**Your full webhook URL format:**
```
https://YOUR-DOMAIN.com/api/agreements/bookly-webhook
```

### Examples:

- **Local development**: `http://localhost:3000/api/agreements/bookly-webhook`
- **Production**: `https://agreements.yourdomain.com/api/agreements/bookly-webhook`
- **Vercel/Netlify**: `https://your-app.vercel.app/api/agreements/bookly-webhook`
- **Custom domain**: `https://app.yourcompany.com/api/agreements/bookly-webhook`

### How to Find Your Domain:

1. **Check your hosting provider dashboard** (Vercel, Netlify, Railway, etc.)
2. **Check your deployment URL** from your last deploy
3. **Check your `.env` or environment variables** for `NEXT_PUBLIC_URL` or similar
4. **If using custom domain**, use your configured domain

### Where to Use the Webhook URL:

#### Option A: WordPress Plugin (Recommended)
1. Go to **WordPress Admin → Settings → Bookly → Agreements**
2. Paste your webhook URL in the **"Webhook URL"** field
3. Click **"Save Changes"**

#### Option B: Standalone PHP Code
1. Open `bookly-integration.php`
2. Find line 16: `$webhook_url = 'https://your-domain.com/api/agreements/bookly-webhook';`
3. Replace with your actual URL
4. Save the file

---

## 🔐 API Key / Webhook Secret

### What is the API Key?

The API key (also called webhook secret) is an **optional** security feature that verifies requests are coming from your WordPress site, not malicious sources.

### Important Notes:

- ⚠️ **This is OPTIONAL** - The webhook will work without it
- ✅ **Recommended for production** - Adds security
- 🔄 **Must match in both places** - Same value in WordPress AND Agreements app

### Step 1: Generate a Secret Key

Create a secure random string. Options:

**Option A: Generate online:**
- Use: https://www.random.org/strings/
- Length: 32-64 characters
- Example: `a8f5f167f44f4964e6c998dee827110c4f5b8a4b3c9d2e1f8a7b6c5d4e3f2a1b0`

**Option B: Generate in terminal:**
```bash
# Linux/Mac
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option C: Use any secure random string generator**

### Step 2: Configure in Agreements App

Add as an **environment variable** in your Agreements app hosting:

#### If using Vercel:
1. Go to your project → **Settings → Environment Variables**
2. Add variable:
   - **Name**: `BOOKLY_WEBHOOK_SECRET`
   - **Value**: `your-generated-secret-key`
   - **Environment**: Production, Preview, Development (select all)
3. Click **Save**
4. **Redeploy** your app for changes to take effect

#### If using Netlify:
1. Go to **Site settings → Environment variables**
2. Click **Add a variable**
3. **Key**: `BOOKLY_WEBHOOK_SECRET`
4. **Value**: `your-generated-secret-key`
5. Click **Save**
6. **Redeploy** your site

#### If using Railway/Render/Fly.io:
1. Go to your project → **Environment Variables** or **Secrets**
2. Add: `BOOKLY_WEBHOOK_SECRET=your-generated-secret-key`
3. **Redeploy** if needed

#### If using Docker/Local:
Add to your `.env` file:
```env
BOOKLY_WEBHOOK_SECRET=your-generated-secret-key
```

Then restart your app.

### Step 3: Configure in WordPress

#### Option A: WordPress Plugin (Recommended)
1. Go to **WordPress Admin → Settings → Bookly → Agreements**
2. Paste the **same secret key** in the **"API Key / Webhook Secret"** field
3. Click **"Save Changes"**

#### Option B: Standalone PHP Code
1. Open `bookly-integration.php`
2. Find line 17: `$api_key = '';`
3. Replace with: `$api_key = 'your-generated-secret-key';`
4. Save the file

---

## ✅ Quick Configuration Checklist

### Webhook URL Setup:
- [ ] Know your Agreements app domain
- [ ] Construct full URL: `https://YOUR-DOMAIN/api/agreements/bookly-webhook`
- [ ] Test URL is accessible (try opening in browser - should see error, but confirms endpoint exists)
- [ ] Added to WordPress plugin settings OR PHP code

### API Key Setup (Optional but Recommended):
- [ ] Generated secure random secret key (32+ characters)
- [ ] Added `BOOKLY_WEBHOOK_SECRET` to Agreements app environment variables
- [ ] Redeployed Agreements app (if needed)
- [ ] Added same secret to WordPress plugin settings OR PHP code

---

## 🧪 Testing Your Configuration

### Test 1: Verify Webhook URL is Accessible

Try accessing your webhook URL in a browser or with curl:
```bash
curl https://your-domain.com/api/agreements/bookly-webhook
```

You should get a JSON error response (like "Method not allowed" or similar) - this confirms the endpoint exists.

### Test 2: Test with Sample Data

Send a test POST request:
```bash
curl -X POST https://your-domain.com/api/agreements/bookly-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "bookingDate": "2024-01-15",
    "bookingTime": "10:00",
    "serviceName": "Test Service"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Booking data processed successfully",
  "client": {
    "id": "...",
    "email": "test@example.com",
    ...
  }
}
```

### Test 3: Check WordPress Logs

After creating a test booking in Bookly:
1. Enable WordPress debug logging (see setup guide)
2. Check `wp-content/debug.log`
3. Look for: `Bookly Agreements Integration: Successfully sent booking X to Agreements app`

---

## 🔍 Troubleshooting

### "Invalid webhook signature" Error

**Problem**: API key/secret doesn't match between WordPress and Agreements app

**Solution**:
1. Verify the **exact same value** is in both places (no extra spaces)
2. Check for typos
3. If using environment variables, ensure you **redeployed** after adding them
4. If still not working, temporarily disable signature verification to test

### "Webhook URL is not configured" Error

**Problem**: Webhook URL is empty or incorrect

**Solution**:
1. Verify URL in WordPress plugin settings
2. Check URL format: starts with `http://` or `https://`
3. Test URL is accessible from WordPress server

### Cannot Access Webhook URL

**Problem**: WordPress can't reach your Agreements app URL

**Solution**:
1. Verify Agreements app is deployed and running
2. Check if URL is accessible from your browser
3. Verify firewall/security settings allow external requests
4. If using localhost, WordPress server won't be able to reach it (use production URL)

---

## 📝 Summary

- **Webhook URL**: `https://YOUR-DOMAIN/api/agreements/bookly-webhook`
  - Find your domain from hosting provider
  - Configure in WordPress plugin settings

- **API Key/Secret**: Optional security feature
  - Generate a random 32+ character string
  - Add to Agreements app as `BOOKLY_WEBHOOK_SECRET` environment variable
  - Add same value to WordPress plugin settings
  - Must match exactly in both places

Need help finding your domain? Check your hosting provider dashboard or deployment logs!

