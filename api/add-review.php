<?php
/**
 * Добавление отзыва ВОЛГАСТРОЙ 76
 * Все новые отзывы сохраняются с approved = 0 (требуют одобрения в админ-панели).
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-VGS-API-Version: 2026-09-17-2');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    vgs_out(array('ok' => false, 'err' => 'method', 'error' => 'Метод запроса должен быть POST'), 405);
}

$d = vgs_json_in();

/* Хонепот ловушка для ботов */
if (!empty($d['hp'])) {
    vgs_out(array('ok' => true, 'id' => 0, 'approved' => 0, 'msg' => 'Отзыв принят на модерацию'));
}

$name    = vgs_clean(isset($d['name']) ? $d['name'] : '', 100);
$place   = vgs_clean(isset($d['place']) ? $d['place'] : '', 100);
$service = vgs_clean(isset($d['service']) ? $d['service'] : '', 100);
$text    = vgs_clean(isset($d['text']) ? $d['text'] : '', 1500);
$rating  = isset($d['rating']) ? (int)$d['rating'] : 5;
if ($rating < 1) { $rating = 1; }
if ($rating > 5) { $rating = 5; }

if (vgs_len($name) < 2) {
    vgs_out(array('ok' => false, 'err' => 'name', 'error' => 'Пожалуйста, укажите ваше имя (не менее 2 символов)'), 422);
}
if (vgs_len($text) < 10) {
    vgs_out(array('ok' => false, 'err' => 'text', 'error' => 'Текст отзыва должен содержать не менее 10 символов'), 422);
}

/* Защита от спам-ссылок */
if (preg_match_all('~https?://|www\.~i', $text) > 1) {
    vgs_out(array('ok' => false, 'err' => 'spam', 'error' => 'Отзыв содержит недопустимые внешние ссылки'), 422);
}

$ip = vgs_ip();

if (vgs_limited('reviews', $ip, 5, 180)) {
    vgs_out(array('ok' => false, 'err' => 'rate', 'error' => 'Слишком много запросов. Пожалуйста, попробуйте через пару минут'), 429);
}

$reviewId = 0;
try {
    $pdo = vgs_db();
    $ins = $pdo->prepare(
        'INSERT INTO reviews (name, place, service, rating, text, approved, ip)
         VALUES (?, ?, ?, ?, ?, 0, ?)'
    );
    $ins->execute(array($name, $place, $service, $rating, $text, $ip));
    $reviewId = (int)$pdo->lastInsertId();
    vgs_cache_drop('reviews');
} catch (Exception $e) {
    vgs_out(array('ok' => false, 'err' => 'db', 'error' => 'Ошибка сохранения в базу данных: ' . $e->getMessage()), 500);
}

// Логирование в mail.log
$logFile = __DIR__ . '/mail.log';
$time = date('Y-m-d H:i:s');
@file_put_contents($logFile, "[{$time}] [REVIEW_SAVED] Review #{$reviewId} saved with approved=0 for author '{$name}'" . PHP_EOL, FILE_APPEND);

// Почтовое уведомление администратору о новом отзыве через VgsMailer
require_once __DIR__ . '/mailer.php';

$cfgFile = __DIR__ . '/config.php';
$VGS_CFG = file_exists($cfgFile) ? require $cfgFile : array();
$notifyEmails = !empty($VGS_CFG['notify_emails']) ? (array)$VGS_CFG['notify_emails'] : array('order@volgastroy76.ru');

$stars = str_repeat('★', $rating) . str_repeat('☆', 5 - $rating);
$subj = 'Новый отзыв на модерацию (' . $name . ', оценка ' . $rating . '/5) — ВОЛГАСТРОЙ 76';

$body  = "<!DOCTYPE html><html><body style=\"font-family:Arial,sans-serif;color:#1e293b;padding:16px;background:#f8fafc;\">";
$body .= "<div style=\"max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;\">";
$body .= "<h3 style=\"color:#0284c7;margin-top:0;\">Новый отзыв с сайта (требует подтверждения)</h3>";
$body .= "<p><b>Автор:</b> " . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . "</p>";
$body .= "<p><b>Оценка:</b> <span style=\"color:#f59e0b;font-size:18px;\">" . $stars . "</span> (" . $rating . "/5)</p>";
if ($place) { $body .= "<p><b>Локация:</b> " . htmlspecialchars($place, ENT_QUOTES, 'UTF-8') . "</p>"; }
if ($service) { $body .= "<p><b>Услуга/Объект:</b> " . htmlspecialchars($service, ENT_QUOTES, 'UTF-8') . "</p>"; }
$body .= "<p><b>Текст отзыва:</b><br><blockquote style=\"background:#f1f5f9;border-left:4px solid #0284c7;padding:10px 14px;margin:8px 0;\">" . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')) . "</blockquote></p>";
$body .= "<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:16px 0;\">";
$body .= "<p style=\"font-size:13px;color:#64748b;\">Для одобрения отзыва перейдите во вкладку «Отзывы» в панели управления:<br><a href=\"https://volgastroy76.ru/admin.php?t=reviews\" style=\"color:#0284c7;font-weight:bold;\">Открыть админ-панель →</a></p>";
$body .= "</div></body></html>";

$mailSentCount = 0;
foreach ($notifyEmails as $to) {
    $to = trim($to);
    if (filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $diagLog = array();
        $res = VgsMailer::send($to, $subj, $body, array(), $diagLog);
        if ($res) {
            $mailSentCount++;
        }
        usleep(150000);
    }
}

if ($mailSentCount > 0) {
    @file_put_contents($logFile, "[{$time}] [REVIEW_MAIL_SUCCESS] Moderation notification sent for review #{$reviewId} to {$mailSentCount} recipient(s)" . PHP_EOL, FILE_APPEND);
} else {
    @file_put_contents($logFile, "[{$time}] [REVIEW_MAIL_FAILED] Failed to send email moderation notification for review #{$reviewId}" . PHP_EOL, FILE_APPEND);
}

vgs_out(array(
    'ok'        => true,
    'id'        => $reviewId,
    'approved'  => 0,
    'mail_sent' => ($mailSentCount > 0),
    'msg'       => 'Отзыв успешно отправлен на модерацию и появится на сайте после подтверждения'
));
