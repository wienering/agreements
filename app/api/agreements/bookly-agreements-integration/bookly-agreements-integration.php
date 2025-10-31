<?php
/**
 * Plugin Name: Bookly to Agreements App Integration
 * Plugin URI: https://www.photoboothguys.ca
 * Description: Automatically sends booking data from Bookly WordPress plugin to your Agreements app when a booking is created. Creates or updates client records automatically.
 * Version: 1.0.0
 * Author: Photobooth Guys
 * Author URI: https://www.photoboothguys.ca
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
        // Log when hooks are registered
        $this->log_success('Registering Bookly hooks...');
        
        add_action('bookly_booking_created', array($this, 'send_booking_to_agreements'), 10, 1);
        add_action('bookly_appointment_created', array($this, 'send_booking_to_agreements'), 10, 1);
        add_action('bookly_new_booking', array($this, 'send_booking_to_agreements'), 10, 1);
        
        // Additional hooks to try (some Bookly versions use these)
        add_action('bookly_after_appointment_created', array($this, 'send_booking_to_agreements'), 10, 1);
        add_action('bookly_after_booking_created', array($this, 'send_booking_to_agreements'), 10, 1);
        add_action('bookly_appointment_saved', array($this, 'send_booking_to_agreements'), 10, 1);
        
        // Log all hook registrations
        $this->log_success('Hooks registered: bookly_booking_created, bookly_appointment_created, bookly_new_booking, bookly_after_appointment_created, bookly_after_booking_created, bookly_appointment_saved');
        
        // Alternative: Thank you page approach
        add_action('template_redirect', array($this, 'catch_thank_you_page'), 10);
        
        // Backup: Check for new bookings on admin pages (runs every time admin loads)
        // This ensures we catch bookings even if hooks don't fire
        add_action('admin_init', array($this, 'check_new_bookings_on_admin_load'), 999);
    }
    
    /**
     * Check for new bookings when admin pages load
     * This is a backup method if hooks aren't firing
     */
    public function check_new_bookings_on_admin_load() {
        // Only run occasionally (every 2 minutes max) to avoid performance issues
        $last_check = get_transient('bookly_last_check');
        if ($last_check && (time() - $last_check) < 120) {
            return;
        }
        
        // Update last check time
        set_transient('bookly_last_check', time(), 300);
        
        // Check for very recent bookings (last 5 minutes)
        global $wpdb;
        $bookly_customer_appointments_table = $wpdb->prefix . 'bookly_customer_appointments';
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$bookly_customer_appointments_table'");
        if (!$table_exists) {
            return;
        }
        
        // Get bookings from last 5 minutes
        $query = "
            SELECT ca.id 
            FROM {$bookly_customer_appointments_table} ca
            WHERE ca.created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            AND ca.status IN ('approved', 'done', 'waitlisted')
            ORDER BY ca.created_at DESC
            LIMIT 5
        ";
        
        $new_bookings = $wpdb->get_col($query);
        
        if (!empty($new_bookings)) {
            foreach ($new_bookings as $booking_id) {
                // Check if we've already processed this booking
                $processed_key = 'bookly_processed_' . $booking_id;
                if (!get_transient($processed_key)) {
                    $this->send_booking_to_agreements($booking_id);
                    // Mark as processed (expires in 24 hours)
                    set_transient($processed_key, true, 86400);
                }
            }
        }
    }
    
    /**
     * Send booking data to Agreements app
     * 
     * @param int|array $booking_data Booking ID or booking data array
     */
    public function send_booking_to_agreements($booking_data) {
        $this->log_success('Hook triggered! Booking data received: ' . print_r($booking_data, true));
        
        // Get booking ID
        $booking_id = is_array($booking_data) 
            ? ($booking_data['id'] ?? $booking_data['booking_id'] ?? null) 
            : $booking_data;
        
        if (!$booking_id) {
            $this->log_error('No booking ID provided');
            return false;
        }
        
        // Check if plugin is enabled and configured
        if (!$this->settings['enabled']) {
            $this->log_error('Integration is disabled in settings');
            return false;
        }
        
        if (empty($this->settings['webhook_url'])) {
            $this->log_error('Webhook URL is not configured. Please set it in Settings → Bookly → Agreements');
            return false;
        }
        
        $this->log_success("Processing booking ID: $booking_id");
        
        // Fetch booking details from Bookly
        $booking_details = $this->get_booking_details($booking_id);
        
        if (!$booking_details) {
            $this->log_error("Could not fetch booking details for ID: $booking_id");
            return false;
        }
        
        // Check if we got email (required field)
        if (empty($booking_details['customer_email'])) {
            $this->log_error("No customer email found for booking ID: $booking_id. Booking details: " . print_r($booking_details, true));
            return false;
        }
        
        $this->log_success("Fetched booking details. Email: " . $booking_details['customer_email']);
        
        // Prepare payload for Agreements app
        $payload = $this->prepare_payload($booking_details);
        
        // Verify email is in payload (required)
        if (empty($payload['email'])) {
            $this->log_error("No email in prepared payload for booking ID: $booking_id. Payload: " . json_encode($payload));
            return false;
        }
        
        $this->log_success("Prepared payload with email: " . $payload['email']);
        
        // Send to Agreements app
        $response = $this->send_webhook($payload);
        
        if (is_wp_error($response)) {
            $error_msg = $response->get_error_message();
            $this->log_error("Webhook error for booking $booking_id: $error_msg");
            return false;
        } else {
            $response_code = wp_remote_retrieve_response_code($response);
            $response_body = wp_remote_retrieve_body($response);
            
            if ($response_code >= 200 && $response_code < 300) {
                $this->log_success("Successfully sent booking $booking_id to Agreements app. Response ($response_code): $response_body");
                return true;
            } else {
                $this->log_error("Webhook failed for booking $booking_id. Code: $response_code, Response: $response_body");
                return false;
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
        
        // First, let's get the basic booking info to see what we have
        $booking_basic = $wpdb->get_row($wpdb->prepare("
            SELECT ca.*, ca.customer_id
            FROM {$bookly_customer_appointments_table} ca
            WHERE ca.id = %d
        ", $booking_id), ARRAY_A);
        
        if (!$booking_basic) {
            $this->log_error("Booking ID $booking_id not found in bookly_customer_appointments table");
            return null;
        }
        
        $customer_id = $booking_basic['customer_id'];
        $this->log_success("Booking ID $booking_id has customer_id: $customer_id");
        
        // Now get customer info separately
        $customer = $wpdb->get_row($wpdb->prepare("
            SELECT * FROM {$bookly_customers_table} WHERE id = %d
        ", $customer_id), ARRAY_A);
        
        if (!$customer) {
            $this->log_error("Customer ID $customer_id not found in bookly_customers table");
            // Continue anyway, maybe email is elsewhere
        } else {
            $this->log_success("Customer found. Email: " . ($customer['email'] ?? 'NOT SET') . ", Name: " . ($customer['name'] ?? 'NOT SET'));
        }
        
        // Try to get booking data from database with JOINs
        // Note: Using correct field names based on actual Bookly database structure
        $query = $wpdb->prepare("
            SELECT 
                ca.id as booking_id,
                ca.appointment_id,
                ca.customer_id,
                COALESCE(c.full_name, CONCAT(c.first_name, ' ', c.last_name), '') as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.notes as customer_notes,
                a.start_date,
                DATE_FORMAT(a.start_date, '%%H:%%i') as start_time,
                a.end_date,
                DATE_FORMAT(a.end_date, '%%H:%%i') as end_time,
                a.location_id as location,
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
            $this->log_error("Failed to get booking with JOIN query for ID: $booking_id");
            // Fallback: Try using Bookly's internal functions if available
            return $this->get_booking_fallback($booking_id);
        }
        
        // If customer_email is empty but we found the customer separately, use that
        if (empty($booking['customer_email']) && $customer && !empty($customer['email'])) {
            $this->log_success("Email missing from JOIN, using direct customer query. Email: " . $customer['email']);
            $booking['customer_email'] = $customer['email'];
            $booking['customer_name'] = !empty($customer['full_name']) ? $customer['full_name'] : (trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) ?: $booking['customer_name'] ?? '');
            $booking['customer_phone'] = $customer['phone'] ?? $booking['customer_phone'] ?? '';
        }
        
        // Fallback: If JOIN still didn't work, build from separate queries
        if (empty($booking['customer_email']) && $customer) {
            $this->log_success("Building booking data from separate queries");
            $booking['customer_email'] = $customer['email'] ?? '';
            $booking['customer_name'] = !empty($customer['full_name']) ? $customer['full_name'] : trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? ''));
            $booking['customer_phone'] = $customer['phone'] ?? '';
            $booking['customer_notes'] = $customer['notes'] ?? '';
        }
        
        // Get appointment data separately if JOIN didn't work
        if ($booking && empty($booking['start_date'])) {
            $appointment_id = $booking_basic['appointment_id'] ?? null;
            if ($appointment_id) {
                $appointment = $wpdb->get_row($wpdb->prepare("
                    SELECT * FROM {$bookly_appointments_table} WHERE id = %d
                ", $appointment_id), ARRAY_A);
                
                if ($appointment) {
                    $booking['start_date'] = $appointment['start_date'] ?? '';
                    $booking['start_time'] = $appointment['start_date'] ? date('H:i', strtotime($appointment['start_date'])) : '';
                    $booking['end_date'] = $appointment['end_date'] ?? '';
                    $booking['end_time'] = $appointment['end_date'] ? date('H:i', strtotime($appointment['end_date'])) : '';
                    $booking['location'] = $appointment['location_id'] ?? '';
                    
                    // Get service if we have service_id
                    $service_id = $appointment['service_id'] ?? null;
                    if ($service_id) {
                        $service = $wpdb->get_row($wpdb->prepare("
                            SELECT * FROM {$bookly_services_table} WHERE id = %d
                        ", $service_id), ARRAY_A);
                        
                        if ($service) {
                            $booking['service_name'] = $service['title'] ?? '';
                            $booking['duration'] = $service['duration'] ?? '';
                            $booking['price'] = $service['price'] ?? '';
                        }
                    }
                }
            }
        }
        
        // Log what we got for debugging
        $this->log_success("Final booking data - Email: " . ($booking['customer_email'] ?? 'MISSING') . ", Name: " . ($booking['customer_name'] ?? 'MISSING'));
        
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
        
        // IMPORTANT: Always keep email, even if empty, so we can validate it
        // Remove null values but keep email
        $filtered = array_filter($payload, function($value, $key) {
            // Always keep email for validation
            if ($key === 'email') {
                return true;
            }
            return $value !== null && $value !== '';
        }, ARRAY_FILTER_USE_BOTH);
        
        // Ensure email is in the result
        if (isset($payload['email'])) {
            $filtered['email'] = $payload['email'];
        }
        
        return $filtered;
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
        
        // Verify email is in payload before sending
        if (empty($payload['email'])) {
            $this->log_error('Cannot send webhook: Email is missing from payload. Payload: ' . json_encode($payload));
            return new WP_Error('no_email', 'Email is required in payload');
        }
        
        $body = json_encode($payload);
        
        $this->log_success('Sending webhook to: ' . $this->settings['webhook_url']);
        $this->log_success('Payload size: ' . strlen($body) . ' bytes');
        
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
        
        $response = wp_remote_post($this->settings['webhook_url'], $args);
        
        // Log the actual request details for debugging
        if (is_wp_error($response)) {
            $this->log_error('WP_Remote_Post Error: ' . $response->get_error_code() . ' - ' . $response->get_error_message());
        } else {
            $response_code = wp_remote_retrieve_response_code($response);
            $response_body = wp_remote_retrieve_body($response);
            $this->log_success("Webhook response code: $response_code, body length: " . strlen($response_body));
        }
        
        return $response;
    }
    
    /**
     * Alternative: Catch booking data from thank you page
     */
    public function catch_thank_you_page() {
        // This runs on every page load to catch Bookly booking data
        // Bookly usually sets cookies or session data after booking
        
        // Method 1: Check for Bookly cookie (most common)
        if (isset($_COOKIE['bookly_appointment_id'])) {
            $booking_id = intval($_COOKIE['bookly_appointment_id']);
            if ($booking_id) {
                $this->log_success("Found booking ID from cookie: $booking_id");
                $this->send_booking_to_agreements($booking_id);
                return;
            }
        }
        
        // Method 2: Check for booking ID in URL
        if (isset($_GET['bookly_booking_id'])) {
            $booking_id = intval($_GET['bookly_booking_id']);
            if ($booking_id) {
                $this->log_success("Found booking ID from URL: $booking_id");
                $this->send_booking_to_agreements($booking_id);
                return;
            }
        }
        
        // Method 3: Check session (if Bookly uses sessions)
        if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['bookly_appointment_id'])) {
            $booking_id = intval($_SESSION['bookly_appointment_id']);
            if ($booking_id) {
                $this->log_success("Found booking ID from session: $booking_id");
                $this->send_booking_to_agreements($booking_id);
                return;
            }
        }
        
        // Method 4: Try to get from POST data
        if (isset($_POST['bookly_appointment_id'])) {
            $booking_id = intval($_POST['bookly_appointment_id']);
            if ($booking_id) {
                $this->log_success("Found booking ID from POST: $booking_id");
                $this->send_booking_to_agreements($booking_id);
                return;
            }
        }
    }
    
    /**
     * Check for recent bookings and process them
     * This can be called manually or automatically
     */
    public function check_recent_bookings() {
        global $wpdb;
        
        if (!$this->settings['enabled'] || empty($this->settings['webhook_url'])) {
            return array('found' => 0, 'processed' => 0, 'errors' => array());
        }
        
        // Get bookings from last 24 hours that are approved/completed
        $bookly_customer_appointments_table = $wpdb->prefix . 'bookly_customer_appointments';
        
        // Check if table exists
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$bookly_customer_appointments_table'");
        if (!$table_exists) {
            return array('found' => 0, 'processed' => 0, 'errors' => array('Table does not exist'));
        }
        
        // Get bookings with customer info to verify we can access email
        $query = "
            SELECT ca.id, ca.customer_id, ca.status, c.email as has_email
            FROM {$bookly_customer_appointments_table} ca
            LEFT JOIN {$wpdb->prefix}bookly_customers c ON ca.customer_id = c.id
            WHERE ca.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND ca.status IN ('approved', 'done', 'waitlisted')
            ORDER BY ca.created_at DESC
            LIMIT 50
        ";
        
        $recent_bookings_data = $wpdb->get_results($query, ARRAY_A);
        
        if (empty($recent_bookings_data)) {
            return array('found' => 0, 'processed' => 0, 'errors' => array());
        }
        
        $processed = 0;
        $errors = array();
        $recent_bookings = array();
        
        // Extract booking IDs and check for emails
        foreach ($recent_bookings_data as $booking_data) {
            $booking_id = $booking_data['id'];
            $recent_bookings[] = $booking_id;
            
            // Pre-check: Does this booking have an email?
            if (empty($booking_data['has_email'])) {
                $errors[] = "Booking ID $booking_id: Customer has no email in database (customer_id: " . $booking_data['customer_id'] . ")";
            }
        }
        
        foreach ($recent_bookings as $booking_id) {
            try {
                // First verify we can get booking details
                $booking_details = $this->get_booking_details($booking_id);
                if (!$booking_details) {
                    $errors[] = "Booking ID $booking_id: Could not fetch booking details from database";
                    continue;
                }
                
                // Check for required email
                if (empty($booking_details['customer_email'])) {
                    $errors[] = "Booking ID $booking_id: No customer email found";
                    continue;
                }
                
                // Send booking data
                $result = $this->send_booking_to_agreements($booking_id);
                
                // Check if it actually succeeded
                if ($result === true) {
                    $processed++;
                } else {
                    $errors[] = "Booking ID $booking_id: Failed to send (check logs for details)";
                }
            } catch (Exception $e) {
                $errors[] = "Booking ID $booking_id: Exception - " . $e->getMessage();
            }
        }
        
        return array(
            'found' => count($recent_bookings), 
            'processed' => $processed,
            'errors' => $errors
        );
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
            // Get and sanitize the posted settings
            $input = isset($_POST[self::OPTION_NAME]) ? $_POST[self::OPTION_NAME] : array();
            $sanitized = $this->sanitize_settings($input);
            
            // Save the sanitized settings
            update_option(self::OPTION_NAME, $sanitized);
            echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
            
            // Reload settings to show updated values
            $this->load_settings();
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
            
            <h3>Test Webhook Connection</h3>
            <form method="post" action="" style="margin: 20px 0;">
                <?php wp_nonce_field('bookly_test_webhook'); ?>
                <input type="hidden" name="bookly_test_action" value="test_webhook">
                <p>Click this button to send a test booking to your Agreements app:</p>
                <button type="submit" class="button button-primary">Test Webhook Now</button>
            </form>
            
            <?php
            // Handle test webhook
            if (isset($_POST['bookly_test_action']) && $_POST['bookly_test_action'] === 'test_webhook' && check_admin_referer('bookly_test_webhook')) {
                $test_payload = array(
                    'email' => 'test@example.com',
                    'firstName' => 'Test',
                    'lastName' => 'Client',
                    'bookingDate' => date('Y-m-d'),
                    'bookingTime' => '10:00',
                    'serviceName' => 'Test Service',
                    'phone' => '123-456-7890',
                );
                
                $response = $this->send_webhook($test_payload);
                
                if (is_wp_error($response)) {
                    echo '<div class="notice notice-error"><p><strong>Test Failed:</strong> ' . esc_html($response->get_error_message()) . '</p></div>';
                } else {
                    $response_code = wp_remote_retrieve_response_code($response);
                    $response_body = wp_remote_retrieve_body($response);
                    
                    if ($response_code >= 200 && $response_code < 300) {
                        echo '<div class="notice notice-success"><p><strong>Test Successful!</strong> Response (' . $response_code . '): ' . esc_html($response_body) . '</p></div>';
                    } else {
                        echo '<div class="notice notice-error"><p><strong>Test Failed:</strong> HTTP ' . $response_code . ' - ' . esc_html($response_body) . '</p></div>';
                    }
                }
            }
            ?>
            
            <h3>Debug Booking Data</h3>
            <form method="post" action="" style="margin: 20px 0;">
                <?php wp_nonce_field('bookly_debug_booking'); ?>
                <input type="hidden" name="bookly_debug_action" value="debug_booking">
                <p>Enter a booking ID to see what data is retrieved from the database:</p>
                <input type="number" name="debug_booking_id" placeholder="Booking ID (e.g. 647)" style="width: 200px;" required>
                <button type="submit" class="button">Debug Booking</button>
            </form>
            
            <?php
            // Handle debug action
            if (isset($_POST['bookly_debug_action']) && $_POST['bookly_debug_action'] === 'debug_booking' && check_admin_referer('bookly_debug_booking')) {
                $debug_id = intval($_POST['debug_booking_id']);
                if ($debug_id) {
                    global $wpdb;
                    
                    echo '<div class="notice notice-info"><p><strong>Debug Results for Booking ID ' . $debug_id . ':</strong></p>';
                    
                    // Step 1: Get booking record
                    $bookly_customer_appointments_table = $wpdb->prefix . 'bookly_customer_appointments';
                    $booking_record = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$bookly_customer_appointments_table} WHERE id = %d", $debug_id), ARRAY_A);
                    
                    echo '<h4>Step 1: Booking Record</h4>';
                    if ($booking_record) {
                        echo '<pre style="background: #f5f5f5; padding: 15px; overflow-x: auto; max-height: 300px;">';
                        echo htmlspecialchars(print_r($booking_record, true));
                        echo '</pre>';
                        
                        $customer_id = $booking_record['customer_id'] ?? null;
                        $appointment_id = $booking_record['appointment_id'] ?? null;
                        echo '<p><strong>Customer ID:</strong> ' . ($customer_id ? $customer_id : 'NOT SET') . '</p>';
                        echo '<p><strong>Appointment ID:</strong> ' . ($appointment_id ? $appointment_id : 'NOT SET') . '</p>';
                    } else {
                        echo '<p style="color:red;">✗ Booking not found!</p>';
                        echo '</div>';
                        return;
                    }
                    
                    // Step 2: Get customer record
                    if ($customer_id) {
                        $bookly_customers_table = $wpdb->prefix . 'bookly_customers';
                        $customer_record = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$bookly_customers_table} WHERE id = %d", $customer_id), ARRAY_A);
                        
                        echo '<h4>Step 2: Customer Record (ID: ' . $customer_id . ')</h4>';
                        if ($customer_record) {
                            echo '<pre style="background: #f5f5f5; padding: 15px; overflow-x: auto; max-height: 300px;">';
                            echo htmlspecialchars(print_r($customer_record, true));
                            echo '</pre>';
                            echo '<p><strong>Email:</strong> ' . (!empty($customer_record['email']) ? '<span style="color:green;">' . esc_html($customer_record['email']) . '</span>' : '<span style="color:red;">NOT SET</span>') . '</p>';
                        } else {
                            echo '<p style="color:red;">✗ Customer not found!</p>';
                        }
                    }
                    
                    // Step 3: Get appointment record
                    if ($appointment_id) {
                        $bookly_appointments_table = $wpdb->prefix . 'bookly_appointments';
                        $appointment_record = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$bookly_appointments_table} WHERE id = %d", $appointment_id), ARRAY_A);
                        
                        echo '<h4>Step 3: Appointment Record (ID: ' . $appointment_id . ')</h4>';
                        if ($appointment_record) {
                            echo '<pre style="background: #f5f5f5; padding: 15px; overflow-x: auto; max-height: 300px;">';
                            echo htmlspecialchars(print_r($appointment_record, true));
                            echo '</pre>';
                            
                            $service_id = $appointment_record['service_id'] ?? null;
                            if ($service_id) {
                                // Step 4: Get service record
                                $bookly_services_table = $wpdb->prefix . 'bookly_services';
                                $service_record = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$bookly_services_table} WHERE id = %d", $service_id), ARRAY_A);
                                
                                echo '<h4>Step 4: Service Record (ID: ' . $service_id . ')</h4>';
                                if ($service_record) {
                                    echo '<pre style="background: #f5f5f5; padding: 15px; overflow-x: auto; max-height: 300px;">';
                                    echo htmlspecialchars(print_r($service_record, true));
                                    echo '</pre>';
                                }
                            }
                        } else {
                            echo '<p style="color:red;">✗ Appointment not found!</p>';
                        }
                    }
                    
                    // Step 5: Try the integrated query
                    echo '<h4>Step 5: Integrated Query Result</h4>';
                    $booking_details = $this->get_booking_details($debug_id);
                    if ($booking_details) {
                        echo '<pre style="background: #f5f5f5; padding: 15px; overflow-x: auto; max-height: 300px;">';
                        echo htmlspecialchars(print_r($booking_details, true));
                        echo '</pre>';
                        
                        if (!empty($booking_details['customer_email'])) {
                            echo '<p style="color:green; font-weight:bold;">✓ Email found: ' . esc_html($booking_details['customer_email']) . '</p>';
                        } else {
                            echo '<p style="color:red; font-weight:bold;">✗ Email is MISSING from booking details</p>';
                        }
                    } else {
                        echo '<p style="color:red;">✗ Could not retrieve booking details</p>';
                    }
                    
                    echo '</div>';
                }
            }
            ?>
            
            <h3>Sync Recent Bookings</h3>
            <form method="post" action="" style="margin: 20px 0;">
                <?php wp_nonce_field('bookly_sync_bookings'); ?>
                <input type="hidden" name="bookly_sync_action" value="sync_recent">
                <p>Check for bookings from the last 24 hours and send them to Agreements app. Useful if hooks aren't firing.</p>
                <button type="submit" class="button button-primary">Check & Sync Recent Bookings</button>
            </form>
            
            <?php
            // Handle sync action
            if (isset($_POST['bookly_sync_action']) && $_POST['bookly_sync_action'] === 'sync_recent' && check_admin_referer('bookly_sync_bookings')) {
                $result = $this->check_recent_bookings();
                if ($result && isset($result['found'])) {
                    if ($result['found'] > 0) {
                        $message = '<strong>Sync Complete!</strong> Found ' . esc_html($result['found']) . ' recent booking(s), successfully processed ' . esc_html($result['processed']) . '.';
                        if ($result['processed'] < $result['found']) {
                            $message .= ' Some bookings failed - check details below.';
                        }
                        echo '<div class="notice notice-' . ($result['processed'] > 0 ? 'success' : 'warning') . '"><p>' . $message . '</p></div>';
                        
                        if (!empty($result['errors'])) {
                            echo '<div class="notice notice-warning"><p><strong>Errors occurred:</strong><br>' . esc_html(implode('<br>', $result['errors'])) . '</p></div>';
                        }
                        
                        if ($result['processed'] == 0) {
                            echo '<div class="notice notice-warning"><p><strong>Bookings found but none processed.</strong><br>';
                            if (!empty($result['errors'])) {
                                echo 'Errors:<br><ul style="margin-left:20px;">';
                                foreach ($result['errors'] as $error) {
                                    echo '<li>' . esc_html($error) . '</li>';
                                }
                                echo '</ul>';
                            } else {
                                echo 'Possible causes:<br>
                                - Booking details couldn\'t be fetched from database<br>
                                - Email missing from booking data<br>
                                - Webhook request failed<br>
                                Check your server\'s error logs or PHP error logs for detailed messages.';
                            }
                            echo '</p></div>';
                        }
                    } else {
                        echo '<div class="notice notice-info"><p>No recent bookings found (last 24 hours with approved/done/waitlisted status).</p></div>';
                    }
                } else {
                    echo '<div class="notice notice-error"><p>Error checking bookings. Check database connection.</p></div>';
                }
            }
            ?>
            
            <h3>Check Integration Status</h3>
            <table class="form-table">
                <tr>
                    <th>Integration Enabled:</th>
                    <td><?php echo $this->settings['enabled'] ? '<span style="color:green;">✓ Yes</span>' : '<span style="color:red;">✗ No</span>'; ?></td>
                </tr>
                <tr>
                    <th>Webhook URL:</th>
                    <td><?php echo !empty($this->settings['webhook_url']) ? esc_html($this->settings['webhook_url']) : '<span style="color:red;">Not configured</span>'; ?></td>
                </tr>
                <tr>
                    <th>Last Booking Test:</th>
                    <td>Create a test booking in Bookly and check logs below</td>
                </tr>
            </table>
            
            <h3>Debug Logs</h3>
            <p>After configuring, create a test booking in Bookly and check the WordPress error log for messages:</p>
            <ul>
                <li><code>Bookly Agreements Integration: Hook triggered!</code> - Hook is firing ✅</li>
                <li><code>Bookly Agreements Integration: Processing booking ID: X</code> - Processing booking ✅</li>
                <li><code>Bookly Agreements Integration: Successfully sent booking X</code> - Success ✅</li>
                <li><code>Bookly Agreements Integration ERROR: ...</code> - Error occurred ❌</li>
            </ul>
            <p><strong>To enable WordPress debug logging, add these lines to <code>wp-config.php</code>:</strong></p>
            <pre><code>define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);</code></pre>
            <p>The log file will be at: <code>wp-content/debug.log</code></p>
            
            <h3>Check Active Hooks</h3>
            <p>Current hooks registered:</p>
            <ul>
                <li><code>bookly_booking_created</code></li>
                <li><code>bookly_appointment_created</code></li>
                <li><code>bookly_new_booking</code></li>
                <li><code>bookly_after_appointment_created</code></li>
                <li><code>bookly_after_booking_created</code></li>
                <li><code>bookly_appointment_saved</code></li>
            </ul>
            <p><strong>Alternative Method:</strong> If hooks aren't firing, we're also listening on the thank you page (template_redirect hook) to catch booking data from cookies/sessions/URL.</p>
            <p><strong>Debug Mode:</strong> With WP_DEBUG enabled, check your debug.log for messages starting with "🔍 BOOKLY HOOK DETECTED:" to see which hooks Bookly actually fires.</p>
            <p><strong>Note:</strong> If you don't see "Hook triggered!" in logs after creating a booking, the hooks may not be firing. Check debug.log for detected hooks or try the thank you page method.</p>
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
 * Hook detector - logs all Bookly-related hooks for debugging
 * This helps identify which hooks Bookly actually fires
 */
function bookly_detect_hooks() {
    // Only enable in debug mode to avoid cluttering logs
    if (!defined('WP_DEBUG') || !WP_DEBUG) {
        return;
    }
    
    add_action('all', function($hook) {
        // Listen for any hook that might be related to Bookly
        if (stripos($hook, 'bookly') !== false || 
            stripos($hook, 'appointment') !== false || 
            stripos($hook, 'booking') !== false ||
            stripos($hook, 'customer_appointment') !== false) {
            error_log("🔍 BOOKLY HOOK DETECTED: $hook");
        }
    }, 999);
}
add_action('init', 'bookly_detect_hooks', 1);

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

