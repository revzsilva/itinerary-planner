<?php
/**
 * ============================================================================
 * LAVINIA EXPLORER - DELETE POINT OF INTEREST API (ADMIN ONLY)
 * File: api/delete_place.php
 * ============================================================================
 * Specifications Implemented:
 * - FR-ADM     : Secure admin deletion of POIs
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

$rawInput  = file_get_contents('php://input');
$jsonData  = $rawInput ? json_decode($rawInput, true) : null;
$inputData = is_array($jsonData) ? $jsonData : $_POST;

$placeId = filter_var($inputData['id'] ?? ($inputData['place_id'] ?? null), FILTER_VALIDATE_INT);

if (!$placeId || $placeId <= 0) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'success' => false, 'message' => 'Valid place ID is required for deletion.']));
}

try {
    // 2. Fetch Existing Record First via PDO Prepared Statement
    $selectStmt = $pdo->prepare("SELECT id, image_url FROM places WHERE id = :id LIMIT 1");
    $selectStmt->execute([':id' => $placeId]);
    $place = $selectStmt->fetch();

    if (!$place) {
        http_response_code(404);
        exit(json_encode(['status' => 'error', 'success' => false, 'message' => 'Place record not found.']));
    }

    // 3. NFR-SEC-02: Delete Record Using PDO Prepared Statement
    $deleteStmt = $pdo->prepare("DELETE FROM places WHERE id = :id");
    $deleteStmt->execute([':id' => $placeId]);

    // 4. Remove Associated Image File from Server Storage if local upload
    if (!empty($place['image_url']) && str_starts_with($place['image_url'], 'uploads/')) {
        $filePath = __DIR__ . '/../' . $place['image_url'];
        if (file_exists($filePath) && is_file($filePath)) {
            unlink($filePath);
        }
    }

    http_response_code(200);
    echo json_encode([
        'status'   => 'success',
        'success'  => true,
        'message'  => 'Place record deleted successfully.',
        'place_id' => $placeId
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'success' => false, 'message' => 'Failed to delete place record.']);
}
