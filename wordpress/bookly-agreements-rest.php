<?php
/**
 * REST API for Bookly Agreements Integration (loaded by main plugin).
 */
if (!defined('ABSPATH')) {
    exit;
}
if (defined('BOOKLY_AGREEMENTS_REST_LOADED')) {
    return;
}
define('BOOKLY_AGREEMENTS_REST_LOADED', true);

/**
 * Verify X-API-Key when configured in plugin settings (optional).
 * If no API key is saved, requests are allowed without X-API-Key.
 *
 * @param WP_REST_Request $request
 * @return true|WP_Error
 */
function bookly_integration_verify_api_key($request) {
    $settings = get_option(Bookly_Agreements_Integration::OPTION_NAME, array());
    $stored_key = isset($settings['api_key']) ? (string) $settings['api_key'] : '';

    if ($stored_key === '') {
        return true;
    }

    $provided_key = $request->get_header('X-API-Key');
    if ($provided_key === null || $provided_key === '') {
        return new WP_Error(
            'missing_api_key',
            'Missing X-API-Key header.',
            array('status' => 401)
        );
    }

    if (!hash_equals($stored_key, $provided_key)) {
        return new WP_Error(
            'invalid_api_key',
            'Invalid API key.',
            array('status' => 401)
        );
    }

    return true;
}

/**
 * Build Bookly full_name from first and last name (matches get_booking_details COALESCE).
 *
 * @param string $first_name
 * @param string $last_name
 * @return string
 */
function bookly_integration_build_full_name($first_name, $last_name) {
    return trim($first_name . ' ' . $last_name);
}

/**
 * Name fields for bookly_customers (admin "Full name" uses name; queries also use full_name).
 *
 * @param string $first_name
 * @param string $last_name
 * @return array
 */
function bookly_integration_customer_name_fields($first_name, $last_name) {
    $full_name = bookly_integration_build_full_name($first_name, $last_name);

    return array(
        'first_name' => $first_name,
        'last_name' => $last_name,
        'full_name' => $full_name,
        'name' => $full_name,
    );
}

/**
 * Filter insert data to columns that exist on the table and build format array.
 *
 * @param string $table Full table name.
 * @param array  $data  Column => value.
 * @return array|WP_Error Array with row and formats, or WP_Error.
 */
function bookly_integration_prepare_insert_row($table, $data) {
    global $wpdb;

    $columns = $wpdb->get_results("DESCRIBE `{$table}`", ARRAY_A);
    if (empty($columns)) {
        return new WP_Error(
            'describe_failed',
            'Could not read table schema for ' . $table,
            array('status' => 500)
        );
    }

    $allowed = array();
    foreach ($columns as $column) {
        $allowed[$column['Field']] = strtolower($column['Type']);
    }

    $row = array();
    $formats = array();

    foreach ($data as $key => $value) {
        if (!isset($allowed[$key])) {
            continue;
        }

        $row[$key] = $value;
        $type = $allowed[$key];

        if (
            strpos($type, 'int') !== false
            || strpos($type, 'decimal') !== false
            || strpos($type, 'float') !== false
            || strpos($type, 'double') !== false
        ) {
            $formats[] = strpos($type, 'decimal') !== false || strpos($type, 'float') !== false || strpos($type, 'double') !== false
                ? '%f'
                : '%d';
        } else {
            $formats[] = '%s';
        }
    }

    if (empty($row)) {
        return new WP_Error(
            'no_insert_columns',
            'No matching columns to insert into ' . $table,
            array('status' => 500)
        );
    }

    return array($row, $formats);
}

/**
 * Resolve the physical Bookly table name (bookly_* vs legacy ab_*).
 *
 * @param string[] $base_names Table names without $wpdb->prefix.
 * @return string|null
 */
function bookly_integration_resolve_bookly_table($base_names) {
    global $wpdb;

    foreach ($base_names as $base) {
        $table = $wpdb->prefix . $base;
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists === $table) {
            return $table;
        }
    }

    return null;
}

/**
 * Load one staff row by ID using the correct Bookly staff table.
 *
 * @param int $staff_id
 * @return array|null
 */
function bookly_integration_get_staff_row($staff_id) {
    global $wpdb;

    $staff_id = (int) $staff_id;
    if ($staff_id < 1) {
        return null;
    }

    $staff_table = bookly_integration_resolve_bookly_table(array('bookly_staff', 'ab_staff'));
    if ($staff_table === null) {
        return null;
    }

    return $wpdb->get_row(
        $wpdb->prepare("SELECT * FROM `{$staff_table}` WHERE id = %d LIMIT 1", $staff_id),
        ARRAY_A
    );
}

/**
 * REST API: create a Bookly customer (first_name, last_name only).
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function bookly_integration_rest_create_customer($request) {
    $auth = bookly_integration_verify_api_key($request);
    if (is_wp_error($auth)) {
        return $auth;
    }

    $params = $request->get_json_params();
    if (!is_array($params)) {
        return new WP_Error(
            'invalid_json',
            'Request body must be valid JSON with first_name and last_name.',
            array('status' => 400)
        );
    }

    $first_name = isset($params['first_name']) ? sanitize_text_field($params['first_name']) : '';
    $last_name = isset($params['last_name']) ? sanitize_text_field($params['last_name']) : '';

    if ($first_name === '') {
        return new WP_Error(
            'missing_first_name',
            'first_name is required and cannot be empty.',
            array('status' => 400)
        );
    }

    if ($last_name === '') {
        return new WP_Error(
            'missing_last_name',
            'last_name is required and cannot be empty.',
            array('status' => 400)
        );
    }

    global $wpdb;
    $table = $wpdb->prefix . 'bookly_customers';

    $table_exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
    if ($table_exists !== $table) {
        return new WP_Error(
            'table_missing',
            'Bookly customers table was not found. Is the Bookly plugin installed?',
            array('status' => 500)
        );
    }

    $customer_prepared = bookly_integration_prepare_insert_row(
        $table,
        bookly_integration_customer_name_fields($first_name, $last_name)
    );
    if (is_wp_error($customer_prepared)) {
        return $customer_prepared;
    }

    $insert_data = $customer_prepared[0];
    $insert_format = $customer_prepared[1];
    $inserted = $wpdb->insert($table, $insert_data, $insert_format);

    if ($inserted === false) {
        return new WP_Error(
            'insert_failed',
            'Failed to create customer: ' . $wpdb->last_error,
            array('status' => 500)
        );
    }

    return new WP_REST_Response(
        array(
            'success' => true,
            'customer_id' => (int) $wpdb->insert_id,
        ),
        201
    );
}

/**
 * Build custom_fields JSON for venue address (field ID 21883).
 *
 * @param string $venue_address
 * @return string|null JSON string or null if empty
 */
function bookly_integration_build_venue_custom_fields($venue_address) {
    $venue_address = trim($venue_address);
    if ($venue_address === '') {
        return null;
    }

    return wp_json_encode(
        array(
            array(
                'id' => 21883,
                'value' => $venue_address,
            ),
        )
    );
}

/**
 * Combine event_date and time string into Bookly start_date / end_date format.
 *
 * @param string $event_date
 * @param string $time
 * @return string|null MySQL datetime (Y-m-d H:i:s) or null on failure
 */
function bookly_integration_combine_date_time($event_date, $time) {
    $event_date = trim($event_date);
    $time = trim($time);

    if ($event_date === '' || $time === '') {
        return null;
    }

    $tz = function_exists('wp_timezone') ? wp_timezone() : new DateTimeZone('UTC');
    $combined = $event_date . ' ' . $time;
    $dt = date_create($combined, $tz);

    if ($dt instanceof DateTime) {
        return $dt->format('Y-m-d H:i:s');
    }

    $timestamp = strtotime($combined);
    if ($timestamp === false) {
        return null;
    }

    if (function_exists('wp_date')) {
        return wp_date('Y-m-d H:i:s', $timestamp, $tz);
    }

    return gmdate('Y-m-d H:i:s', $timestamp);
}

/**
 * Validate staff, service, and staff-service assignment exist in Bookly.
 *
 * @param int $staff_id
 * @param int $service_id
 * @return true|WP_Error
 */
function bookly_integration_validate_booking_prerequisites($staff_id, $service_id) {
    global $wpdb;

    $staff_table = bookly_integration_resolve_bookly_table(array('bookly_staff', 'ab_staff'));
    $services_table = bookly_integration_resolve_bookly_table(array('bookly_services', 'ab_services'));
    $staff_services_table = bookly_integration_resolve_bookly_table(array('bookly_staff_services', 'ab_staff_services'));

    if ($staff_table === null) {
        return new WP_Error(
            'table_missing',
            'Bookly staff table was not found.',
            array('status' => 500)
        );
    }

    $staff_exists = $wpdb->get_var(
        $wpdb->prepare("SELECT id FROM `{$staff_table}` WHERE id = %d LIMIT 1", $staff_id)
    );
    if (!$staff_exists) {
        return new WP_Error(
            'invalid_staff_id',
            'staff_id does not match any staff member in Bookly.',
            array('status' => 400)
        );
    }

    if ($services_table === null) {
        return new WP_Error(
            'table_missing',
            'Bookly services table was not found.',
            array('status' => 500)
        );
    }

    $service_exists = $wpdb->get_var(
        $wpdb->prepare("SELECT id FROM `{$services_table}` WHERE id = %d LIMIT 1", $service_id)
    );
    if (!$service_exists) {
        return new WP_Error(
            'invalid_service_id',
            'service_id does not match any service in Bookly.',
            array('status' => 400)
        );
    }

    if ($staff_services_table !== null) {
        $staff_service_exists = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT 1 FROM `{$staff_services_table}` WHERE staff_id = %d AND service_id = %d LIMIT 1",
                $staff_id,
                $service_id
            )
        );
        if (!$staff_service_exists) {
            return new WP_Error(
                'staff_service_mismatch',
                'The selected staff member is not assigned to this service in Bookly.',
                array('status' => 400)
            );
        }
    }

    return true;
}

/**
 * Find customer by email or insert a new bookly_customers row.
 *
 * @param array $customer_data Keys: first_name, last_name, email, phone
 * @return int|WP_Error
 */
function bookly_integration_find_or_create_customer($customer_data) {
    global $wpdb;

    $customers_table = $wpdb->prefix . 'bookly_customers';
    $email = $customer_data['email'];

    $existing_id = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT id FROM {$customers_table} WHERE email = %s LIMIT 1",
            $email
        )
    );

    if ($existing_id) {
        $update_data = bookly_integration_customer_name_fields(
            $customer_data['first_name'],
            $customer_data['last_name']
        );
        if ($customer_data['phone'] !== '') {
            $update_data['phone'] = $customer_data['phone'];
        }

        $customer_update = bookly_integration_prepare_insert_row($customers_table, $update_data);
        if (!is_wp_error($customer_update)) {
            $update_row = $customer_update[0];
            $update_formats = $customer_update[1];
            $wpdb->update(
                $customers_table,
                $update_row,
                array('id' => (int) $existing_id),
                $update_formats,
                array('%d')
            );
        }

        return (int) $existing_id;
    }

    $insert_data = array_merge(
        bookly_integration_customer_name_fields(
            $customer_data['first_name'],
            $customer_data['last_name']
        ),
        array('email' => $email)
    );

    if ($customer_data['phone'] !== '') {
        $insert_data['phone'] = $customer_data['phone'];
    }

    $customer_prepared = bookly_integration_prepare_insert_row($customers_table, $insert_data);
    if (is_wp_error($customer_prepared)) {
        return $customer_prepared;
    }

    $insert_data = $customer_prepared[0];
    $insert_format = $customer_prepared[1];
    $inserted = $wpdb->insert($customers_table, $insert_data, $insert_format);
    if ($inserted === false) {
        return new WP_Error(
            'customer_insert_failed',
            'Failed to create customer: ' . $wpdb->last_error,
            array('status' => 500)
        );
    }

    return (int) $wpdb->insert_id;
}

/**
 * REST API: create a full Bookly booking (customer, appointment, customer_appointment).
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function bookly_integration_rest_create_booking($request) {
    $auth = bookly_integration_verify_api_key($request);
    if (is_wp_error($auth)) {
        return $auth;
    }

    $params = $request->get_json_params();
    if (!is_array($params)) {
        return new WP_Error(
            'invalid_json',
            'Request body must be valid JSON.',
            array('status' => 400)
        );
    }

    $first_name = isset($params['first_name']) ? sanitize_text_field($params['first_name']) : '';
    $last_name = isset($params['last_name']) ? sanitize_text_field($params['last_name']) : '';
    $email = isset($params['email']) ? sanitize_email($params['email']) : '';
    $phone = isset($params['phone']) ? sanitize_text_field($params['phone']) : '';
    $event_date = isset($params['event_date']) ? sanitize_text_field($params['event_date']) : '';
    $start_time = isset($params['start_time']) ? sanitize_text_field($params['start_time']) : '';
    $end_time = isset($params['end_time']) ? sanitize_text_field($params['end_time']) : '';
    $service_id = isset($params['service_id']) ? absint($params['service_id']) : 0;
    $staff_id = isset($params['staff_id']) ? absint($params['staff_id']) : 0;
    $venue_address = isset($params['venue_address']) ? sanitize_text_field($params['venue_address']) : '';
    $notes = isset($params['notes']) ? sanitize_textarea_field($params['notes']) : '';
    $deposit_paid = isset($params['deposit_paid']) ? sanitize_text_field($params['deposit_paid']) : '';
    $total_price = isset($params['total_price']) ? sanitize_text_field($params['total_price']) : '';
    $extras_raw = isset($params['extras']) ? $params['extras'] : null;

    if ($first_name === '') {
        return new WP_Error('missing_first_name', 'first_name is required and cannot be empty.', array('status' => 400));
    }
    if ($last_name === '') {
        return new WP_Error('missing_last_name', 'last_name is required and cannot be empty.', array('status' => 400));
    }
    if ($email === '' || !is_email($email)) {
        return new WP_Error('invalid_email', 'email is required and must be a valid email address.', array('status' => 400));
    }
    if ($event_date === '') {
        return new WP_Error('missing_event_date', 'event_date is required and cannot be empty.', array('status' => 400));
    }
    if ($start_time === '') {
        return new WP_Error('missing_start_time', 'start_time is required and cannot be empty.', array('status' => 400));
    }
    if ($service_id < 1) {
        return new WP_Error('invalid_service_id', 'service_id is required and must be a positive integer.', array('status' => 400));
    }
    if ($staff_id < 1) {
        return new WP_Error('invalid_staff_id', 'staff_id is required and must be a positive integer.', array('status' => 400));
    }

    $start_date = bookly_integration_combine_date_time($event_date, $start_time);
    if ($start_date === null) {
        return new WP_Error(
            'invalid_start_datetime',
            'Could not parse event_date and start_time into a valid datetime.',
            array('status' => 400)
        );
    }

    $end_date = null;
    if ($end_time !== '') {
        $end_date = bookly_integration_combine_date_time($event_date, $end_time);
        if ($end_date === null) {
            return new WP_Error(
                'invalid_end_datetime',
                'Could not parse event_date and end_time into a valid datetime.',
                array('status' => 400)
            );
        }
    }

    global $wpdb;

    $customers_table = $wpdb->prefix . 'bookly_customers';
    $appointments_table = $wpdb->prefix . 'bookly_appointments';
    $customer_appointments_table = $wpdb->prefix . 'bookly_customer_appointments';
    $services_table = $wpdb->prefix . 'bookly_services';

    foreach (array($customers_table, $appointments_table, $customer_appointments_table) as $table) {
        $exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
        if ($exists !== $table) {
            return new WP_Error(
                'table_missing',
                'Required Bookly table was not found: ' . $table,
                array('status' => 500)
            );
        }
    }

    if ($end_date === null) {
        $duration = $wpdb->get_var(
            $wpdb->prepare("SELECT duration FROM {$services_table} WHERE id = %d", $service_id)
        );
        if ($duration !== null && $duration !== '') {
            $end_timestamp = strtotime($start_date) + (int) $duration;
            $tz = function_exists('wp_timezone') ? wp_timezone() : new DateTimeZone('UTC');
            $end_date = function_exists('wp_date')
                ? wp_date('Y-m-d H:i:s', $end_timestamp, $tz)
                : gmdate('Y-m-d H:i:s', $end_timestamp);
        } else {
            $end_date = $start_date;
        }
    }

    $prerequisites = bookly_integration_validate_booking_prerequisites($staff_id, $service_id);
    if (is_wp_error($prerequisites)) {
        return $prerequisites;
    }

    $customer_id = bookly_integration_find_or_create_customer(
        array(
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $email,
            'phone' => $phone,
        )
    );
    if (is_wp_error($customer_id)) {
        return $customer_id;
    }

    // Build the internal_note for the appointment.  The Google Calendar
    // description's "Internal Notes" line reads from this same column, and so
    // does the Bookly backend appointment dialog.  We put ONLY the total price
    // here — the customer notes are NEVER written into internal_note (and the
    // total is no longer concatenated into the customer notes column either).
    $internal_note = '';
    if ($total_price !== '' && is_numeric($total_price)) {
        $price_num = (float) $total_price;
        // No decimals when the value is a whole number; comma thousands separator
        // (e.g. 900 -> "$900", 1200 -> "$1,200", 1234.5 -> "$1,234.50").
        $price_label = floor($price_num) == $price_num
            ? number_format($price_num, 0, '.', ',')
            : number_format($price_num, 2, '.', ',');
        $internal_note = 'Total Price: $' . $price_label;
    }

    $appointment_prepared = bookly_integration_prepare_insert_row(
        $appointments_table,
        array(
            'staff_id' => $staff_id,
            'staff_any' => 0,
            'service_id' => $service_id,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'extras_duration' => 0,
            'created_from' => 'frontend',
            'internal_note' => $internal_note,
        )
    );
    if (is_wp_error($appointment_prepared)) {
        return $appointment_prepared;
    }

    $appointment_row = $appointment_prepared[0];
    $appointment_formats = $appointment_prepared[1];
    $appointment_inserted = $wpdb->insert($appointments_table, $appointment_row, $appointment_formats);
    if ($appointment_inserted === false) {
        return new WP_Error(
            'appointment_insert_failed',
            'Failed to create appointment: ' . $wpdb->last_error,
            array('status' => 500, 'failed_step' => 'appointment')
        );
    }
    $appointment_id = (int) $wpdb->insert_id;
    if ($appointment_id < 1) {
        return new WP_Error(
            'appointment_insert_failed',
            'Appointment insert did not return a valid appointment ID.',
            array('status' => 500, 'failed_step' => 'appointment')
        );
    }

    // CHANGE 2: write only the customer's note text — no price concatenation.
    $booking_notes = $notes;

    // CHANGE 1: validate and normalise the extras value for bookly_customer_appointments.extras.
    // Bookly native empty representation is [] (empty JSON array), not {}.
    $extras_value = '[]';
    if ($extras_raw !== null && $extras_raw !== '' && $extras_raw !== '[]' && $extras_raw !== '{}') {
        $extras_string = is_string($extras_raw) ? $extras_raw : wp_json_encode($extras_raw);
        $extras_decoded = json_decode($extras_string, true);
        if (is_array($extras_decoded) && !empty($extras_decoded)) {
            $extras_value = $extras_string;
        }
    }

    $customer_appointment_data = array(
        'customer_id' => $customer_id,
        'appointment_id' => $appointment_id,
        'number_of_persons' => 1,
        'units' => 1,
        'status' => 'approved',
        'created_at' => current_time('mysql'),
        'extras' => $extras_value,
    );

    if ($booking_notes !== '') {
        $customer_appointment_data['notes'] = $booking_notes;
    }

    $custom_fields = bookly_integration_build_venue_custom_fields($venue_address);
    if ($custom_fields !== null) {
        $customer_appointment_data['custom_fields'] = $custom_fields;
    }

    $booking_prepared = bookly_integration_prepare_insert_row(
        $customer_appointments_table,
        $customer_appointment_data
    );
    if (is_wp_error($booking_prepared)) {
        $wpdb->delete($appointments_table, array('id' => $appointment_id), array('%d'));
        return $booking_prepared;
    }

    $booking_row = $booking_prepared[0];
    $booking_formats = $booking_prepared[1];
    $booking_inserted = $wpdb->insert($customer_appointments_table, $booking_row, $booking_formats);
    if ($booking_inserted === false) {
        $wpdb->delete($appointments_table, array('id' => $appointment_id), array('%d'));
        return new WP_Error(
            'booking_insert_failed',
            'Failed to create customer appointment: ' . $wpdb->last_error,
            array('status' => 500, 'failed_step' => 'customer_appointment')
        );
    }

    $booking_id = (int) $wpdb->insert_id;
    if ($booking_id < 1) {
        $wpdb->delete($appointments_table, array('id' => $appointment_id), array('%d'));
        return new WP_Error(
            'booking_insert_failed',
            'Customer appointment insert did not return a valid booking ID.',
            array('status' => 500, 'failed_step' => 'customer_appointment')
        );
    }

    $calendar_sync_result = array(
        'synced' => false,
        'reason' => 'unknown',
    );
    try {
        $calendar_sync_result = bookly_integration_sync_appointment_google_calendar(
            $appointment_id,
            $booking_id,
            $staff_id
        );
    } catch (Throwable $e) {
        $calendar_sync_result = array(
            'synced' => false,
            'reason' => 'exception: ' . $e->getMessage(),
        );
        bookly_integration_log_error(
            'Google Calendar sync exception for appointment ' . $appointment_id . ': ' . $e->getMessage()
        );
    }

    $response = array(
        'success' => true,
        'customer_id' => $customer_id,
        'appointment_id' => $appointment_id,
        'booking_id' => $booking_id,
        'calendar_synced' => !empty($calendar_sync_result['synced']),
    );
    if (empty($calendar_sync_result['synced']) && !empty($calendar_sync_result['reason'])) {
        $response['calendar_sync_reason'] = $calendar_sync_result['reason'];
        $response['calendar_sync_debug'] = bookly_integration_google_calendar_sync_debug($staff_id);
    }

    return new WP_REST_Response($response, 201);
}

/**
 * Log an error using the same convention as Bookly_Agreements_Integration::log_error().
 *
 * @param string $message
 */
function bookly_integration_log_error($message) {
    error_log('Bookly Agreements Integration ERROR: ' . $message);
}

/**
 * Resolve a Bookly entity class (Pro namespace preferred).
 *
 * @param string $entity Short entity name, e.g. Appointment, Staff.
 * @return string|null
 */
function bookly_integration_bookly_entity_class($entity) {
    foreach (array(
        '\\Bookly\\Lib\\Entities\\' . $entity,
        '\\BooklyPro\\Lib\\Entities\\' . $entity,
        '\\BooklyLite\\Lib\\Entities\\' . $entity,
    ) as $class) {
        if (class_exists($class)) {
            return $class;
        }
    }

    return null;
}

/**
 * Resolve Bookly's Google API wrapper class (Pro addon may use a different namespace).
 *
 * @return string|null Fully-qualified class name.
 */
function bookly_integration_resolve_bookly_google_class() {
    $candidates = array(
        '\\Bookly\\Lib\\Google',
        '\\BooklyPro\\Lib\\Google',
        '\\BooklyLite\\Lib\\Google',
    );

    foreach ($candidates as $class) {
        if (!class_exists($class, false)) {
            continue;
        }

        if ($class === '\\BooklyLite\\Lib\\Google') {
            try {
                $ref = new ReflectionMethod($class, 'createEvent');
                if ($ref->getFileName() && strpos($ref->getFileName(), 'BooklyLite') !== false) {
                    continue;
                }
            } catch (ReflectionException $e) {
                continue;
            }
        }

        return $class;
    }

    return null;
}

/**
 * Whether Bookly PRO (or a real Pro Google API class) appears to be loaded.
 *
 * Pro often keeps handleGoogleCalendar() in the Lite parent class; reflection on that
 * method is not a reliable signal. Prefer plugin/class detection instead.
 *
 * @return bool
 */
function bookly_integration_is_bookly_pro_loaded() {
    if (class_exists('\\Bookly\\Lib\\Plugin', false)) {
        return true;
    }

    if (class_exists('\\BooklyPro\\Lib\\Plugin', false)) {
        return true;
    }

    if (class_exists('\\Bookly\\Lib\\Google', false)) {
        try {
            $ref = new ReflectionMethod('\\Bookly\\Lib\\Google', 'createEvent');
            $file = $ref->getFileName();
            if ($file && strpos($file, 'BooklyLite') === false) {
                return true;
            }
        } catch (ReflectionException $e) {
            // Fall through.
        }
    }

    if (function_exists('is_plugin_active')) {
        $pro_plugins = array(
            'bookly-addon-pro/main.php',
            'bookly-pro/main.php',
            'bookly-responsive-appointment-booking-tool-pro/main.php',
        );
        foreach ($pro_plugins as $plugin) {
            if (is_plugin_active($plugin)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Invoke Bookly Proxy classes that may perform Google Calendar sync (Pro add-on pattern).
 *
 * @param object $appointment
 * @return array{synced: bool, reason: string}|null Null when no proxy handled sync.
 */
function bookly_integration_try_bookly_google_proxies($appointment) {
    $proxy_classes = array(
        '\\Bookly\\Lib\\Proxy\\Pro',
        '\\Bookly\\Lib\\Proxy\\GoogleCalendar',
        '\\Bookly\\Lib\\Proxy\\Shared',
    );
    $methods = array(
        'createGoogleCalendarEvent',
        'handleGoogleCalendar',
        'syncGoogleCalendar',
        'updateGoogleCalendarEvent',
    );

    foreach ($proxy_classes as $class) {
        if (!class_exists($class, false)) {
            continue;
        }

        foreach ($methods as $method) {
            if (!method_exists($class, $method)) {
                continue;
            }

            try {
                $result = call_user_func(array($class, $method), $appointment);
                if ($result === true || !empty($result)) {
                    return array(
                        'synced' => true,
                        'reason' => $class . '::' . $method,
                    );
                }
            } catch (Throwable $e) {
                bookly_integration_log_error($class . '::' . $method . ' failed: ' . $e->getMessage());
            }
        }
    }

    return null;
}

/**
 * Sync via Bookly\Lib\Google (Pro implementation).
 *
 * @param object $appointment
 * @param int    $staff_id
 * @return array{synced: bool, reason: string}|null
 */
function bookly_integration_try_bookly_google_client($appointment, $staff_id) {
    $google_class = bookly_integration_resolve_bookly_google_class();
    if ($google_class === null) {
        return null;
    }

    $google = new $google_class();
    $staff_class = bookly_integration_bookly_entity_class('Staff');
    $loaded = false;

    if ($staff_class && method_exists($staff_class, 'find') && method_exists($google, 'loadByStaff')) {
        $staff = $staff_class::find($staff_id, false);
        if ($staff) {
            $loaded = (bool) $google->loadByStaff($staff);
        }
    }
    if (!$loaded && method_exists($google, 'loadByStaffId')) {
        $loaded = (bool) $google->loadByStaffId($staff_id);
    }

    if (!$loaded) {
        return array(
            'synced' => false,
            'reason' => 'google_client_load_by_staff_failed',
        );
    }

    if (!empty($appointment->get('google_event_id')) && method_exists($google, 'updateEvent')) {
        if ($google->updateEvent($appointment)) {
            return array('synced' => true, 'reason' => 'google_updateEvent');
        }
    } elseif (method_exists($google, 'createEvent')) {
        $event_id = $google->createEvent($appointment);
        if (!empty($event_id)) {
            $appointment->set('google_event_id', $event_id);
            $appointment->save();
            return array('synced' => true, 'reason' => 'google_createEvent');
        }
    }

    if (method_exists($google, 'getErrors')) {
        $errors = $google->getErrors();
        if (!empty($errors)) {
            return array(
                'synced' => false,
                'reason' => 'google_api_error: ' . implode('; ', $errors),
            );
        }
    }

    return null;
}

/**
 * Decode Bookly staff google_data (JSON, serialized, base64, slash-escaped).
 *
 * @param string|null $raw
 * @return array|null
 */
function bookly_integration_decode_google_data($raw) {
    if ($raw === null || $raw === '' || $raw === 'null') {
        return null;
    }

    $candidates = array($raw, stripslashes($raw));

    if (function_exists('is_serialized') && is_serialized($raw)) {
        $unserialized = maybe_unserialize($raw);
        if (is_array($unserialized)) {
            return $unserialized;
        }
        if (is_string($unserialized) && $unserialized !== '') {
            $candidates[] = $unserialized;
        }
    }

    $decoded_b64 = base64_decode($raw, true);
    if ($decoded_b64 !== false && $decoded_b64 !== '') {
        $candidates[] = $decoded_b64;
    }

    foreach ($candidates as $candidate) {
        if (!is_string($candidate) || $candidate === '') {
            continue;
        }

        $decoded = json_decode($candidate, true);
        if (!is_array($decoded)) {
            continue;
        }

        if (count($decoded) === 1) {
            $only = reset($decoded);
            if (is_string($only) && $only !== '') {
                $inner = bookly_integration_decode_google_data($only);
                if ($inner !== null) {
                    return $inner;
                }
            }
        }

        return $decoded;
    }

    return null;
}

/**
 * Decrypt Bookly staff google_data (Pro stores XOR+base64 via Lib\Utils\Common::xorDecrypt).
 *
 * @param string|null $raw
 * @return array|null Decoded token array or null.
 */
function bookly_integration_decrypt_bookly_google_data($raw) {
    if ($raw === null || $raw === '' || $raw === 'null') {
        return null;
    }

    $passwords = array(
        '',
        (string) get_option('bookly_gc_client_secret'),
        (string) get_option('bookly_gc_client_id'),
    );

    foreach (array('\\Bookly\\Lib\\Utils\\Common', '\\BooklyLite\\Lib\\Utils\\Common') as $class) {
        if (!class_exists($class, false) || !method_exists($class, 'xorDecrypt')) {
            continue;
        }

        foreach ($passwords as $password) {
            try {
                $decrypted = $class::xorDecrypt($raw, $password);
            } catch (Throwable $e) {
                continue;
            }

            if (!is_string($decrypted) || $decrypted === '' || $decrypted === $raw) {
                continue;
            }

            $decoded = bookly_integration_decode_google_data($decrypted);
            if ($decoded !== null) {
                return $decoded;
            }
        }
    }

    return null;
}

/**
 * Collect google-related fields from a staff DB row (column names vary by Bookly version).
 *
 * @param array $row
 * @return array{token_raw: string|null, calendar_id: string|null, calendar_source: string|null}
 */
function bookly_integration_extract_staff_google_fields($row) {
    $token_raw = null;
    $calendar_id = null;
    $calendar_source = null;

    if (!is_array($row)) {
        return array('token_raw' => null, 'calendar_id' => null, 'calendar_source' => null);
    }

    foreach ($row as $column => $value) {
        if ($value === null || $value === '' || $value === 'null') {
            continue;
        }

        $name = strtolower((string) $column);
        if ($token_raw === null && (strpos($name, 'google_data') !== false || $name === 'google_token')) {
            $token_raw = (string) $value;
        }
    }

    if ($token_raw === null && !empty($row['google_data'])) {
        $token_raw = (string) $row['google_data'];
    }

    if ($token_raw !== null && $token_raw !== '') {
        $decoded = bookly_integration_decrypt_bookly_google_data($token_raw);
        if ($decoded === null) {
            $decoded = bookly_integration_decode_google_data($token_raw);
        }
        if (is_array($decoded)) {
            $from_json = bookly_integration_extract_calendar_id_from_decoded($decoded);
            if ($from_json !== null) {
                $calendar_id = $from_json;
                $calendar_source = 'google_data';
            }
        }
    }

    if ($calendar_id === null) {
        foreach ($row as $column => $value) {
            if ($value === null || $value === '' || $value === 'null') {
                continue;
            }

            $name = strtolower((string) $column);
            if (strpos($name, 'google_calendar') !== false && strpos($name, 'data') === false && strpos($name, 'token') === false) {
                $calendar_id = (string) $value;
                $calendar_source = 'staff_column:' . $column;
                break;
            }
        }
    }

    if ($calendar_id === null && !empty($row['google_calendar_id'])) {
        $calendar_id = (string) $row['google_calendar_id'];
        $calendar_source = 'staff_column:google_calendar_id';
    }

    return array(
        'token_raw' => $token_raw,
        'calendar_id' => $calendar_id,
        'calendar_source' => $calendar_source,
    );
}

/**
 * Read the Google Calendar ID Bookly stored inside google_data (calendar.id, etc.).
 *
 * @param array $decoded Decoded google_data.
 * @return string|null
 */
function bookly_integration_extract_calendar_id_from_decoded($decoded) {
    if (!is_array($decoded)) {
        return null;
    }

    if (!empty($decoded['calendar']) && is_array($decoded['calendar']) && !empty($decoded['calendar']['id'])) {
        $id = trim((string) $decoded['calendar']['id']);
        if ($id !== '') {
            return $id;
        }
    }

    foreach (array('google_calendar_id', 'calendar_id', 'calendarId') as $key) {
        if (!empty($decoded[$key]) && is_string($decoded[$key])) {
            $id = trim($decoded[$key]);
            if ($id !== '') {
                return $id;
            }
        }
    }

    return null;
}

/**
 * Calendar IDs to try when creating an event (canonical id first, then primary).
 *
 * @param array $staff_row
 * @return string[]
 */
function bookly_integration_staff_calendar_id_candidates($staff_row) {
    $google_fields = bookly_integration_extract_staff_google_fields($staff_row);
    $candidates = array();

    if (!empty($google_fields['calendar_id'])) {
        $candidates[] = $google_fields['calendar_id'];
    }

    $candidates[] = 'primary';

    return array_values(array_unique($candidates));
}

/**
 * Key paths inside decoded google_data (no values; for sync debugging only).
 *
 * @param array $data
 * @param int   $max_depth
 * @param string $prefix
 * @return string[]
 */
function bookly_integration_google_data_key_paths($data, $max_depth = 3, $prefix = '') {
    $paths = array();
    if ($max_depth < 0 || !is_array($data)) {
        return $paths;
    }

    foreach ($data as $key => $value) {
        $path = $prefix === '' ? (string) $key : $prefix . '.' . (string) $key;
        $paths[] = $path;
        if (is_array($value) && $max_depth > 0) {
            $paths = array_merge(
                $paths,
                bookly_integration_google_data_key_paths($value, $max_depth - 1, $path)
            );
        }
    }

    return array_slice(array_values(array_unique($paths)), 0, 40);
}

/**
 * Normalize OAuth token field names (camelCase, nested wrappers).
 *
 * @param array $data
 * @return array|null
 */
function bookly_integration_coerce_oauth_token_array($data) {
    if (!is_array($data)) {
        return null;
    }

    $out = $data;
    if (empty($out['access_token']) && !empty($out['accessToken'])) {
        $out['access_token'] = $out['accessToken'];
    }
    if (empty($out['refresh_token']) && !empty($out['refreshToken'])) {
        $out['refresh_token'] = $out['refreshToken'];
    }
    if (!isset($out['expires_in']) && isset($out['expiresIn'])) {
        $out['expires_in'] = $out['expiresIn'];
    }
    if (!isset($out['created']) && isset($out['created_at'])) {
        $out['created'] = $out['created_at'];
    }

    $has_access = !empty($out['access_token']) && is_string($out['access_token']);
    $has_refresh = !empty($out['refresh_token']) && is_string($out['refresh_token']);

    if ($has_access || $has_refresh) {
        return $out;
    }

    return null;
}

/**
 * Walk nested google_data to find an OAuth token array.
 *
 * @param array $data
 * @param int   $depth
 * @return array|null
 */
function bookly_integration_deep_find_oauth_token_array($data, $depth = 0) {
    if ($depth > 10 || !is_array($data)) {
        return null;
    }

    $coerced = bookly_integration_coerce_oauth_token_array($data);
    if ($coerced !== null) {
        return $coerced;
    }

    foreach ($data as $value) {
        if (is_array($value)) {
            $found = bookly_integration_deep_find_oauth_token_array($value, $depth + 1);
            if ($found !== null) {
                return $found;
            }
            continue;
        }

        if (!is_string($value) || strlen($value) < 8) {
            continue;
        }

        $parsed = bookly_integration_decrypt_bookly_google_data($value);
        if ($parsed === null) {
            $parsed = bookly_integration_decode_google_data($value);
        }
        if ($parsed !== null) {
            $found = bookly_integration_deep_find_oauth_token_array($parsed, $depth + 1);
            if ($found !== null) {
                return $found;
            }
        }
    }

    return null;
}

/**
 * Safe diagnostics when calendar sync fails (no secrets returned).
 *
 * @param int $staff_id
 * @return array
 */
function bookly_integration_google_calendar_sync_debug($staff_id) {
    $staff_id = (int) $staff_id;
    $row = bookly_integration_get_staff_row($staff_id);
    $google_fields = bookly_integration_extract_staff_google_fields($row ?: array());
    $raw = $google_fields['token_raw'];

    $debug = array(
        'staff_id' => $staff_id,
        'staff_row_found' => $row !== null,
        'google_data_length' => $raw !== null ? strlen($raw) : 0,
        'google_calendar_id_set' => !empty($google_fields['calendar_id']),
        'bookly_google_load_by_staff' => false,
        'bookly_pro_detected' => bookly_integration_is_bookly_pro_loaded(),
        'google_client_class' => bookly_integration_resolve_bookly_google_class(),
        'token_decode' => array(
            'json' => bookly_integration_decode_google_data($raw) !== null,
            'bookly_xor' => bookly_integration_decrypt_bookly_google_data($raw) !== null,
            'via_bookly_client' => false,
            'via_google_php_client' => false,
            'has_access_token' => false,
            'has_refresh_token' => false,
        ),
        'token_key_hints' => array(),
        'resolved_calendar_id' => !empty($google_fields['calendar_id']),
        'calendar_id_source' => $google_fields['calendar_source'],
    );

    $decoded = bookly_integration_decrypt_bookly_google_data($raw);
    if ($decoded === null) {
        $decoded = bookly_integration_decode_google_data($raw);
    }
    if (is_array($decoded)) {
        $debug['token_key_hints'] = bookly_integration_google_data_key_paths($decoded);
        $oauth = bookly_integration_normalize_google_token_data($decoded);
        if ($oauth !== null) {
            $debug['token_decode']['has_access_token'] = !empty($oauth['access_token']);
            $debug['token_decode']['has_refresh_token'] = !empty($oauth['refresh_token']);
        }
    }

    if ($staff_id > 0) {
        $via_bookly = bookly_integration_google_access_token_via_bookly($staff_id);
        $debug['token_decode']['via_bookly_client'] = $via_bookly !== null && $via_bookly !== '';
        $debug['bookly_google_load_by_staff'] = $debug['token_decode']['via_bookly_client'];
    }

    if ($raw !== null && $raw !== '') {
        $via_google = bookly_integration_google_access_token_via_google_client($raw);
        $debug['token_decode']['via_google_php_client'] = $via_google !== null && $via_google !== '';
    }

    return $debug;
}

/**
 * Pull access_token (and refresh metadata) from a decoded token array.
 *
 * @param array $token_data
 * @return array|null
 */
function bookly_integration_normalize_google_token_data($token_data) {
    if (!is_array($token_data)) {
        return null;
    }

    // Bookly Pro stores OAuth under "token" and sync metadata under "calendar" / "channel".
    if (!empty($token_data['token']) && is_array($token_data['token'])
        && (!empty($token_data['calendar']) || !empty($token_data['channel']))) {
        $coerced = bookly_integration_coerce_oauth_token_array($token_data['token']);
        if ($coerced !== null) {
            return $coerced;
        }
        $found = bookly_integration_deep_find_oauth_token_array($token_data['token']);
        if ($found !== null) {
            return $found;
        }
    }

    $coerced = bookly_integration_coerce_oauth_token_array($token_data);
    if ($coerced !== null) {
        return $coerced;
    }

    $nested_keys = array(
        'token',
        'auth',
        'credentials',
        'oauth',
        'google_calendar_token',
        'google_token',
        'data',
        'google_data',
    );

    foreach ($nested_keys as $key) {
        if (empty($token_data[$key])) {
            continue;
        }

        if (is_array($token_data[$key])) {
            $coerced = bookly_integration_coerce_oauth_token_array($token_data[$key]);
            if ($coerced !== null) {
                return $coerced;
            }
            $found = bookly_integration_deep_find_oauth_token_array($token_data[$key]);
            if ($found !== null) {
                return $found;
            }
        }

        if (is_string($token_data[$key])) {
            $parsed = bookly_integration_decrypt_bookly_google_data($token_data[$key]);
            if ($parsed === null) {
                $parsed = bookly_integration_decode_google_data($token_data[$key]);
            }
            if ($parsed !== null) {
                $found = bookly_integration_normalize_google_token_data($parsed);
                if ($found !== null) {
                    return $found;
                }
            }
        }
    }

    return bookly_integration_deep_find_oauth_token_array($token_data);
}

/**
 * Refresh OAuth token and optionally persist updated google_data on the staff row.
 *
 * @param array $token_data
 * @param array $staff_row
 * @return string|null
 */
function bookly_integration_google_refresh_access_token($token_data, $staff_row) {
    $token_data = bookly_integration_normalize_google_token_data($token_data);
    if ($token_data === null) {
        return null;
    }

    $access_token = isset($token_data['access_token']) ? (string) $token_data['access_token'] : '';
    $needs_refresh = $access_token === '';

    if (!$needs_refresh && isset($token_data['created'], $token_data['expires_in'])) {
        $expires_at = (int) $token_data['created'] + (int) $token_data['expires_in'] - 120;
        if (time() >= $expires_at) {
            $needs_refresh = true;
        }
    }

    if (!$needs_refresh) {
        return $access_token;
    }

    $refresh_token = isset($token_data['refresh_token']) ? (string) $token_data['refresh_token'] : '';
    if ($refresh_token === '') {
        return $access_token !== '' ? $access_token : null;
    }

    $client_id = get_option('bookly_gc_client_id');
    $client_secret = get_option('bookly_gc_client_secret');
    if ($client_id === '' || $client_secret === '') {
        return null;
    }

    $response = wp_remote_post(
        'https://oauth2.googleapis.com/token',
        array(
            'timeout' => 30,
            'body' => array(
                'client_id' => $client_id,
                'client_secret' => $client_secret,
                'refresh_token' => $refresh_token,
                'grant_type' => 'refresh_token',
            ),
        )
    );

    if (is_wp_error($response)) {
        bookly_integration_log_error('Google token refresh failed: ' . $response->get_error_message());
        return $access_token !== '' ? $access_token : null;
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body['access_token'])) {
        bookly_integration_log_error('Google token refresh returned no access_token.');
        return $access_token !== '' ? $access_token : null;
    }

    $token_data['access_token'] = $body['access_token'];
    if (isset($body['expires_in'])) {
        $token_data['expires_in'] = (int) $body['expires_in'];
    }
    $token_data['created'] = time();

    global $wpdb;
    $staff_table = bookly_integration_resolve_bookly_table(array('bookly_staff', 'ab_staff'));
    if ($staff_table !== null && !empty($staff_row['id'])) {
        $wpdb->update(
            $staff_table,
            array('google_data' => wp_json_encode($token_data)),
            array('id' => (int) $staff_row['id']),
            array('%s'),
            array('%d')
        );
    }

    return $body['access_token'];
}

/**
 * Read access token from Bookly's Google client after loadByStaff (same path Bookly uses).
 *
 * @param int $staff_id
 * @return string|null
 */
function bookly_integration_google_access_token_via_bookly($staff_id) {
    $google_class = bookly_integration_resolve_bookly_google_class();
    if ($google_class === null) {
        return null;
    }

    $google = new $google_class();
    $loaded = false;
    $staff_class = bookly_integration_bookly_entity_class('Staff');

    if ($staff_class && method_exists($staff_class, 'find') && method_exists($google, 'loadByStaff')) {
        $staff = $staff_class::find($staff_id, false);
        if ($staff) {
            $loaded = (bool) $google->loadByStaff($staff);
        }
    }
    if (!$loaded && method_exists($google, 'loadByStaffId')) {
        $loaded = (bool) $google->loadByStaffId($staff_id);
    }
    if (!$loaded) {
        return null;
    }

    if (method_exists($google, 'getAccessToken')) {
        $token = $google->getAccessToken();
        if (is_string($token) && $token !== '') {
            $decoded = bookly_integration_decode_google_data($token);
            if ($decoded !== null) {
                $refreshed = bookly_integration_google_refresh_access_token(
                    $decoded,
                    array('id' => $staff_id)
                );
                if ($refreshed !== null && $refreshed !== '') {
                    return $refreshed;
                }
            }
        }
        if (is_array($token) && !empty($token['access_token'])) {
            return (string) $token['access_token'];
        }
    }

    try {
        $ref = new ReflectionClass($google);
        foreach (array('client', 'googleClient') as $property) {
            if (!$ref->hasProperty($property)) {
                continue;
            }
            $prop = $ref->getProperty($property);
            $prop->setAccessible(true);
            $client = $prop->getValue($google);
            if ($client === null || !method_exists($client, 'getAccessToken')) {
                continue;
            }

            if (method_exists($client, 'isAccessTokenExpired') && $client->isAccessTokenExpired()) {
                $token = $client->getAccessToken();
                $refresh = is_array($token) && !empty($token['refresh_token']) ? $token['refresh_token'] : null;
                if ($refresh && method_exists($client, 'fetchAccessTokenWithRefreshToken')) {
                    $client->fetchAccessTokenWithRefreshToken($refresh);
                }
            }

            $token = $client->getAccessToken();
            if (is_array($token) && !empty($token['access_token'])) {
                return (string) $token['access_token'];
            }
            if (is_string($token) && $token !== '') {
                $decoded = bookly_integration_decode_google_data($token);
                if ($decoded !== null && !empty($decoded['access_token'])) {
                    return (string) $decoded['access_token'];
                }
            }
        }
    } catch (ReflectionException $e) {
        bookly_integration_log_error('Google client reflection failed: ' . $e->getMessage());
    }

    return null;
}

/**
 * Use Google API PHP client with raw staff google_data (Bookly passes this string to setAccessToken).
 *
 * @param string $raw google_data column value.
 * @return string|null
 */
function bookly_integration_google_access_token_via_google_client($raw) {
    if ($raw === null || $raw === '' || $raw === 'null') {
        return null;
    }

    $client = null;
    if (class_exists('\\Google\\Client')) {
        $client = new \Google\Client();
    } elseif (class_exists('Google_Client')) {
        $client = new Google_Client();
    }

    if ($client === null) {
        return null;
    }

    $client_id = get_option('bookly_gc_client_id');
    $client_secret = get_option('bookly_gc_client_secret');
    if ($client_id === '' || $client_secret === '') {
        return null;
    }

    if (method_exists($client, 'setClientId')) {
        $client->setClientId($client_id);
    }
    if (method_exists($client, 'setClientSecret')) {
        $client->setClientSecret($client_secret);
    }

    $decoded = bookly_integration_decrypt_bookly_google_data($raw);
    if ($decoded === null) {
        $decoded = bookly_integration_decode_google_data($raw);
    }
    $oauth = is_array($decoded) ? bookly_integration_normalize_google_token_data($decoded) : null;

    $token_candidates = array();
    if ($oauth !== null) {
        $token_candidates[] = $oauth;
    }
    if (is_array($decoded)) {
        $token_candidates[] = $decoded;
    }
    $token_candidates[] = $raw;

    $loaded = false;
    foreach ($token_candidates as $candidate) {
        try {
            $client->setAccessToken($candidate);
            $loaded = true;
            break;
        } catch (Throwable $e) {
            continue;
        }
    }

    if (!$loaded) {
        return null;
    }

    if (method_exists($client, 'isAccessTokenExpired') && $client->isAccessTokenExpired()) {
        $token = $client->getAccessToken();
        $refresh = is_array($token) && !empty($token['refresh_token']) ? $token['refresh_token'] : null;
        if ($refresh && method_exists($client, 'fetchAccessTokenWithRefreshToken')) {
            try {
                $client->fetchAccessTokenWithRefreshToken($refresh);
            } catch (Throwable $e) {
                bookly_integration_log_error('Google client token refresh failed: ' . $e->getMessage());
                return null;
            }
        }
    }

    $token = $client->getAccessToken();
    if (is_array($token) && !empty($token['access_token'])) {
        return (string) $token['access_token'];
    }

    return null;
}

/**
 * Obtain a valid Google access token for staff (DB, Bookly Google class, or Google API client).
 *
 * @param array $staff_row
 * @param int   $staff_id
 * @return string|null
 */
function bookly_integration_google_get_access_token($staff_row, $staff_id = 0) {
    $staff_id = $staff_id > 0 ? $staff_id : (int) ($staff_row['id'] ?? 0);
    $google_fields = bookly_integration_extract_staff_google_fields($staff_row);
    $raw = $google_fields['token_raw'];

    if ($staff_id > 0) {
        $via_bookly = bookly_integration_google_access_token_via_bookly($staff_id);
        if ($via_bookly !== null && $via_bookly !== '') {
            return $via_bookly;
        }
    }

    if ($raw !== null && $raw !== '' && $raw !== 'null') {
        $token_data = bookly_integration_decrypt_bookly_google_data($raw);
        if ($token_data === null) {
            $token_data = bookly_integration_decode_google_data($raw);
        }
        if ($token_data !== null) {
            $oauth = bookly_integration_normalize_google_token_data($token_data);
            if ($oauth !== null) {
                $access_token = bookly_integration_google_refresh_access_token($oauth, $staff_row);
                if ($access_token !== null && $access_token !== '') {
                    return $access_token;
                }
            }
        }

        $via_client = bookly_integration_google_access_token_via_google_client($raw);
        if ($via_client !== null && $via_client !== '') {
            return $via_client;
        }

        $decrypted_raw = null;
        foreach (array('\\Bookly\\Lib\\Utils\\Common', '\\BooklyLite\\Lib\\Utils\\Common') as $class) {
            if (!class_exists($class, false) || !method_exists($class, 'xorDecrypt')) {
                continue;
            }
            try {
                $decrypted_raw = $class::xorDecrypt($raw, (string) get_option('bookly_gc_client_secret'));
                if ($decrypted_raw && $decrypted_raw !== $raw) {
                    break;
                }
                $decrypted_raw = $class::xorDecrypt($raw, '');
                if ($decrypted_raw && $decrypted_raw !== $raw) {
                    break;
                }
            } catch (Throwable $e) {
                continue;
            }
        }
        if (is_string($decrypted_raw) && $decrypted_raw !== '' && $decrypted_raw !== $raw) {
            $via_decrypted = bookly_integration_google_access_token_via_google_client($decrypted_raw);
            if ($via_decrypted !== null && $via_decrypted !== '') {
                return $via_decrypted;
            }
        }
    }

    $staff_class = bookly_integration_bookly_entity_class('Staff');
    if ($staff_id > 0 && $staff_class && method_exists($staff_class, 'find')) {
        $staff = $staff_class::find($staff_id, false);
        if ($staff) {
            $entity_raw = $staff->get('google_data');
            if ($entity_raw && $entity_raw !== $raw) {
                return bookly_integration_google_get_access_token(
                    array_merge($staff_row, array('google_data' => $entity_raw, 'id' => $staff_id)),
                    $staff_id
                );
            }
        }
    }

    if (!empty($staff_row['google_calendar_id'])) {
        bookly_integration_log_error(
            'Google token unavailable for staff ' . $staff_id . ': calendar is connected but google_data could not be decoded.'
        );
    }

    return null;
}

/**
 * Load Bookly custom field id => label map (cached per request).
 *
 * @return array<int, string>
 */
function bookly_integration_load_bookly_custom_field_labels() {
    static $labels = null;
    if ($labels !== null) {
        return $labels;
    }

    global $wpdb;
    $labels = array();
    $table = bookly_integration_resolve_bookly_table(array('bookly_custom_fields', 'ab_custom_fields'));
    if ($table === null) {
        return $labels;
    }

    $rows = $wpdb->get_results("SELECT id, label FROM `{$table}`", ARRAY_A);
    if (is_array($rows)) {
        foreach ($rows as $row) {
            if (!empty($row['id'])) {
                $labels[(int) $row['id']] = trim((string) ($row['label'] ?? ''));
            }
        }
    }

    return $labels;
}

/**
 * Load Bookly service extras id => title map (cached per request).
 * The Bookly Service Extras add-on table is bookly_service_extras (legacy: ab_service_extras).
 * Returns id => extra title (e.g. 2 => "Unlimited Prints").
 *
 * @return array<int, string>
 */
function bookly_integration_load_bookly_service_extras_titles() {
    static $titles = null;
    if ($titles !== null) {
        return $titles;
    }

    global $wpdb;
    $titles = array();
    $table = bookly_integration_resolve_bookly_table(array('bookly_service_extras', 'ab_service_extras'));
    if ($table === null) {
        return $titles;
    }

    $rows = $wpdb->get_results("SELECT id, title FROM `{$table}`", ARRAY_A);
    if (is_array($rows)) {
        foreach ($rows as $row) {
            if (!empty($row['id'])) {
                $titles[(int) $row['id']] = trim((string) ($row['title'] ?? ''));
            }
        }
    }

    return $titles;
}

/**
 * Build a human-readable label for the bookly_customer_appointments.extras column.
 * Examples:
 *   '[]'         => ''
 *   '{"2":1}'    => 'Unlimited Prints'
 *   '{"2":2}'    => 'Unlimited Prints (x2)'
 *   '{"2":1,"5":1}' => 'Unlimited Prints, Backdrop Upgrade'
 *
 * @param string|null $extras_json
 * @return string
 */
function bookly_integration_format_extras_label($extras_json) {
    if ($extras_json === null || $extras_json === '' || $extras_json === '[]' || $extras_json === '{}') {
        return '';
    }

    $decoded = json_decode($extras_json, true);
    if (!is_array($decoded) || empty($decoded)) {
        return '';
    }

    $titles = bookly_integration_load_bookly_service_extras_titles();
    $parts = array();
    foreach ($decoded as $extra_id => $quantity) {
        $extra_id = (int) $extra_id;
        $quantity = (int) $quantity;
        if ($extra_id < 1 || $quantity < 1) {
            continue;
        }
        $title = $titles[$extra_id] ?? ('Extra #' . $extra_id);
        $parts[] = $quantity > 1 ? $title . ' (x' . $quantity . ')' : $title;
    }

    return implode(', ', $parts);
}

/**
 * Parse custom_fields JSON into id => value.
 *
 * @param string|null $json
 * @return array<int, string>
 */
function bookly_integration_parse_custom_fields_values($json) {
    $values = array();
    if ($json === null || $json === '') {
        return $values;
    }

    $decoded = json_decode($json, true);
    if (!is_array($decoded)) {
        return $values;
    }

    foreach ($decoded as $field) {
        if (!is_array($field) || empty($field['id'])) {
            continue;
        }
        $value = isset($field['value']) ? trim((string) $field['value']) : '';
        if ($value !== '') {
            $values[(int) $field['id']] = $value;
        }
    }

    return $values;
}

/**
 * Split booking notes into free text and deposit/total lines from create-booking.
 *
 * @param string $notes
 * @return array{notes: string, deposit_paid: string, total_price: string, amount_due: string, payment_status: string}
 */
function bookly_integration_parse_booking_notes_meta($notes) {
    $notes = trim((string) $notes);
    $deposit_paid = '';
    $total_price = '';
    $free_lines = array();

    if ($notes !== '') {
        foreach (preg_split('/\r\n|\r|\n/', $notes) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (preg_match('/^Deposit paid:\s*(.+)$/i', $line, $matches)) {
                $deposit_paid = trim($matches[1]);
                continue;
            }
            if (preg_match('/^Total price:\s*(.+)$/i', $line, $matches)) {
                $total_price = trim($matches[1]);
                continue;
            }
            $free_lines[] = $line;
        }
    }

    $amount_due = '';
    $payment_status = '';
    if ($deposit_paid !== '' && $total_price !== '') {
        $deposit_num = (float) preg_replace('/[^0-9.]/', '', $deposit_paid);
        $total_num = (float) preg_replace('/[^0-9.]/', '', $total_price);
        if ($total_num > 0) {
            $due_num = max(0, $total_num - $deposit_num);
            $amount_due = (string) $due_num;
            if ($due_num <= 0.009) {
                $payment_status = 'Paid in full';
            } elseif ($deposit_num > 0) {
                $payment_status = 'Deposit received';
            }
        }
    }

    return array(
        'notes' => trim(implode("\n", $free_lines)),
        'deposit_paid' => $deposit_paid,
        'total_price' => $total_price,
        'amount_due' => $amount_due,
        'payment_status' => $payment_status,
    );
}

/**
 * Human-readable service duration (Bookly stores seconds).
 *
 * @param int $seconds
 * @return string
 */
function bookly_integration_format_service_duration_label($seconds) {
    $seconds = (int) $seconds;
    if ($seconds < 1) {
        return '';
    }

    $hours = (int) floor($seconds / 3600);
    $minutes = (int) floor(($seconds % 3600) / 60);

    if ($hours > 0 && $minutes > 0) {
        return $hours . ' hour' . ($hours === 1 ? '' : 's') . ' ' . $minutes . ' min';
    }
    if ($hours > 0) {
        return $hours . ' hour' . ($hours === 1 ? '' : 's');
    }

    return $minutes . ' min';
}

/**
 * Format time without leading zero on hour (matches Bookly / site convention).
 *
 * @param DateTime $dt
 * @return string
 */
function bookly_integration_format_time_label(DateTime $dt) {
    $formatted = $dt->format('g:i a');
    return preg_replace('/^0(\d):/', '$1:', $formatted);
}

/**
 * Bookly Google Calendar templates from wp_options.
 *
 * @return array{title: string, description: string}
 */
function bookly_integration_get_bookly_gc_templates() {
    $title = (string) get_option('bookly_gc_event_title', '');
    $description = (string) get_option('bookly_gc_event_description', '');

    if ($description === '') {
        $description = (string) get_option('bookly_gc_description', '');
    }

    if ($title === '') {
        $title = '{client_name} {service_name}';
    }

    return array(
        'title' => $title,
        'description' => $description,
    );
}

/**
 * Build a participant-scope placeholder map from the main placeholders map.
 * Bookly Pro stores per-customer data under {participant.xxx} inside
 * {#each participants as participant}...{/each} blocks.
 *
 * @param array $placeholders
 * @return array<string, string>
 */
function bookly_integration_build_participant_map($placeholders) {
    $map = array(
        '{participant.client_name}'   => $placeholders['{client_name}']  ?? '',
        '{participant.client_names}'  => $placeholders['{client_names}'] ?? '',
        '{participant.client_phone}'  => $placeholders['{client_phone}'] ?? '',
        '{participant.client_phones}' => $placeholders['{client_phones}']?? '',
        '{participant.client_email}'  => $placeholders['{client_email}'] ?? '',
        '{participant.amount_paid}'   => $placeholders['{deposit_paid}'] ?? '',
        '{participant.amount_due}'    => $placeholders['{amount_due}']   ?? '',
        // {extras} / {participant.extras} resolve to the human-readable extra
        // name(s) looked up from bookly_service_extras. Empty when no extras.
        // NEVER map this to booking notes — Bookly's own email engine handles
        // {extras} natively from the bookly_customer_appointments.extras column.
        '{extras}'                    => $placeholders['{extras}'] ?? '',
        '{participant.extras}'        => $placeholders['{extras}'] ?? '',
        '{appointment_notes}'         => $placeholders['{booking_notes}']  ?? '',
        '{internal_note}'             => $placeholders['{internal_notes}'] ?? '',
    );

    foreach ($placeholders as $key => $value) {
        if (preg_match('/^\{cf_(\d+)\}$/', $key, $m)) {
            $map['{participant.custom_field#' . $m[1] . '}'] = $value;
        }
    }

    return $map;
}

/**
 * Fully resolve a Bookly Google Calendar template, including Pro-style
 * {#each}/{#if}/{participant.xxx} syntax. Returns empty string on failure
 * so callers can fall through to the structured description.
 *
 * @param string $template
 * @param array  $placeholders
 * @return string
 */
function bookly_integration_render_gc_template($template, $placeholders) {
    if ($template === '') {
        return '';
    }

    $participant_map = bookly_integration_build_participant_map($placeholders);

    // Strip {#each participants as participant} / {/each} (single-participant flow).
    $result = preg_replace('/\{#each\s+participants\s+as\s+participant\}\s*/i', '', $template);
    $result = preg_replace('/\s*\{\/each\}/i', '', $result);

    // Evaluate {#if var == val}content{/if} and {#if var != val}content{/if}.
    // Run up to 4 passes to handle nested conditionals.
    $all_map = array_merge($participant_map, $placeholders);
    for ($pass = 0; $pass < 4; $pass++) {
        $result = preg_replace_callback(
            '/\{#if\s+([^}]+)\}(.*?)\{\/if\}/s',
            static function ($matches) use ($all_map) {
                $condition = trim($matches[1]);
                $content   = $matches[2];
                if (preg_match('/^(.+?)\s*(==|!=)\s*(.+)$/', $condition, $parts)) {
                    $var_key  = '{' . trim($parts[1]) . '}';
                    $op       = $parts[2];
                    $expected = trim($parts[3]);
                    $actual   = $all_map[$var_key] ?? '';
                    if ($op === '==' && $actual !== $expected) {
                        return '';
                    }
                    if ($op === '!=' && $actual === $expected) {
                        return '';
                    }
                }
                return $content;
            },
            $result
        );
    }

    // Resolve participant placeholders, then standard ones.
    $result = strtr($result, $participant_map);
    $result = strtr($result, $placeholders);

    // Resolve {cf_NNN} / {cfNNN} variants.
    $result = preg_replace_callback(
        '/\{cf[_-]?(\d+)\}/i',
        static function ($matches) use ($placeholders) {
            return $placeholders['{cf_' . $matches[1] . '}'] ?? '';
        },
        $result
    );

    // Strip any remaining unresolved {token} placeholders.
    $result = preg_replace('/\{[^}\s]{1,80}\}/', '', $result);

    // Fix template typo "{service_duration}ours" → already resolved to "3 hoursours"; clean it.
    $result = preg_replace('/\b(\d+\s+hours?)ours\b/i', '$1', $result);
    $result = preg_replace('/\b(\d+)\s*hrs?ours\b/i', '$1 hours', $result);

    // Collapse 3+ blank lines to 2.
    $result = preg_replace('/\n{3,}/', "\n\n", $result);

    return trim($result);
}

/**
 * Build placeholder map for Bookly Google Calendar templates.
 *
 * @param array    $row Appointment/booking row from DB.
 * @param DateTime $start_dt
 * @param DateTime $end_dt
 * @return array<string, string>
 */
function bookly_integration_build_gc_placeholders($row, DateTime $start_dt, DateTime $end_dt) {
    $client_name = trim($row['customer_name'] ?? '');
    if ($client_name === '') {
        $client_name = trim(
            trim($row['customer_first_name'] ?? '') . ' ' . trim($row['customer_last_name'] ?? '')
        );
    }

    $service_name = trim($row['service_name'] ?? '');
    $staff_name = trim($row['staff_name'] ?? '');
    $custom_field_values = bookly_integration_parse_custom_fields_values($row['custom_fields'] ?? '');
    $field_labels = bookly_integration_load_bookly_custom_field_labels();
    $notes_meta = bookly_integration_parse_booking_notes_meta($row['booking_notes'] ?? '');

    $venue_address = '';
    if (isset($custom_field_values[21883])) {
        $venue_address = $custom_field_values[21883];
    }

    $duration_label = bookly_integration_format_service_duration_label((int) ($row['service_duration'] ?? 0));
    $start_time_label = bookly_integration_format_time_label($start_dt);
    if ($duration_label !== '') {
        $start_time_label .= ' - ' . $duration_label;
    }

    $custom_fields_lines = array();
    foreach ($custom_field_values as $field_id => $value) {
        $label = $field_labels[$field_id] ?? ('Custom field ' . $field_id);
        $custom_fields_lines[] = $label . ': ' . $value;
    }

    $placeholders = array(
        '{service_name}' => $service_name,
        '{staff_name}' => $staff_name,
        '{client_name}' => $client_name,
        '{client_names}' => $client_name,
        '{client_phone}' => trim($row['customer_phone'] ?? ''),
        '{client_phones}' => trim($row['customer_phone'] ?? ''),
        '{client_email}' => trim($row['customer_email'] ?? ''),
        '{appointment_date}' => $start_dt->format('F j, Y'),
        '{appointment_time}' => bookly_integration_format_time_label($start_dt),
        '{appointment_date_time}' => $start_dt->format('F j, Y g:i a'),
        '{service_duration}' => $duration_label,
        '{booking_notes}' => $notes_meta['notes'],
        '{internal_notes}' => trim($row['internal_note'] ?? ''),
        '{extras}' => bookly_integration_format_extras_label($row['extras'] ?? ''),
        '{custom_fields}' => implode("\n", $custom_fields_lines),
        '{event_address}' => $venue_address,
        '{venue_address}' => $venue_address,
        '{payment_status}' => $notes_meta['payment_status'],
        '{amount_paid}' => $notes_meta['deposit_paid'],
        '{amount_due}' => $notes_meta['amount_due'],
        '{deposit_paid}' => $notes_meta['deposit_paid'],
        '{total_price}' => $notes_meta['total_price'],
    );

    foreach ($custom_field_values as $field_id => $value) {
        $placeholders['{cf_' . $field_id . '}'] = $value;
        $placeholders['{cf' . $field_id . '}'] = $value;
        $placeholders['{custom_field_' . $field_id . '}'] = $value;
    }

    return $placeholders;
}

/**
 * Structured description matching Photobooth Guys / Bookly staff calendar layout.
 *
 * @param array    $row
 * @param DateTime $start_dt
 * @param array    $placeholders
 * @return string
 */
function bookly_integration_build_structured_gc_description($row, DateTime $start_dt, $placeholders) {
    $custom_field_values = bookly_integration_parse_custom_fields_values($row['custom_fields'] ?? '');
    $field_labels = bookly_integration_load_bookly_custom_field_labels();
    $notes_meta = bookly_integration_parse_booking_notes_meta($row['booking_notes'] ?? '');

    $lines = array();
    $append = static function ($label, $value, $always = false) use (&$lines) {
        $value = trim((string) $value);
        if ($value !== '' || $always) {
            $lines[] = $label . ': ' . $value;
        }
    };

    $append('Attendant', $placeholders['{staff_name}'] ?? '');
    $lines[] = '';
    $date = $placeholders['{appointment_date}'] ?? '';
    if ($date !== '') {
        $lines[] = $date;
    }
    $start_line = 'Start Time: ' . ($placeholders['{appointment_time}'] ?? '');
    if (!empty($placeholders['{service_duration}'])) {
        $start_line .= ' - ' . $placeholders['{service_duration}'];
    }
    $lines[] = $start_line;
    $append('Client Name', $placeholders['{client_name}'] ?? '');
    $append('Contact Phone', $placeholders['{client_phone}'] ?? '');
    $append('Event Address', $placeholders['{event_address}'] ?? '');

    $backdrop_value = '';
    foreach ($custom_field_values as $field_id => $value) {
        if ($field_id === 21883) {
            continue;
        }
        $label = strtolower($field_labels[$field_id] ?? '');
        if (strpos($label, 'backdrop') !== false) {
            $backdrop_value = $value;
            break;
        }
    }
    $append('Backdrop', $backdrop_value !== '' ? $backdrop_value : 'To be selected');

    // "Additional Info" = any custom field whose label contains "additional" or "print"
    // (matches Bookly's {participant.extras} equivalent for our bookings).
    $additional_info = '';
    foreach ($custom_field_values as $field_id => $value) {
        if ($field_id === 21883) {
            continue;
        }
        $label_lc = strtolower($field_labels[$field_id] ?? '');
        if (strpos($label_lc, 'additional') !== false || strpos($label_lc, 'print') !== false) {
            $additional_info = $value;
            break;
        }
    }
    // If no custom field tagged as "additional", any extra custom fields go here.
    if ($additional_info === '') {
        $extra_parts = array();
        foreach ($custom_field_values as $field_id => $value) {
            if ($field_id === 21883) {
                continue;
            }
            $label_lc = strtolower($field_labels[$field_id] ?? '');
            if (strpos($label_lc, 'backdrop') !== false) {
                continue;
            }
            $extra_parts[] = $value;
        }
        $additional_info = implode(', ', $extra_parts);
    }

    // Blank line before the notes/email/payment block (matches reference layout).
    $lines[] = '';
    $lines[] = 'Additional Info: ' . $additional_info;
    // CHANGE 3: Internal Notes = appointment internal_note field, not booking notes.
    $internal_note = trim($placeholders['{internal_notes}'] ?? '');
    $lines[] = 'Internal Notes: ' . $internal_note;
    $lines[] = '';
    $lines[] = 'Email: ' . ($placeholders['{client_email}'] ?? '');
    $lines[] = '';
    $lines[] = 'Payment Status: ' . $notes_meta['payment_status'];
    $lines[] = 'Amount Paid: ' . $notes_meta['deposit_paid'];
    $lines[] = 'Amount Due: ' . $notes_meta['amount_due'];

    // Collapse multiple consecutive blank lines and trim.
    $result = implode("\n", $lines);
    $result = preg_replace('/\n{3,}/', "\n\n", $result);
    return trim($result);
}

/**
 * Build Google Calendar API event body for an appointment.
 *
 * @param int $appointment_id
 * @param int $booking_id
 * @return array|null
 */
function bookly_integration_build_google_calendar_event_body($appointment_id, $booking_id) {
    global $wpdb;

    $appointments_table = bookly_integration_resolve_bookly_table(array('bookly_appointments', 'ab_appointments'));
    $ca_table = bookly_integration_resolve_bookly_table(array('bookly_customer_appointments', 'ab_customer_appointments'));
    $customers_table = bookly_integration_resolve_bookly_table(array('bookly_customers', 'ab_customers'));
    $services_table = bookly_integration_resolve_bookly_table(array('bookly_services', 'ab_services'));
    $staff_table = bookly_integration_resolve_bookly_table(array('bookly_staff', 'ab_staff'));

    if ($appointments_table === null) {
        return null;
    }

    $services_join = $services_table !== null
        ? "LEFT JOIN `{$services_table}` s ON s.id = a.service_id"
        : '';
    $staff_join = $staff_table !== null
        ? "LEFT JOIN `{$staff_table}` st ON st.id = a.staff_id"
        : '';
    $customers_join = ($ca_table !== null && $customers_table !== null)
        ? "LEFT JOIN `{$customers_table}` c ON c.id = ca.customer_id"
        : '';

    $customer_name_sql = "TRIM(COALESCE(
        NULLIF(TRIM(c.full_name), ''),
        NULLIF(TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))), ''),
        ''
    )) AS customer_name";

    $row = null;
    if ($booking_id > 0 && $ca_table !== null) {
        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT a.start_date, a.end_date, a.staff_id, a.service_id,
                        s.title AS service_name, s.duration AS service_duration,
                        st.full_name AS staff_name,
                        c.first_name AS customer_first_name, c.last_name AS customer_last_name,
                        c.email AS customer_email, c.phone AS customer_phone,
                        {$customer_name_sql},
                        ca.notes AS booking_notes, ca.custom_fields, ca.extras,
                        a.internal_note
                 FROM `{$ca_table}` ca
                 INNER JOIN `{$appointments_table}` a ON a.id = ca.appointment_id
                 {$services_join}
                 {$staff_join}
                 {$customers_join}
                 WHERE ca.id = %d
                 LIMIT 1",
                $booking_id
            ),
            ARRAY_A
        );
    }

    if (empty($row['start_date']) && $ca_table !== null) {
        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT a.start_date, a.end_date, a.staff_id, a.service_id,
                        s.title AS service_name, s.duration AS service_duration,
                        st.full_name AS staff_name,
                        c.first_name AS customer_first_name, c.last_name AS customer_last_name,
                        c.email AS customer_email, c.phone AS customer_phone,
                        {$customer_name_sql},
                        ca.notes AS booking_notes, ca.custom_fields, ca.extras,
                        a.internal_note
                 FROM `{$appointments_table}` a
                 LEFT JOIN `{$ca_table}` ca ON ca.appointment_id = a.id
                 {$services_join}
                 {$staff_join}
                 {$customers_join}
                 WHERE a.id = %d
                 ORDER BY ca.id ASC
                 LIMIT 1",
                $appointment_id
            ),
            ARRAY_A
        );
    }

    if (empty($row['start_date'])) {
        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT a.start_date, a.end_date, a.staff_id, a.service_id,
                        s.title AS service_name, s.duration AS service_duration,
                        st.full_name AS staff_name
                 FROM `{$appointments_table}` a
                 {$services_join}
                 {$staff_join}
                 WHERE a.id = %d
                 LIMIT 1",
                $appointment_id
            ),
            ARRAY_A
        );
    }

    if (empty($row['start_date'])) {
        return null;
    }

    $timezone = function_exists('wp_timezone_string') ? wp_timezone_string() : 'UTC';
    if ($timezone === '') {
        $timezone = 'UTC';
    }

    try {
        $start_dt = new DateTime($row['start_date'], new DateTimeZone($timezone));
        $end_dt = new DateTime(!empty($row['end_date']) ? $row['end_date'] : $row['start_date'], new DateTimeZone($timezone));
    } catch (Exception $e) {
        return null;
    }

    $placeholders = bookly_integration_build_gc_placeholders($row, $start_dt, $end_dt);
    $templates = bookly_integration_get_bookly_gc_templates();

    // ── Title ──────────────────────────────────────────────────────────────
    $client  = $placeholders['{client_name}'] ?? '';
    $service = $placeholders['{service_name}'] ?? '';

    $title_template = $templates['title'];
    $summary = bookly_integration_render_gc_template($title_template, $placeholders);

    // Ensure the client name appears in the title.
    // If the Bookly title template doesn't include a {client_*} code,
    // prepend the client name (e.g. "Kim Doe 3 Hour Photo Booth Rental").
    if ($client !== '' && stripos($summary, $client) === false) {
        $summary = trim($client . ' ' . ($summary !== '' ? $summary : $service));
    }
    if ($summary === '') {
        $summary = trim($client . ' ' . $service);
    }
    if ($summary === '') {
        $summary = 'Bookly appointment';
    }

    // ── Description ────────────────────────────────────────────────────────
    // Process the Bookly description template (handles {#each}, {participant.xxx},
    // {#if}, etc.).  If the template is empty or leaves unresolvable remnants,
    // fall back to our structured layout that mirrors the reference entry.
    $description = '';
    $desc_template = $templates['description'];
    if ($desc_template !== '') {
        $description = bookly_integration_render_gc_template($desc_template, $placeholders);
    }
    // Fall back to structured description when template is absent or produced nothing useful.
    if ($description === '' || preg_match('/\{[a-z_#.]+\}/i', $description)) {
        $description = bookly_integration_build_structured_gc_description($row, $start_dt, $placeholders);
    }

    $event = array(
        'summary' => $summary,
        'start' => array(
            'dateTime' => $start_dt->format(DateTime::RFC3339),
            'timeZone' => $timezone,
        ),
        'end' => array(
            'dateTime' => $end_dt->format(DateTime::RFC3339),
            'timeZone' => $timezone,
        ),
    );

    if ($description !== '') {
        $event['description'] = $description;
    }

    return $event;
}

/**
 * Create a Google Calendar event via the REST API using staff OAuth tokens Bookly stored.
 *
 * @param int $appointment_id
 * @param int $booking_id
 * @param int $staff_id
 * @return array{synced: bool, reason: string}
 */
function bookly_integration_google_calendar_direct_sync($appointment_id, $booking_id, $staff_id) {
    $staff_row = bookly_integration_get_staff_row($staff_id);
    if ($staff_row === null) {
        return array('synced' => false, 'reason' => 'staff_not_found');
    }

    $google_fields = bookly_integration_extract_staff_google_fields($staff_row);
    $access_token = bookly_integration_google_get_access_token($staff_row, $staff_id);
    if ($access_token === null || $access_token === '') {
        $reason = ($google_fields['token_raw'] !== null && $google_fields['token_raw'] !== '')
            ? 'google_token_decode_failed'
            : 'google_access_token_unavailable';
        return array('synced' => false, 'reason' => $reason);
    }

    $event_body = bookly_integration_build_google_calendar_event_body($appointment_id, $booking_id);
    if ($event_body === null) {
        return array('synced' => false, 'reason' => 'google_event_body_build_failed');
    }

    $calendar_candidates = bookly_integration_staff_calendar_id_candidates($staff_row);
    $last_reason = 'google_direct_error: unknown';

    foreach ($calendar_candidates as $calendar_id) {
        $url = 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calendar_id) . '/events';

        $response = wp_remote_post(
            $url,
            array(
                'timeout' => 30,
                'headers' => array(
                    'Authorization' => 'Bearer ' . $access_token,
                    'Content-Type' => 'application/json',
                ),
                'body' => wp_json_encode($event_body),
            )
        );

        if (is_wp_error($response)) {
            $last_reason = 'google_direct_error: ' . $response->get_error_message();
            continue;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($code >= 200 && $code < 300 && !empty($body['id'])) {
            global $wpdb;
            $appointments_table = bookly_integration_resolve_bookly_table(array('bookly_appointments', 'ab_appointments'));
            if ($appointments_table !== null) {
                $wpdb->update(
                    $appointments_table,
                    array('google_event_id' => $body['id']),
                    array('id' => $appointment_id),
                    array('%s'),
                    array('%d')
                );
            }

            $reason = 'google_direct_api';
            if ($calendar_id !== ($calendar_candidates[0] ?? $calendar_id)) {
                $reason = 'google_direct_api:primary_fallback';
            }

            return array('synced' => true, 'reason' => $reason);
        }

        $message = is_array($body) && isset($body['error']['message'])
            ? $body['error']['message']
            : 'HTTP ' . $code;
        $last_reason = 'google_direct_error: ' . $message;

        $not_found = ($code === 404)
            || stripos($message, 'not found') !== false
            || stripos($message, 'notFound') !== false;
        if (!$not_found) {
            break;
        }
    }

    return array('synced' => false, 'reason' => $last_reason);
}

/**
 * Re-save Bookly entities so Pro save handlers may run (no do_action — avoids duplicate Agreements webhooks).
 *
 * @param int         $booking_id
 * @param object|null $appointment
 */
function bookly_integration_touch_bookly_entities($booking_id, $appointment) {
    $ca_class = bookly_integration_bookly_entity_class('CustomerAppointment');
    if ($booking_id > 0 && $ca_class && method_exists($ca_class, 'find')) {
        $ca = $ca_class::find($booking_id, false);
        if ($ca && method_exists($ca, 'save')) {
            $ca->save();
        }
    }

    if ($appointment && method_exists($appointment, 'save')) {
        $appointment->save();
    }
}

/**
 * Staff Google Calendar connection diagnostics.
 *
 * @param int $staff_id
 * @return array{connected: bool, reason: string}
 */
function bookly_integration_staff_google_calendar_status($staff_id) {
    $staff_id = (int) $staff_id;
    if ($staff_id < 1) {
        return array(
            'connected' => false,
            'reason' => 'invalid_staff_id',
        );
    }

    $staff_class = bookly_integration_bookly_entity_class('Staff');
    if ($staff_class && method_exists($staff_class, 'find')) {
        $staff = $staff_class::find($staff_id, false);
        if ($staff) {
            if (bookly_integration_staff_row_has_google_calendar($staff->getFields())) {
                return array(
                    'connected' => true,
                    'reason' => 'staff_entity_google_connected',
                );
            }
        }
    }

    $row = bookly_integration_get_staff_row($staff_id);
    if ($row === null) {
        return array(
            'connected' => false,
            'reason' => 'staff_not_found',
        );
    }

    if (bookly_integration_staff_row_has_google_calendar($row)) {
        return array(
            'connected' => true,
            'reason' => 'staff_row_google_connected',
        );
    }

    return array(
        'connected' => false,
        'reason' => 'staff_google_not_connected',
    );
}

/**
 * Whether a staff DB row indicates Google Calendar is connected.
 *
 * @param array $row Staff table row.
 * @return bool
 */
function bookly_integration_staff_row_has_google_calendar($row) {
    if (!is_array($row)) {
        return false;
    }

    $google_fields = bookly_integration_extract_staff_google_fields($row);

    return ($google_fields['token_raw'] !== null && $google_fields['token_raw'] !== '')
        || ($google_fields['calendar_id'] !== null && $google_fields['calendar_id'] !== '');
}

/**
 * Trigger Bookly's Google Calendar sync for a single appointment.
 *
 * @param int $appointment_id
 * @param int $booking_id     bookly_customer_appointments.id
 * @param int $staff_id
 * @return array{synced: bool, reason: string}
 */
function bookly_integration_sync_appointment_google_calendar($appointment_id, $booking_id = 0, $staff_id = 0) {
    $appointment_id = (int) $appointment_id;
    $booking_id = (int) $booking_id;
    $staff_id = (int) $staff_id;

    if ($appointment_id < 1) {
        $reason = 'invalid_appointment_id';
        bookly_integration_log_error('Google Calendar sync skipped: ' . $reason);
        return array('synced' => false, 'reason' => $reason);
    }

    if (!get_option('bookly_gc_client_id') || !get_option('bookly_gc_client_secret')) {
        $reason = 'google_calendar_api_not_configured';
        bookly_integration_log_error('Google Calendar sync skipped: ' . $reason);
        return array('synced' => false, 'reason' => $reason);
    }

    $appointment_class = bookly_integration_bookly_entity_class('Appointment');
    if ($appointment_class === null) {
        $reason = 'bookly_appointment_class_missing';
        bookly_integration_log_error('Google Calendar sync skipped: ' . $reason);
        return array('synced' => false, 'reason' => $reason);
    }

    $appointment = $appointment_class::find($appointment_id, false);
    if (!$appointment) {
        $reason = 'appointment_not_found';
        bookly_integration_log_error('Google Calendar sync skipped: ' . $reason . ' (id ' . $appointment_id . ')');
        return array('synced' => false, 'reason' => $reason);
    }

    if ($staff_id < 1) {
        $staff_id = (int) $appointment->get('staff_id');
    }
    if ($staff_id < 1) {
        global $wpdb;
        $appointments_table = bookly_integration_resolve_bookly_table(array('bookly_appointments', 'ab_appointments'));
        if ($appointments_table !== null) {
            $staff_id = (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT staff_id FROM `{$appointments_table}` WHERE id = %d LIMIT 1",
                    $appointment_id
                )
            );
        }
    }

    $staff_status = bookly_integration_staff_google_calendar_status($staff_id);
    if (!$staff_status['connected']) {
        $reason = $staff_status['reason'];
        bookly_integration_log_error(
            'Google Calendar sync skipped for appointment ' . $appointment_id . ': ' . $reason
        );
        return array('synced' => false, 'reason' => $reason);
    }

    try {
        bookly_integration_touch_bookly_entities($booking_id, $appointment);
        if (bookly_integration_appointment_has_google_event($appointment, $appointment_id)) {
            return array('synced' => true, 'reason' => 'bookly_entity_save');
        }

        $client_result = bookly_integration_try_bookly_google_client($appointment, $staff_id);
        if ($client_result !== null) {
            if (!empty($client_result['synced'])) {
                return $client_result;
            }
            if (!empty($client_result['reason']) && strpos($client_result['reason'], 'google_api_error:') === 0) {
                bookly_integration_log_error(
                    'Google Calendar sync failed for appointment ' . $appointment_id . ': ' . $client_result['reason']
                );
                return $client_result;
            }
        }

        $proxy_result = bookly_integration_try_bookly_google_proxies($appointment);
        if ($proxy_result !== null && !empty($proxy_result['synced'])) {
            if (bookly_integration_appointment_has_google_event($appointment, $appointment_id)) {
                return $proxy_result;
            }
        }

        $google_event_id = $appointment->get('google_event_id');

        if (empty($google_event_id) && method_exists($appointment, 'createGoogleCalendarEvent')) {
            $event_id = $appointment->createGoogleCalendarEvent();
            if (!empty($event_id)) {
                return array('synced' => true, 'reason' => 'createGoogleCalendarEvent');
            }
        } elseif (!empty($google_event_id) && method_exists($appointment, 'updateGoogleCalendarEvent')) {
            if ($appointment->updateGoogleCalendarEvent()) {
                return array('synced' => true, 'reason' => 'updateGoogleCalendarEvent');
            }
        }

        if (method_exists($appointment, 'handleGoogleCalendar')) {
            $appointment->handleGoogleCalendar();
            if (bookly_integration_appointment_has_google_event($appointment, $appointment_id)) {
                return array('synced' => true, 'reason' => 'handleGoogleCalendar');
            }
        }

        if ($booking_id > 0) {
            $ca_class = bookly_integration_bookly_entity_class('CustomerAppointment');
            if ($ca_class && method_exists($ca_class, 'find')) {
                $ca = $ca_class::find($booking_id, false);
                if ($ca && method_exists($ca, 'getAppointment')) {
                    $linked = $ca->getAppointment();
                    if ($linked && method_exists($linked, 'handleGoogleCalendar')) {
                        $linked->handleGoogleCalendar();
                        if (bookly_integration_appointment_has_google_event($linked, $appointment_id)) {
                            return array('synced' => true, 'reason' => 'customer_appointment_handleGoogleCalendar');
                        }
                    }
                }
            }
        }

        if (bookly_integration_appointment_has_google_event($appointment, $appointment_id)) {
            return array('synced' => true, 'reason' => 'google_event_id_present');
        }

        $direct_result = bookly_integration_google_calendar_direct_sync($appointment_id, $booking_id, $staff_id);
        if (!empty($direct_result['synced'])) {
            return $direct_result;
        }
        if (!empty($direct_result['reason']) && strpos($direct_result['reason'], 'google_direct_error:') === 0) {
            bookly_integration_log_error(
                'Google Calendar direct sync failed for appointment ' . $appointment_id . ': ' . $direct_result['reason']
            );
            return $direct_result;
        }

        $reason = !empty($direct_result['reason'])
            ? $direct_result['reason']
            : (bookly_integration_is_bookly_pro_loaded()
                ? 'sync_methods_returned_false'
                : 'bookly_pro_plugin_not_detected');
        bookly_integration_log_error(
            'Google Calendar sync did not complete for appointment ' . $appointment_id . ': ' . $reason
        );
        return array('synced' => false, 'reason' => $reason);
    } catch (Throwable $e) {
        $reason = 'exception: ' . $e->getMessage();
        bookly_integration_log_error(
            'Google Calendar sync failed for appointment ' . $appointment_id . ': ' . $reason
        );
        return array('synced' => false, 'reason' => $reason);
    }
}

/**
 * Check whether an appointment row has a google_event_id after sync.
 *
 * @param object $appointment Bookly Appointment entity.
 * @param int    $appointment_id
 * @return bool
 */
function bookly_integration_appointment_has_google_event($appointment, $appointment_id) {
    if (!empty($appointment->get('google_event_id'))) {
        return true;
    }

    if (method_exists($appointment, 'load')) {
        $appointment->load($appointment_id);
        return !empty($appointment->get('google_event_id'));
    }

    return false;
}

/**
 * Register REST routes for Bookly integration API.
 */
function bookly_integration_register_rest_routes() {
    register_rest_route(
        'bookly-integration/v1',
        '/create-customer',
        array(
            'methods' => 'POST',
            'callback' => 'bookly_integration_rest_create_customer',
            'permission_callback' => '__return_true',
        )
    );

    register_rest_route(
        'bookly-integration/v1',
        '/create-booking',
        array(
            'methods' => 'POST',
            'callback' => 'bookly_integration_rest_create_booking',
            'permission_callback' => '__return_true',
        )
    );
}
