<?php
/**
 * Plugin Name: Bookly to Agreements App Integration
 * Plugin URI: https://your-domain.com
 * Description: Automatically sends booking data from Bookly WordPress plugin to your Agreements app when a booking is created. Creates or updates client records automatically.
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://your-domain.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bookly-agreements-integration
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main plugin class
 */
class Bookly_Agreements_Integration {
    
    /**
     * Plugin version
     */
    const VERSION = '1.0.0';
    
    /**
     * Option name for settings
     */
    const OPTION_NAME = 'bookly_agreements_integration_settings';
    
    /**
     * Singleton instance
     */
    private static $instance = null;
    
    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        // Load settings
        $this->load_settings();
        
        // Initialize hooks
        $this->init_hooks();
        
        // Admin settings page
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Load settings from database
     */
    private function load_settings() {
        $defaults = array(
            'webhook_url' => '',
            'api_key' => '',
            'auto_create_agreement' => false,
            'template_id' => '',
            'enabled' => true,
        );
        
        $this->settings = wp_parse_args(
            get_option(self::OPTION_NAME, array()),
            $defaults
        );
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // Only hook if enabled
        if (!$this->settings['enabled']) {
            return;
        }
        
        // Hook into Bookly booking creation - try multiple hook names
        add_action('bookly_booking_created', array($this, 'send_booking_to_agreements'), 10, 1);
        add_action('bookly_appointment_created', array($this, 'send_booking_to_agreements'), 10, 1);
        add_action('bookly_new_booking', array($this, 'send_booking_to_agreements'), 10, 1);
        
        // Alternative: Thank you page approach (uncomment if needed)
        // add_action('template_redirect', array($this, 'catch_thank_you_page'));
    }
    
    /**
     * Send booking data to Agreements app
     * 
     * @param int|array $booking_data Booking ID or booking data array
     */
    public function send_booking_to_agreements($booking_data) {
        // Get booking ID
        $booking_id = is_array($booking_data) 
            ? ($booking_data['id'] ?? $booking_data['booking_id'] ?? null) 
            : $booking_data;
        
        if (!$booking_id) {
            $this->log_error('No booking ID provided');
            return;
        }
        
        // Fetch booking details from Bookly
        $booking_details = $this->get_booking_details($booking_id);
        
        if (!$booking_details) {
            $this->log_error("Could not fetch booking details for ID: $booking_id");
            return;
        }
        
        // Prepare payload for Agreements app
        $payload = $this->prepare_payload($booking_details);
        
        // Send to Agreements app
        $response = $this->send_webhook($payload);
        
        if (is_wp_error($response)) {
            $this->log_error('Webhook error - ' . $response->get_error_message());
        } else {
            $response_code = wp_remote_retrieve_response_code($response);
            if ($response_code >= 200 && $response_code < 300) {
                $this->log_success("Successfully sent booking $booking_id to Agreements app");
            } else {
                $response_body = wp_remote_retrieve_body($response);
                $this->log_error("Webhook failed with code $response_code: $response_body");
            }
        }
    }
    
    /**
     * Get booking details from Bookly database
     * 
     * @param int $booking_id
     * @return array|null
     */
    private function get_booking_details($booking_id) {
        global $wpdb;
        
        // Bookly table names (may vary by version)
        $bookly_customers_table = $wpdb->prefix . 'bookly_customers';
        $bookly_customer_appointments_table = $wpdb->prefix . 'bookly_customer_appointments';
        $bookly_appointments_table = $wpdb->prefix . 'bookly_appointments';
        $bookly_services_table = $wpdb->prefix . 'bookly_services';
        
        // Try to get booking data from database
        $query = $wpdb->prepare("
            SELECT 
                ca.id as booking_id,
                ca.appointment_id,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.notes as customer_notes,
                a.start_date,
                a.start_time,
                a.end_date,
                a.end_time,
                a.location,
                s.title as service_name,
                s.duration,
                s.price,
                ca.notes as booking_notes,
                ca.status
            FROM {$bookly_customer_appointments_table} ca
            LEFT JOIN {$bookly_customers_table} c ON ca.customer_id = c.id
            LEFT JOIN {$bookly_appointments_table} a ON ca.appointment_id = a.id
            LEFT JOIN {$bookly_services_table} s ON a.service_id = s.id
            WHERE ca.id = %d
        ", $booking_id);
        
        $booking = $wpdb->get_row($query, ARRAY_A);
        
        if (!$booking) {
            // Fallback: Try using Bookly's internal functions if available
            return $this->get_booking_fallback($booking_id);
        }
        
        return $booking;
    }
    
    /**
     * Fallback method to get booking data using Bookly's internal functions
     * 
     * @param int $booking_id
     * @return array|null
     */
    private function get_booking_fallback($booking_id) {
        // Try using Bookly's internal functions if they exist
        if (class_exists('\\Bookly\\Lib\\Entities\\CustomerAppointment')) {
            try {
                $ca = \Bookly\Lib\Entities\CustomerAppointment::find($booking_id);
                if ($ca) {
                    $customer = $ca->getCustomer();
                    $appointment = $ca->getAppointment();
                    $service = $appointment ? $appointment->getService() : null;
                    
                    return array(
                        'booking_id' => $ca->getId(),
                        'customer_name' => $customer ? $customer->getFullName() : '',
                        'customer_email' => $customer ? $customer->getEmail() : '',
                        'customer_phone' => $customer ? $customer->getPhone() : '',
                        'customer_notes' => $customer ? $customer->getNotes() : '',
                        'start_date' => $appointment ? $appointment->getStartDate() : '',
                        'start_time' => $appointment ? $appointment->getStartTime() : '',
                        'location' => $appointment ? $appointment->getLocationId() : '',
                        'service_name' => $service ? $service->getTitle() : '',
                        'duration' => $service ? $service->getDuration() : '',
                        'price' => $ca->getTotalPrice() ?: ($service ? $service->getPrice() : ''),
                        'booking_notes' => $ca->getNotes() ?: '',
                    );
                }
            } catch (Exception $e) {
                $this->log_error('Error fetching booking - ' . $e->getMessage());
            }
        }
        
        return null;
    }
    
    /**
     * Prepare payload for Agreements app
     * Maps Bookly data to the format expected by the webhook
     * 
     * @param array $booking_details
     * @return array
     */
    private function prepare_payload($booking_details) {
        // Split full name into first and last name
        $name_parts = $this->split_name($booking_details['customer_name'] ?? '');
        
        // Combine date and time
        $start_date = $booking_details['start_date'] ?? '';
        $start_time = $booking_details['start_time'] ?? '';
        
        // Prepare payload matching the webhook schema
        $payload = array(
            'email' => $booking_details['customer_email'] ?? '',
            'firstName' => $name_parts['first'],
            'lastName' => $name_parts['last'],
            'phone' => $booking_details['customer_phone'] ?? null,
            
            // Booking date/time - try multiple formats
            'bookingDate' => $start_date,
            'appointmentDate' => $start_date,
            'bookingTime' => $start_time,
            'appointmentTime' => $start_time,
            
            // Service information
            'serviceName' => $booking_details['service_name'] ?? null,
            'eventType' => $booking_details['service_name'] ?? null,
            'duration' => $booking_details['duration'] ?? null,
            'eventDuration' => $booking_details['duration'] ?? null,
            
            // Location
            'location' => $booking_details['location'] ?? null,
            'eventLocation' => $booking_details['location'] ?? null,
            
            // Price
            'price' => $booking_details['price'] ?? null,
            'packagePrice' => $booking_details['price'] ?? null,
            
            // Notes
            'notes' => $booking_details['booking_notes'] ?? $booking_details['customer_notes'] ?? null,
            'customerNotes' => $booking_details['customer_notes'] ?? null,
        );
        
        // Add template ID if auto-create agreement is enabled
        if ($this->settings['auto_create_agreement'] && !empty($this->settings['template_id'])) {
            $payload['templateId'] = $this->settings['template_id'];
        }
        
        // Remove null values to keep payload clean
        return array_filter($payload, function($value) {
            return $value !== null && $value !== '';
        });
    }
    
    /**
     * Split full name into first and last name
     * 
     * @param string $full_name
     * @return array
     */
    private function split_name($full_name) {
        if (empty($full_name)) {
            return array('first' => '', 'last' => '');
        }
        
        $parts = explode(' ', trim($full_name));
        if (count($parts) === 1) {
            return array('first' => $parts[0], 'last' => '');
        }
        
        $last = array_pop($parts);
        $first = implode(' ', $parts);
        
        return array('first' => $first, 'last' => $last);
    }
    
    /**
     * Send webhook to Agreements app
     * 
     * @param array $payload
     * @return array|WP_Error
     */
    private function send_webhook($payload) {
        if (empty($this->settings['webhook_url'])) {
            $this->log_error('Webhook URL is not configured');
            return new WP_Error('no_url', 'Webhook URL is not configured');
        }
        
        $body = json_encode($payload);
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'Bookly-WordPress-Integration/' . self::VERSION,
            ),
            'body' => $body,
            'timeout' => 15,
        );
        
        // Add webhook signature if API key is configured
        if (!empty($this->settings['api_key'])) {
            $signature = hash_hmac('sha256', $body, $this->settings['api_key']);
            $args['headers']['X-Bookly-Signature'] = $signature;
            $args['headers']['X-Signature'] = $signature; // Alternative header name
        }
        
        return wp_remote_post($this->settings['webhook_url'], $args);
    }
    
    /**
     * Alternative: Catch booking data from thank you page
     */
    public function catch_thank_you_page() {
        // Only run on the thank you page
        if (!is_page('thank-you') && !isset($_涉及['bookly_booking_id'])) {
            return;
        }
        
        // Get booking ID from URL or cookie
        $booking_id = isset($_GET['bookly_booking_id']) 
            ? intval($_GET['bookly_booking_id']) 
            : null;
        
        if (!$booking_id && isset($_COOKIE['bookly_booking_id'])) {
            $booking_id = intval($_COOKIE['bookly_booking_id']);
        }
        
        if ($booking_id) {
            $this->send_booking_to_agreements($booking_id);
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'Bookly Agreements Integration',
            'Bookly → Agreements',
            'manage_options',
            'bookly-agreements-integration',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting(
            'bookly_agreements_integration',
            self::OPTION_NAME,
            array($this, 'sanitize_settings')
        );
    }
    
    /**
     * Sanitize settings before saving
     */
    public function sanitize_settings($input) {
        $sanitized = array();
        
        $sanitized['webhook_url'] = esc_url_raw($input['webhook_url'] ?? '');
        $sanitized['api_key'] = sanitize_text_field($input['api_key'] ?? '');
        $sanitized['auto_create_agreement'] = isset($input['auto_create_agreement']);
        $sanitized['template_id'] = sanitize_text_field($input['template_id'] ?? '');
        $sanitized['enabled'] = isset($input['enabled']);
        
        return $sanitized;
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Save settings if form was submitted
        if (isset($_POST['submit']) && check_admin_referer('bookly_agreements_settings')) {
            update_option(self::OPTION_NAME, $this->settings);
            echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
            $this->load_settings(); // Reload settings
        }
        
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('bookly_agreements_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="enabled"><?php _e('Enable Integration', 'bookly-agreements-integration'); ?></label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="enabled" 
                                   name="<?php echo esc_attr(self::OPTION_NAME); ?>[enabled]" 
                                   value="1" 
                                   <?php checked($this->settings['enabled'], true); ?>>
                            <p class="description">Enable or disable the integration</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="webhook_url"><?php _e('Webhook URL', 'bookly-agreements-integration'); ?></label>
                        </th>
                        <td>
                            <input type="url" 
                                   id="webhook_url"
                                   name="<?php echo esc_attr(self::OPTION_NAME); ?>[webhook_url]" 
                                   value="<?php echo esc_attr($this->settings['webhook_url']); ?>" 
                                   class="regular-text" 
                                   required>
                            <p class="description">URL of your Agreements app webhook endpoint<br>
                            Example: <code>https://your-domain.com/api/agreements/bookly-webhook</code></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="api_key"><?php _e('API Key / Webhook Secret', 'bookly-agreements-integration'); ?></label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="api_key" 
                                   name="<?php echo esc_attr(self::OPTION_NAME); ?>[api_key]" 
                                   value="<?php echo esc_attr($this->settings['api_key']); ?>" 
                                   class="regular-text">
                            <p class="description">Optional: Webhook secret for signature verification (must match BOOKLY_WEBHOOK_SECRET in your Agreements app)</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="auto_create_agreement"><?php _e('Auto-create Agreement', 'bookly-agreements-integration'); ?></label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="auto_create_agreement" 
                                   name="<?php echo esc_attr(self::OPTION_NAME); ?>[auto_create_agreement]" 
                                   value="1" 
                                   <?php checked($this->settings['auto_create_agreement'], true); ?>>
                            <p class="description">Automatically create an agreement when a booking is created</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="template_id"><?php _e('Default Template ID', 'bookly-agreements-integration'); ?></label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="template_id" 
                                   name="<?php echo esc_attr(self::OPTION_NAME); ?>[template_id]" 
                                   value="<?php echo esc_attr($this->settings['template_id']); ?>" 
                                   class="regular-text">
                            <p class="description">Template ID to use when auto-creating agreements (leave empty to use BOOKLY_DEFAULT_TEMPLATE_ID from Agreements app)</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <hr>
            
            <h2>Testing & Troubleshooting</h2>
            <p>After configuring, create a test booking in Bookly and check the WordPress error log for messages:</p>
            <ul>
                <li><code>Bookly Integration: Successfully sent booking X to Agreements app</code> ✅</li>
                <li><code>Bookly Integration: Webhook error - ...</code> ❌</li>
            </ul>
            <p>To enable WordPress debug logging, add these lines to <code>wp-config.php</code>:</p>
            <pre><code>define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);</code></pre>
        </div>
        <?php
    }
    
    /**
     * Log success message
     */
    private function log_success($message) {
        error_log('Bookly Agreements Integration: ' . $message);
    }
    
    /**
     * Log error message
     */
    private function log_error($message) {
        error_log('Bookly Agreements Integration ERROR: ' . $message);
    }
}

/**
 * Initialize the plugin
 */
function bookly_agreements_integration_init() {
    Bookly_Agreements_Integration::get_instance();
}
add_action('plugins_loaded', 'bookly_agreements_integration_init');

/**
 * Activation hook
 */
register_activation_hook(__FILE__, function() {
    // Set default settings on activation
    $defaults = array(
        'webhook_url' => '',
        'api_key' => '',
        'auto_create_agreement' => false,
        'template_id' => '',
        'enabled' => true,
    );
    
    add_option(Bookly_Agreements_Integration::OPTION_NAME, $defaults);
});

/**
 * Deactivation hook
 */
register_deactivation_hook(__FILE__, function() {
    // Optionally clear scheduled events or cleanup
});

