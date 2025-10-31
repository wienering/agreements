# Bookly WordPress Integration Setup Guide

This guide explains how to integrate Bookly WordPress plugin with your Agreements app using custom PHP code.

## Overview

When a booking is created in Bookly, the PHP code automatically sends booking data to your Agreements app, which then creates or updates client records.

## Setup Steps

### 1. Copy the PHP Code to WordPress

You have two options:

#### Option A: Add to Theme's functions.php (Quick Method)
1. Go to WordPress Admin → Appearance → Theme Editor
2. Select your active theme's `functions.php` file
3. Copy the contents of `bookly-integration.php` and paste at the end of the file
4. **Update the webhook URL** on line 16:
   ```php
   $webhook_url = 'https://your-actual-domain.com/api/agreements/bookly-webhook';
   ```
5. Save the file

#### Option B: Create a Custom Plugin (Recommended) ✅ READY TO USE
A complete WordPress plugin is provided in the `bookly-agreements-integration/` folder!

1. **Upload the plugin**:
   - Option A: Zip the `bookly-agreements-integration` folder and upload via WordPress Admin → Plugins → Add New → Upload Plugin
   - Option B: Upload the folder to `/wp-content/plugins/bookly-agreements-integration/`

2. **Activate the plugin**:
   - Go to WordPress Admin → Plugins
   - Find "Bookly to Agreements App Integration"
   - Click "Activate"

3. **Configure the plugin**:
   - Go to Settings → Bookly → Agreements
   - Enter your webhook URL and configure options
   - No code editing required! ✨

See `bookly-agreements-integration/README.md` for detailed installation instructions.

### 2. Configure the Integration

Edit the configuration variables at the top of the PHP file:

```php
// Your Agreements app webhook URL
$webhook_url = 'https://your-domain.com/api/agreements/bookly-webhook';

// Optional: Webhook secret if you're using signature verification
$api_key = 'your-secret-key-here'; // Leave empty if not using
```

### 3. Test the Integration

1. Create a test booking in Bookly
2. Check WordPress error logs (usually in `wp-content/debug.log` if WP_DEBUG is enabled)
3. Look for messages like:
   - `Bookly Integration: Successfully sent booking X to Agreements app` ✅
   - `Bookly Integration: Webhook error - ...` ❌

### 4. Verify in Agreements App

1. Check your Agreements app database/client list
2. You should see a new client created with the booking details
3. If `BOOKLY_DEFAULT_TEMPLATE_ID` is set, an agreement should also be created

## Troubleshooting

### The hook isn't firing

Bookly uses different hook names depending on the version. The code tries multiple common hooks:
- `bookly_booking_created`
- `bookly_appointment_created`
- `bookly_new_booking`

If none work, try:

1. **Check Bookly documentation** for your specific version's hooks
2. **Enable WordPress debug mode** to see what hooks are available:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```
3. **Use the thank you page approach** (see Alternative Method below)

### Data not sending correctly

1. Check WordPress error logs for detailed error messages
2. Verify the webhook URL is accessible from your WordPress server
3. Test the webhook endpoint directly with a POST request:
   ```bash
   curl -X POST https://your-domain.com/api/agreements/bookly-webhook \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}'
   ```

### Database query failing

The code queries Bookly's database tables. If the table structure differs:
1. Check your Bookly database tables in phpMyAdmin
2. Update the table names in `bookly_get_booking_details()` function
3. Or use the fallback method which uses Bookly's internal functions

## Alternative Method: Thank You Page Approach

If hooks don't work, you can use Bookly's thank you page redirect:

1. **In Bookly Settings**:
   - Go to Bookly → Settings → URL Settings
   - Set "Final step URL" to: `https://your-wordpress-site.com/bookly-thank-you?bookly_booking_id={booking_id}`

2. **In the PHP code**, uncomment this line:
   ```php
   add_action('template_redirect', 'bookly_catch_thank_you_page');
   ```

3. **Create a WordPress page** with slug `thank-you` (or update the check in `bookly_catch_thank_you_page()`)

## Security Considerations

### Webhook Signature Verification (Recommended)

1. Set `BOOKLY_WEBHOOK_SECRET` in your Agreements app environment variables
2. Set the same value in the PHP `$api_key` variable
3. The code will automatically sign requests using HMAC-SHA256

### API Key Authentication

If you prefer API key authentication instead:
1. Modify the webhook endpoint to check for `X-API-Key` header
2. Set `$api_key` in the PHP code

## Data Mapping

The integration maps Bookly fields to Agreements app Client fields:

| Bookly Field | Agreements App Field |
|-------------|---------------------|
| Customer Email | email (required) |
| Customer Name | firstName, lastName (split automatically) |
| Customer Phone | phone |
| Appointment Date | eventDate |
| Appointment Time | eventStartTime |
| Service Name | eventType |
| Service Duration | eventDuration |
| Service Price | packagePrice |
| Location | eventLocation |
| Notes | notes |

## Support

If you encounter issues:
1. Check WordPress error logs
2. Verify Bookly is active and working
3. Test the webhook endpoint directly
4. Check Agreements app logs for incoming requests

