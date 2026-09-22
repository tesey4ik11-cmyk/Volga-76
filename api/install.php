<?php
/**
 * Одноразовая установка ВОЛГАСТРОЙ 76.
 * Создаёт таблицы (leads, reviews, admins), администратора и файл config.php.
 * После успешной установки файл рекомендуется удалить.
 */
$configPath = __DIR__ . '/config.php';
$installed  = file_exists($configPath);
$error      = '';
$done       = false;
$unlinkMsg  = '';

if (isset($_GET['delete']) && $_GET['delete'] === '1') {
    if (file_exists(__FILE__)) {
        $ok = @unlink(__FILE__);
        $unlinkMsg = $ok ? 'Файл install.php удалён.' : 'Не удалось удалить install.php — удалите его вручную.';
        header('Location: admin.php'); // install.php после удаления не выполнится; редирект на админку
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($installed) {
        $error = 'Установка уже выполнена: config.php существует. Для безопасности удалите install.php.';
    } else {
        $dbHost    = trim($_POST['db_host'] ?? 'localhost');
        $dbPort    = (int)($_POST['db_port'] ?? 3306);
        $dbName    = trim($_POST['db_name'] ?? '');
        $dbUser    = trim($_POST['db_user'] ?? '');
        $dbPass    = (string)($_POST['db_pass'] ?? '');
        $adminUser = trim($_POST['admin_user'] ?? 'admin');
        $adminPass = (string)($_POST['admin_pass'] ?? '');
        $adminPass2= (string)($_POST['admin_pass2'] ?? '');
        $mailFrom  = trim($_POST['mail_from'] ?? 'order@volgastroy76.ru');
        $smtpHost  = trim($_POST['smtp_host'] ?? '');
        $smtpPort  = (int)($_POST['smtp_port'] ?? 465);
        $smtpUser  = trim($_POST['smtp_user'] ?? '');
        $smtpPass  = (string)($_POST['smtp_pass'] ?? '');

        $notifyIn  = str_replace(';', ',', $_POST['notify'] ?? '');
        $notifyRaw = array_map('trim', explode(',', $notifyIn));
        $notify    = array();
        foreach ($notifyRaw as $mail) {
            if (filter_var($mail, FILTER_VALIDATE_EMAIL)) {
                $notify[] = $mail;
            }
        }
        if (empty($notify)) {
            $notify = array('order@volgastroy76.ru', 'a.zvonaryov@volgastroy76.ru', 's.tyagunov@volgastroy76.ru', 'info@volgastroy76.ru');
        }

        if ($dbName === '' || $dbUser === '') {
            $error = 'Укажите имя базы данных и пользователя.';
        } elseif ($adminUser === '' || mb_strlen($adminUser) < 2) {
            $error = 'Логин администратора — минимум 2 символа.';
        } elseif (strlen($adminPass) < 6) {
            $error = 'Пароль администратора — минимум 6 символов.';
        } elseif ($adminPass !== $adminPass2) {
            $error = 'Пароли администратора не совпадают.';
        } elseif (!filter_var($mailFrom, FILTER_VALIDATE_EMAIL)) {
            $error = 'Некорректный адрес «От кого» для почты.';
        }

        if (!$error) {
            try {
                $pdo = new PDO(
                    'mysql:host=' . $dbHost . ';port=' . $dbPort . ';dbname=' . $dbName . ';charset=utf8mb4',
                    $dbUser, $dbPass,
                    array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false)
                );

                $schema = array(
                    "CREATE TABLE IF NOT EXISTS leads (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        phone VARCHAR(30) NOT NULL,
                        topic VARCHAR(150) NOT NULL DEFAULT '',
                        message TEXT NOT NULL,
                        ip VARCHAR(45) NOT NULL DEFAULT '',
                        status ENUM('new','viewed','archived') NOT NULL DEFAULT 'new',
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

                    "CREATE TABLE IF NOT EXISTS reviews (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        place VARCHAR(100) NOT NULL DEFAULT '',
                        service VARCHAR(100) NOT NULL DEFAULT '',
                        rating TINYINT UNSIGNED NOT NULL DEFAULT 5,
                        text TEXT NOT NULL,
                        ip VARCHAR(45) NOT NULL DEFAULT '',
                        approved TINYINT UNSIGNED NOT NULL DEFAULT 0,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

                    "CREATE TABLE IF NOT EXISTS admins (
                        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(100) NOT NULL DEFAULT '',
                        login VARCHAR(100) NOT NULL DEFAULT '',
                        password_hash VARCHAR(255) NOT NULL DEFAULT '',
                        pass_hash VARCHAR(255) NOT NULL DEFAULT '',
                        role VARCHAR(50) NOT NULL DEFAULT 'admin',
                        last_login DATETIME NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_username (username),
                        INDEX ix_login (login)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
                );
                foreach ($schema as $sql) {
                    $pdo->exec($sql);
                }

                $hash = password_hash($adminPass, PASSWORD_DEFAULT);
                $ins  = $pdo->prepare('INSERT INTO admins (username, login, password_hash, pass_hash, role) VALUES (?, ?, ?, ?, "admin")');
                $ins->execute(array($adminUser, $adminUser, $hash, $hash));

                $cfg = array(
                    'db_host' => $dbHost,
                    'db_port' => $dbPort,
                    'db_name' => $dbName,
                    'db_user' => $dbUser,
                    'db_pass' => $dbPass,
                    'mail_from' => $mailFrom,
                    'notify_emails' => $notify,
                    'smtp_host' => $smtpHost,
                    'smtp_port' => $smtpPort,
                    'smtp_user' => $smtpUser,
                    'smtp_pass' => $smtpPass,
                    'max_worker_url' => '',
                );
                $code = "<?php\n// Сгенерировано install.php — вручную менять при необходимости.\nreturn " . var_export($cfg, true) . ";\n";
                if (@file_put_contents($configPath, $code) === false) {
                    $error = 'Не удалось записать config.php. Проверьте права на запись в папке api/.';
                } else {
                    $done = true;
                }
            } catch (PDOException $e) {
                $error = 'Ошибка подключения к базе: ' . $e->getMessage();
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Установка — ВОЛГАСТРОЙ 76</title>
<style>
body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#0d1526;color:#e8eef7;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.box{background:#14203a;border:1px solid #22345a;border-radius:14px;padding:32px;max-width:640px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.45)}
h1{margin:0 0 6px;font-size:24px}
h1 span{color:#39bdf6}
p{color:#93a7c4;margin:4px 0 18px;font-size:14px}
label{display:block;font-size:13px;color:#9fb4d4;margin:14px 0 6px}
input{width:100%;box-sizing:border-box;background:#0d1526;border:1px solid #2b3d63;color:#e8eef7;padding:11px 12px;border-radius:8px;font-size:14px}
input:focus{outline:none;border-color:#39bdf6}
.row{display:flex;gap:12px}
.row>div{flex:1}
button{margin-top:22px;width:100%;background:linear-gradient(135deg,#39bdf6,#1479d6);color:#fff;border:0;padding:13px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}
button:hover{filter:brightness(1.1)}
.ok{background:#123b24;border:1px solid #2b8a52;color:#a3e6c1;padding:12px;border-radius:8px;font-size:14px;margin:14px 0}
.err{background:#3d1720;border:1px solid #8a2b3a;color:#f2b0bd;padding:12px;border-radius:8px;font-size:14px;margin:14px 0}
code{background:#0d1526;padding:2px 6px;border-radius:5px;color:#7cc9ff}
a{color:#39bdf6}
.note{font-size:12px;color:#6b7f96;line-height:1.5}
</style>
</head>
<body>
<div class="box">
<h1>Установка <span>ВОЛГАСТРОЙ 76</span></h1>
<?php if ($done): ?>
  <div class="ok"><b>Установка завершена!</b></div>
  <p>Таблицы созданы, администратор добавлен, <code>config.php</code> записан.</p>
  <p>
    <b>Важно:</b> удалите файл <code>install.php</code>:
    <a href="?delete=1">Удалить install.php</a> (или через файловый менеджер).
  </p>
  <p>
    Админ-панель: <a href="admin.php">admin.php</a><br>
    На сайт: <a href="/">volgastroy76.ru</a>
  </p>
<?php else: ?>
  <p>Укажите данные MySQL из Timeweb Panel (Базы данных → Создать) и логин администратора.</p>
  <?php if ($error): ?><div class="err"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div><?php endif; ?>
  <?php if ($installed): ?>
    <div class="ok">Установка уже выполнена — <code>config.php</code> существует.</div>
    <p>Перейти в <a href="admin.php">админ-панель</a>? И удалите <code>install.php</code>: <a href="?delete=1">удалить</a>.</p>
  <?php else: ?>
  <form method="post" autocomplete="off">
    <label>Хост БД (обычно localhost)</label>
    <input type="text" name="db_host" value="localhost" required>
    <div class="row">
      <div><label>Имя БД</label><input type="text" name="db_name" required placeholder="как в панели"></div>
      <div><label>Порт</label><input type="number" name="db_port" value="3306"></div>
    </div>
    <div class="row">
      <div><label>Пользователь БД</label><input type="text" name="db_user" required></div>
      <div><label>Пароль БД</label><input type="password" name="db_pass"></div>
    </div>
    <div class="row">
      <div><label>Логин администратора</label><input type="text" name="admin_user" value="admin" required></div>
      <div><label>Пароль</label><input type="password" name="admin_pass" required></div>
      <div><label>Ещё раз</label><input type="password" name="admin_pass2" required></div>
    </div>
    <label>Отправитель писем (email на вашем домене)</label>
    <input type="text" name="mail_from" value="order@volgastroy76.ru">
    <label>Куда слать заявки (через запятую)</label>
    <textarea name="notify" rows="3" style="width:100%;box-sizing:border-box;background:#0d1526;border:1px solid #2b3d63;color:#e8eef7;padding:11px 12px;border-radius:8px;font-size:14px;resize:vertical">order@volgastroy76.ru, a.zvonaryov@volgastroy76.ru, s.tyagunov@volgastroy76.ru, info@volgastroy76.ru</textarea>
    <p class="note" style="margin:12px 0 0">SMTP — надёжная отправка через почтовый ящик Timeweb (рекомендуется). Если оставить пустым — письма попробует отправить стандартная функция <code>mail()</code>.</p>
    <div class="row">
      <div><label>SMTP-сервер</label><input type="text" name="smtp_host" placeholder="smtp.timeweb.ru"></div>
      <div><label>Порт</label><input type="number" name="smtp_port" value="465"></div>
    </div>
    <div class="row">
      <div><label>SMTP-логин (адрес ящика)</label><input type="text" name="smtp_user" placeholder="order@volgastroy76.ru"></div>
      <div><label>SMTP-пароль ящика</label><input type="password" name="smtp_pass"></div>
    </div>
    <button type="submit">Установить</button>
    <p class="note" style="margin-top:14px">Создаст таблицы <code>leads</code>, <code>reviews</code>, <code>admins</code> и одиноразовый вход администратора. После установки удалите этот файл.</p>
  </form>
  <?php endif; ?>
<?php endif; ?>
</div>
</body>
</html>