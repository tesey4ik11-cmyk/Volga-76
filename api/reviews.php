<?php
/**
 * Отдаёт одобренные отзывы (GET) или принимает новый отзыв на модерацию (POST).
 */
error_reporting(E_ALL);
ini_set('display_errors', 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require __DIR__ . '/add-review.php';
    exit;
}

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');
header('X-VGS-API-Version: 2026-09-17-2');

$rows = vgs_cache_get('reviews', 60);

if ($rows === null) {
    try {
        $pdo = vgs_db();
        $st = $pdo->query(
            'SELECT name, place, service, rating, text, created_at
             FROM reviews WHERE approved = 1
             ORDER BY created_at DESC LIMIT 60'
        );
        $rows = $st->fetchAll();
        foreach ($rows as $i => $r) {
            $rows[$i]['rating'] = (int)$r['rating'];
        }
        vgs_cache_put('reviews', $rows);
    } catch (Exception $e) {
        $rows = array();
    }
}

vgs_out(is_array($rows) ? $rows : array());
