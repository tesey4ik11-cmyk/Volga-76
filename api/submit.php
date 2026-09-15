<?php
/**
 * Обработчик формы заявки. Принимает JSON или обычный POST,
 * сохраняет заявку в БД (вместе с расчётом из калькулятора)
 * и отправляет уведомления на почту (и в MAX, если настроен).
 */
require __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    vgs_out(array('ok' => false, 'err' => 'method'), 405);
}

$d = vgs_json_in();

/* Хонепот: поле f-hp заполняют только боты — «молча» считаем успехом. */
if (!empty($d['hp'])) {
    vgs_out(array('ok' => true));
}

$name  = vgs_clean(isset($d['name']) ? $d['name'] : '', 100);
$phone = vgs_clean(isset($d['phone']) ? $d['phone'] : '', 30);
$topic = vgs_clean(isset($d['subject']) ? $d['subject'] : '', 150);
$msg   = vgs_clean(isset($d['message']) ? $d['message'] : '', 3000);

/* Расчёт из калькулятора — отдельным полем */
$calcTxt = vgs_calc_text(isset($d['calc']) ? $d['calc'] : null);

if ($name === '' || $name === '—') {
    $name = 'Аноним';
}
$digits = preg_replace('/\D/', '', $phone);
if ($digits === '' || strlen($digits) < 10) {
    vgs_out(array('ok' => false, 'err' => 'phone'), 422);
}
if ($topic === '') { $topic = '—'; }
if ($msg === '')   { $msg = '—'; }

$ip = vgs_ip();

if (vgs_limited('leads', $ip, 5, 60)) {
    vgs_out(array('ok' => false, 'err' => 'rate'), 429);
}

try {
    $pdo = vgs_db();
    /* Пытаемся записать с расчётом; если колонки calc ещё нет — пишем без неё */
    try {
        $st = $pdo->prepare('INSERT INTO leads (name, phone, topic, message, calc, ip) VALUES (?, ?, ?, ?, ?, ?)');
        $st->execute(array($name, $phone, $topic, $msg, $calcTxt, $ip));
    } catch (Exception $inner) {
        $st = $pdo->prepare('INSERT INTO leads (name, phone, topic, message, ip) VALUES (?, ?, ?, ?, ?)');
        $st->execute(array($name, $phone, $topic, ($calcTxt ? $msg . "\n\n" . $calcTxt : $msg), $ip));
    }
} catch (Exception $e) {
    vgs_out(array('ok' => false, 'err' => 'db'), 500);
}

vgs_send_notify($name, $phone, $topic, $msg, $calcTxt);

vgs_out(array('ok' => true));

/**
 * Уведомления: email на все адреса из config.php + MAX-бот, если настроен.
 * Способ отправки: SMTP (если заполнен smtp_host в config.php) или PHP mail().
 */
function vgs_send_notify($name, $phone, $topic, $msg, $calcTxt = '')
{
    global $VGS_CFG;

    $toList   = isset($VGS_CFG['notify_emails']) ? $VGS_CFG['notify_emails'] : array();
    $mailFrom = isset($VGS_CFG['mail_from']) && $VGS_CFG['mail_from'] ? $VGS_CFG['mail_from'] : 'order@volgastroy76.ru';

    $subject  = 'Новая заявка — ВОЛГАСТРОЙ 76';
    $fromName = 'ВОЛГАСТРОЙ 76 — сайт';
    $when     = date('d.m.Y H:i');

    $phoneDigits = preg_replace('/\D/', '', $phone);

    $body  = '<html><body style="font-family:Arial,sans-serif;color:#222;font-size:14px">';
    $body .= '<h2 style="color:#0b6bbf;margin:0 0 14px">Новая заявка с сайта volgastroy76.ru</h2>';
    $body .= '<table cellpadding="6" style="border-collapse:collapse">';
    $body .= '<tr><td style="padding:4px 10px 4px 0"><b>Дата:</b></td><td>' . $when . '</td></tr>';
    $body .= '<tr><td style="padding:4px 10px 4px 0"><b>Имя:</b></td><td>' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '</td></tr>';
    $body .= '<tr><td style="padding:4px 10px 4px 0"><b>Телефон:</b></td><td><a href="tel:+' . $phoneDigits . '" style="font-size:17px;font-weight:bold;color:#0b6bbf">' . htmlspecialchars($phone, ENT_QUOTES, 'UTF-8') . '</a></td></tr>';
    $body .= '<tr><td style="padding:4px 10px 4px 0"><b>Тема:</b></td><td>' . htmlspecialchars($topic, ENT_QUOTES, 'UTF-8') . '</td></tr>';
    $body .= '<tr><td style="padding:4px 10px 4px 0;vertical-align:top"><b>Сообщение:</b></td><td>' . nl2br(htmlspecialchars($msg, ENT_QUOTES, 'UTF-8')) . '</td></tr>';
    $body .= '</table>';
    if ($calcTxt !== '') {
        $body .= '<div style="margin:16px 0;padding:14px 16px;background:#eef4fb;border-left:4px solid #0b6bbf;border-radius:4px">';
        $body .= '<b style="color:#0b6bbf">🧮 Клиент прислал расчёт из калькулятора:</b><br>';
        $body .= nl2br(htmlspecialchars($calcTxt, ENT_QUOTES, 'UTF-8'));
        $body .= '</div>';
    }
    $body .= '<p style="color:#777;font-size:12px">Отправлено автоматически. Ответить можно, позвонив клиенту.</p>';
    $body .= '</body></html>';

    $validTo = array();
    foreach ($toList as $to) {
        $to = trim($to);
        if (filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $validTo[] = $to;
        }
    }

    /* SMTP, если настроен */
    $smtpHost = isset($VGS_CFG['smtp_host']) && $VGS_CFG['smtp_host'] ? $VGS_CFG['smtp_host'] : '';
    $smtpOk = false;
    if ($smtpHost && $validTo) {
        $smtpOk = vgs_smtp_send(
            $smtpHost,
            isset($VGS_CFG['smtp_port']) ? (int)$VGS_CFG['smtp_port'] : 465,
            isset($VGS_CFG['smtp_user']) ? $VGS_CFG['smtp_user'] : '',
            isset($VGS_CFG['smtp_pass']) ? $VGS_CFG['smtp_pass'] : '',
            $mailFrom, $validTo, $subject, $body, $fromName
        );
    }

    /* Фолбэк на PHP mail() */
    if (!$smtpOk && $validTo) {
        $subjectEnc = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $headers  = 'From: =?UTF-8?B?' . base64_encode($fromName) . "?= <" . $mailFrom . ">\r\n";
        $headers .= 'MIME-Version: 1.0' . "\r\n";
        $headers .= 'Content-Type: text/html; charset=UTF-8' . "\r\n";
        $headers .= 'Content-Transfer-Encoding: 8bit' . "\r\n";
        $envFrom = '-f' . $mailFrom;
        $ok = true;
        foreach ($validTo as $to) {
            $r = @mail($to, $subjectEnc, $body, $headers, $envFrom);
            if (!$r) { $ok = false; }
        }
        if (!$ok) {
            vgs_mail_err('mail() — не удалось отправить на: ' . implode(', ', $validTo));
        }
    }

    /* MAX-бот (когда будет настроен): одна строка в config.php -> max_worker_url */
    if (!empty($VGS_CFG['max_worker_url'])) {
        vgs_send_max($VGS_CFG['max_worker_url'], $name, $phone, $topic, $msg . ($calcTxt ? "\n\n" . $calcTxt : ''));
    }
}

function vgs_mail_err($msg)
{
    @file_put_contents(
        __DIR__ . '/mail-error.log',
        '[' . date('d.m.Y H:i:s') . '] ' . $msg . PHP_EOL,
        FILE_APPEND
    );
}

/**
 * Отправка письма по SMTP (465 SSL, 587 STARTTLS; AUTH LOGIN или PLAIN).
 * При неудаче одной порт/сервер комбинации пробует резервный порт и логирует причину.
 */
function vgs_smtp_send($host, $port, $user, $pass, $from, $toList, $subject, $body, $fromName)
{
    $ports = array((int)$port);
    $fallback = ((int)$port == 465) ? 587 : 465;
    if (!in_array($fallback, $ports)) {
        $ports[] = $fallback;
    }
    $lastErr = '';
    foreach ($ports as $p) {
        $res = vgs_smtp_try($host, $p, $user, $pass, $from, $toList, $subject, $body, $fromName);
        if ($res === true) {
            return true;
        }
        $lastErr = $res;
    }
    vgs_mail_err('SMTP ' . $host . ' не смог отправить: ' . $lastErr);
    return false;
}

/**
 * Одна попытка SMTP-сессии. Возвращает true при успехе или текст ошибки.
 */
function vgs_smtp_try($host, $port, $user, $pass, $from, $toList, $subject, $body, $fromName)
{
    $steps = array();
    $step  = function ($name, $resp) use (&$steps, $host, $port) {
        $code = substr($resp, 0, 3);
        $steps[] = $name . ' [' . $port . '] -> ' . trim($resp);
        return $code;
    };
    $fail = function ($where) use (&$steps, $host, $port) {
        return $where . ' на ' . $host . ':' . $port . ' — ответы: ' . implode(' | ', $steps);
    };

    $useSsl = ($port == 465);
    $ctx = stream_context_create(array('ssl' => array('verify_peer' => false, 'verify_peer_name' => false)));
    $sock = @stream_socket_client(
        ($useSsl ? 'ssl://' : 'tcp://') . $host . ':' . $port,
        $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx
    );
    if (!$sock) {
        return 'connect: ' . $host . ':' . $port . ' (' . $errstr . ')';
    }
    stream_set_timeout($sock, 15);

    $line = fgets($sock, 4096);
    if ($step('greeting', $line) !== '220') { fclose($sock); return $fail('приветствие'); }

    fwrite($sock, "EHLO " . $host . "\r\n");
    $caps = '';
    while ($line = fgets($sock, 4096)) {
        $caps .= $line;
        if (substr($line, 3, 1) !== '-') { break; }
    }
    $step('ehlo', trim($caps));

    if (!$useSsl) {
        fwrite($sock, "STARTTLS\r\n");
        $line = fgets($sock, 4096);
        if ($step('starttls', $line) !== '220') { fclose($sock); return $fail('STARTTLS'); }
        stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        fwrite($sock, "EHLO " . $host . "\r\n");
        $caps = '';
        while ($line = fgets($sock, 4096)) {
            $caps .= $line;
            if (substr($line, 3, 1) !== '-') { break; }
        }
        $step('ehlo2', $caps);
    }

    $allowPlain = stripos($caps, 'PLAIN') !== false;
    $authOk = false;

    /* AUTH LOGIN */
    fwrite($sock, "AUTH LOGIN\r\n");
    $line = fgets($sock, 4096);
    $step('auth-login', $line);
    if (substr($line, 0, 3) === '334') {
        fwrite($sock, base64_encode($user) . "\r\n");
        $line = fgets($sock, 4096);
        $step('auth-login-user', $line);
        if (substr($line, 0, 3) === '334') {
            fwrite($sock, base64_encode($pass) . "\r\n");
            $line = fgets($sock, 4096);
            $step('auth-login-pass', $line);
            if (substr($line, 0, 3) === '235') { $authOk = true; }
        }
    }

    /* AUTH PLAIN, если LOGIN не вышел */
    if (!$authOk && $allowPlain) {
        fwrite($sock, "AUTH PLAIN " . base64_encode("\0" . $user . "\0" . $pass) . "\r\n");
        $line = fgets($sock, 4096);
        $step('auth-plain', $line);
        if (substr($line, 0, 3) === '235') { $authOk = true; }
    }

    if (!$authOk) { fclose($sock); return $fail('авторизация (проверьте логин/пароль)'); }

    fwrite($sock, "MAIL FROM:<" . $from . ">\r\n");
    $line = fgets($sock, 4096);
    if ($step('mail-from', $line) !== '250') { fclose($sock); return $fail('MAIL FROM'); }

    $rcptOk = false;
    foreach ($toList as $to) {
        fwrite($sock, "RCPT TO:<" . $to . ">\r\n");
        $line = fgets($sock, 4096);
        $step('rcpt', $line);
        if (substr($line, 0, 3) === '250') { $rcptOk = true; }
    }
    if (!$rcptOk) { fclose($sock); return $fail('все адреса отклонены (RCPT TO)'); }

    fwrite($sock, "DATA\r\n");
    $line = fgets($sock, 4096);
    if ($step('data', $line) !== '354') { fclose($sock); return $fail('DATA'); }

    $header  = 'From: =?UTF-8?B?' . base64_encode($fromName) . '?= <' . $from . ">\r\n";
    $header .= 'To: ' . implode(', ', $toList) . "\r\n";
    $header .= 'Subject: =?UTF-8?B?' . base64_encode($subject) . "?=\r\n";
    $header .= 'MIME-Version: 1.0' . "\r\n";
    $header .= 'Content-Type: text/html; charset=UTF-8' . "\r\n";
    $header .= 'Content-Transfer-Encoding: 8bit' . "\r\n";
    $header .= 'X-Mailer: PHP/' . phpversion() . "\r\n";

    fwrite($sock, $header . "\r\n" . $body . "\r\n.\r\n");
    $line = fgets($sock, 4096);
    $step('dot', $line);
    fwrite($sock, "QUIT\r\n");
    fclose($sock);

    if (substr($line, 0, 3) !== '250') {
        return $fail('данные не приняты');
    }
    return true;
}

function vgs_send_max($url, $name, $phone, $topic, $msg)
{
    if (!function_exists('curl_init')) { return; }
    $payload = json_encode(array(
        'name'    => $name,
        'phone'   => $phone,
        'subject' => $topic,
        'message' => $msg,
        'hp'      => '',
    ), JSON_UNESCAPED_UNICODE);
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => array('Content-Type: application/json'),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ));
    @curl_exec($ch);
    @curl_close($ch);
}
