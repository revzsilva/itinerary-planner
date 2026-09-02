<?php
/**
 * ============================================================================
 * LAVINIA EXPLORER - CREATE POINT OF INTEREST API (ADMIN ONLY)
 * File: api/create_place.php
 * ============================================================================
 * Specifications Implemented:
 * - FR-ADM     : Secure admin insertion of POIs
 * - BSR-01     : Server-side Haversine validation (<= 25.00 km of Mount Lavinia)
 * - FR-VAL-02  : Image upload validation (Max 5MB, .jpg/.png/.webp)
 * - NFR-SEC-02 : PDO Prepared Statements to prevent SQL injection
 * ============================================================================
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db_connect.php';

// 1. Enforce Admin Session Authorization (with 30-min inactivity check)
requireAdminAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['status' => 'error', 'success' => false, 'message' => 'Method Not Allowed. Use POST.']));
}

// 2. Sanitize and Extract Inputs
$title            = trim($_POST['title'] ?? '');
$category         = trim($_POST['category'] ?? '');
$timeSuitability  = trim($_POST['time_suitability'] ?? '');
$description      = trim($_POST['description'] ?? '');
$openingHours     = trim($_POST['opening_hours'] ?? '');
$travelTips       = trim($_POST['travel_tips'] ?? '');
$latitude         = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
$longitude        = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);
$imageUrlInput    = trim($_POST['image_url'] ?? '');

// Support array of checkboxes for time_suitability if passed as array
if (isset($_POST['time_suitability']) && is_array($_POST['time_suitability'])) {
    $timeSuitability = implode(', ', array_map('trim', $_POST['time_suitability']));
}

// Validate required fields
if (
    $title === '' ||
    $category === '' ||
    $timeSuitability === '' ||
    $description === '' ||
    $openingHours === '' ||
    $travelTips === '' ||
    $latitude === false || $latitude === null ||
    $longitude === false || $longitude === null
) {
    http_response_code(400);
    exit(json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'All required fields (title, category, time_suitability, description, opening_hours, travel_tips, latitude, longitude) must be provided.'
    ]));
}

if (!in_array($category, ALLOWED_CATEGORIES, true)) {
    http_response_code(400);
    exit(json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'Invalid category selected.'
    ]));
}

// 3. BSR-01: Server-Side 25 km Mount Lavinia Radius Boundary Validation
$distanceKm = 0.0;
if (!isWithinBoundary((float)$latitude, (float)$longitude, $distanceKm)) {
    http_response_code(422);
    exit(json_encode([
        'status'  => 'error',
        'success' => false,
        'code'    => 'BSR-01',
        'message' => sprintf(
            'BSR-01 Violation: Coordinates are %.2f km from Mount Lavinia center (6.8398° N, 79.8656° E), exceeding the strict 25.00 km boundary.',
            $distanceKm
        )
    ]));
}

// 4. FR-VAL-02: Image Upload Validation (Max 5MB, .jpg/.png/.webp)
$finalImageUrl = $imageUrlInput !== '' ? $imageUrlInput : null;
$uploadedFile  = false;

if (!empty($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
    $uploadResult = handleImageUpload($_FILES['image']);
    if (!$uploadResult['success']) {
        http_response_code(422);
        exit(json_encode([
            'status'  => 'error',
            'success' => false,
            'code'    => 'FR-VAL-02',
            'message' => $uploadResult['error']
        ]));
    }
    $finalImageUrl = $uploadResult['path'];
    $uploadedFile  = true;
}

// 5. NFR-SEC-02: Insert Record Using PDO Prepared Statement
try {
    $sql = "INSERT INTO places (
                title, category, time_suitability, description,
                opening_hours, travel_tips, distance_km,
                latitude, longitude, image_url
            ) VALUES (
                :title, :category, :time_suitability, :description,
                :opening_hours, :travel_tips, :distance_km,
                :latitude, :longitude, :image_url
            )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title'            => $title,
        ':category'         => $category,
        ':time_suitability' => $timeSuitability,
        ':description'      => $description,
        ':opening_hours'    => $openingHours,
        ':travel_tips'      => $travelTips,
        ':distance_km'      => $distanceKm,
        ':latitude'         => (float)$latitude,
        ':longitude'        => (float)$longitude,
        ':image_url'        => $finalImageUrl
    ]);

    $insertedId = (int)$pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'status'      => 'success',
        'success'     => true,
        'message'     => 'Point of Interest created successfully.',
        'place_id'    => $insertedId,
        'distance_km' => $distanceKm,
        'image_url'   => $finalImageUrl
    ]);
} catch (PDOException $e) {
    if ($uploadedFile && $finalImageUrl) {
        $fullPath = __DIR__ . '/../' . $finalImageUrl;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
    }

    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'Failed to save POI record to database.'
    ]);
}
