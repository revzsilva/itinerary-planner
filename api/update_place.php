<?php
/**
 * ============================================================================
 * LAVINIA EXPLORER - UPDATE POINT OF INTEREST API (ADMIN ONLY)
 * File: api/update_place.php
 * ============================================================================
 * Specifications Implemented:
 * - FR-ADM     : Secure admin updating of POIs
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

// 2. Validate Target Place ID & Inputs
$placeId          = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT)
                 ?: filter_input(INPUT_POST, 'place_id', FILTER_VALIDATE_INT);
$title            = trim($_POST['title'] ?? '');
$category         = trim($_POST['category'] ?? '');
$timeSuitability  = trim($_POST['time_suitability'] ?? '');
$description      = trim($_POST['description'] ?? '');
$openingHours     = trim($_POST['opening_hours'] ?? '');
$travelTips       = trim($_POST['travel_tips'] ?? '');
$latitude         = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
$longitude        = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);
$imageUrlInput    = trim($_POST['image_url'] ?? '');

if (isset($_POST['time_suitability']) && is_array($_POST['time_suitability'])) {
    $timeSuitability = implode(', ', array_map('trim', $_POST['time_suitability']));
}

if (
    !$placeId ||
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
        'message' => 'Invalid place ID or missing required fields.'
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

// 3. BSR-01: Re-validate Coordinates Against 25 km Mount Lavinia Radius
$distanceKm = 0.0;
if (!isWithinBoundary((float)$latitude, (float)$longitude, $distanceKm)) {
    http_response_code(422);
    exit(json_encode([
        'status'  => 'error',
        'success' => false,
        'code'    => 'BSR-01',
        'message' => sprintf(
            'BSR-01 Violation: Updated coordinates are %.2f km from Mount Lavinia center, exceeding the strict 25.00 km boundary.',
            $distanceKm
        )
    ]));
}

// 4. Verify Existing Record via PDO Prepared Statement (NFR-SEC-02)
$checkStmt = $pdo->prepare("SELECT id, image_url FROM places WHERE id = :id LIMIT 1");
$checkStmt->execute([':id' => $placeId]);
$existingPlace = $checkStmt->fetch();

if (!$existingPlace) {
    http_response_code(404);
    exit(json_encode(['status' => 'error', 'success' => false, 'message' => 'Attraction record not found.']));
}

// 5. FR-VAL-02: Handle Optional New Image Upload
$finalImageUrl    = $imageUrlInput !== '' ? $imageUrlInput : $existingPlace['image_url'];
$newImageUploaded = false;

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
    $finalImageUrl    = $uploadResult['path'];
    $newImageUploaded = true;
}

// 6. NFR-SEC-02: Update Record Using PDO Prepared Statement
try {
    $sql = "UPDATE places
            SET title            = :title,
                category         = :category,
                time_suitability = :time_suitability,
                description      = :description,
                opening_hours    = :opening_hours,
                travel_tips      = :travel_tips,
                distance_km      = :distance_km,
                latitude         = :latitude,
                longitude        = :longitude,
                image_url        = :image_url,
                updated_at       = NOW()
            WHERE id = :id";

    $updateStmt = $pdo->prepare($sql);
    $updateStmt->execute([
        ':title'            => $title,
        ':category'         => $category,
        ':time_suitability' => $timeSuitability,
        ':description'      => $description,
        ':opening_hours'    => $openingHours,
        ':travel_tips'      => $travelTips,
        ':distance_km'      => $distanceKm,
        ':latitude'         => (float)$latitude,
        ':longitude'        => (float)$longitude,
        ':image_url'        => $finalImageUrl,
        ':id'               => $placeId
    ]);

    // Remove old uploaded image file if replaced
    if ($newImageUploaded && !empty($existingPlace['image_url']) && str_starts_with($existingPlace['image_url'], 'uploads/')) {
        $oldFilePath = __DIR__ . '/../' . $existingPlace['image_url'];
        if (file_exists($oldFilePath) && is_file($oldFilePath)) {
            unlink($oldFilePath);
        }
    }

    http_response_code(200);
    echo json_encode([
        'status'      => 'success',
        'success'     => true,
        'message'     => 'Attraction record updated successfully.',
        'place_id'    => $placeId,
        'distance_km' => $distanceKm,
        'image_url'   => $finalImageUrl
    ]);
} catch (PDOException $e) {
    if ($newImageUploaded && $finalImageUrl) {
        $newFilePath = __DIR__ . '/../' . $finalImageUrl;
        if (file_exists($newFilePath)) {
            unlink($newFilePath);
        }
    }

    http_response_code(500);
    echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Failed to update attraction record.']);
}
