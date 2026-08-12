<?php
/**
 * ============================================================================
 * LAVINIA EXPLORER - DATABASE CONNECTION & CORE SECURITY HELPERS
 * File: api/db_connect.php
 * ============================================================================
 * Specifications Implemented:
 * - Database Name : lavinia_explorer_db
 * - NFR-SEC-02    : PDO with Emulated Prepares Disabled (True Prepared Statements)
 * - NFR-SEC-03    : 30-Minute (1800s) Admin Session Inactivity Timeout
 * - BSR-01        : Haversine 25.00 km Mount Lavinia Boundary Validation
 * - FR-VAL-02     : Image Upload Validation (Max 5MB, .jpg / .png / .webp)
 * ============================================================================
 */
declare(strict_types=1);

// Configure secure session parameters before starting session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.gc_maxlifetime', '1800');
    session_start();
}

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'lavinia_explorer_db');
define('DB_USER', 'root');
define('DB_PASS', '');

// Mount Lavinia Reference Coordinates & Boundary Limit (BSR-01)
define('MT_LAVINIA_LAT', 6.8398);
define('MT_LAVINIA_LNG', 79.8656);
define('MAX_RADIUS_KM', 25.0);

// Session Timeout Limit: 30 Minutes (1800 seconds)
define('SESSION_TIMEOUT_SECONDS', 1800);

// Image Upload Constraints (FR-VAL-02)
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5 MB in bytes
define('UPLOAD_DIR', __DIR__ . '/../uploads/places/');

//Allowed Categories & Time Suitabilities
define('ALLOWED_CATEGORIES', [
    'Nature & Wildlife',
    'Heritage & History',
    'Religious & Cultural',
    'Leisure & Dining',
    'Conservation'
]);

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false, // Enforces true prepared statements (NFR-SEC-02)
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'Database connection failed. Ensure MySQL is running and schema.sql has been imported into lavinia_explorer_db.'
    ]));
}

/**
 * Checks whether the current admin session is authenticated and within the
 * 30-minute inactivity window. Updates last_activity timestamp if valid.
 */
function checkAdminSession(): bool {
    if (empty($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        return false;
    }

    $now = time();
    if (isset($_SESSION['last_activity']) && ($now - (int)$_SESSION['last_activity']) > SESSION_TIMEOUT_SECONDS) {
        // Session expired due to 30-minute inactivity
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', $now - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        return false;
    }

    // Refresh activity timer
    $_SESSION['last_activity'] = $now;
    return true;
}

/**
 * Enforces Admin Session Authorization (with 30-minute inactivity timeout)
 */
function requireAdminAuth(): void {
    if (!checkAdminSession()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        exit(json_encode([
            'status'  => 'error',
            'success' => false,
            'code'    => 'AUTH_TIMEOUT_OR_UNAUTHORIZED',
            'message' => 'Unauthorized or session expired (30-minute inactivity timeout). Please log in again.'
        ]));
    }
}

/**
 * BSR-01: Calculates Haversine straight-line distance (km) from Mount Lavinia center
 */
function calculateDistanceFromMtLavinia(float $lat, float $lng): float {
    $earthRadiusKm = 6371.0;

    $dLat = deg2rad($lat - MT_LAVINIA_LAT);
    $dLng = deg2rad($lng - MT_LAVINIA_LNG);

    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad(MT_LAVINIA_LAT)) * cos(deg2rad($lat)) *
         sin($dLng / 2) * sin($dLng / 2);

    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    return round($earthRadiusKm * $c, 2);
}

/**
 * BSR-01: Validates whether coordinates fall strictly within the 25.00 km radius of Mount Lavinia
 */
function isWithinBoundary(float $lat, float $lng, ?float &$calculatedDistance = null): bool {
    if ($lat < -90.0 || $lat > 90.0 || $lng < -180.0 || $lng > 180.0) {
        return false;
    }
    $calculatedDistance = calculateDistanceFromMtLavinia($lat, $lng);
    return $calculatedDistance <= MAX_RADIUS_KM;
}

/**
 * FR-VAL-02: Validates and processes image uploads (Max 5MB, .jpg/.png/.webp)
 */
function handleImageUpload(array $file): array {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return ['success' => false, 'error' => 'File upload error code: ' . $file['error']];
    }

    // Check max file size (5 MB)
    if ($file['size'] > MAX_FILE_SIZE) {
        return ['success' => false, 'error' => 'FR-VAL-02 Violation: Image exceeds maximum allowed size of 5MB.'];
    }

    // Verify true MIME type using finfo (prevents renamed executable scripts)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp'
    ];

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!array_key_exists($mimeType, $allowedMimes) || !in_array($ext, $allowedExts, true)) {
        return [
            'success' => false,
            'error'   => 'FR-VAL-02 Violation: Invalid file format. Only .jpg, .png, and .webp images are allowed.'
        ];
    }

    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }

    // Generate cryptographically secure unique filename
    $safeFilename = 'poi_' . bin2hex(random_bytes(8)) . '.' . $allowedMimes[$mimeType];
    $destination = UPLOAD_DIR . $safeFilename;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        return ['success' => false, 'error' => 'Failed to move uploaded file to uploads/places/ directory.'];
    }

    return ['success' => true, 'path' => 'uploads/places/' . $safeFilename];
}
