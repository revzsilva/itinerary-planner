<?php
/**
 * ============================================================================
 * LAVINIA EXPLORER - FETCH & FILTER POINTS OF INTEREST API
 * File: api/get_places.php
 * ============================================================================
 * Specifications Implemented:
 * - NFR-SEC-02 : Uses PDO Prepared Statements for all query filtering
 * - BSR-01     : Enforces strict <= 25.00 km radius filter from Mount Lavinia
 * - FR-CAT     : Supports optional query parameters:
 *                ?category=...&time_suitability=...&search=...
 * ============================================================================
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db_connect.php';

try {
    $category        = trim($_GET['category'] ?? '');
    $timeSuitability = trim($_GET['time_suitability'] ?? ($_GET['time'] ?? ''));
    $search          = trim($_GET['search'] ?? '');

    $sql = "SELECT
                id,
                title,
                category,
                time_suitability,
                description,
                opening_hours,
                travel_tips,
                distance_km,
                latitude,
                longitude,
                image_url,
                created_at,
                updated_at
            FROM places
            WHERE distance_km <= :max_radius";

    $params = [
        ':max_radius' => MAX_RADIUS_KM
    ];

    if ($category !== '' && strtolower($category) !== 'all') {
        $sql .= " AND category = :category";
        $params[':category'] = $category;
    }

    if ($timeSuitability !== '' && strtolower($timeSuitability) !== 'all') {
        $sql .= " AND time_suitability LIKE :time_suitability";
        $params[':time_suitability'] = '%' . $timeSuitability . '%';
    }

    if ($search !== '') {
        $sql .= " AND (title LIKE :search_title OR description LIKE :search_desc OR travel_tips LIKE :search_tips OR category LIKE :search_cat)";
        $likeQuery = '%' . $search . '%';
        $params[':search_title'] = $likeQuery;
        $params[':search_desc']  = $likeQuery;
        $params[':search_tips']  = $likeQuery;
        $params[':search_cat']   = $likeQuery;
    }

    $sql .= " ORDER BY distance_km ASC, title ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Format records with both exact DB column names and frontend-friendly aliases
    $places = array_map(static function (array $row): array {
        $timeArray = array_values(array_filter(array_map('trim', explode(',', (string)$row['time_suitability']))));
        return [
            'id'               => (int)$row['id'],
            'title'            => $row['title'],
            'category'         => $row['category'],
            'time_suitability' => $row['time_suitability'],
            'bestTime'         => $timeArray,
            'description'      => $row['description'],
            'opening_hours'    => $row['opening_hours'],
            'operatingHours'   => $row['opening_hours'],
            'travel_tips'      => $row['travel_tips'],
            'travelTips'       => $row['travel_tips'],
            'distance_km'      => (float)$row['distance_km'],
            'distanceFromHubKm'=> (float)$row['distance_km'],
            'latitude'         => (float)$row['latitude'],
            'lat'              => (float)$row['latitude'],
            'longitude'        => (float)$row['longitude'],
            'lng'              => (float)$row['longitude'],
            'image_url'        => $row['image_url'],
            'imageUrl'         => $row['image_url'],
            'created_at'       => $row['created_at'],
            'updated_at'       => $row['updated_at']
        ];
    }, $rows);

    echo json_encode([
        'status'  => 'success',
        'success' => true,
        'count'   => count($places),
        'places'  => $places
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'Failed to retrieve points of interest.'
    ]);
}
