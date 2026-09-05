<?php
/**
 * FLIX Vision — Main API endpoint
 * Upload to: devsapps.org/flix/api.php
 *
 * All requests come here. Action is determined by POST/GET body field "action"
 * or by the ?action= query param.
 *
 * Auth endpoints  (no admin required):
 *   check-username, login, setup-pin, change-pin, logout, me, request-reset
 *
 * Activity endpoint (session required):
 *   log-activity
 *
 * Admin endpoints (Authorization: Bearer <secret> required):
 *   admin-stats, admin-users, admin-add-user, admin-delete-user,
 *   admin-set-pin, admin-sessions, admin-revoke-session,
 *   admin-requests, admin-delete-request, admin-activity
 */

declare(strict_types=1);
error_reporting(0);            // never leak PHP errors to client
ini_set('display_errors', '0');

require_once __DIR__ . '/db.php';

// ── CORS ──────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
} else {
    // Still send a header so the browser gets a clear rejection
    header('Access-Control-Allow-Origin: null');
}
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Token');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// ── Helpers ───────────────────────────────────────────────────────────────────
function respond(int $code, array $data): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function ok(array $extra = []): never {
    respond(200, array_merge(['ok' => true], $extra));
}
function err(int $code, string $msg): never {
    respond($code, ['error' => $msg]);
}

function body(): array {
    static $parsed = null;
    if ($parsed !== null) return $parsed;
    $raw = file_get_contents('php://input');
    $parsed = json_decode($raw ?: '{}', true) ?? [];
    return $parsed;
}

function param(string $key, string $default = ''): string {
    $b = body();
    if (isset($b[$key])) return trim((string)$b[$key]);
    if (isset($_REQUEST[$key])) return trim((string)$_REQUEST[$key]);
    return $default;
}

function getIP(): string {
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    return trim(explode(',', $ip)[0]);
}

function randomToken(): string {
    return bin2hex(random_bytes(32));
}

function nowET(): string {
    $dt = new DateTime('now', new DateTimeZone('America/New_York'));
    return $dt->format('Y-m-d H:i:s');
}

function requireAdmin(): void {
    // Admin password is verified against the bcrypt hash stored in the settings table.
    // The Authorization header carries the plain password — it never touches the DB
    // or any log as plaintext. Only the hash lives in the DB.
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($auth, 'Bearer ')) err(403, 'Forbidden');
    $password = substr($auth, 7);
    if (!verifyAdminPassword($password)) err(403, 'Forbidden');
}

function getSessionUser(): ?array {
    // Accept session token from cookie OR X-Session-Token header (for cross-origin contexts
    // where third-party cookies are blocked by the browser)
    $token = $_COOKIE[COOKIE_NAME] ?? '';
    if (!$token) {
        $token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
    }
    if (!$token || strlen($token) !== 64) return null;
    $db = getDB();
    $st = $db->prepare('
        SELECT s.id as session_id, s.user_id, u.username, u.pin_hash
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.id = ?
          AND s.last_seen >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ');
    $st->execute([$token]);
    $row = $st->fetch();
    if (!$row) {
        // Delete the token if it exists but is expired
        $db->prepare('DELETE FROM sessions WHERE id = ? AND last_seen < DATE_SUB(NOW(), INTERVAL 30 DAY)')
           ->execute([$token]);
        return null;
    }
    // Update last_seen
    $db->prepare('UPDATE sessions SET last_seen = NOW() WHERE id = ?')->execute([$token]);
    return $row;
}

function requireSession(): array {
    $user = getSessionUser();
    if (!$user) err(401, 'Not authenticated');
    return $user;
}

function setCookieHeader(string $token): void {
    // SameSite=None + Secure required for cross-origin cookies
    $expires = time() + COOKIE_MAXAGE;
    $cookie  = COOKIE_NAME . '=' . $token
        . '; Path=/'
        . '; Expires=' . gmdate('D, d M Y H:i:s T', $expires)
        . '; HttpOnly'
        . '; SameSite=None'
        . '; Secure';
    header('Set-Cookie: ' . $cookie, false);
}

function clearCookieHeader(): void {
    $cookie = COOKIE_NAME . '=deleted'
        . '; Path=/'
        . '; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        . '; HttpOnly'
        . '; SameSite=None'
        . '; Secure';
    header('Set-Cookie: ' . $cookie, false);
}

// ── Initialise tables on every request (cheap — uses CREATE TABLE IF NOT EXISTS) ─
try {
    initTables();
} catch (Throwable $e) {
    err(503, 'Database unavailable');
}

$db     = getDB();
$action = param('action') ?: ($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'];

// ══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── GET me ────────────────────────────────────────────────────────────────────
if ($action === 'me' && $method === 'GET') {
    $user = getSessionUser();
    if (!$user) err(401, 'Not authenticated');
    $st = $db->prepare('SELECT direct_access FROM users WHERE id = ?');
    $st->execute([$user['user_id']]);
    $extra = $st->fetch();
    ok([
        'id'            => (int)$user['user_id'],
        'username'      => $user['username'],
        'hasPin'        => !empty($user['pin_hash']),
        'directAccess'  => (bool)($extra['direct_access'] ?? 0),
    ]);
}

// ── check-username ────────────────────────────────────────────────────────────
if ($action === 'check-username' && $method === 'POST') {
    $username = param('username');
    if (!$username) err(400, 'Username required');
    $st = $db->prepare('SELECT id, pin_hash FROM users WHERE LOWER(username) = LOWER(?)');
    $st->execute([$username]);
    $user = $st->fetch();
    if (!$user) respond(200, ['exists' => false]);
    respond(200, ['exists' => true, 'hasPin' => !empty($user['pin_hash'])]);
}

// ── setup-pin (first login — creates PIN and session) ─────────────────────────
if ($action === 'setup-pin' && $method === 'POST') {
    $username = param('username');
    $pin      = param('pin');
    if (!$username || !$pin) err(400, 'Username and PIN required');
    if (!preg_match('/^\d{4}$/', $pin)) err(400, 'PIN must be exactly 4 digits');

    $st = $db->prepare('SELECT id, pin_hash FROM users WHERE LOWER(username) = LOWER(?)');
    $st->execute([$username]);
    $user = $st->fetch();
    if (!$user)         err(404, 'User not found');
    if ($user['pin_hash']) err(400, 'PIN already set');

    $hash = password_hash($pin, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $db->prepare('UPDATE users SET pin_hash = ? WHERE id = ?')->execute([$hash, $user['id']]);

    // Purge expired sessions (older than 30 days) before creating new one
    $db->prepare('DELETE FROM sessions WHERE user_id = ? AND last_seen < DATE_SUB(NOW(), INTERVAL 30 DAY)')
       ->execute([$user['id']]);

    $token = randomToken();
    $db->prepare('INSERT INTO sessions (id, user_id, ip, user_agent) VALUES (?, ?, ?, ?)')
       ->execute([$token, $user['id'], getIP(), $_SERVER['HTTP_USER_AGENT'] ?? '']);
    setCookieHeader($token);
    ok(['username' => $username, 'token' => $token]);
}

// ── login ─────────────────────────────────────────────────────────────────────
if ($action === 'login' && $method === 'POST') {
    $username = param('username');
    $pin      = param('pin');
    if (!$username || !$pin) err(400, 'Username and PIN required');

    $st = $db->prepare('SELECT id, username, pin_hash FROM users WHERE LOWER(username) = LOWER(?)');
    $st->execute([$username]);
    $user = $st->fetch();
    if (!$user || !$user['pin_hash'])              err(401, 'Invalid credentials');
    if (!password_verify($pin, $user['pin_hash']))  err(401, 'Incorrect PIN');

    // Purge expired sessions (older than 30 days) before creating new one
    $db->prepare('DELETE FROM sessions WHERE user_id = ? AND last_seen < DATE_SUB(NOW(), INTERVAL 30 DAY)')
       ->execute([$user['id']]);

    $token = randomToken();
    $db->prepare('INSERT INTO sessions (id, user_id, ip, user_agent) VALUES (?, ?, ?, ?)')
       ->execute([$token, $user['id'], getIP(), $_SERVER['HTTP_USER_AGENT'] ?? '']);
    setCookieHeader($token);
    ok(['username' => $user['username'], 'token' => $token]);
}

// ── logout ────────────────────────────────────────────────────────────────────
if ($action === 'logout' && $method === 'POST') {
    $token = $_COOKIE[COOKIE_NAME] ?? '';
    if ($token) $db->prepare('DELETE FROM sessions WHERE id = ?')->execute([$token]);
    clearCookieHeader();
    ok();
}

// ── change-pin ────────────────────────────────────────────────────────────────
if ($action === 'change-pin' && $method === 'POST') {
    $session    = requireSession();
    $currentPin = param('currentPin');
    $newPin     = param('newPin');
    if (!$currentPin || !$newPin) err(400, 'Current and new PIN required');
    if (!preg_match('/^\d{4}$/', $newPin)) err(400, 'New PIN must be exactly 4 digits');

    $st = $db->prepare('SELECT pin_hash FROM users WHERE id = ?');
    $st->execute([$session['user_id']]);
    $user = $st->fetch();
    if (!password_verify($currentPin, $user['pin_hash'])) err(401, 'Current PIN is incorrect');

    $hash = password_hash($newPin, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $db->prepare('UPDATE users SET pin_hash = ? WHERE id = ?')->execute([$hash, $session['user_id']]);
    ok();
}

// ── request-reset ─────────────────────────────────────────────────────────────
if ($action === 'request-reset' && $method === 'POST') {
    $username = param('username');
    $message  = param('message');
    if (!$username) err(400, 'Username required');

    $st = $db->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)');
    $st->execute([$username]);
    $user = $st->fetch();
    if (!$user) err(404, 'User not found');

    $db->prepare('INSERT INTO pin_reset_requests (user_id, message) VALUES (?, ?)')->execute([$user['id'], $message]);
    ok();
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY ENDPOINT
// ══════════════════════════════════════════════════════════════════════════════

if ($action === 'log-activity' && $method === 'POST') {
    $session = requireSession();
    $type    = param('type');
    $detail  = body()['detail'] ?? null;
    if (!$type) err(400, 'type required');
    $detailJson = $detail ? json_encode($detail) : null;
    $db->prepare('INSERT INTO activity (user_id, type, detail, ip) VALUES (?, ?, ?, ?)')
       ->execute([$session['user_id'], $type, $detailJson, getIP()]);
    ok();
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS — all require Authorization: Bearer <secret>
// ══════════════════════════════════════════════════════════════════════════════

// ── admin-stats ───────────────────────────────────────────────────────────────
if ($action === 'admin-stats') {
    requireAdmin();
    respond(200, [
        'totalUsers'      => (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn(),
        'activeSessions'  => (int)$db->query('SELECT COUNT(*) FROM sessions')->fetchColumn(),
        'pendingRequests' => (int)$db->query('SELECT COUNT(*) FROM pin_reset_requests WHERE is_read = 0')->fetchColumn(),
        'totalActivity'   => (int)$db->query('SELECT COUNT(*) FROM activity')->fetchColumn(),
    ]);
}

// ── admin-users ───────────────────────────────────────────────────────────────
if ($action === 'admin-users' && $method === 'GET') {
    requireAdmin();
    $rows = $db->query('
        SELECT u.id, u.username,
               (u.pin_hash IS NOT NULL) as hasPin,
               u.created_at,
               u.direct_access,
               (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) as activeSessions
        FROM users u
        ORDER BY u.created_at DESC
    ')->fetchAll();
    foreach ($rows as &$r) {
        $r['id']             = (int)$r['id'];
        $r['hasPin']         = (bool)$r['hasPin'];
        $r['activeSessions'] = (int)$r['activeSessions'];
        $r['direct_access']  = (bool)$r['direct_access'];
    }
    respond(200, $rows);
}

// ── admin-add-user ────────────────────────────────────────────────────────────
if ($action === 'admin-add-user' && $method === 'POST') {
    requireAdmin();
    $username = param('username');
    if (!$username) err(400, 'Username required');
    try {
        $db->prepare('INSERT INTO users (username) VALUES (?)')->execute([$username]);
        $id = (int)$db->lastInsertId();
        $st = $db->prepare('SELECT id, username, created_at FROM users WHERE id = ?');
        $st->execute([$id]);
        $user = $st->fetch();
        $user['id'] = (int)$user['id'];
        respond(201, $user);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) err(409, 'Username already exists');
        err(500, 'Database error');
    }
}

// ── admin-set-direct-access ───────────────────────────────────────────────────
if ($action === 'admin-set-direct-access' && $method === 'POST') {
    requireAdmin();
    $userId       = (int)param('userId');
    $directAccess = (int)(param('directAccess') === 'true' || param('directAccess') === '1');
    if (!$userId) err(400, 'userId required');
    $db->prepare('UPDATE users SET direct_access = ? WHERE id = ?')->execute([$directAccess, $userId]);
    ok(['directAccess' => (bool)$directAccess]);
}

// ── admin-delete-user ─────────────────────────────────────────────────────────
if ($action === 'admin-delete-user' && $method === 'POST') {
    requireAdmin();
    $userId = (int)param('userId');
    if (!$userId) err(400, 'userId required');
    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);
    ok();
}

// ── admin-set-pin ─────────────────────────────────────────────────────────────
if ($action === 'admin-set-pin' && $method === 'POST') {
    requireAdmin();
    $userId = (int)param('userId');
    $pin    = param('pin');
    if (!$userId) err(400, 'userId required');
    $pinToSet = (preg_match('/^\d{4}$/', $pin)) ? $pin : DEFAULT_PIN;
    $hash = password_hash($pinToSet, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $db->prepare('UPDATE users SET pin_hash = ? WHERE id = ?')->execute([$hash, $userId]);
    // Revoke all sessions
    $db->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$userId]);
    ok(['pin' => $pinToSet]);
}

// ── admin-sessions ────────────────────────────────────────────────────────────
if ($action === 'admin-sessions' && $method === 'GET') {
    requireAdmin();
    $rows = $db->query('
        SELECT s.id, s.user_id, u.username, s.ip, s.user_agent, s.created_at, s.last_seen
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        ORDER BY s.last_seen DESC
    ')->fetchAll();
    respond(200, $rows);
}

// ── admin-revoke-session ──────────────────────────────────────────────────────
if ($action === 'admin-revoke-session' && $method === 'POST') {
    requireAdmin();
    $sessionId = param('sessionId');
    if (!$sessionId) err(400, 'sessionId required');
    $db->prepare('DELETE FROM sessions WHERE id = ?')->execute([$sessionId]);
    ok();
}

// ── admin-requests ────────────────────────────────────────────────────────────
if ($action === 'admin-requests' && $method === 'GET') {
    requireAdmin();
    $rows = $db->query('
        SELECT r.id, r.user_id, u.username, r.message, r.requested_at, r.is_read
        FROM pin_reset_requests r
        JOIN users u ON u.id = r.user_id
        ORDER BY r.requested_at DESC
    ')->fetchAll();
    foreach ($rows as &$r) {
        $r['id']      = (int)$r['id'];
        $r['user_id'] = (int)$r['user_id'];
        $r['is_read'] = (bool)$r['is_read'];
    }
    // Mark all as read
    $db->exec('UPDATE pin_reset_requests SET is_read = 1');
    respond(200, $rows);
}

// ── admin-delete-request ──────────────────────────────────────────────────────
if ($action === 'admin-delete-request' && $method === 'POST') {
    requireAdmin();
    $id = (int)param('id');
    if (!$id) err(400, 'id required');
    $db->prepare('DELETE FROM pin_reset_requests WHERE id = ?')->execute([$id]);
    ok();
}

// ── admin-activity ────────────────────────────────────────────────────────────
if ($action === 'admin-activity' && $method === 'GET') {
    requireAdmin();
    $userId = (int)($_GET['userId'] ?? 0);
    if (!$userId) err(400, 'userId required');
    $st = $db->prepare('
        SELECT id, user_id, type, detail, ip, timestamp
        FROM activity
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT 500
    ');
    $st->execute([$userId]);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) { $r['id'] = (int)$r['id']; $r['user_id'] = (int)$r['user_id']; }
    respond(200, $rows);
}

// ── admin-unread-count ────────────────────────────────────────────────────────
if ($action === 'admin-unread-count' && $method === 'GET') {
    requireAdmin();
    $count = (int)$db->query('SELECT COUNT(*) FROM pin_reset_requests WHERE is_read = 0')->fetchColumn();
    respond(200, ['count' => $count]);
}

// ── admin-change-password ─────────────────────────────────────────────────────
if ($action === 'admin-change-password' && $method === 'POST') {
    requireAdmin(); // must supply current password first
    $newPassword = param('newPassword');
    if (strlen($newPassword) < 4) err(400, 'New password must be at least 4 characters');
    $newHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
    $db->prepare("
        INSERT INTO settings (setting_key, setting_value)
        VALUES ('admin_password_hash', ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ")->execute([$newHash]);
    ok();
}

// ── Fallback ──────────────────────────────────────────────────────────────────
err(400, 'Unknown action: ' . htmlspecialchars($action));
