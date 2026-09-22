<?php
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) { http_response_code(404); exit; }

return array(
    'db_host'          => 'localhost',
    'db_port'          => 3306,
    'db_name'          => 'cu947103_volgastroy76',
    'db_user'          => 'cu947103_volgastroy76',
    'db_pass'          => 'Papa1211!',
    
    // Основной email отправителя и имя
    'mail_from'        => 'order@volgastroy76.ru',
    'mail_from_name'   => 'ВОЛГАСТРОЙ 76',

    // Прямой SMTP для VK WorkSpace / Mail.ru / Timeweb (гарантирует 100% доставку во Входящие)
    'smtp_enabled'     => true,
    'smtp_host'        => 'smtp.mail.ru', // Для VK WorkSpace: smtp.mail.ru
    'smtp_port'        => 465,            // 465 (SSL) или 587 (TLS)
    'smtp_secure'      => 'ssl',          // 'ssl' или 'tls'
    'smtp_user'        => 'tesey4ik@vk.com',
    'smtp_pass'        => 'qFvFM5uultlpu1nhAPZP',             // Пароль для внешних приложений VK WorkSpace / ящика
    
    // Адреса получателей заявок
    'notify_emails'    => array(
        'order@volgastroy76.ru',
        'a.zvonaryov@volgastroy76.ru',
        's.tyagunov@volgastroy76.ru',
        'info@volgastroy76.ru',
    ),

    // Секретный ключ для запуска диагностического теста /api/test-mail.php?key=vgs76_timeweb_2026
    'test_mail_key'    => 'vgs76_timeweb_2026',

    'telegram_token'   => '',
    'telegram_chat_id' => '',
    'max_worker_url'   => '',
    'cache_dir'        => __DIR__ . '/../data/cache',
);
