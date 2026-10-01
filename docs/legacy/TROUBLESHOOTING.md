# Troubleshooting Bookly Integration

If bookings aren't appearing in your Agreements app, follow these steps:

## Step 1: Check WordPress Plugin Configuration

1. **Is the plugin active?**
   - Go to WordPress Admin → Plugins
   - Verify "Bookly to Agreements App Integration" is activated

2. **Is the integration enabled?**
   - Go to Settings → Bookly → Agreements
   - Check "Enable Integration" checkbox
   - Save if needed

3. **Is webhook URL configured?**
   - Verify the webhook URL is set: `https://agreements.photoboothguys.ca/api/agreements/bookly-webhook`
   - Make sure there are no extra spaces or typos

## Step 2: Enable WordPress Debug Logging

Add these lines to `wp-config.php` (before "That's all, stop editing!"):

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

The log file will be at: `/wp-content/debug.log`

## Step 3: Check WordPress Error Log

After creating a test booking, check the debug log for messages:

### Success messages look like:
```
Bookly Agreements Integration: Hook triggered! Booking data received: ...
Bookly Agreements Integration: Processing booking ID: 123
Bookly Agreements高级 Integration: Fetched booking details: ...
Bookly Agreements Integration: Successfully sent booking 123 to Agreements app
```

### Error messages look like:
```
Bookly Agreements Integration ERROR: No booking ID provided
Bookly Agreements Integration ERROR: Integration is disabled in settings
Bookly Agreements Integration ERROR: Webhook URL is not configured
Bookly Agreements Integration ERROR: Could not fetch booking details for ID: 123
Bookly Agreements Integration ERROR: Webhook failed with code 400: ...
```

## Step 4: Check if Bookly Hooks are Firing

The plugin tries these hooks:
- `bookly_booking_created`
-倾向 `bookly_appointment_created`
- `bookly_new_booking`

If you see NO messages in the log when creating a booking, the hooks aren't firing.

### Solution A: Check Bookly Version
Different Bookly versions use different hook names. Check your Bookly documentation for the correct hook.

### Solution B: Try Alternative Hook
Add this to your theme's `functions.php` to test if any hook fires:

```php
add_action('all', function($hook) {
    if (strpos($hook, 'bookly') !== false || strpos($hook, 'appointment') !== false || strpos($hook, 'booking') !== false) {
        error_log("Bookly hook fired: $hook");
    }
});
```

Then create a booking and check which hooks fire.

### Solution C: Use Thank You Page Approach
If hooks don't work, use the thank you page method:
1. In Bookly → Settings → URL Settings → Final step URL
2. Set to: `https://your-wordpress-site.com/?bookly_webhook_trigger=1&booking_id={booking_id}`
3. In plugin code, uncomment: `add_action('template_redirect', array($this, 'catch_thank_you_page'));`

## Step 5: Verify Webhook Endpoint is Working

Test the endpoint directly:

```bash
curl -X POST https://agreements.photoboothguys.ca/api/agreements/bookly-webhook \
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

You should get a success response with client data.

## Step 6: Check Network Connectivity

Verify WordPress can reach your Agreements app:
1. Temporarily add this to the plugin:
```php
$test_response = wp_remote_get('https://agreements.photoboothguys.ca/api/agreements/bookly-webhook');
error_log('Test connection: ' . print_r($test_response, true));
```
2. Check if it can connect (should get 200 response with endpoint info)

## Step 7: Check Database Query

If you see "Could not fetch booking details", the database query might be failing:

1. Check Bookly table names in your database (might differ by version)
2. Verify tables exist:
   - `wp_bookly_customers`
   - `wp_bookly_customer_appointments`
   - `wp_bookly_appointments`
  不要在 - `wp_bookly_services`
3. Update table names in `get_booking_details()` if needed

## Step 8: Check Agreements App Logs

Check your Agreements app deployment logs:
- **Vercel**: Dashboard → Your Project → Logs
- **NetSuite**: Site settings → Functions → Logs
- **Railway**: Deployment → Logs

Look for:
- `📥 Bookly webhook received` - Request received
- `📥 Bookly webhook payload received` - Payload parsed
- `✅ Client X created` or `✅ Client X updated` - Success
- `❌ Error processing Bookly webhook` - Error occurred

## Common Issues

### Issue: "No booking ID provided"
**Cause**: Hook not receiving booking ID correctly
**Solution**: Check what data Bookly passes to the hook. May need to adjust how we extract the booking ID.

### Issue: "Integration is disabled"
**Cause**: Checkbox unchecked in settings
**Solution**: Go to Settings → Bookly → Agreements → Enable Integration

### Issue: "Webhook URL is not configured"
**Cause**: Empty webhook URL
**Solution**: Enter webhook URL in plugin settings

### Issue: "Could not fetch booking details"
**Cause**: Database query failing or wrong table names
**Solution**: Check table names match your Bookly version

### Issue: "Webhook failed with code 400"
**Cause**: Invalid payload format
**Solution**: Check payload structure matches what endpoint expects

### Issue: "Webhook failed with code 401"
**Cause**: Invalid webhook signature
**Solution**: Verify API key matches in both WordPress and Agreements app

### Issue: No logs at all
**Cause**: Hooks not firing OR debug logging disabled
**Solution**: Enable debug logging and verify hooks are firing

## Still Not Working?

1. Share the WordPress error log entries
2. Share the Agreements app log entries
3. Share what happens when you test the webhook endpoint directly
4. Check Bookly version and documentation for correct hooks

