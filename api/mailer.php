<?php
/**
 * Надежный почтовый шлюз ВОЛГАСТРОЙ 76
 * Поддерживает:
 * 1. Прямой SMTP (VK WorkSpace / smtp.mail.ru / smtp.timeweb.ru / Yandex / SSL 465 / TLS 587)
 * 2. Резервный PHP mail() через Sendmail хостинга
 * 3. Формирование стандартизированных RFC 5322 multipart/mixed писем с вложениями
 */
error_reporting(E_ALL);

class VgsMailer
{
    public static function send($to, $subject, $htmlBody, $attachments = array(), &$diagLog = array())
    {
        $cfgFile = __DIR__ . '/config.php';
        $cfg = file_exists($cfgFile) ? require($cfgFile) : array();

        $mailFrom     = !empty($cfg['mail_from']) ? trim($cfg['mail_from']) : 'order@volgastroy76.ru';
        $mailFromName = !empty($cfg['mail_from_name']) ? trim($cfg['mail_from_name']) : 'ВОЛГАСТРОЙ 76';
        $smtpEnabled  = !empty($cfg['smtp_enabled']) || !empty($cfg['smtp_pass']);

        if ($smtpEnabled && !empty($cfg['smtp_pass'])) {
            $smtpHost   = !empty($cfg['smtp_host']) ? trim($cfg['smtp_host']) : 'smtp.mail.ru';
            $smtpPort   = !empty($cfg['smtp_port']) ? (int)$cfg['smtp_port'] : 465;
            $smtpSecure = !empty($cfg['smtp_secure']) ? trim($cfg['smtp_secure']) : 'ssl';
            $smtpUser   = !empty($cfg['smtp_user']) ? trim($cfg['smtp_user']) : $mailFrom;
            $smtpPass   = (string)$cfg['smtp_pass'];

            // Для Mail.ru / VK / Yandex адрес отправителя MAIL FROM обязан совпадать с логином авторизации
            $senderEmail = (filter_var($smtpUser, FILTER_VALIDATE_EMAIL)) ? $smtpUser : $mailFrom;

            $res = self::sendSmtp($smtpHost, $smtpPort, $smtpSecure, $smtpUser, $smtpPass, $senderEmail, $mailFromName, $to, $subject, $htmlBody, $attachments, $diagLog);
            if ($res) {
                return true;
            }
            $diagLog[] = "[SMTP_FALLBACK] Переключение на резервный mail()...";
        }

        // Резервная отправка через mail()
        return self::sendPhpMail($mailFrom, $mailFromName, $to, $subject, $htmlBody, $attachments, $diagLog);
    }

    /**
     * Прямая отправка через SMTP сокет (без сторонних библиотек)
     */
    public static function sendSmtp($host, $port, $secure, $user, $pass, $from, $fromName, $to, $subject, $htmlBody, $attachments = array(), &$log = array())
    {
        // Если передан логин в виде email (например tesey4ik@vk.com), 
        // то MAIL FROM и From в протоколе SMTP ОБЯЗАН совпадать с $user,
        // иначе Mail.ru / VK возвращает: "501 sender address must match authenticated user"
        if (!empty($user) && filter_var($user, FILTER_VALIDATE_EMAIL)) {
            $from = trim($user);
        }

        $log[] = "[SMTP_START] Подключение к {$host}:{$port} (шифрование: {$secure})...";

        $prefix = ($secure === 'ssl' || $port == 465) ? 'ssl://' : '';
        $socketHost = $prefix . $host;

        $context = stream_context_create(array(
            'ssl' => array(
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true,
            )
        ));

        $socket = @stream_socket_client($socketHost . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            $log[] = "[SMTP_ERROR] Не удалось открыть сокет к {$socketHost}:{$port} ({$errno}: {$errstr})";
            return false;
        }

        stream_set_timeout($socket, 15);

        $greeting = self::smtpRead($socket, $log);
        if (substr($greeting, 0, 3) !== '220') {
            $log[] = "[SMTP_ERROR] Неверное приветствие сервера: {$greeting}";
            fclose($socket);
            return false;
        }

        // EHLO
        $serverName = !empty($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'volgastroy76.ru';
        self::smtpWrite($socket, "EHLO {$serverName}", $log);
        $ehloResp = self::smtpRead($socket, $log);
        if (substr($ehloResp, 0, 3) !== '250') {
            self::smtpWrite($socket, "HELO {$serverName}", $log);
            self::smtpRead($socket, $log);
        }

        // STARTTLS при необходимости (если порт 587)
        if (($secure === 'tls' || $port == 587) && $secure !== 'ssl') {
            self::smtpWrite($socket, "STARTTLS", $log);
            $tlsResp = self::smtpRead($socket, $log);
            if (substr($tlsResp, 0, 3) === '220') {
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    $log[] = "[SMTP_ERROR] Сбой включения TLS шифрования";
                    fclose($socket);
                    return false;
                }
                self::smtpWrite($socket, "EHLO {$serverName}", $log);
                self::smtpRead($socket, $log);
            }
        }

        // AUTH LOGIN
        if (!empty($user) && !empty($pass)) {
            self::smtpWrite($socket, "AUTH LOGIN", $log);
            $authResp1 = self::smtpRead($socket, $log);
            if (substr($authResp1, 0, 3) !== '334') {
                $log[] = "[SMTP_ERROR] Сервер не запросил логин: {$authResp1}";
                fclose($socket);
                return false;
            }

            self::smtpWrite($socket, base64_encode($user), $log, "[LOGIN_SENT]");
            $authResp2 = self::smtpRead($socket, $log);
            if (substr($authResp2, 0, 3) !== '334') {
                $log[] = "[SMTP_ERROR] Неверный ответ на логин: {$authResp2}";
                fclose($socket);
                return false;
            }

            self::smtpWrite($socket, base64_encode($pass), $log, "[PASSWORD_SENT]");
            $authResp3 = self::smtpRead($socket, $log);
            if (substr($authResp3, 0, 3) !== '235') {
                $log[] = "[SMTP_AUTH_FAILED] Ошибка авторизации SMTP: {$authResp3}";
                fclose($socket);
                return false;
            }
            $log[] = "[SMTP_AUTH_OK] Авторизация успешна для {$user}";
        }

        // MAIL FROM
        self::smtpWrite($socket, "MAIL FROM:<{$from}>", $log);
        $fromResp = self::smtpRead($socket, $log);
        if (substr($fromResp, 0, 3) !== '250') {
            $log[] = "[SMTP_ERROR] Ошибка MAIL FROM: {$fromResp}";
            fclose($socket);
            return false;
        }

        // RCPT TO
        self::smtpWrite($socket, "RCPT TO:<{$to}>", $log);
        $rcptResp = self::smtpRead($socket, $log);
        if (substr($rcptResp, 0, 3) !== '250' && substr($rcptResp, 0, 3) !== '251') {
            $log[] = "[SMTP_ERROR] Ошибка RCPT TO для {$to}: {$rcptResp}";
            fclose($socket);
            return false;
        }

        // DATA
        self::smtpWrite($socket, "DATA", $log);
        $dataResp = self::smtpRead($socket, $log);
        if (substr($dataResp, 0, 3) !== '354') {
            $log[] = "[SMTP_ERROR] Ошибка DATA: {$dataResp}";
            fclose($socket);
            return false;
        }

        // Формирование MIME письма
        $rawMessage = self::buildRawMimeMessage($from, $fromName, $to, $subject, $htmlBody, $attachments);

        // Отправка тела + точка-терминатор
        // Экранирование строк, начинающихся с точки
        $rawMessage = preg_replace('/^\./m', '..', $rawMessage);
        fwrite($socket, $rawMessage . "\r\n.\r\n");
        $log[] = "[SMTP_DATA_SENT] Сообщение передано (размер " . strlen($rawMessage) . " байт)";

        $doneResp = self::smtpRead($socket, $log);
        if (substr($doneResp, 0, 3) !== '250') {
            $log[] = "[SMTP_ERROR] Ошибка подтверждения отправки: {$doneResp}";
            fclose($socket);
            return false;
        }

        self::smtpWrite($socket, "QUIT", $log);
        self::smtpRead($socket, $log);
        fclose($socket);

        $log[] = "[SMTP_SUCCESS] Письмо успешно принято сервером {$host} для {$to}";
        return true;
    }

    /**
     * Отправка через встроенный PHP mail()
     */
    public static function sendPhpMail($from, $fromName, $to, $subject, $htmlBody, $attachments = array(), &$log = array())
    {
        $log[] = "[MAIL_START] Отправка через PHP mail() на {$to}...";

        $subjectEnc  = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $fromNameB64 = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $msgId = '<vgs_' . time() . '_' . substr(md5(uniqid($to, true)), 0, 10) . '@volgastroy76.ru>';
        $dateRfc = date('r');

        if (!empty($attachments)) {
            $boundary = "==Multipart_Boundary_vgs_" . md5(uniqid((string)time(), true)) . "x";

            $headers  = "From: {$fromNameB64} <{$from}>\r\n";
            $headers .= "Reply-To: {$from}\r\n";
            $headers .= "Date: {$dateRfc}\r\n";
            $headers .= "Message-ID: {$msgId}\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
            $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
            $headers .= "Auto-Submitted: auto-generated\r\n";

            $messageBody  = "--{$boundary}\r\n";
            $messageBody .= "Content-Type: text/html; charset=UTF-8\r\n";
            $messageBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $messageBody .= $htmlBody . "\r\n\r\n";

            foreach ($attachments as $att) {
                $rawContent = isset($att['content']) ? $att['content'] : (isset($att['path']) && file_exists($att['path']) ? file_get_contents($att['path']) : false);
                if ($rawContent !== false) {
                    $b64Content = chunk_split(base64_encode($rawContent));
                    $safeAsciiName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $att['filename']);

                    $messageBody .= "--{$boundary}\r\n";
                    $messageBody .= "Content-Type: {$att['type']}; name=\"{$safeAsciiName}\"\r\n";
                    $messageBody .= "Content-Disposition: attachment; filename=\"{$safeAsciiName}\"\r\n";
                    $messageBody .= "Content-Transfer-Encoding: base64\r\n\r\n";
                    $messageBody .= $b64Content . "\r\n";
                }
            }
            $messageBody .= "--{$boundary}--\r\n";
        } else {
            $headers  = "From: {$fromNameB64} <{$from}>\r\n";
            $headers .= "Reply-To: {$from}\r\n";
            $headers .= "Date: {$dateRfc}\r\n";
            $headers .= "Message-ID: {$msgId}\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "Content-Transfer-Encoding: 8bit\r\n";
            $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
            $headers .= "Auto-Submitted: auto-generated\r\n";

            $messageBody = $htmlBody;
        }

        $envSender = "-f{$from}";
        $res = @mail($to, $subjectEnc, $messageBody, $headers, $envSender);
        if (!$res) {
            $res = @mail($to, $subjectEnc, $messageBody, $headers);
        }

        if ($res) {
            $log[] = "[MAIL_SUCCESS] mail() успешно передал письмо в очередь Sendmail для {$to}";
            return true;
        } else {
            $log[] = "[MAIL_ERROR] mail() вернул false для {$to}";
            return false;
        }
    }

    /**
     * Сборка сырого MIME сообщения для SMTP
     */
    private static function buildRawMimeMessage($from, $fromName, $to, $subject, $htmlBody, $attachments = array())
    {
        $subjectEnc  = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        $fromNameB64 = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
        $msgId = '<vgs_' . time() . '_' . substr(md5(uniqid($to, true)), 0, 10) . '@volgastroy76.ru>';
        $dateRfc = date('r');

        $out = "";
        $out .= "From: {$fromNameB64} <{$from}>\r\n";
        $out .= "Reply-To: <order@volgastroy76.ru>\r\n";
        $out .= "To: <{$to}>\r\n";
        $out .= "Subject: {$subjectEnc}\r\n";
        $out .= "Date: {$dateRfc}\r\n";
        $out .= "Message-ID: {$msgId}\r\n";
        $out .= "MIME-Version: 1.0\r\n";
        $out .= "Auto-Submitted: auto-generated\r\n";
        $out .= "X-Mailer: VGS-SMTP/2026\r\n";

        if (!empty($attachments)) {
            $boundary = "==Multipart_Boundary_vgs_" . md5(uniqid((string)time(), true)) . "x";
            $out .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n\r\n";

            $out .= "--{$boundary}\r\n";
            $out .= "Content-Type: text/html; charset=UTF-8\r\n";
            $out .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $out .= $htmlBody . "\r\n\r\n";

            foreach ($attachments as $att) {
                $rawContent = isset($att['content']) ? $att['content'] : (isset($att['path']) && file_exists($att['path']) ? file_get_contents($att['path']) : false);
                if ($rawContent !== false) {
                    $b64Content = chunk_split(base64_encode($rawContent));
                    $safeAsciiName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $att['filename']);

                    $out .= "--{$boundary}\r\n";
                    $out .= "Content-Type: {$att['type']}; name=\"{$safeAsciiName}\"\r\n";
                    $out .= "Content-Disposition: attachment; filename=\"{$safeAsciiName}\"\r\n";
                    $out .= "Content-Transfer-Encoding: base64\r\n\r\n";
                    $out .= $b64Content . "\r\n";
                }
            }
            $out .= "--{$boundary}--\r\n";
        } else {
            $out .= "Content-Type: text/html; charset=UTF-8\r\n";
            $out .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
            $out .= $htmlBody;
        }

        return $out;
    }

    private static function smtpWrite($socket, $cmd, &$log = array(), $maskLog = '')
    {
        $display = $maskLog ?: $cmd;
        $log[] = "> {$display}";
        fwrite($socket, $cmd . "\r\n");
    }

    private static function smtpRead($socket, &$log = array())
    {
        $response = "";
        while ($line = fgets($socket, 515)) {
            $response .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        $log[] = "< " . trim($response);
        return $response;
    }
}
