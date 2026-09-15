<?php
/**
 * Отдаёт одобренные отзывы. Кэшируется в файл на 5 минут,
 * поэтому при любом трафике БД читается максимум раз в 5 минут.
 */
require __DIR__ . '/db.php';

header('Cache-Control: public, max-age=300');

$rows = vgs_cache_get('reviews', 300);

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
        vgs_out(array(), 200);
    }
}

vgs_out($rows);
