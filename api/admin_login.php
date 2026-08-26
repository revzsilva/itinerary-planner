<?php
/**
 * ============================================================================
 * LAVINIA EXPLORER - ADMIN AUTHENTICATION & SESSION MANAGEMENT API
 * File: api/admin_login.php
 * ============================================================================
 * Specifications Implemented:
 * - FR-ADM     : Secure administrator login, session check, and logout
 * - NFR-SEC-02 : PDO Prepared Statements to prevent SQL injection
 * - NFR-SEC-03 : 30-Minute (1800 seconds) Session Inactivity Timeout
 * ============================================================================
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db_connect.php';

$action = trim($_GET['action'] ?? ($_POST['action'] ?? ''));

// 1. Handle Logout Request
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }
    session_destroy();
    echo json_encode([
        'status'  => 'success',
        'success' => true,
        'message' => 'Logged out successfully.'
    ]);
    exit;
}

// 2. Handle Session Status Check (GET or action=status)
if ($_SERVER['REQUEST_METHOD'] === 'GET' || $action === 'status') {
    $isActive = checkAdminSession();
    $remainingSeconds = $isActive
        ? max(0, SESSION_TIMEOUT_SECONDS - (time() - (int)($_SESSION['last_activity'] ?? time())))
        : 0;

    echo json_encode([
        'status'            => 'success',
        'success'           => true,
        'authenticated'     => $isActive,
        'username'          => $isActive ? ($_SESSION['admin_user'] ?? 'admin') : null,
        'timeout_seconds'   => SESSION_TIMEOUT_SECONDS,
        'remaining_seconds' => $remainingSeconds
    ]);
    exit;
}

// 3. Handle Login Submission (POST)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'Method Not Allowed. Use POST.'
    ]);
    exit;
}

// Support both JSON payload and standard FormData / x-www-form-urlencoded POST
$rawInput = file_get_contents('php://input');
$jsonData = $rawInput ? json_decode($rawInput, true) : null;
$input    = is_array($jsonData) ? $jsonData : $_POST;

$username = trim((string)($input['username'] ?? ''));
$password = (string)($input['password'] ?? '');

if ($username === '' || $password === '') {
    http_response_code(400);
    echo json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'Username and password are required.'
    ]);
    exit;
}

try {
    // NFR-SEC-02: Fetch admin record via PDO Prepared Statement
    $stmt = $pdo->prepare("SELECT id, username, password_hash FROM admins WHERE username = :username LIMIT 1");
    $stmt->execute([':username' => $username]);
    $admin = $stmt->fetch();

    if ($admin && password_verify($password, $admin['password_hash'])) {
        // Prevent session fixation attacks
        session_regenerate_id(true);

        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_id']        = (int)$admin['id'];
        $_SESSION['admin_user']      = $admin['username'];
        $_SESSION['last_activity']   = time(); // Starts 30-minute inactivity window

        echo json_encode([
            'status'          => 'success',
            'success'         => true,
            'message'         => 'Authentication successful. Welcome to the Lavinia Explorer Admin Portal.',
            'username'        => $admin['username'],
            'timeout_seconds' => SESSION_TIMEOUT_SECONDS
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'status'  => 'error',
            'success' => false,
            'message' => 'Invalid administrator username or password.'
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'success' => false,
        'message' => 'Authentication query failed.'
    ]);
}
