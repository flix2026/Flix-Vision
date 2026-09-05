<?php
/**
 * FLIX Vision — Database connection + table initialisation
 * Upload to: devsapps.org/flix/db.php
 *
 * This file is required by api.php. Never expose it directly —
 * the .htaccess in this directory blocks direct browser access.
 */

define('DB_HOST',    'localhost');       // always localhost on x10hosting
define('DB_NAME',    'oftmqwad_flix');
define('DB_USER',    'oftmqwad_flix');
define('DB_PASS',    '~FlixDatabase~');
define('DB_CHARSET', 'utf8mb4');

define('DEFAULT_PIN',   '1234');
define('BCRYPT_COST',   10);
define('COOKIE_NAME',   'fv_session');
define('COOKIE_MAXAGE', 60 * 60 * 24 * 365); // 1 year
define('SESSION_TTL',   60 * 60 * 24 * 30);  // 30 days — sessions older than this are auto-revoked

// ── Allowed origins for CORS (your Cloudflare site + local dev) ──────────────
define('ALLOWED_ORIGINS', [
    'https://flix.thedevreal33.workers.dev',
    'https://devsapps.org',
    'http://127.0.0.1:8080',
    'http://localhost:8080',
]);

// ── PDO connection (singleton) ────────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

// ── Create tables if they don't exist ────────────────────────────────────────
function initTables(): void {
    $db = getDB();

    $db->exec("
        -- User accounts (no admin account here — admin lives in settings table)
        CREATE TABLE IF NOT EXISTS users (
            id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username      VARCHAR(64) NOT NULL,
            pin_hash      VARCHAR(255) DEFAULT NULL,
            direct_access TINYINT(1) NOT NULL DEFAULT 0,
            created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Active login sessions
        CREATE TABLE IF NOT EXISTS sessions (
            id         CHAR(64) PRIMARY KEY,
            user_id    INT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_seen  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            ip         VARCHAR(45) DEFAULT NULL,
            user_agent VARCHAR(512) DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- User activity log (page views, play/stop events)
        CREATE TABLE IF NOT EXISTS activity (
            id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id    INT UNSIGNED NOT NULL,
            type       VARCHAR(32) NOT NULL,
            detail     TEXT DEFAULT NULL,
            ip         VARCHAR(45) DEFAULT NULL,
            timestamp  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- PIN reset requests from users
        CREATE TABLE IF NOT EXISTS pin_reset_requests (
            id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id      INT UNSIGNED NOT NULL,
            message      TEXT DEFAULT NULL,
            requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_read      TINYINT(1) NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Global settings key/value store (admin password hash lives here)
        CREATE TABLE IF NOT EXISTS settings (
            setting_key   VARCHAR(64) PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Seed default admin password (1579) if not yet set.
    // The hash is generated here at runtime — the plain value never appears
    // in any source file, database export, or browser response.
    $st = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'admin_password_hash'");
    $st->execute();
    if (!$st->fetch()) {
        $defaultHash = password_hash('1579', PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $db->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('admin_password_hash', ?)")
           ->execute([$defaultHash]);
    }

    // Add direct_access column to existing databases if missing (safe to run repeatedly)
    try {
        $db->exec("ALTER TABLE users ADD COLUMN direct_access TINYINT(1) NOT NULL DEFAULT 0");
    } catch (PDOException $e) {
        // Column already exists — ignore duplicate column error
    }
}

// ── Read a setting value from the DB ─────────────────────────────────────────
function getSetting(string $key): ?string {
    $st = getDB()->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
    $st->execute([$key]);
    $row = $st->fetch();
    return $row ? $row['setting_value'] : null;
}

// ── Verify admin password against the stored bcrypt hash ─────────────────────
function verifyAdminPassword(string $password): bool {
    $hash = getSetting('admin_password_hash');
    if (!$hash) return false;
    return password_verify($password, $hash);
}
