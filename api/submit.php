<?php
/**
 * Обработчик формы заявки ВОЛГАСТРОЙ 76
 * Поддержка:
 * - JSON (application/json) и FormData (multipart/form-data);
 * - Полей: name, phone, location, objectType (subject), estimatedCost, comment (message), calc, calc_json, timestamp;
 * - Вложений (PDF, XLSX, DOCX, изображения);
 * - Сохранения в MySQL (leads);
 * - Отправки через нативный PHP mail() на Timeweb (-forder@volgastroy76.ru);
 * - Детального диагностического логирования (REQUEST_IN, POST/FILES keys, errors, sizes, MAIL_SUCCESS/FAILED);
 * - Возврата честного HTTP-статуса (200 при успехе, 4xx/500 при ошибке).
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-VGS-API-Version: 2026-09-17-2');

function vgs_json_resp($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function vgs_mask_phone($phone) {
    $digits = preg_replace('/\D/', '', $phone);
    if (strlen($digits) >= 10) {
        return '+' . substr($digits, 0, 1) . ' (' . substr($digits, 1, 3) . ') ***-**-' . substr($digits, -2);
    }
    return '***';
}

function vgs_parse_size_bytes($sizeStr) {
    $sizeStr = trim((string)$sizeStr);
    $last = strtolower(substr($sizeStr, -1));
    $val = (int)$sizeStr;
    switch ($last) {
        case 'g': $val *= 1024 * 1024 * 1024; break;
        case 'm': $val *= 1024 * 1024; break;
        case 'k': $val *= 1024; break;
    }
    return $val;
}

function vgs_log_submit($stage, $msg, $extra = array()) {
    $logFile = __DIR__ . '/mail.log';
    $time = date('Y-m-d H:i:s');
    $sanitized = array();
    foreach ($extra as $k => $v) {
        if (stripos($k, 'pass') !== false || stripos($k, 'token') !== false || stripos($k, 'secret') !== false) {
            $sanitized[$k] = '***';
        } elseif ($k === 'phone') {
            $sanitized[$k] = vgs_mask_phone((string)$v);
        } else {
            $sanitized[$k] = $v;
        }
    }
    $extraStr = !empty($sanitized) ? ' | ' . json_encode($sanitized, JSON_UNESCAPED_UNICODE) : '';
    $line = "[{$time}] [{$stage}] {$msg}{$extraStr}" . PHP_EOL;
    @file_put_contents($logFile, $line, FILE_APPEND);
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    vgs_json_resp(array('ok' => false, 'err' => 'method', 'error' => 'Метод запроса должен быть POST'), 405);
}

// Проверка на превышение post_max_size (когда PHP автоматически сбрасывает $_POST и $_FILES)
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
$postMaxSizeStr = ini_get('post_max_size');
$postMaxSizeBytes = vgs_parse_size_bytes($postMaxSizeStr);

if ($contentLength > 0 && empty($_POST) && empty($_FILES) && $contentLength > $postMaxSizeBytes) {
    vgs_log_submit('POST_MAX_SIZE_EXCEEDED', "Request payload ({$contentLength} bytes) exceeds post_max_size ({$postMaxSizeStr})", array(
        'content_length' => $contentLength,
        'post_max_size'  => $postMaxSizeStr
    ));
    vgs_json_resp(array(
        'ok'    => false,
        'err'   => 'payload_too_large',
        'error' => "Размер отправляемых файлов превышает лимит сервера (post_max_size = {$postMaxSizeStr})"
    ), 413);
}

// Загрузка конфигурации
$cfgFile = __DIR__ . '/config.php';
$VGS_CFG = file_exists($cfgFile) ? require $cfgFile : array();

$contentType = $_SERVER['CONTENT-TYPE'] ?? ($_SERVER['HTTP_CONTENT_TYPE'] ?? '');
$rawInput = file_get_contents('php://input');

$name          = '';
$phone         = '';
$location      = '';
$objectType    = '';
$estimatedCost = '';
$comment       = '';
$calcTxt       = '';
$calcJson      = '';
$timestamp     = '';
$isBot         = false;

// 1. Разбор входящих данных (JSON или FormData)
if (stripos($contentType, 'application/json') !== false || (empty($_POST) && !empty($rawInput))) {
    $json = json_decode($rawInput, true);
    if (is_array($json)) {
        $name          = trim((string)($json['name'] ?? ''));
        $phone         = trim((string)($json['phone'] ?? ''));
        $location      = trim((string)($json['location'] ?? ''));
        $objectType    = trim((string)($json['objectType'] ?? ($json['subject'] ?? ($json['topic'] ?? ''))));
        $estimatedCost = trim((string)($json['estimatedCost'] ?? ($json['cost'] ?? '')));
        $comment       = trim((string)($json['comment'] ?? ($json['message'] ?? '')));
        $calcTxt       = trim((string)($json['calc'] ?? ''));
        $calcJson      = is_array($json['calc_json'] ?? null) ? json_encode($json['calc_json'], JSON_UNESCAPED_UNICODE) : trim((string)($json['calc_json'] ?? ''));
        $timestamp     = trim((string)($json['timestamp'] ?? ''));
        if (!empty($json['hp'])) { $isBot = true; }
    }
}

// Если данные пришли через стандартный POST (FormData)
if (empty($name) && empty($phone) && !empty($_POST)) {
    $name          = trim((string)($_POST['name'] ?? ''));
    $phone         = trim((string)($_POST['phone'] ?? ''));
    $location      = trim((string)($_POST['location'] ?? ''));
    $objectType    = trim((string)($_POST['objectType'] ?? ($_POST['subject'] ?? ($_POST['topic'] ?? ''))));
    $estimatedCost = trim((string)($_POST['estimatedCost'] ?? ($_POST['cost'] ?? '')));
    $comment       = trim((string)($_POST['comment'] ?? ($_POST['message'] ?? '')));
    $calcTxt       = trim((string)($_POST['calc'] ?? ''));
    $calcJson      = trim((string)($_POST['calc_json'] ?? ''));
    $timestamp     = trim((string)($_POST['timestamp'] ?? ''));
    if (!empty($_POST['hp'])) { $isBot = true; }
}

// Сбор информации о файлах для логирования
$fileDiagnostics = array();
if (!empty($_FILES)) {
    foreach ($_FILES as $fk => $fv) {
        $fileDiagnostics[$fk] = array(
            'name'  => $fv['name'] ?? '',
            'size'  => $fv['size'] ?? 0,
            'error' => $fv['error'] ?? -1,
            'type'  => $fv['type'] ?? '',
        );
    }
}

// Honeypot ловушка для ботов
if ($isBot) {
    vgs_log_submit('BOT_DETECTED', 'Honeypot triggered, silent success');
    vgs_json_resp(array('ok' => true, 'id' => 0, 'sent' => 1));
}

// Проверка валидности телефона
$digits = preg_replace('/\D/', '', $phone);
if (strlen($digits) < 10) {
    vgs_log_submit('VALIDATION_FAILED', 'Invalid phone number', array('phone' => $phone));
    vgs_json_resp(array('ok' => false, 'err' => 'phone', 'error' => 'Некорректный номер телефона (требуется не менее 10 цифр)'), 422);
}

if ($name === '') {
    $name = 'Клиент с сайта';
}
if ($objectType === '') {
    $objectType = 'Заявка на расчет';
}
if ($timestamp === '') {
    $timestamp = date('d.m.Y H:i:s');
}

// Логирование REQUEST_IN
vgs_log_submit('REQUEST_IN', 'Incoming lead submission', array(
    'content_type' => $contentType,
    'raw_size'     => strlen($rawInput),
    'post_keys'    => array_keys($_POST),
    'files_keys'   => array_keys($_FILES),
    'files_diag'   => $fileDiagnostics,
    'name'         => $name,
    'phone'        => $phone,
    'object_type'  => $objectType,
    'location'     => $location,
));

// 2. Сохранение заявки в базу данных MySQL (если БД настроена)
$leadId = 0;
if (!empty($VGS_CFG['db_name']) && !empty($VGS_CFG['db_user'])) {
    try {
        $dsn = 'mysql:host=' . ($VGS_CFG['db_host'] ?? 'localhost')
             . ';port=' . ((int)($VGS_CFG['db_port'] ?? 3306))
             . ';dbname=' . $VGS_CFG['db_name']
             . ';charset=utf8mb4';
        $pdo = new PDO($dsn, $VGS_CFG['db_user'], $VGS_CFG['db_pass'] ?? '', array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ));
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';

        $topicFull = $objectType;
        if ($location) { $topicFull .= " ({$location})"; }
        if ($estimatedCost) { $topicFull .= " — {$estimatedCost}"; }

        try {
            $st = $pdo->prepare('INSERT INTO leads (name, phone, topic, message, calc, ip) VALUES (?, ?, ?, ?, ?, ?)');
            $st->execute(array($name, $phone, $topicFull, $comment, $calcTxt, $ip));
            $leadId = (int)$pdo->lastInsertId();
        } catch (Exception $e2) {
            $st = $pdo->prepare('INSERT INTO leads (name, phone, topic, message, ip) VALUES (?, ?, ?, ?, ?)');
            $fullMsg = $comment;
            if ($location) { $fullMsg .= "\nЛокация: " . $location; }
            if ($estimatedCost) { $fullMsg .= "\nПредварительная стоимость: " . $estimatedCost; }
            if ($calcTxt) { $fullMsg .= "\n\n" . $calcTxt; }
            $st->execute(array($name, $phone, $topicFull, $fullMsg, $ip));
            $leadId = (int)$pdo->lastInsertId();
        }
        vgs_log_submit('DB_SAVED', "Lead saved into database", array('lead_id' => $leadId));
    } catch (Exception $e) {
        vgs_log_submit('DB_ERROR', $e->getMessage());
    }
}

// 3. Обработка загруженных файлов (с валидацией расширений и ошибок $_FILES)
$savedAttachments = array();
if (!empty($_FILES)) {
    $uploadDir = __DIR__ . '/../data/uploads';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0775, true);
        @file_put_contents($uploadDir . '/.htaccess', "Order Deny,Allow\nDeny from all\n");
    }

    $allowedMap = array(
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'pdf'  => 'application/pdf',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'dwg'  => 'application/octet-stream',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc'  => 'application/msword',
        'zip'  => 'application/zip',
        'csv'  => 'text/csv',
    );

    foreach ($_FILES as $fileKey => $f) {
        $errCode = (int)($f['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errCode !== UPLOAD_ERR_OK) {
            if ($errCode !== UPLOAD_ERR_NO_FILE) {
                vgs_log_submit('FILE_UPLOAD_ERROR', "Upload error for key '{$fileKey}' with code {$errCode}", array(
                    'file_key'   => $fileKey,
                    'error_code' => $errCode,
                    'name'       => $f['name'] ?? ''
                ));
            }
            continue;
        }

        if (!empty($f['tmp_name']) && is_uploaded_file($f['tmp_name'])) {
            $rawName = basename((string)$f['name']);
            $cleanName = preg_replace('/[^\p{L}\p{N}\._\-]/u', '_', $rawName);
            $ext = strtolower(pathinfo($cleanName, PATHINFO_EXTENSION));

            if (!isset($allowedMap[$ext])) {
                vgs_log_submit('FILE_REJECTED', "Forbidden file extension: {$ext}", array('file' => $cleanName));
                continue;
            }

            $fsize = (int)@filesize($f['tmp_name']);
            if ($fsize <= 0 || $fsize > 20 * 1024 * 1024) {
                vgs_log_submit('FILE_REJECTED', "File size limit exceeded: {$fsize} bytes", array('file' => $cleanName));
                continue;
            }

            // Определение реального MIME
            $detectedMime = $allowedMap[$ext];
            if (function_exists('finfo_open')) {
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                if ($finfo) {
                    $realMime = finfo_file($finfo, $f['tmp_name']);
                    finfo_close($finfo);
                    if ($realMime) {
                        $detectedMime = $realMime;
                    }
                }
            }

            if ($ext === 'xlsx') {
                $detectedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                $attachmentTitle = 'Smeta_Volgastroy76.xlsx';
            } elseif ($ext === 'pdf') {
                $detectedMime = 'application/pdf';
                $attachmentTitle = 'Kommercheskoe_Predlozhenie.pdf';
            } else {
                $attachmentTitle = $cleanName;
            }

            $target = $uploadDir . '/lead_' . ($leadId ?: time()) . '_' . uniqid() . '.' . $ext;
            if (@move_uploaded_file($f['tmp_name'], $target)) {
                $savedAttachments[] = array(
                    'path'     => $target,
                    'filename' => $attachmentTitle,
                    'type'     => $detectedMime
                );
                vgs_log_submit('FILE_SAVED', "Attachment stored: {$attachmentTitle}", array('size' => $fsize, 'type' => $detectedMime));
            }
        }
    }
}

// 4. Формирование тела письма для VK WorkSpace
$when = date('d.m.Y H:i:s');
$htmlBody  = "<!DOCTYPE html><html><body style=\"font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;padding:12px;background:#f8fafc;\">";
$htmlBody .= "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;\">";
$htmlBody .= "<div style=\"background:#0f172a;color:#ffffff;padding:20px 24px;\">";
$htmlBody .= "<h2 style=\"color:#38bdf8;margin:0 0 6px;font-size:20px;\">ВОЛГАСТРОЙ 76 — Новая заявка с сайта</h2>";
$htmlBody .= "<p style=\"margin:0;color:#94a3b8;font-size:13px;\">Поступила: {$when} • ID в базе: #" . ($leadId ?: '—') . "</p>";
$htmlBody .= "</div>";

$htmlBody .= "<div style=\"padding:24px;\">";
$htmlBody .= "<table cellpadding=\"8\" cellspacing=\"0\" style=\"border-collapse:collapse;width:100%;font-size:14px;\">";
$htmlBody .= "<tr style=\"border-bottom:1px solid #f1f5f9;\"><td style=\"width:150px;color:#64748b;font-weight:bold;\">Имя клиента:</td><td><b>" . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</b></td></tr>";
$htmlBody .= "<tr style=\"border-bottom:1px solid #f1f5f9;\"><td style=\"color:#64748b;font-weight:bold;\">Телефон:</td><td><a href=\"tel:+{$digits}\" style=\"font-size:17px;font-weight:bold;color:#0284c7;text-decoration:none;\">" . htmlspecialchars($phone, ENT_QUOTES, 'UTF-8') . "</a></td></tr>";
if ($location) {
    $htmlBody .= "<tr style=\"border-bottom:1px solid #f1f5f9;\"><td style=\"color:#64748b;font-weight:bold;\">Локация участка:</td><td>" . htmlspecialchars($location, ENT_QUOTES, 'UTF-8') . "</td></tr>";
}
$htmlBody .= "<tr style=\"border-bottom:1px solid #f1f5f9;\"><td style=\"color:#64748b;font-weight:bold;\">Тип объекта:</td><td><b>" . htmlspecialchars($objectType, ENT_QUOTES, 'UTF-8') . "</b></td></tr>";
if ($estimatedCost) {
    $htmlBody .= "<tr style=\"border-bottom:1px solid #f1f5f9;\"><td style=\"color:#64748b;font-weight:bold;\">Предварит. стоимость:</td><td><b style=\"color:#0284c7;font-size:15px;\">" . htmlspecialchars($estimatedCost, ENT_QUOTES, 'UTF-8') . "</b></td></tr>";
}
if ($comment && $comment !== '—') {
    $htmlBody .= "<tr style=\"border-bottom:1px solid #f1f5f9;\"><td style=\"color:#64748b;font-weight:bold;vertical-align:top;\">Комментарий:</td><td>" . nl2br(htmlspecialchars($comment, ENT_QUOTES, 'UTF-8')) . "</td></tr>";
}
$htmlBody .= "</table>";

if ($calcTxt !== '') {
    $htmlBody .= "<div style=\"margin:20px 0 10px;padding:16px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;\">";
    $htmlBody .= "<b style=\"color:#15803d;font-size:14px;\">🧮 Данные сметного расчёта:</b><br>";
    $htmlBody .= "<div style=\"margin-top:8px;font-size:13px;line-height:1.5;color:#166534;\">" . nl2br(htmlspecialchars($calcTxt, ENT_QUOTES, 'UTF-8')) . "</div>";
    $htmlBody .= "</div>";
}

if (!empty($savedAttachments)) {
    $htmlBody .= "<div style=\"margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #0284c7;border-radius:6px;font-size:13px;\">";
    $htmlBody .= "<b style=\"color:#0369a1;\">📎 Прикреплённые файлы:</b><br>";
    foreach ($savedAttachments as $att) {
        $htmlBody .= "• <b>" . htmlspecialchars($att['filename'], ENT_QUOTES, 'UTF-8') . "</b><br>";
    }
    $htmlBody .= "</div>";
}

$htmlBody .= "<p style=\"color:#94a3b8;font-size:12px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px;\">Сайт: <a href=\"https://volgastroy76.ru\" style=\"color:#0284c7;\">volgastroy76.ru</a></p>";
$htmlBody .= "</div></div></body></html>";

// 5. Отправка email через почтовый шлюз (SMTP VK WorkSpace / mail())
require_once __DIR__ . '/mailer.php';

$notifyEmails = !empty($VGS_CFG['notify_emails']) ? (array)$VGS_CFG['notify_emails'] : array('order@volgastroy76.ru');
$subject      = 'Новая заявка с сайта: ' . $objectType . ' (' . $phone . ')';

$sentCount = 0;
$totalRecipients = 0;

foreach ($notifyEmails as $to) {
    $to = trim($to);
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        continue;
    }
    $totalRecipients++;

    $diagLog = array();
    $res = VgsMailer::send($to, $subject, $htmlBody, $savedAttachments, $diagLog);

    if ($res) {
        $sentCount++;
        vgs_log_submit('MAIL_SUCCESS', "Notification sent to {$to}", array(
            'lead_id'     => $leadId,
            'attachments' => count($savedAttachments),
            'diag'        => end($diagLog)
        ));
    } else {
        vgs_log_submit('MAIL_FAILED', "Failed sending to {$to}", array(
            'lead_id' => $leadId,
            'diag'    => $diagLog
        ));
    }

    usleep(150000);
}

// 6. Отправка в Telegram (резервный мгновенный канал)
if (!empty($VGS_CFG['telegram_token']) && !empty($VGS_CFG['telegram_chat_id']) && function_exists('curl_init')) {
    $tgText  = "🔔 <b>Новая заявка ВОЛГАСТРОЙ 76</b>\n\n";
    $tgText .= "👤 <b>Имя:</b> " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "\n";
    $tgText .= "📞 <b>Телефон:</b> <code>" . htmlspecialchars($phone, ENT_QUOTES, 'UTF-8') . "</code>\n";
    if ($location) { $tgText .= "📍 <b>Локация:</b> " . htmlspecialchars($location, ENT_QUOTES, 'UTF-8') . "\n"; }
    $tgText .= "📋 <b>Объект:</b> " . htmlspecialchars($objectType, ENT_QUOTES, 'UTF-8') . "\n";
    if ($estimatedCost) { $tgText .= "💰 <b>Предварит. стоимость:</b> " . htmlspecialchars($estimatedCost, ENT_QUOTES, 'UTF-8') . "\n"; }
    if ($comment && $comment !== '—') { $tgText .= "💬 <b>Комментарий:</b> " . htmlspecialchars($comment, ENT_QUOTES, 'UTF-8') . "\n"; }
    if ($calcTxt) { $tgText .= "\n🧮 <b>Смета:</b>\n" . htmlspecialchars($calcTxt, ENT_QUOTES, 'UTF-8') . "\n"; }

    $ch = curl_init("https://api.telegram.org/bot" . $VGS_CFG['telegram_token'] . "/sendMessage");
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(array(
            'chat_id' => $VGS_CFG['telegram_chat_id'],
            'text' => $tgText,
            'parse_mode' => 'HTML'
        )),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 4,
        CURLOPT_SSL_VERIFYPEER => false
    ));
    @curl_exec($ch);
    @curl_close($ch);
}

// 7. Формирование финального ответа
if ($sentCount > 0) {
    vgs_json_resp(array(
        'ok'          => true,
        'id'          => $leadId,
        'sent'        => $sentCount,
        'attachments' => count($savedAttachments)
    ), 200);
} else {
    vgs_log_submit('ALL_RECIPIENTS_FAILED', 'All mail() calls returned false', array('lead_id' => $leadId, 'total_recipients' => $totalRecipients));
    vgs_json_resp(array(
        'ok'          => false,
        'err'         => 'mail',
        'id'          => $leadId,
        'sent'        => 0,
        'attachments' => count($savedAttachments),
        'error'       => 'Не удалось передать письмо почтовому серверу'
    ), 500);
}
