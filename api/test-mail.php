<?php
/**
 * Скрипт расширенной диагностики и тестирования отправки почты ВОЛГАСТРОЙ 76
 * Поддерживает:
 * 1. Прямую проверку SMTP (VK WorkSpace / smtp.mail.ru / SSL 465 / TLS 587) с интерактивным логом сокета
 * 2. Проверку PHP mail()
 * 3. Отправку HTML с PDF и XLSX вложениями
 * 
 * Использование: https://volgastroy76.ru/api/test-mail.php?key=vgs76_timeweb_2026
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/html; charset=utf-8');

$cfgFile = __DIR__ . '/config.php';
if (!file_exists($cfgFile)) {
    http_response_code(500);
    exit('<h1>Ошибка: config.php не найден</h1>');
}
$VGS_CFG = require $cfgFile;
require_once __DIR__ . '/mailer.php';

// Проверка секретного ключа доступа
$reqKey = $_GET['key'] ?? ($_POST['key'] ?? '');
$expectedKey = !empty($VGS_CFG['test_mail_key']) ? $VGS_CFG['test_mail_key'] : 'vgs76_timeweb_2026';

if (empty($reqKey) || $reqKey !== $expectedKey) {
    http_response_code(403);
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Доступ ограничен</title>';
    echo '<style>body{font-family:system-ui,-apple-system,sans-serif;padding:40px;background:#0f172a;color:#f8fafc;max-width:600px;margin:auto}</style></head><body>';
    echo '<h2 style="color:#f87171">🔒 Доступ к тесту почты защищён секретным ключом</h2>';
    echo '<p>Укажите ключ в URL параметре <code>?key=...</code> или введите его ниже:</p>';
    echo '<form method="GET" action=""><input type="password" name="key" placeholder="Секретный ключ из config.php" style="padding:8px 12px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#fff;width:260px"> <button type="submit" style="padding:8px 16px;background:#0284c7;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer">Войти</button></form>';
    echo '</body></html>';
    exit;
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$targetEmail = trim($_POST['target_email'] ?? ($_GET['target_email'] ?? 'order@volgastroy76.ru'));
$testType = $_POST['test_type'] ?? ($_GET['test_type'] ?? 'all');
$sendMethod = $_POST['send_method'] ?? ($_GET['send_method'] ?? 'smtp');

$smtpHost = trim($_POST['smtp_host'] ?? ($VGS_CFG['smtp_host'] ?? 'smtp.mail.ru'));
$smtpPort = (int)($_POST['smtp_port'] ?? ($VGS_CFG['smtp_port'] ?? 465));
$smtpSecure = trim($_POST['smtp_secure'] ?? ($VGS_CFG['smtp_secure'] ?? 'ssl'));
$smtpUser = trim($_POST['smtp_user'] ?? ($VGS_CFG['smtp_user'] ?? 'order@volgastroy76.ru'));
$smtpPass = (string)($_POST['smtp_pass'] ?? ($VGS_CFG['smtp_pass'] ?? ''));

$mailFrom = trim($VGS_CFG['mail_from'] ?? 'order@volgastroy76.ru');
$fromName = trim($VGS_CFG['mail_from_name'] ?? 'ВОЛГАСТРОЙ 76');
$notifyList = (array)($VGS_CFG['notify_emails'] ?? array('order@volgastroy76.ru'));
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <title>Диагностика и тестирование почты — ВОЛГАСТРОЙ 76</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; max-width: 960px; margin: auto; background: #0f172a; color: #f8fafc; line-height: 1.5; }
        h1, h2, h3 { color: #38bdf8; margin-top: 0; }
        .card { background: #1e293b; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #334155; }
        .param-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
        .param-table td { padding: 8px 12px; border-bottom: 1px solid #334155; }
        .param-table tr td:first-child { color: #94a3b8; font-weight: bold; width: 240px; }
        input[type=text], input[type=email], input[type=password], input[type=number], select { background: #0f172a; border: 1px solid #475569; color: #fff; padding: 9px 12px; border-radius: 6px; width: 340px; font-size: 14px; }
        button { background: #0284c7; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px; }
        button:hover { background: #0369a1; }
        code { background: #334155; padding: 2px 6px; border-radius: 4px; color: #a5f3fc; }
        pre { background: #020617; padding: 14px; border-radius: 6px; overflow: auto; color: #cbd5e1; font-size: 13px; line-height: 1.4; border: 1px solid #1e293b; }
        .ok { color: #4ade80; font-weight: bold; }
        .err { color: #f87171; font-weight: bold; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .badge-ok { background: #064e3b; color: #6ee7b7; }
        .badge-warn { background: #78350f; color: #fcd34d; }
        .info-box { background: #082f49; border: 1px solid #0284c7; padding: 14px; border-radius: 8px; font-size: 13px; margin-bottom: 15px; color: #bae6fd; }
    </style>
</head>
<body>

<h1>🛠️ Диагностика доставки почты ВОЛГАСТРОЙ 76</h1>

<div class="info-box">
    <b>💡 Почему письма не доходили на адреса @volgastroy76.ru?</b><br>
    Домен <code>volgastroy76.ru</code> обслуживается почтой <b>VK WorkSpace (Mail.ru для бизнеса)</b>. Серверы Mail.ru отклоняют письма от имени собственного домена, если они отправлены с внешнего IP Timeweb без авторизации через SMTP. <br>
    <b>Решение:</b> отправка напрямую через <b>SMTP VK WorkSpace (<code>smtp.mail.ru:465 SSL</code>)</b>. Письма подписываются официальным DKIM и моментально доставляются во «Входящие».
</div>

<div class="card">
    <h3>1. Текущие настройки почты</h3>
    <table class="param-table">
        <tr>
            <td>Отправитель (From):</td>
            <td><code><?= htmlspecialchars($mailFrom) ?></code> (<?= htmlspecialchars($fromName) ?>)</td>
        </tr>
        <tr>
            <td>Список рассылки заявок:</td>
            <td><code><?= implode(', ', $notifyList) ?></code></td>
        </tr>
        <tr>
            <td>SMTP-сервер VK WorkSpace:</td>
            <td><code><?= htmlspecialchars($smtpHost) ?>:<?= $smtpPort ?> (<?= htmlspecialchars($smtpSecure) ?>)</code></td>
        </tr>
        <tr>
            <td>Логин SMTP:</td>
            <td><code><?= htmlspecialchars($smtpUser) ?></code></td>
        </tr>
        <tr>
            <td>Пароль SMTP в config.php:</td>
            <td>
                <?php if (!empty($VGS_CFG['smtp_pass'])): ?>
                    <span class="badge badge-ok">✓ Настроен (длина <?= strlen($VGS_CFG['smtp_pass']) ?> симв.)</span>
                <?php else: ?>
                    <span class="badge badge-warn">⚠️ Не задан в config.php (введите ниже для теста)</span>
                <?php endif; ?>
            </td>
        </tr>
    </table>
</div>

<div class="card">
    <h3>2. Запуск тестирования доставки</h3>
    <form method="POST" action="?key=<?= urlencode($reqKey) ?>">
        <input type="hidden" name="action" value="send_test">
        
        <p>
            <label><b>Метод отправки:</b></label><br>
            <select name="send_method" onchange="document.getElementById('smtp_fields').style.display = this.value === 'smtp' ? 'block' : 'none';">
                <option value="smtp" <?= $sendMethod === 'smtp' ? 'selected' : '' ?>>1. Прямой SMTP через сокет (smtp.mail.ru:465) — РЕКОМЕНДУЕТСЯ</option>
                <option value="mail" <?= $sendMethod === 'mail' ? 'selected' : '' ?>>2. Нативный PHP mail() через Sendmail Timeweb</option>
            </select>
        </p>

        <div id="smtp_fields" style="display: <?= $sendMethod === 'smtp' ? 'block' : 'none' ?>; background: #0f172a; padding: 14px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #334155;">
            <p style="margin-top:0;"><b>Параметры SMTP для проверки:</b></p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="font-size:12px;color:#94a3b8">Хост SMTP:</label><br>
                    <input type="text" name="smtp_host" value="<?= htmlspecialchars($smtpHost) ?>">
                </div>
                <div>
                    <label style="font-size:12px;color:#94a3b8">Порт и протокол:</label><br>
                    <input type="number" name="smtp_port" value="<?= $smtpPort ?>" style="width:120px">
                    <select name="smtp_secure" style="width:140px">
                        <option value="ssl" <?= $smtpSecure === 'ssl' ? 'selected' : '' ?>>SSL (порт 465)</option>
                        <option value="tls" <?= $smtpSecure === 'tls' ? 'selected' : '' ?>>TLS (порт 587)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;color:#94a3b8">Логин (email ящика):</label><br>
                    <input type="email" name="smtp_user" value="<?= htmlspecialchars($smtpUser) ?>">
                </div>
                <div>
                    <label style="font-size:12px;color:#94a3b8">Пароль / Пароль приложения VK WorkSpace:</label><br>
                    <input type="password" name="smtp_pass" placeholder="Введите пароль ящика или пароль приложения" value="<?= htmlspecialchars($smtpPass) ?>">
                </div>
            </div>
            <p style="font-size:11px;color:#94a3b8;margin-bottom:0;margin-top:8px;">
                * Как получить пароль приложения в VK WorkSpace: <i>Вход в почту mail.ru под order@volgastroy76.ru → Настройки → Пароль и безопасность → Пароли для внешних приложений → Создать</i>.
            </p>
        </div>

        <p>
            <label><b>Адрес получателя:</b></label><br>
            <input type="email" name="target_email" required value="<?= htmlspecialchars($targetEmail) ?>">
        </p>

        <p>
            <label><b>Тип сообщения:</b></label><br>
            <select name="test_type">
                <option value="all" <?= $testType === 'all' ? 'selected' : '' ?>>1. Полный комплект заявки (HTML + Смета XLSX + КП PDF)</option>
                <option value="html" <?= $testType === 'html' ? 'selected' : '' ?>>2. Простое HTML-письмо (без файлов)</option>
                <option value="pdf" <?= $testType === 'pdf' ? 'selected' : '' ?>>3. Письмо с PDF вложением</option>
                <option value="xlsx" <?= $testType === 'xlsx' ? 'selected' : '' ?>>4. Письмо со сметой XLSX</option>
            </select>
        </p>

        <p>
            <button type="submit">🚀 Запустить отправку и тест</button>
        </p>
    </form>
</div>

<?php
if ($action === 'send_test' && filter_var($targetEmail, FILTER_VALIDATE_EMAIL)) {
    echo '<div class="card">';
    echo '<h3>Результат отправки на ' . htmlspecialchars($targetEmail) . ':</h3>';

    $subject = 'Тестовое сообщение ВОЛГАСТРОЙ 76 [' . strtoupper($sendMethod) . '] — ' . date('d.m.Y H:i:s');
    $htmlBody  = "<!DOCTYPE html><html><body style=\"font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;padding:12px;background:#f8fafc;\">";
    $htmlBody .= "<div style=\"max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;\">";
    $htmlBody .= "<div style=\"background:#0f172a;color:#ffffff;padding:16px 20px;\"><h3 style=\"color:#38bdf8;margin:0;\">ВОЛГАСТРОЙ 76 — Тест почтового шлюза</h3></div>";
    $htmlBody .= "<div style=\"padding:20px;\">";
    $htmlBody .= "<p>Это проверочное письмо подтверждает успешную настройку отправки почты.</p>";
    $htmlBody .= "<ul>";
    $htmlBody .= "<li>Метод: <b>" . htmlspecialchars($sendMethod) . "</b></li>";
    $htmlBody .= "<li>Тип теста: <b>" . htmlspecialchars($testType) . "</b></li>";
    $htmlBody .= "<li>Дата/время: <b>" . date('d.m.Y H:i:s') . "</b></li>";
    $htmlBody .= "<li>Отправитель: <b>" . htmlspecialchars($mailFrom) . "</b></li>";
    $htmlBody .= "</ul>";
    $htmlBody .= "</div></div></body></html>";

    $attachments = array();
    if ($testType === 'pdf' || $testType === 'all') {
        $attachments[] = array(
            'filename' => 'Kommercheskoe_Predlozhenie_TEST.pdf',
            'type'     => 'application/pdf',
            'content'  => "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
        );
    }
    if ($testType === 'xlsx' || $testType === 'all') {
        $tempXlsx = sys_get_temp_dir() . '/test_' . time() . '.xlsx';
        $zip = new ZipArchive();
        if ($zip->open($tempXlsx, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
            $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
            $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
            $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Смета" sheetId="1" r:id="rId1"/></sheets></workbook>');
            $zip->addFromString('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Тестовая смета ВОЛГАСТРОЙ 76</t></is></c></row></sheetData></worksheet>');
            $zip->close();
            $xlsxContent = file_get_contents($tempXlsx);
            @unlink($tempXlsx);
        } else {
            $xlsxContent = "PK\x03\x04\x14\x00\x00\x00\x08\x00";
        }
        $attachments[] = array(
            'filename' => 'Smeta_Volgastroy76_TEST.xlsx',
            'type'     => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'content'  => $xlsxContent
        );
    }

    $diagLog = array();
    if ($sendMethod === 'smtp') {
        $effectiveSender = (filter_var($smtpUser, FILTER_VALIDATE_EMAIL)) ? $smtpUser : $mailFrom;
        $res = VgsMailer::sendSmtp($smtpHost, $smtpPort, $smtpSecure, $smtpUser, $smtpPass, $effectiveSender, $fromName, $targetEmail, $subject, $htmlBody, $attachments, $diagLog);
    } else {
        $res = VgsMailer::sendPhpMail($mailFrom, $fromName, $targetEmail, $subject, $htmlBody, $attachments, $diagLog);
    }

    if ($res) {
        echo '<p class="ok">✓ УСПЕХ: Сообщение успешно отправлено на ' . htmlspecialchars($targetEmail) . '!</p>';
        echo '<p>Проверьте папку «Входящие» в ящике <b>' . htmlspecialchars($targetEmail) . '</b>.</p>';
        if ($sendMethod === 'smtp' && !empty($smtpPass) && empty($VGS_CFG['smtp_pass'])) {
            echo '<div class="info-box" style="background:#064e3b;border-color:#10b981;color:#d1fae5;">';
            echo '<b>Совет:</b> Чтобы этот проверенный пароль сохранился для всех будущих заявок с сайта, пропишите его в <code>api/config.php</code> в поле <code>\'smtp_pass\' => \'' . htmlspecialchars($smtpPass) . '\'</code> или сохраните через админ-панель.';
            echo '</div>';
        }
    } else {
        echo '<p class="err">✗ ОШИБКА ОТПРАВКИ: Сервер вернул ошибку.</p>';
    }

    echo '<h4>Журнал выполнения (SMTP Diagnostic Log):</h4>';
    echo '<pre>' . htmlspecialchars(implode(PHP_EOL, $diagLog)) . '</pre>';
    echo '</div>';
}
?>

<div class="card">
    <h3>3. Последние записи из <code>api/mail.log</code></h3>
    <?php
    $logFile = __DIR__ . '/mail.log';
    if (file_exists($logFile)) {
        $lines = array_slice(explode(PHP_EOL, trim(file_get_contents($logFile))), -20);
        echo '<pre>' . htmlspecialchars(implode(PHP_EOL, $lines)) . '</pre>';
    } else {
        echo '<p style="color:#94a3b8">Журнал mail.log пуст.</p>';
    }
    ?>
</div>

</body>
</html>
