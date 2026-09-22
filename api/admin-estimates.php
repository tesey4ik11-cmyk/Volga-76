<?php
/**
 * ВОЛГАСТРОЙ 76 — API Смет и Коммерческих предложений (КП)
 * Доступно только авторизованным инженерам/администраторам.
 */

if (!defined('VGS_APP')) {
    define('VGS_APP', 1);
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/estimates_db.php';

session_start();

header('Content-Type: application/json; charset=utf-8');

// Проверка сессии администратора
if (empty($_SESSION['vgs_admin'])) {
    http_response_code(401);
    echo json_encode(array('ok' => false, 'error' => 'AUTH_REQUIRED', 'err' => 'Требуется авторизация в админ-панели'), JSON_UNESCAPED_UNICODE);
    exit;
}

// Автоматическая проверка таблиц БД
vgs_init_estimate_tables();

$pdo = vgs_db();
$action = $_GET['action'] ?? ($_POST['action'] ?? 'list');

try {
    /* -------------------------------------------------------------
       1. Список смет (list)
    -------------------------------------------------------------- */
    if ($action === 'list') {
        $status = trim($_GET['status'] ?? 'all');
        $q = trim($_GET['q'] ?? '');

        $where = array();
        $args = array();

        if ($status !== '' && $status !== 'all') {
            $where[] = 'status = ?';
            $args[] = $status;
        }

        if ($q !== '') {
            $where[] = '(number LIKE ? OR object_name LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR object_address LIKE ?)';
            $like = '%' . $q . '%';
            array_push($args, $like, $like, $like, $like, $like);
        }

        $wsql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';
        $sql = "SELECT id, number, template_code, status, customer_name, customer_phone, customer_email,
                       object_name, object_address, area, lead_time, valid_until, engineer_name, comment,
                       options_json, data_json,
                       work_total, material_total, delivery_total, grand_total,
                       work_cost_price, material_cost_price, expected_margin,
                       created_at, updated_at
                FROM estimates $wsql ORDER BY id DESC LIMIT 200";

        $st = $pdo->prepare($sql);
        $st->execute($args);
        $rawList = $st->fetchAll();
        $list = array();
        foreach ($rawList as $row) {
            $options = !empty($row['options_json']) ? json_decode($row['options_json'], true) : array();
            $data = !empty($row['data_json']) ? json_decode($row['data_json'], true) : array();
            $row['options'] = is_array($options) ? $options : array();
            $row['sections'] = isset($data['sections']) && is_array($data['sections']) ? $data['sections'] : array();
            $row['area'] = (float)($row['area'] ?? 0);
            $row['work_total'] = (float)($row['work_total'] ?? 0);
            $row['material_total'] = (float)($row['material_total'] ?? 0);
            $row['delivery_total'] = (float)($row['delivery_total'] ?? 0);
            $row['grand_total'] = (float)($row['grand_total'] ?? 0);
            $row['work_cost_price'] = (float)($row['work_cost_price'] ?? 0);
            $row['material_cost_price'] = (float)($row['material_cost_price'] ?? 0);
            $row['expected_margin'] = (float)($row['expected_margin'] ?? 0);
            $list[] = $row;
        }

        echo json_encode(array('ok' => true, 'list' => $list), JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* -------------------------------------------------------------
       2. Получение одной сметы (get)
    -------------------------------------------------------------- */
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        $st = $pdo->prepare("SELECT * FROM estimates WHERE id = ? LIMIT 1");
        $st->execute(array($id));
        $est = $st->fetch();

        if (!$est) {
            http_response_code(404);
            echo json_encode(array('ok' => false, 'err' => 'Смета не найдена в базе данных'));
            exit;
        }

        $est['options'] = !empty($est['options_json']) ? json_decode($est['options_json'], true) : array();
        $data = !empty($est['data_json']) ? json_decode($est['data_json'], true) : array();
        $est['sections'] = isset($data['sections']) && is_array($data['sections']) ? $data['sections'] : array();

        echo json_encode(array('ok' => true, 'estimate' => $est), JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* -------------------------------------------------------------
       3. Сохранение сметы (save) — создание или обновление в MySQL
    -------------------------------------------------------------- */
    if ($action === 'save') {
        $raw = file_get_contents('php://input');
        $in = json_decode($raw, true);
        if (!$in && !empty($_POST['estimate'])) {
            $in = json_decode($_POST['estimate'], true);
        }
        if (!is_array($in)) {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'err' => 'Некорректный JSON сметы'));
            exit;
        }

        $id = (int)($in['id'] ?? 0);
        $number = trim($in['number'] ?? '');
        if ($number === '') {
            $number = 'КП-ВГС-' . rand(100000, 999999);
        }

        $templateCode = trim($in['template_code'] ?? 'custom');
        $status = trim($in['status'] ?? 'draft');
        $customerName = trim($in['customer_name'] ?? '');
        $customerPhone = trim($in['customer_phone'] ?? '');
        $customerEmail = trim($in['customer_email'] ?? '');
        $objectName = trim($in['object_name'] ?? '');
        $objectAddress = trim($in['object_address'] ?? '');
        $area = (float)($in['area'] ?? 0);
        $leadTime = trim($in['lead_time'] ?? '15-25 рабочих дней');
        $validUntil = trim($in['valid_until'] ?? date('Y-m-d', strtotime('+14 days')));
        $engineerName = trim($in['engineer_name'] ?? 'Звонарёв А.Б.');
        $comment = trim($in['comment'] ?? '');

        $options = isset($in['options']) && is_array($in['options']) ? $in['options'] : array();
        $sections = isset($in['sections']) && is_array($in['sections']) ? $in['sections'] : array();

        // Точный серверный расчет итогов
        $totals = vgs_calc_estimate_totals($sections);

        $dataJson = json_encode(array(
            'sections' => $sections,
            'options'  => $options,
        ), JSON_UNESCAPED_UNICODE);
        $optionsJson = json_encode($options, JSON_UNESCAPED_UNICODE);
        $adminName = $_SESSION['vgs_name'] ?? 'admin';
        $adminId = (int)($_SESSION['vgs_admin'] ?? 1);

        // Проверяем, существует ли запись в MySQL
        $isUpdate = false;
        $oldEst = null;
        if ($id > 0) {
            $stCheck = $pdo->prepare("SELECT * FROM estimates WHERE id = ? LIMIT 1");
            $stCheck->execute(array($id));
            $oldEst = $stCheck->fetch();
            if ($oldEst) {
                $isUpdate = true;
            }
        }

        if ($isUpdate) {
            // Обновление существующей сметы
            $st = $pdo->prepare("UPDATE estimates SET
                number = ?, template_code = ?, status = ?, customer_name = ?, customer_phone = ?,
                customer_email = ?, object_name = ?, object_address = ?, area = ?, lead_time = ?,
                valid_until = ?, engineer_name = ?, comment = ?, options_json = ?, data_json = ?,
                work_cost_price = ?, work_total = ?, material_cost_price = ?, material_total = ?,
                delivery_total = ?, grand_total = ?, expected_margin = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?");

            $st->execute(array(
                $number, $templateCode, $status, $customerName, $customerPhone,
                $customerEmail, $objectName, $objectAddress, $area, $leadTime,
                $validUntil, $engineerName, $comment, $optionsJson, $dataJson,
                $totals['work_cost_price'], $totals['work_total'], $totals['material_cost_price'], $totals['material_total'],
                $totals['delivery_total'], $totals['grand_total'], $totals['expected_margin'],
                $id
            ));

            vgs_log_admin_action($pdo, 'edit', 'estimate', $id, 'Смета ' . $number, $oldEst, array('grand_total' => $totals['grand_total'], 'status' => $status, 'object_name' => $objectName), $adminName, $adminId);
        } else {
            // Создание новой записи в MySQL
            $st = $pdo->prepare("INSERT INTO estimates (
                number, template_code, status, customer_name, customer_phone,
                customer_email, object_name, object_address, area, lead_time,
                valid_until, engineer_name, comment, options_json, data_json,
                work_cost_price, work_total, material_cost_price, material_total,
                delivery_total, grand_total, expected_margin
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?
            )");

            $st->execute(array(
                $number, $templateCode, $status, $customerName, $customerPhone,
                $customerEmail, $objectName, $objectAddress, $area, $leadTime,
                $validUntil, $engineerName, $comment, $optionsJson, $dataJson,
                $totals['work_cost_price'], $totals['work_total'], $totals['material_cost_price'], $totals['material_total'],
                $totals['delivery_total'], $totals['grand_total'], $totals['expected_margin']
            ));
            $id = (int)$pdo->lastInsertId();

            vgs_log_admin_action($pdo, 'create', 'estimate', $id, 'Смета ' . $number, null, array('grand_total' => $totals['grand_total'], 'object_name' => $objectName), $adminName, $adminId);
        }

        echo json_encode(array(
            'ok'     => true,
            'id'     => $id,
            'number' => $number,
            'totals' => $totals,
            'msg'    => 'Смета успешно сохранена в базе данных MySQL',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* -------------------------------------------------------------
       4. Копирование / Создать на основе (duplicate)
    -------------------------------------------------------------- */
    if ($action === 'duplicate') {
        $raw = file_get_contents('php://input');
        $json = $raw ? json_decode($raw, true) : array();
        $id = (int)($json['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        $st = $pdo->prepare("SELECT * FROM estimates WHERE id = ? LIMIT 1");
        $st->execute(array($id));
        $orig = $st->fetch();

        if (!$orig) {
            http_response_code(404);
            echo json_encode(array('ok' => false, 'err' => 'Исходная смета не найдена в БД'));
            exit;
        }

        $newNumber = 'КП-ВГС-' . rand(100000, 999999);
        $newObjName = $orig['object_name'] . ' (копия)';
        $validUntil = date('Y-m-d', strtotime('+14 days'));

        $ins = $pdo->prepare("INSERT INTO estimates (
            number, template_code, status, customer_name, customer_phone,
            customer_email, object_name, object_address, area, lead_time,
            valid_until, engineer_name, comment, options_json, data_json,
            work_cost_price, work_total, material_cost_price, material_total,
            delivery_total, grand_total, expected_margin
        ) VALUES (
            ?, ?, 'draft', ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?
        )");

        $ins->execute(array(
            $newNumber, $orig['template_code'], $orig['customer_name'], $orig['customer_phone'],
            $orig['customer_email'], $newObjName, $orig['object_address'], $orig['area'], $orig['lead_time'],
            $validUntil, $orig['engineer_name'], 'Создано на основе сметы ' . $orig['number'],
            $orig['options_json'], $orig['data_json'],
            $orig['work_cost_price'], $orig['work_total'], $orig['material_cost_price'], $orig['material_total'],
            $orig['delivery_total'], $orig['grand_total'], $orig['expected_margin']
        ));

        $newId = (int)$pdo->lastInsertId();
        $adminName = $_SESSION['vgs_name'] ?? 'admin';
        $adminId = (int)($_SESSION['vgs_admin'] ?? 1);
        vgs_log_admin_action($pdo, 'create', 'estimate', $newId, 'Смета ' . $newNumber . ' (копия ' . $orig['number'] . ')', null, array('number' => $newNumber, 'parent_id' => $id), $adminName, $adminId);

        echo json_encode(array('ok' => true, 'id' => $newId, 'number' => $newNumber, 'msg' => 'Копия сметы создана в БД'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* -------------------------------------------------------------
       5. Удаление сметы (delete) с сохранением snapshot в истории
    -------------------------------------------------------------- */
    if ($action === 'delete') {
        $raw = file_get_contents('php://input');
        $json = $raw ? json_decode($raw, true) : array();
        $id = (int)($json['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        if ($id > 0) {
            $pdo->beginTransaction();
            $st = $pdo->prepare("SELECT * FROM estimates WHERE id = ? LIMIT 1");
            $st->execute(array($id));
            $est = $st->fetch();

            if (!$est) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(array('ok' => false, 'err' => 'Смета не найдена в БД'));
                exit;
            }

            $adminName = $_SESSION['vgs_name'] ?? 'admin';
            $adminId = (int)($_SESSION['vgs_admin'] ?? 1);
            $histId = vgs_log_admin_action($pdo, 'delete', 'estimate', $id, 'Смета ' . $est['number'] . ' (' . ($est['object_name'] ?: 'Без названия') . ')', $est, null, $adminName, $adminId);

            $del = $pdo->prepare("DELETE FROM estimates WHERE id = ?");
            $del->execute(array($id));
            $pdo->commit();

            echo json_encode(array('ok' => true, 'id' => $id, 'history_id' => $histId, 'msg' => 'Смета удалена из БД (доступна отмена)'));
            exit;
        }
        echo json_encode(array('ok' => false, 'err' => 'Не указан ID сметы'));
        exit;
    }

    /* -------------------------------------------------------------
       6. Быстрая смена статуса (status)
    -------------------------------------------------------------- */
    if ($action === 'status') {
        $raw = file_get_contents('php://input');
        $json = $raw ? json_decode($raw, true) : array();
        $id = (int)($json['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        $stt = trim($json['status'] ?? ($_POST['status'] ?? ($_GET['status'] ?? '')));
        $allowed = array('draft', 'calculating', 'sent', 'agreed', 'approved', 'rejected', 'archived');
        if (in_array($stt, $allowed, true) && $id > 0) {
            $stCheck = $pdo->prepare("SELECT * FROM estimates WHERE id = ? LIMIT 1");
            $stCheck->execute(array($id));
            $oldEst = $stCheck->fetch();

            $st = $pdo->prepare("UPDATE estimates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $st->execute(array($stt, $id));

            if ($oldEst) {
                $adminName = $_SESSION['vgs_name'] ?? 'admin';
                $adminId = (int)($_SESSION['vgs_admin'] ?? 1);
                vgs_log_admin_action($pdo, 'status', 'estimate', $id, 'Смета ' . $oldEst['number'] . ' (' . $stt . ')', $oldEst, array('status' => $stt), $adminName, $adminId);
            }

            echo json_encode(array('ok' => true, 'id' => $id, 'status' => $stt, 'msg' => 'Статус сметы обновлен'));
            exit;
        }
        echo json_encode(array('ok' => false, 'err' => 'Недопустимый статус или некорректный ID'));
        exit;
    }

    /* -------------------------------------------------------------
       7. Список готовых шаблонов (templates)
    -------------------------------------------------------------- */
    if ($action === 'templates') {
        $rows = $pdo->query("SELECT * FROM estimate_templates WHERE is_active = 1 ORDER BY sort_order ASC, id ASC")->fetchAll();
        $templates = array();
        foreach ($rows as $r) {
            $templates[] = array(
                'id' => $r['id'],
                'code' => $r['code'],
                'name' => $r['name'],
                'default_area' => (float)$r['default_area'],
                'description' => $r['description'],
                'options' => !empty($r['options_json']) ? json_decode($r['options_json'], true) : array(),
                'sections' => !empty($r['sections_json']) ? json_decode($r['sections_json'], true) : array(),
            );
        }
        echo json_encode(array('ok' => true, 'templates' => $templates), JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* -------------------------------------------------------------
       8. Справочники работ и материалов (catalog)
    -------------------------------------------------------------- */
    if ($action === 'catalog') {
        $works = $pdo->query("SELECT * FROM works WHERE is_active = 1 ORDER BY category ASC, sort_order ASC, id ASC")->fetchAll();
        $materials = $pdo->query("SELECT * FROM materials WHERE is_active = 1 ORDER BY category ASC, sort_order ASC, id ASC")->fetchAll();
        echo json_encode(array('ok' => true, 'works' => $works, 'materials' => $materials), JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* -------------------------------------------------------------
       9. Добавление работы в справочник
    -------------------------------------------------------------- */
    if ($action === 'catalog_add_work') {
        $in = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $name = trim($in['name'] ?? '');
        $unit = trim($in['unit'] ?? 'компл.');
        $costPrice = (float)($in['cost_price'] ?? 0);
        $defaultPrice = (float)($in['default_price'] ?? 0);
        $cat = trim($in['category'] ?? 'general');
        $desc = trim($in['description'] ?? '');

        if ($name === '') {
            echo json_encode(array('ok' => false, 'err' => 'Укажите название работы'));
            exit;
        }

        $st = $pdo->prepare("INSERT INTO works (category, name, unit, cost_price, default_price, description) VALUES (?, ?, ?, ?, ?, ?)");
        $st->execute(array($cat, $name, $unit, $costPrice, $defaultPrice, $desc));
        echo json_encode(array('ok' => true, 'id' => (int)$pdo->lastInsertId()));
        exit;
    }

    /* -------------------------------------------------------------
       10. Добавление материала в справочник
    -------------------------------------------------------------- */
    if ($action === 'catalog_add_material') {
        $in = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $name = trim($in['name'] ?? '');
        $unit = trim($in['unit'] ?? 'шт.');
        $costPrice = (float)($in['cost_price'] ?? 0);
        $defaultPrice = (float)($in['default_price'] ?? 0);
        $cat = trim($in['category'] ?? 'general');
        $supplier = trim($in['supplier'] ?? '');
        $article = trim($in['article'] ?? '');

        if ($name === '') {
            echo json_encode(array('ok' => false, 'err' => 'Укажите название материала'));
            exit;
        }

        $st = $pdo->prepare("INSERT INTO materials (category, name, unit, cost_price, default_price, supplier, article) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $st->execute(array($cat, $name, $unit, $costPrice, $defaultPrice, $supplier, $article));
        echo json_encode(array('ok' => true, 'id' => (int)$pdo->lastInsertId()));
        exit;
    }

    echo json_encode(array('ok' => false, 'err' => 'Неизвестное действие: ' . htmlspecialchars($action)));

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('API admin-estimates error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    echo json_encode(array(
        'ok' => false,
        'error' => 'DATABASE_ERROR',
        'err' => 'Внутренняя ошибка базы данных смет. Подробности записаны в системный журнал.'
    ), JSON_UNESCAPED_UNICODE);
}
