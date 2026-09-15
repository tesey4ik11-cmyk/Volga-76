<?php
/**
 * ВОЛГАСТРОЙ 76 — подключение к БД и общие функции.
 * Файл недоступен напрямую по HTTP (см. .htaccess).
 *
 * Совместим со старым config.php. Добавлено:
 *  - поддержка driver = 'sqlite' (для локальной отладки без MySQL);
 *  - vgs_limited() с более экономным запросом (использует индекс ip+created_at);
 *  - vgs_cache_* — файловый кэш, чтобы не дёргать БД на каждый показ отзывов.
 */

/* Защита в глубину: если .htaccess не сработал (nginx и т.п.) — не отдавать файл напрямую. */
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
    echo json_encode(array('ok' => false, 'err' => 'config missing — запустите install.php'));
    exit;
}
$VGS_CFG = require __DIR__ . '/config.php';

function vgs_cfg($k, $def = null)
{
    global $VGS_CFG;
    return isset($VGS_CFG[$k]) ? $VGS_CFG[$k] : $def;
}

function vgs_db()
{
    global $VGS_CFG;
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $opts = array(
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    );
    if (vgs_cfg('driver') === 'sqlite') {
        $pdo = new PDO('sqlite:' . vgs_cfg('db_path', __DIR__ . '/../data/vgs.sqlite'), null, null, $opts);
        $pdo->exec('PRAGMA journal_mode=WAL');
        return $pdo;
    }
    $dsn = 'mysql:host=' . $VGS_CFG['db_host']
         . ';port=' . (int)$VGS_CFG['db_port']
         . ';dbname=' . $VGS_CFG['db_name']
         . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $VGS_CFG['db_user'], $VGS_CFG['db_pass'], $opts);
    return $pdo;
}

/** true, если работаем на SQLite (различия в SQL) */
function vgs_is_sqlite()
{
    return vgs_cfg('driver') === 'sqlite';
}

function vgs_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
}

function vgs_json_in()
{
    $raw = file_get_contents('php://input');
    if ($raw) {
        $d = json_decode($raw, true);
        if (is_array($d)) {
            return $d;
        }
    }
    return $_POST;
}

function vgs_out($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function vgs_e($s)
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}

function vgs_clean($s, $max = 0)
{
    $s = (string)$s;
    // убираем управляющие символы, кроме переноса строки и таба
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
    $s = trim($s);
    if ($max > 0) {
        if (function_exists('mb_strlen') && mb_strlen($s, 'UTF-8') > $max) {
            $s = mb_substr($s, 0, $max, 'UTF-8');
        } elseif (!function_exists('mb_strlen') && strlen($s) > $max) {
            $s = substr($s, 0, $max);
        }
    }
    return $s;
}

function vgs_len($s)
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

/**
 * Антиспам: не более $max записей с одного IP за $minutes минут.
 * $table — только 'leads' или 'reviews'.
 */
function vgs_limited($table, $ip, $max = 5, $minutes = 60)
{
    $table = ($table === 'reviews') ? 'reviews' : 'leads';
    if ($ip === '') {
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
   Простейший файловый кэш. На минимальном тарифе это главное, что
   бережёт и БД, и CPU: отзывы читаются с диска, а не из MySQL.
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

/**
 * Приводит расчёт из калькулятора к компактному тексту.
 * Храним как текст в leads.calc — это дешевле, чем отдельная таблица.
 */
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
        /* строка-заголовок раздела приходит с пустым расчётом и нулевой суммой.
           mb_strtoupper есть не на каждом хостинге — поэтому с проверкой. */
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
