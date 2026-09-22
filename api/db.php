<?php
/**
 * ВОЛГАСТРОЙ 76 — подключение к БД и общие функции.
 * Файл недоступен напрямую по HTTP.
 *
 * КРИТИЧЕСКОЕ ПРАВИЛО:
 * Для production используется строго база данных MySQL.
 * Никакого молчаливого переключения на SQLite при сбое MySQL!
 */

if (!defined('VGS_APP')) {
    if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
        http_response_code(404);
        exit;
    }
    define('VGS_APP', 1);
}

if (!file_exists(__DIR__ . '/config.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok' => false, 'err' => 'config.php отсутствует. Запустите api/install.php'));
    exit;
}
$VGS_CFG = require __DIR__ . '/config.php';

function vgs_cfg($k = null, $def = null)
{
    global $VGS_CFG;
    if ($k === null) {
        return is_array($VGS_CFG) ? $VGS_CFG : array();
    }
    return isset($VGS_CFG[$k]) ? $VGS_CFG[$k] : $def;
}

$VGS_USING_SQLITE = false;

function vgs_is_sqlite()
{
    global $VGS_USING_SQLITE;
    return $VGS_USING_SQLITE || (vgs_cfg('driver') === 'sqlite');
}

/**
 * Подключение к базе данных.
 * Строго MySQL для production!
 */
function vgs_db()
{
    global $VGS_CFG, $VGS_USING_SQLITE;
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $opts = array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    );

    $isDev = (vgs_cfg('env') === 'development');
    $explicitSqlite = (vgs_cfg('driver') === 'sqlite');

    // Локальная разработка со SQLite разрешена ТОЛЬКО если явно задан driver = 'sqlite'
    if ($explicitSqlite) {
        $VGS_USING_SQLITE = true;
        $dbPath = vgs_cfg('db_path', __DIR__ . '/../data/vgs.sqlite');
        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $pdo = new PDO('sqlite:' . $dbPath, null, null, $opts);
        $pdo->exec('PRAGMA journal_mode=WAL');
        vgs_ensure_base_schema($pdo, true);
        return $pdo;
    }

    // PRODUCTION: Строгое подключение к MySQL
    try {
        $host = $VGS_CFG['db_host'] ?? 'localhost';
        $port = (int)($VGS_CFG['db_port'] ?? 3306);
        $name = $VGS_CFG['db_name'] ?? '';
        $user = $VGS_CFG['db_user'] ?? '';
        $pass = $VGS_CFG['db_pass'] ?? '';

        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, $opts);
        $VGS_USING_SQLITE = false;

        // Проверяем и накатываем миграции колонок в MySQL
        vgs_ensure_base_schema($pdo, false);
        return $pdo;
    } catch (Exception $e) {
        // Ошибка подключения к MySQL
        $errMessage = 'VGS MySQL Error: ' . $e->getMessage();
        error_log($errMessage);

        // Никакого автоматического перехода на SQLite в production!
        // Проверяем тип запроса: API или веб-страница
        $isApi = false;
        $uri = $_SERVER['REQUEST_URI'] ?? '';
        $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
        if (strpos($uri, '/api/') !== false || strpos($accept, 'application/json') !== false) {
            $isApi = true;
        }

        if ($isApi) {
            http_response_code(503);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(array(
                'ok'      => false,
                'error'   => 'MYSQL_CONNECTION_FAILED',
                'err'     => 'Не удалось подключиться к базе данных MySQL. Проверьте настройки в api/config.php.',
                'detail'  => $e->getMessage()
            ), JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Если это веб-страница (admin.php) или CLI, пробрасываем исключение
        throw new RuntimeException('Ошибка подключения к MySQL: ' . $e->getMessage());
    }
}

/**
 * Проверка структуры таблиц и безопасная миграция отсутствующих колонок
 */
function vgs_ensure_base_schema($pdo, $isSq)
{
    static $initialized = false;
    if ($initialized) return;
    $initialized = true;

    $ai = $isSq ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY';
    $txt = $isSq ? 'TEXT' : 'VARCHAR(255)';
    $num = $isSq ? 'REAL NOT NULL DEFAULT 0' : 'DECIMAL(12,2) NOT NULL DEFAULT 0.00';
    $dt = $isSq ? "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" : "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP";

    // 1. Таблица заявок (leads)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS leads (
            id $ai,
            name $txt NOT NULL,
            phone $txt NOT NULL,
            topic $txt NOT NULL DEFAULT '',
            message TEXT NOT NULL,
            calc TEXT NULL,
            ip $txt NOT NULL DEFAULT '',
            status $txt NOT NULL DEFAULT 'new',
            created_at $dt
        )");
    } catch (Exception $e) {
        error_log('Ошибка создания leads: ' . $e->getMessage());
    }

    // 2. Таблица отзывов (reviews)
    try {
        $approvedCol = $isSq ? "approved INTEGER NOT NULL DEFAULT 0" : "approved TINYINT NOT NULL DEFAULT 0";
        $pdo->exec("CREATE TABLE IF NOT EXISTS reviews (
            id $ai,
            name $txt NOT NULL,
            place $txt NOT NULL DEFAULT '',
            service $txt NOT NULL DEFAULT '',
            rating INTEGER NOT NULL DEFAULT 5,
            text TEXT NOT NULL,
            ip $txt NOT NULL DEFAULT '',
            $approvedCol,
            status $txt NOT NULL DEFAULT 'pending',
            created_at $dt
        )");
    } catch (Exception $e) {
        error_log('Ошибка создания reviews: ' . $e->getMessage());
    }

    // 3. Таблица администраторов (admins)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS admins (
            id $ai,
            username $txt NOT NULL DEFAULT '',
            login $txt NOT NULL DEFAULT '',
            password_hash $txt NOT NULL DEFAULT '',
            pass_hash $txt NOT NULL DEFAULT '',
            role $txt NOT NULL DEFAULT 'admin',
            last_login " . ($isSq ? "TEXT NULL" : "DATETIME NULL") . "
        )");
    } catch (Exception $e) {
        error_log('Ошибка создания admins: ' . $e->getMessage());
    }

    // 4. Таблица истории действий и отмены (admin_action_history)
    try {
        $undoneCol = $isSq ? "undone_at TEXT NULL" : "undone_at DATETIME NULL";
        $pdo->exec("CREATE TABLE IF NOT EXISTS admin_action_history (
            id $ai,
            admin_id INTEGER NOT NULL DEFAULT 1,
            admin_name $txt NOT NULL DEFAULT 'admin',
            action_type $txt NOT NULL,
            entity_type $txt NOT NULL,
            entity_id INTEGER NOT NULL DEFAULT 0,
            entity_name $txt NOT NULL DEFAULT '',
            before_data_json LONGTEXT NULL,
            after_data_json LONGTEXT NULL,
            created_at $dt,
            $undoneCol
        )");
    } catch (Exception $e) {
        error_log('Ошибка создания admin_action_history: ' . $e->getMessage());
    }

    // 5. Таблица смет и КП (estimates)
    try {
        $updatedAtCol = $isSq ? "updated_at TEXT NULL" : "updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
        $pdo->exec("CREATE TABLE IF NOT EXISTS estimates (
            id $ai,
            number $txt NOT NULL,
            template_code $txt NOT NULL DEFAULT 'custom',
            status $txt NOT NULL DEFAULT 'draft',
            customer_name $txt NOT NULL DEFAULT '',
            customer_phone $txt NOT NULL DEFAULT '',
            customer_email $txt NOT NULL DEFAULT '',
            object_name $txt NOT NULL DEFAULT '',
            object_address $txt NOT NULL DEFAULT '',
            area $num,
            lead_time $txt NOT NULL DEFAULT '15-25 рабочих дней',
            valid_until $txt NOT NULL DEFAULT '',
            engineer_name $txt NOT NULL DEFAULT 'Звонарёв А.Б.',
            comment TEXT,
            options_json LONGTEXT,
            data_json LONGTEXT,
            work_cost_price $num,
            work_total $num,
            material_cost_price $num,
            material_total $num,
            delivery_total $num,
            grand_total $num,
            expected_margin $num,
            created_at $dt,
            $updatedAtCol
        )");
    } catch (Exception $e) {
        error_log('Ошибка создания estimates: ' . $e->getMessage());
    }

    // 6. Миграция колонок (Safe ALTER TABLE)
    try {
        vgs_migrate_missing_columns($pdo, $isSq);
    } catch (Exception $e) {
        error_log('Ошибка миграции колонок: ' . $e->getMessage());
    }

    // Индексы
    if (!$isSq) {
        try { $pdo->exec("ALTER TABLE leads ADD INDEX ix_leads_status (status)"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE leads ADD INDEX ix_leads_created (created_at)"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE reviews ADD INDEX ix_reviews_status (status)"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE estimates ADD INDEX ix_estimates_number (number)"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE estimates ADD INDEX ix_estimates_status (status)"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE admin_action_history ADD INDEX ix_history_entity (entity_type, entity_id)"); } catch (Exception $e) {}
    }
}

/**
 * Проверка существующих колонок и накат недостающих
 */
function vgs_migrate_missing_columns($pdo, $isSq)
{
    if ($isSq) {
        // SQLite: проверяем колонки через PRAGMA table_info
        $leadCols = array();
        $q = $pdo->query("PRAGMA table_info(leads)");
        while ($r = $q->fetch()) {
            $leadCols[] = $r['name'];
        }
        if (!in_array('calc', $leadCols, true)) {
            $pdo->exec("ALTER TABLE leads ADD COLUMN calc TEXT NULL");
        }
        if (!in_array('topic', $leadCols, true)) {
            $pdo->exec("ALTER TABLE leads ADD COLUMN topic TEXT NOT NULL DEFAULT ''");
        }

        $revCols = array();
        $q = $pdo->query("PRAGMA table_info(reviews)");
        while ($r = $q->fetch()) {
            $revCols[] = $r['name'];
        }
        if (!in_array('place', $revCols, true)) {
            $pdo->exec("ALTER TABLE reviews ADD COLUMN place TEXT NOT NULL DEFAULT ''");
        }
        if (!in_array('approved', $revCols, true)) {
            $pdo->exec("ALTER TABLE reviews ADD COLUMN approved INTEGER NOT NULL DEFAULT 0");
        }
        if (!in_array('ip', $revCols, true)) {
            $pdo->exec("ALTER TABLE reviews ADD COLUMN ip TEXT NOT NULL DEFAULT ''");
        }

        $adminCols = array();
        $q = $pdo->query("PRAGMA table_info(admins)");
        while ($r = $q->fetch()) {
            $adminCols[] = $r['name'];
        }
        if (!in_array('username', $adminCols, true)) {
            $pdo->exec("ALTER TABLE admins ADD COLUMN username TEXT NOT NULL DEFAULT ''");
        }
        if (!in_array('password_hash', $adminCols, true)) {
            $pdo->exec("ALTER TABLE admins ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''");
        }
        return;
    }

    // MySQL: проверяем SHOW COLUMNS
    try {
        // Проверяем таблицу leads
        $leadCols = array();
        $q = $pdo->query("SHOW COLUMNS FROM leads");
        while ($r = $q->fetch()) {
            $leadCols[] = $r['Field'];
        }
        if (!in_array('calc', $leadCols, true)) {
            $pdo->exec("ALTER TABLE leads ADD COLUMN calc TEXT NULL AFTER message");
        }
        if (!in_array('topic', $leadCols, true)) {
            $pdo->exec("ALTER TABLE leads ADD COLUMN topic VARCHAR(255) NOT NULL DEFAULT '' AFTER phone");
        }

        // Проверяем таблицу estimates
        $estCols = array();
        $q = $pdo->query("SHOW COLUMNS FROM estimates");
        while ($r = $q->fetch()) {
            $estCols[] = $r['Field'];
        }
        $expectedEstCols = array(
            'customer_name'       => "VARCHAR(255) NOT NULL DEFAULT ''",
            'customer_phone'      => "VARCHAR(255) NOT NULL DEFAULT ''",
            'customer_email'      => "VARCHAR(255) NOT NULL DEFAULT ''",
            'object_name'         => "VARCHAR(255) NOT NULL DEFAULT ''",
            'object_address'      => "VARCHAR(255) NOT NULL DEFAULT ''",
            'area'                => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'lead_time'           => "VARCHAR(255) NOT NULL DEFAULT '15-25 рабочих дней'",
            'valid_until'         => "VARCHAR(255) NOT NULL DEFAULT ''",
            'engineer_name'       => "VARCHAR(255) NOT NULL DEFAULT 'Звонарёв А.Б.'",
            'comment'             => "TEXT NULL",
            'options_json'        => "LONGTEXT NULL",
            'data_json'           => "LONGTEXT NULL",
            'work_cost_price'     => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'work_total'          => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'material_cost_price' => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'material_total'      => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'delivery_total'      => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'grand_total'         => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'expected_margin'     => "DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'updated_at'          => "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        );
        foreach ($expectedEstCols as $colName => $colDef) {
            if (!in_array($colName, $estCols, true)) {
                $pdo->exec("ALTER TABLE estimates ADD COLUMN {$colName} {$colDef}");
            }
        }

        // Проверяем таблицу admin_action_history
        $histCols = array();
        $q = $pdo->query("SHOW COLUMNS FROM admin_action_history");
        while ($r = $q->fetch()) {
            $histCols[] = $r['Field'];
        }
        if (!in_array('undone_at', $histCols, true)) {
            $pdo->exec("ALTER TABLE admin_action_history ADD COLUMN undone_at DATETIME NULL AFTER created_at");
        }

        // Проверяем таблицу reviews
        $revCols = array();
        $q = $pdo->query("SHOW COLUMNS FROM reviews");
        while ($r = $q->fetch()) {
            $revCols[] = $r['Field'];
        }
        if (!in_array('place', $revCols, true)) {
            $pdo->exec("ALTER TABLE reviews ADD COLUMN place VARCHAR(100) NOT NULL DEFAULT '' AFTER name");
        }
        if (!in_array('approved', $revCols, true)) {
            $pdo->exec("ALTER TABLE reviews ADD COLUMN approved TINYINT NOT NULL DEFAULT 0 AFTER text");
            $pdo->exec("UPDATE reviews SET approved = 1 WHERE status = 'approved'");
        }
        if (!in_array('ip', $revCols, true)) {
            $pdo->exec("ALTER TABLE reviews ADD COLUMN ip VARCHAR(45) NOT NULL DEFAULT '' AFTER text");
        }

        // Проверяем таблицу admins
        $adminCols = array();
        $q = $pdo->query("SHOW COLUMNS FROM admins");
        while ($r = $q->fetch()) {
            $adminCols[] = $r['Field'];
        }
        if (!in_array('username', $adminCols, true)) {
            $pdo->exec("ALTER TABLE admins ADD COLUMN username VARCHAR(255) NOT NULL DEFAULT '' AFTER id");
            if (in_array('login', $adminCols, true)) {
                $pdo->exec("UPDATE admins SET username = login WHERE username = ''");
            }
        }
        if (!in_array('password_hash', $adminCols, true)) {
            $pdo->exec("ALTER TABLE admins ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER username");
            if (in_array('pass_hash', $adminCols, true)) {
                $pdo->exec("UPDATE admins SET password_hash = pass_hash WHERE password_hash = ''");
            }
        }
    } catch (Exception $e) {
        error_log('Ошибка vgs_migrate_missing_columns: ' . $e->getMessage());
    }
}

/**
 * Логирование действий администратора в MySQL для аудита и функции UNDO
 */
function vgs_log_admin_action($pdo, $actionType, $entityType, $entityId, $entityName, $beforeData, $afterData, $adminName = 'admin', $adminId = 1)
{
    try {
        $beforeJson = $beforeData !== null ? json_encode($beforeData, JSON_UNESCAPED_UNICODE) : null;
        $afterJson = $afterData !== null ? json_encode($afterData, JSON_UNESCAPED_UNICODE) : null;

        $st = $pdo->prepare("INSERT INTO admin_action_history 
            (admin_id, admin_name, action_type, entity_type, entity_id, entity_name, before_data_json, after_data_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)");
        $st->execute(array(
            $adminId,
            $adminName,
            $actionType,
            $entityType,
            $entityId,
            $entityName,
            $beforeJson,
            $afterJson
        ));
        return (int)$pdo->lastInsertId();
    } catch (Exception $e) {
        error_log('Ошибка логирования действия администратора: ' . $e->getMessage());
        return 0;
    }
}

function vgs_ip()
{
    foreach (array('HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR') as $h) {
        if (!empty($_SERVER[$h])) {
            $ip = trim(explode(',', $_SERVER[$h])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

function vgs_json_in()
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return null;
    }
    $d = json_decode($raw, true);
    return is_array($d) ? $d : null;
}

function vgs_out($ok, $data = array(), $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    $res = array_merge(array('ok' => (bool)$ok), $data);
    echo json_encode($res, JSON_UNESCAPED_UNICODE);
    exit;
}

function vgs_clean($s, $max = 255)
{
    $s = (string)$s;
    $s = trim($s);
    $s = strip_tags($s);
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max, 'UTF-8');
    }
    return substr($s, 0, $max);
}

function vgs_limited($table, $ip, $max = 5, $minutes = 10)
{
    if ($max <= 0) {
        return false;
    }
    try {
        $pdo = vgs_db();
        if (vgs_is_sqlite()) {
            $sql = 'SELECT COUNT(*) FROM ' . $table
                 . " WHERE ip = ? AND created_at >= datetime('now', '-" . (int)$minutes . " minutes')";
        } else {
            $sql = 'SELECT COUNT(*) FROM ' . $table
                 . ' WHERE ip = ? AND created_at >= (NOW() - INTERVAL ' . (int)$minutes . ' MINUTE)';
        }
        $st = $pdo->prepare($sql);
        $st->execute(array($ip));
        return ((int)$st->fetchColumn()) >= $max;
    } catch (Exception $e) {
        return false;
    }
}

/* ------------------------------------------------------------------
   Файловый кэш
-------------------------------------------------------------------*/
function vgs_cache_dir()
{
    $d = vgs_cfg('cache_dir', __DIR__ . '/../data/cache');
    if (!is_dir($d)) {
        @mkdir($d, 0775, true);
    }
    return $d;
}

function vgs_cache_get($key, $ttl = 300)
{
    $f = vgs_cache_dir() . '/' . preg_replace('/[^a-z0-9_\-]/i', '', $key) . '.json';
    if (!is_file($f)) {
        return null;
    }
    if ((time() - filemtime($f)) > $ttl) {
        return null;
    }
    $raw = @file_get_contents($f);
    if ($raw === false) {
        return null;
    }
    $d = json_decode($raw, true);
    return is_array($d) ? $d : null;
}

function vgs_cache_put($key, $data)
{
    $f = vgs_cache_dir() . '/' . preg_replace('/[^a-z0-9_\-]/i', '', $key) . '.json';
    @file_put_contents($f, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function vgs_cache_drop($key)
{
    $f = vgs_cache_dir() . '/' . preg_replace('/[^a-z0-9_\-]/i', '', $key) . '.json';
    @unlink($f);
}

function vgs_calc_text($calc)
{
    if (!is_array($calc) || empty($calc['rows'])) {
        return '';
    }
    $t = 'РАСЧЁТ: ' . vgs_clean(isset($calc['title']) ? $calc['title'] : '', 80);
    if (!empty($calc['per'])) {
        $t .= ' (' . vgs_clean($calc['per'], 120) . ')';
    }
    $t .= "\n";
    $n = 0;
    foreach ($calc['rows'] as $r) {
        if (!is_array($r) || count($r) < 3) { continue; }
        if (++$n > 40) { break; }
        if (isset($r[3]) && $r[3] === 'h') {
            $head = vgs_clean($r[0], 60);
            if (function_exists('mb_strtoupper')) {
                $head = mb_strtoupper($head, 'UTF-8');
            }
            $t .= "\n-- " . $head . " --\n";
            continue;
        }
        $t .= '• ' . vgs_clean($r[0], 90) . ' — ' . vgs_clean($r[1], 60)
            . ' — ' . number_format((float)$r[2], 0, ',', ' ') . " ₽\n";
    }
    if (isset($calc['sum'])) {
        $t .= 'ИТОГО ≈ ' . number_format((float)$calc['sum'], 0, ',', ' ') . ' ₽';
    }
    return vgs_clean($t, 4000);
}
