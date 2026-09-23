<?php
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) { http_response_code(404); exit; }

return array(
    'db_host'          => 'localhost',
    'db_port'          => 3306,
    'db_name'          => '',
    'db_user'          => '',
    'db_pass'          => '',
    
    // Основной email отправителя и имя
    'mail_from'        => '',
    'mail_from_name'   => '',

    // Прямой SMTP 
    'smtp_enabled'     => true,
    'smtp_host'        => '', // 
    'smtp_port'        => ,            // 465 (SSL) или 587 (TLS)
    'smtp_secure'      => '',          // 'ssl' или 'tls'
    'smtp_user'        => '',
    'smtp_pass'        => '',             // 
    
    // Адреса получателей заявок
    'notify_emails'    => array(
        'order@volgastroy76.ru',
        'a.zvonaryov@volgastroy76.ru',
        's.tyagunov@volgastroy76.ru',
        'info@volgastroy76.ru',
    ),

    // Секретный ключ для запуска диагностического теста /api/test-mail.php?key=vgs76_timeweb_2026
    'test_mail_key'    => '',

    'telegram_token'   => '',
    'telegram_chat_id' => '',
    'max_worker_url'   => '',
    'cache_dir'        => __DIR__ . '/../data/cache',
);
