<?php
/**
 * Bookly to Agreements App Integration
 * 
 * This code hooks into Bookly WordPress plugin to automatically send
 * booking data to your Agreements app when a booking is created.
 * 
 * INSTRUCTIONS:
 * 1. Copy this code to your WordPress theme's functions.php file, OR
 * 2. Create a custom plugin with this code
 * 3. Update the $webhook_url variable below with your Agreements app URL
 * 4. Optionally set the $api_key if you're using webhook signature verification
 */

// Configuration
$webhook_url = 'https://your-domain.com/api/agreements/bookly-webhook'; // Update this!
$api_key = ''; // Optional: If using BOOKLY_WEBHOOK_SECRET, leave empty or add your broadcast secret

/**
 * Hook into Bookly booking creation
 * Bookly uses various hooks depending on version. We'll try the most common ones.
 */

// Hook 1: bookly_booking_created (common in newer versions)
add_action('bookly_booking_created', 'bookly_send_to_agreements_app', 10, 1);

// Hook 2: bookly_appointment_created (alternative hook name)
add_action('bookly_appointment_created', 'bookly_send_to_agreements_app', 10, 1);

// Hook 3: bookly_new_booking (some versions use this)
add_action('bookly_new_booking', 'bookly_send_to_agreements_app', 10, 1);

// Hook 4: If using custom thank you page approach, hook into page load
// add_action('template_redirect', 'bookly_catch_thank_you_page');

/**
 * Main function to send booking data to Agreements app
 * 
 * @param int|array $booking_data Booking ID or booking data array
 */
function bookly_send_to_agreements_app($booking_data) {
    global $webhook_url, $api_key;
    
    // Get booking ID
    $booking_id = is_array($booking_data) ? ($booking_data['id'] ?? $booking_data['booking_id'] ?? null) : $booking_data;
    
    if (!$booking_id) {
        error_log('Bookly Integration: No booking ID provided');
        return;
    }
    
    // Fetch booking details from Bookly
    $booking_details = bookly_get_booking_details($booking_id);
    
    if (!$booking_details) {
        error_log("Bookly Integration: Could not fetch booking details for ID: $booking_id");
        return;
    }
    
    // Prepare payload for Agreements app
    $payload = bookly_prepare_payload($booking_details);
    
    // Send to Agreements app
    $response = bookly_send_webhook($webhook_url, $payload, $api_key);
    
    if (is_wp_error($response)) {
        error_log('Bookly Integration: Webhook error - ' . $response->get_error_message());
    } else {
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code >= 200 && $response_code < 300) {
            error_log("Bookly Integration: Successfully sent booking $booking_id to Agreements app");
        } else {
            $response_body = wp_remote_retrieve_body($response);
            error_log("Bookly Integration: Webhook failed with code $response_code: $response_body");
        }
    }
}

/**
 * Get booking details from Bookly database
 * This function adapts to different Bookly database structures
 * 
 * @param int $booking_id
 * @return array|null
 */
function bookly_get_booking_details($booking_id) {
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
        // Fallback: Try alternative table structures or use Bookly API if available
        return bookly_get_booking_fallback($booking_id);
    }
    
    return $booking;
}

/**
 * Fallback method to get booking data
 * Uses Bookly's internal functions if available
 * 
 * @param int $booking_id
 * @return array|null
 */
function bookly_get_booking_fallback($booking_id) {
    // Try using Bookly's internal functions if they exist
    if (function_exists('\\Bookly\\Lib\\Entities\\CustomerAppointment::find')) {
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
            error_log('Bookly Integration: Error fetching booking - ' . $e->getMessage());
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
function bookly_prepare_payload($booking_details) {
    // Split full name into first and last name
    $name_parts = bookly_split_name($booking_details['customer_name'] ?? '');
    
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
function bookly_split_name($full_name) {
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
 * @param string $url
 * @param array $payload
 * @param string $api_key
 * @return array|WP_Error
 */
function bookly_send_webhook($url, $payload, $api_key = '') {
    $body = json_encode($payload);
    
    $args = array(
        'method' => 'POST',
        'headers' => array(
            'Content-Type' => 'application/json',
            'User-Agent' => 'Bookly-WordPress-Integration/1.0',
        ),
        'body' => $body,
        'timeout' => 15,
    );
    
    // Add API key to headers if provided
    if (!empty($api_key)) {
        $args['headers']['X-API-Key'] = $api_key;
    }
    
    // Optional: Add webhook signature if using HMAC
    if (!empty($api_key)) {
        $webhook_secret = $api_key; // Use api_key as secret
        $signature = hash_hmac('sha256', $body, $webhook_secret);
        $args['headers']['X-Bookly-Signature'] = $signature;
    }
    
    return wp_remote_post($url, $args);
}

/**
 * Alternative: If Bookly has a thank you page hook, catch booking data there
 * This can be used if direct hooks don't work
 */
function bookly_catch_thank_you_page() {
    // Only run on the thank you page (update URL as needed)
    if (!is_page('thank-you') && !isset($_GET['bookly_booking_id'])) {
        return;
    }
    
    // Get booking ID from URL or session
    $booking_id = isset($_GET['bookly_booking_id']) ? intval($_GET['bookly_booking_id']) : null;
    
    if (!$booking_id) {
        // Try to get from session/cookie if Bookly stores it
        $booking_id = isset($_COOKIE['bookly_booking_id']) ? intval($_COOKIE['bookly_booking_id']) : null;
    }
    
    if ($booking_id) {
        bookly_send_to_agreements_app($booking_id);
    }
}

