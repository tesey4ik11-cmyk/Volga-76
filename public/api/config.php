<?php
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) { http_response_code(404); exit; }
/* Локальный конфиг для превью (SQLite). На хостинге создаётся install.php с MySQL. */
return array(
    'driver'        => 'sqlite',
    'db_path'       => __DIR__ . '/../data/vgs.sqlite',
    'notify_emails' => array(),
    'mail_from'     => 'order@volgastroy76.ru',
    'smtp_host'     => '',
    'smtp_port'     => 465,
    'smtp_user'     => '',
    'smtp_pass'     => '',
    'max_worker_url'=> '',
    'cache_dir'     => __DIR__ . '/../data/cache',
);
