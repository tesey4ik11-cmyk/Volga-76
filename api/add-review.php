<?php
/**
 * Добавляет новый отзыв с сайта (approved = 0 — ждёт проверки в админке).
 */
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    vgs_out(array('ok' => false, 'err' => 'method'), 405);
}

$d = vgs_json_in();

/* Хонепот: поле r-hp заполняют только боты. */
if (!empty($d['hp'])) {
    vgs_out(array('ok' => true));
}

$name    = vgs_clean(isset($d['name']) ? $d['name'] : '', 100);
$place   = vgs_clean(isset($d['place']) ? $d['place'] : '', 100);
$service = vgs_clean(isset($d['service']) ? $d['service'] : '', 100);
$text    = vgs_clean(isset($d['text']) ? $d['text'] : '', 1200);
$rating  = isset($d['rating']) ? (int)$d['rating'] : 5;
if ($rating < 1) { $rating = 1; }
if ($rating > 5) { $rating = 5; }

if (vgs_len($name) < 2) {
    vgs_out(array('ok' => false, 'err' => 'name'), 422);
}
if (vgs_len($text) < 20) {
    vgs_out(array('ok' => false, 'err' => 'text'), 422);
}

/* Простая защита от ссылочного спама */
if (preg_match_all('~https?://|www\.~i', $text) > 1) {
    vgs_out(array('ok' => false, 'err' => 'spam'), 422);
}

$ip = vgs_ip();

if (vgs_limited('reviews', $ip, 3, 180)) {
    vgs_out(array('ok' => false, 'err' => 'rate'), 429);
}

try {
    $pdo = vgs_db();
    $ins = $pdo->prepare(
        'INSERT INTO reviews (name, place, service, rating, text, approved, ip)
         VALUES (?, ?, ?, ?, ?, 0, ?)'
    );
    $ins->execute(array($name, $place, $service, $rating, $text, $ip));
} catch (Exception $e) {
    vgs_out(array('ok' => false, 'err' => 'db'), 500);
}

vgs_out(array('ok' => true));
