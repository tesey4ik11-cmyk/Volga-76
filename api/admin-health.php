<?php
/**
 * ВОЛГАСТРОЙ 76 — Диагностический endpoint здоровья БД и сервисов
 * Доступен только авторизованным администраторам через сессию.
 */

if (!defined('VGS_APP')) {
    define('VGS_APP', 1);
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/estimates_db.php';

session_start();

header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['vgs_admin'])) {
    http_response_code(401);
    echo json_encode(array('ok' => false, 'error' => 'AUTH_REQUIRED', 'err' => 'Требуется авторизация в админ-панели'), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = vgs_db();
    vgs_init_estimate_tables();

    $isSq = vgs_is_sqlite();
    $driver = $isSq ? 'sqlite' : 'mysql';

    $cfg = require __DIR__ . '/config.php';
    $dbNameRaw = $cfg['db_name'] ?? 'db';
    $dbMasked = substr($dbNameRaw, 0, 3) . '***' . substr($dbNameRaw, -2);

    $tablesToCheck = array(
        'estimates',
        'reviews',
        'leads',
        'works',
        'materials',
        'estimate_templates',
        'admin_action_history'
    );

    $tablesStatus = array();
    foreach ($tablesToCheck as $tbl) {
        try {
            $pdo->query("SELECT 1 FROM " . $tbl . " LIMIT 1");
            $tablesStatus[$tbl] = true;
        } catch (Exception $e) {
            $tablesStatus[$tbl] = false;
        }
    }

    echo json_encode(array(
        'ok'            => true,
        'php'           => true,
        'database'      => true,
        'mysql'         => !$isSq,
        'driver'        => $driver,
        'database_name' => $dbMasked,
        'tables'        => $tablesStatus,
        'active_admin'  => $_SESSION['vgs_name'] ?? 'admin'
    ), JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        'ok'       => false,
        'error'    => 'DB_ERROR',
        'err'      => $e->getMessage(),
        'database' => false,
        'mysql'    => false,
    ), JSON_UNESCAPED_UNICODE);
}
