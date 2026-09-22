<?php
/**
 * ВОЛГАСТРОЙ 76 — REST API Админ-панели
 * Обеспечивает единую точку доступа для React-панели управления
 * и синхронизацию с базой данных MySQL.
 */

if (!defined('VGS_APP')) {
    define('VGS_APP', 1);
}

if (!file_exists(__DIR__ . '/config.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok' => false, 'err' => 'config.php не найден. Запустите install.php'));
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/estimates_db.php';

session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$rawInput = file_get_contents('php://input');
$jsonBody = $rawInput ? json_decode($rawInput, true) : null;
$action = $_GET['action'] ?? ($_POST['action'] ?? ($jsonBody['action'] ?? ''));

$logged = !empty($_SESSION['vgs_admin']);

/* ------------------------------------------------------------------
   0. Авторизация
-------------------------------------------------------------------*/

// 0.1 Проверка статуса авторизации
if ($action === 'check_auth') {
    echo json_encode(array(
        'ok'            => true,
        'authenticated' => $logged,
        'user'          => $_SESSION['vgs_name'] ?? ($logged ? 'admin' : null)
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

// 0.2 Вход через API
if ($action === 'login') {
    $u = trim($jsonBody['username'] ?? ($_POST['username'] ?? ''));
    $p = (string)($jsonBody['password'] ?? ($_POST['password'] ?? ''));

    if ($u === '' || $p === '') {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'err' => 'Укажите логин и пароль'));
        exit;
    }

    try {
        $pdo = vgs_db();
        
        // Инициализируем таблицы если еще не созданы
        vgs_ensure_base_schema($pdo, vgs_is_sqlite());

        $st = $pdo->prepare('SELECT * FROM admins WHERE username = ? OR login = ? LIMIT 1');
        $st->execute(array($u, $u));
        $row = $st->fetch();

        // Если в таблице admins еще нет записей, создаем первого администратора
        $adminCount = (int)$pdo->query('SELECT COUNT(*) FROM admins')->fetchColumn();
        if ($adminCount === 0 && $u === 'admin') {
            $hash = password_hash($p, PASSWORD_DEFAULT);
            $ins = $pdo->prepare('INSERT INTO admins (username, login, password_hash, pass_hash, role) VALUES (?, ?, ?, ?, "admin")');
            $ins->execute(array($u, $u, $hash, $hash));
            $adminId = (int)$pdo->lastInsertId();
            
            session_regenerate_id(true);
            $_SESSION['vgs_admin'] = $adminId;
            $_SESSION['vgs_name']  = $u;

            echo json_encode(array('ok' => true, 'user' => $u, 'msg' => 'Администратор инициализирован'), JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($row) {
            $passHash = !empty($row['password_hash']) ? $row['password_hash'] : (!empty($row['pass_hash']) ? $row['pass_hash'] : '');
            if ($passHash !== '' && password_verify($p, $passHash)) {
                $adminId = (int)$row['id'];
                $adminName = !empty($row['username']) ? $row['username'] : (!empty($row['login']) ? $row['login'] : 'admin');

                // Если password_hash был пустой, но совпал pass_hash - сохраняем в password_hash
                if (empty($row['password_hash']) && !empty($row['pass_hash'])) {
                    try {
                        $upd = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
                        $upd->execute(array($passHash, $adminId));
                    } catch (Exception $e) {}
                }

                // Обновляем время входа
                try {
                    $upd = $pdo->prepare('UPDATE admins SET last_login = NOW() WHERE id = ?');
                    $upd->execute(array($adminId));
                } catch (Exception $e) {}

                session_regenerate_id(true);
                $_SESSION['vgs_admin'] = $adminId;
                $_SESSION['vgs_name']  = $adminName;
                echo json_encode(array('ok' => true, 'user' => $adminName), JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        http_response_code(401);
        echo json_encode(array('ok' => false, 'err' => 'Неверный логин или пароль администратора'));
        exit;
    } catch (Exception $e) {
        error_log('Ошибка авторизации admin.php: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('ok' => false, 'err' => 'Ошибка базы данных при авторизации: ' . $e->getMessage()));
        exit;
    }
}

// 0.3 Выход через API
if ($action === 'logout') {
    unset($_SESSION['vgs_admin'], $_SESSION['vgs_name']);
    session_destroy();
    echo json_encode(array('ok' => true));
    exit;
}

// Защита всех последующих действий авторизацией
if (!$logged) {
    http_response_code(401);
    echo json_encode(array('ok' => false, 'error' => 'AUTH_REQUIRED', 'err' => 'Требуется авторизация в админ-панели'));
    exit;
}

try {
    $pdo = vgs_db();
    $adminName = $_SESSION['vgs_name'] ?? 'admin';
    $adminId = (int)($_SESSION['vgs_admin'] ?? 1);

    /* -------------------------------------------------------------
       1. Заявки (Leads)
    -------------------------------------------------------------- */
    if ($action === 'leads' || $action === 'get_leads') {
        try {
            $st = $pdo->query("SELECT * FROM leads ORDER BY id DESC LIMIT 300");
            $rawLeads = $st ? $st->fetchAll() : array();
        } catch (Exception $e) {
            error_log('VGS API leads query error: ' . $e->getMessage());
            $rawLeads = array();
        }

        $leads = array();
        if (is_array($rawLeads)) {
            foreach ($rawLeads as $r) {
                $leads[] = array(
                    'id' => (int)($r['id'] ?? 0),
                    'name' => (string)($r['name'] ?? ''),
                    'phone' => (string)($r['phone'] ?? ''),
                    'topic' => (string)($r['topic'] ?? ''),
                    'message' => (string)($r['message'] ?? ''),
                    'calc' => (string)($r['calc'] ?? ''),
                    'status' => (string)($r['status'] ?? 'new'),
                    'ip' => (string)($r['ip'] ?? ''),
                    'created_at' => (string)($r['created_at'] ?? date('Y-m-d H:i:s')),
                );
            }
        }
        echo json_encode(array('ok' => true, 'leads' => $leads), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'lead_status' || $action === 'update_lead') {
        $id = (int)($jsonBody['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        $stt = trim($jsonBody['status'] ?? ($_POST['status'] ?? 'viewed'));
        if ($id > 0 && in_array($stt, array('new', 'viewed', 'archived'), true)) {
            $stCheck = $pdo->prepare("SELECT * FROM leads WHERE id = ? LIMIT 1");
            $stCheck->execute(array($id));
            $oldLead = $stCheck->fetch();

            $st = $pdo->prepare("UPDATE leads SET status = ? WHERE id = ?");
            $st->execute(array($stt, $id));

            if ($oldLead) {
                vgs_log_admin_action($pdo, 'status', 'lead', $id, 'Заявка #' . $id . ' (' . $oldLead['name'] . ')', $oldLead, array('status' => $stt), $adminName, $adminId);
            }

            echo json_encode(array('ok' => true, 'id' => $id, 'status' => $stt, 'msg' => 'Статус заявки обновлен'));
            exit;
        }
        http_response_code(400);
        echo json_encode(array('ok' => false, 'err' => 'Некорректные параметры заявки'));
        exit;
    }

    if ($action === 'lead_delete' || $action === 'delete_lead') {
        $id = (int)($jsonBody['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        if ($id > 0) {
            $pdo->beginTransaction();
            $st = $pdo->prepare("SELECT * FROM leads WHERE id = ? LIMIT 1");
            $st->execute(array($id));
            $lead = $st->fetch();

            if (!$lead) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(array('ok' => false, 'err' => 'Заявка не найдена в БД'));
                exit;
            }

            $histId = vgs_log_admin_action($pdo, 'delete', 'lead', $id, 'Заявка #' . $id . ' (' . $lead['name'] . ')', $lead, null, $adminName, $adminId);

            $del = $pdo->prepare("DELETE FROM leads WHERE id = ?");
            $del->execute(array($id));
            $pdo->commit();

            echo json_encode(array('ok' => true, 'id' => $id, 'history_id' => $histId, 'msg' => 'Заявка удалена (доступно восстановление)'));
            exit;
        }
        http_response_code(400);
        echo json_encode(array('ok' => false, 'err' => 'Не указан ID заявки'));
        exit;
    }

    /* -------------------------------------------------------------
       2. Отзывы (Reviews)
    -------------------------------------------------------------- */
    if ($action === 'reviews' || $action === 'get_reviews') {
        $st = $pdo->query("SELECT id, name AS author_name, place AS object_type, rating, text AS review_text, approved, created_at FROM reviews ORDER BY id DESC LIMIT 300");
        $rows = $st->fetchAll();
        $reviews = array();
        if (is_array($rows)) {
            foreach ($rows as $r) {
                $r['id'] = (int)$r['id'];
                $r['rating'] = (int)$r['rating'];
                $r['approved'] = (bool)(int)($r['approved'] ?? 0);
                $reviews[] = $r;
            }
        }
        echo json_encode(array('ok' => true, 'reviews' => $reviews), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'review_approve' || $action === 'review_status' || $action === 'update_review') {
        $id = (int)($jsonBody['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        $approved = isset($jsonBody['approved']) ? ($jsonBody['approved'] ? 1 : 0) : (isset($_POST['approved']) ? ((int)$_POST['approved'] ? 1 : 0) : 1);
        if ($id > 0) {
            $stCheck = $pdo->prepare("SELECT * FROM reviews WHERE id = ? LIMIT 1");
            $stCheck->execute(array($id));
            $oldRev = $stCheck->fetch();

            $st = $pdo->prepare("UPDATE reviews SET approved = ? WHERE id = ?");
            $st->execute(array($approved, $id));
            vgs_cache_drop('reviews');

            if ($oldRev) {
                vgs_log_admin_action($pdo, 'status', 'review', $id, 'Отзыв от ' . $oldRev['name'], $oldRev, array('approved' => $approved), $adminName, $adminId);
            }

            echo json_encode(array('ok' => true, 'id' => $id, 'approved' => (bool)$approved, 'msg' => 'Статус отзыва обновлен'));
            exit;
        }
        http_response_code(400);
        echo json_encode(array('ok' => false, 'err' => 'Не указан ID отзыва'));
        exit;
    }

    if ($action === 'review_delete' || $action === 'delete_review') {
        $id = (int)($jsonBody['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        if ($id > 0) {
            $pdo->beginTransaction();
            $st = $pdo->prepare("SELECT * FROM reviews WHERE id = ? LIMIT 1");
            $st->execute(array($id));
            $rev = $st->fetch();

            if (!$rev) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode(array('ok' => false, 'err' => 'Отзыв не найден в БД'));
                exit;
            }

            $histId = vgs_log_admin_action($pdo, 'delete', 'review', $id, 'Отзыв от ' . $rev['name'], $rev, null, $adminName, $adminId);

            $del = $pdo->prepare("DELETE FROM reviews WHERE id = ?");
            $del->execute(array($id));
            vgs_cache_drop('reviews');
            $pdo->commit();

            echo json_encode(array('ok' => true, 'id' => $id, 'history_id' => $histId, 'msg' => 'Отзыв удален (доступно восстановление)'));
            exit;
        }
        http_response_code(400);
        echo json_encode(array('ok' => false, 'err' => 'Не указан ID отзыва'));
        exit;
    }

    if ($action === 'review_add') {
        $author = trim($jsonBody['author_name'] ?? ($_POST['author_name'] ?? 'Заказчик'));
        $objectType = trim($jsonBody['object_type'] ?? ($_POST['object_type'] ?? ''));
        $rating = max(1, min(5, (int)($jsonBody['rating'] ?? ($_POST['rating'] ?? 5))));
        $text = trim($jsonBody['review_text'] ?? ($_POST['review_text'] ?? ''));
        $approved = !empty($jsonBody['approved']) ? 1 : 0;

        if ($author !== '' && $text !== '') {
            $st = $pdo->prepare("INSERT INTO reviews (name, place, service, rating, text, approved, ip) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $st->execute(array($author, $objectType, 'Строительство и монтаж', $rating, $text, $approved, '127.0.0.1'));
            vgs_cache_drop('reviews');
            $newId = (int)$pdo->lastInsertId();

            vgs_log_admin_action($pdo, 'create', 'review', $newId, 'Отзыв от ' . $author, null, array('name' => $author, 'rating' => $rating, 'text' => $text, 'approved' => $approved), $adminName, $adminId);

            echo json_encode(array('ok' => true, 'id' => $newId, 'msg' => 'Отзыв добавлен'));
            exit;
        }
        http_response_code(400);
        echo json_encode(array('ok' => false, 'err' => 'Заполните имя и текст отзыва'));
        exit;
    }

    /* -------------------------------------------------------------
       3. История действий (Audit Log)
    -------------------------------------------------------------- */
    if ($action === 'history' || $action === 'get_history') {
        $st = $pdo->query("SELECT id, admin_id, admin_name, action_type, entity_type, entity_id, entity_name, before_data_json, after_data_json, created_at, undone_at FROM admin_action_history ORDER BY id DESC LIMIT 150");
        $rows = $st->fetchAll();
        $history = array();
        if (is_array($rows)) {
            foreach ($rows as $r) {
                $r['before_data'] = !empty($r['before_data_json']) ? json_decode($r['before_data_json'], true) : null;
                $r['after_data'] = !empty($r['after_data_json']) ? json_decode($r['after_data_json'], true) : null;
                $history[] = $r;
            }
        }
        echo json_encode(array('ok' => true, 'history' => $history), JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* -------------------------------------------------------------
       4. Отмена действия (Undo) через серверную транзакцию
    -------------------------------------------------------------- */
    if ($action === 'undo' || $action === 'undo_action') {
        $histId = (int)($jsonBody['history_id'] ?? ($_POST['history_id'] ?? ($_GET['history_id'] ?? 0)));
        if ($histId <= 0) {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'err' => 'Не указан ID записи в истории'));
            exit;
        }

        $st = $pdo->prepare("SELECT * FROM admin_action_history WHERE id = ? LIMIT 1");
        $st->execute(array($histId));
        $h = $st->fetch();

        if (!$h) {
            http_response_code(404);
            echo json_encode(array('ok' => false, 'err' => 'Запись истории не найдена'));
            exit;
        }

        if (!empty($h['undone_at'])) {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'err' => 'Это действие уже было отменено ранее'));
            exit;
        }

        $pdo->beginTransaction();
        $entityType = $h['entity_type'];
        $actionType = $h['action_type'];
        $beforeData = !empty($h['before_data_json']) ? json_decode($h['before_data_json'], true) : null;

        if ($actionType === 'delete' && is_array($beforeData)) {
            if ($entityType === 'lead') {
                $ins = $pdo->prepare("INSERT INTO leads (id, name, phone, topic, message, calc, ip, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute(array(
                    $beforeData['id'] ?? null,
                    $beforeData['name'] ?? '',
                    $beforeData['phone'] ?? '',
                    $beforeData['topic'] ?? '',
                    $beforeData['message'] ?? '',
                    $beforeData['calc'] ?? null,
                    $beforeData['ip'] ?? '',
                    $beforeData['status'] ?? 'new',
                    $beforeData['created_at'] ?? date('Y-m-d H:i:s')
                ));
            } elseif ($entityType === 'review') {
                $ins = $pdo->prepare("INSERT INTO reviews (id, name, place, service, rating, text, ip, approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $ins->execute(array(
                    $beforeData['id'] ?? null,
                    $beforeData['name'] ?? '',
                    $beforeData['place'] ?? '',
                    $beforeData['service'] ?? 'Строительство и монтаж',
                    (int)($beforeData['rating'] ?? 5),
                    $beforeData['text'] ?? '',
                    $beforeData['ip'] ?? '',
                    (int)($beforeData['approved'] ?? 1),
                    $beforeData['created_at'] ?? date('Y-m-d H:i:s')
                ));
                vgs_cache_drop('reviews');
            } elseif ($entityType === 'estimate') {
                $ins = $pdo->prepare("INSERT INTO estimates (
                    id, number, template_code, status, customer_name, customer_phone,
                    customer_email, object_name, object_address, area, lead_time,
                    valid_until, engineer_name, comment, options_json, data_json,
                    work_cost_price, work_total, material_cost_price, material_total,
                    delivery_total, grand_total, expected_margin, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?
                )");
                $ins->execute(array(
                    $beforeData['id'] ?? null,
                    $beforeData['number'] ?? 'КП-ВГС-' . rand(100000, 999999),
                    $beforeData['template_code'] ?? 'custom',
                    $beforeData['status'] ?? 'draft',
                    $beforeData['customer_name'] ?? '',
                    $beforeData['customer_phone'] ?? '',
                    $beforeData['customer_email'] ?? '',
                    $beforeData['object_name'] ?? '',
                    $beforeData['object_address'] ?? '',
                    (float)($beforeData['area'] ?? 0),
                    $beforeData['lead_time'] ?? '15-25 рабочих дней',
                    $beforeData['valid_until'] ?? date('Y-m-d', strtotime('+14 days')),
                    $beforeData['engineer_name'] ?? 'Звонарёв А.Б.',
                    $beforeData['comment'] ?? '',
                    $beforeData['options_json'] ?? '[]',
                    $beforeData['data_json'] ?? '[]',
                    (float)($beforeData['work_cost_price'] ?? 0),
                    (float)($beforeData['work_total'] ?? 0),
                    (float)($beforeData['material_cost_price'] ?? 0),
                    (float)($beforeData['material_total'] ?? 0),
                    (float)($beforeData['delivery_total'] ?? 0),
                    (float)($beforeData['grand_total'] ?? 0),
                    (float)($beforeData['expected_margin'] ?? 0),
                    $beforeData['created_at'] ?? date('Y-m-d H:i:s'),
                    date('Y-m-d H:i:s')
                ));
            }
        } elseif ($actionType === 'status' && is_array($beforeData)) {
            $targetId = (int)$h['entity_id'];
            if ($entityType === 'lead') {
                $st = $pdo->prepare("UPDATE leads SET status = ? WHERE id = ?");
                $st->execute(array($beforeData['status'] ?? 'new', $targetId));
            } elseif ($entityType === 'review') {
                $st = $pdo->prepare("UPDATE reviews SET approved = ? WHERE id = ?");
                $st->execute(array((int)($beforeData['approved'] ?? 1), $targetId));
                vgs_cache_drop('reviews');
            } elseif ($entityType === 'estimate') {
                $st = $pdo->prepare("UPDATE estimates SET status = ? WHERE id = ?");
                $st->execute(array($beforeData['status'] ?? 'draft', $targetId));
            }
        } elseif ($actionType === 'edit' && is_array($beforeData)) {
            $targetId = (int)$h['entity_id'];
            if ($entityType === 'estimate') {
                $st = $pdo->prepare("UPDATE estimates SET
                    number = ?, template_code = ?, status = ?, customer_name = ?, customer_phone = ?,
                    customer_email = ?, object_name = ?, object_address = ?, area = ?, lead_time = ?,
                    valid_until = ?, engineer_name = ?, comment = ?, options_json = ?, data_json = ?,
                    work_cost_price = ?, work_total = ?, material_cost_price = ?, material_total = ?,
                    delivery_total = ?, grand_total = ?, expected_margin = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?");
                $st->execute(array(
                    $beforeData['number'] ?? '', $beforeData['template_code'] ?? 'custom', $beforeData['status'] ?? 'draft',
                    $beforeData['customer_name'] ?? '', $beforeData['customer_phone'] ?? '', $beforeData['customer_email'] ?? '',
                    $beforeData['object_name'] ?? '', $beforeData['object_address'] ?? '', (float)($beforeData['area'] ?? 0),
                    $beforeData['lead_time'] ?? '', $beforeData['valid_until'] ?? '', $beforeData['engineer_name'] ?? '',
                    $beforeData['comment'] ?? '', $beforeData['options_json'] ?? '[]', $beforeData['data_json'] ?? '[]',
                    (float)($beforeData['work_cost_price'] ?? 0), (float)($beforeData['work_total'] ?? 0),
                    (float)($beforeData['material_cost_price'] ?? 0), (float)($beforeData['material_total'] ?? 0),
                    (float)($beforeData['delivery_total'] ?? 0), (float)($beforeData['grand_total'] ?? 0),
                    (float)($beforeData['expected_margin'] ?? 0), $targetId
                ));
            }
        } elseif ($actionType === 'create') {
            $targetId = (int)$h['entity_id'];
            if ($entityType === 'estimate') {
                $pdo->prepare("DELETE FROM estimates WHERE id = ?")->execute(array($targetId));
            } elseif ($entityType === 'review') {
                $pdo->prepare("DELETE FROM reviews WHERE id = ?")->execute(array($targetId));
                vgs_cache_drop('reviews');
            } elseif ($entityType === 'lead') {
                $pdo->prepare("DELETE FROM leads WHERE id = ?")->execute(array($targetId));
            }
        }

        $upd = $pdo->prepare("UPDATE admin_action_history SET undone_at = CURRENT_TIMESTAMP WHERE id = ?");
        $upd->execute(array($histId));
        $pdo->commit();

        echo json_encode(array('ok' => true, 'msg' => 'Действие успешно отменено в базе данных'));
        exit;
    }

    http_response_code(400);
    echo json_encode(array('ok' => false, 'err' => 'Неизвестное действие: ' . htmlspecialchars($action)));

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('API admin error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    echo json_encode(array(
        'ok' => false,
        'error' => 'DATABASE_ERROR',
        'err' => 'Внутренняя ошибка базы данных. Подробности записаны в системный журнал.'
    ), JSON_UNESCAPED_UNICODE);
}
