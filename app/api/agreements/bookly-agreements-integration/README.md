# Bookly to Agreements App Integration - WordPress Plugin

A WordPress plugin that automatically sends booking data from Bookly to your Agreements app when a booking is created.

## Installation

### Method 1: Upload Plugin (Recommended)

1. **Zip the plugin folder**:
   - Create a ZIP file containing the `bookly-agreements-integration` folder
   - The ZIP should contain: `bookly-agreements-integration.php` and `README.md`

2. **Upload to WordPress**:
   - Go to WordPress Admin → Plugins → Add New
   - Click "Upload Plugin"
   - Choose the ZIP file and click "Install Now"
   - Click "Activate Plugin"

### Method 2: Manual Installation

1. **Upload folder to WordPress**:
   - Upload the `bookly-agreements-integration` folder to `/wp-content/plugins/`
   - The full path should be: `/wp-content/plugins/bookly-agreements-integration/bookly-agreements-integration.php`

2. **Activate the plugin**:
   - Go to WordPress Admin → Plugins
   - Find "Bookly to Agreements App Integration"
   - Click "Activate"

## Configuration

1. **Go to Settings**:
   - WordPress Admin → Settings → Bookly → Agreements

2. **Configure the integration**:
   - **Enable Integration**: Check to enable the integration
   - **Webhook URL**: Enter your Agreements app webhook endpoint
     - Example: `https://your-domain.com/api/agreements/bookly-webhook`
   - **API Key / Webhook Secret** (Optional): Enter your webhook secret if using signature verification
   - **Auto-create Agreement**: Check to automatically create agreements for new bookings
   - **Default Template ID** (Optional): Template ID to use when auto-creating agreements

3. **Save Settings**:
   - Click "Save Changes"

## Testing

1. **Create a test booking** in Bookly
2. **Check WordPress error log** for messages:
   - Success: `Bookly Agreements Integration: Successfully sent booking X to Agreements app`
   - Error: `Bookly Agreements Integration ERROR: ...`

To enable WordPress debug logging, add to `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

The log file will be at: `/wp-content/debug.log`

## Troubleshooting

### Integration not working?

1. **Check if plugin is enabled** in Settings
2. **Verify webhook URL** is correct and accessible
3. **Check WordPress error logs** for error messages
4. **Test webhook endpoint directly**:
   ```bash
   curl -X POST https://your-domain.com/api/agreements/bookly-webhook \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","firstName":"Test","lastName":"User"}'
   ```

### Hooks not firing?

Bookly uses different hook names depending on version. The plugin tries:
- `bookly_booking_created`
- `bookly_appointment_created`
- `bookly_new_booking`

If none work, check your Bookly version documentation or use the "Thank You Page" approach (see alternative method in main setup guide).

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- Bookly WordPress plugin (active)
- Agreements app webhook endpoint accessible from your WordPress server

## Support

For issues or questions:
1. Check the main setup guide: `BOOKLY_INTEGRATION_SETUP.md`
2. Check WordPress error logs
3. Verify Bookly plugin is active and working
4. Test webhook endpoint directly

## License

GPL v2 or later

