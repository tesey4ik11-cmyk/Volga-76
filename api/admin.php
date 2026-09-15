<?php
/**
 * Админ-панель ВОЛГАСТРОЙ 76:
 *  - вход по логину/паролю (сессия + password_hash);
 *  - просмотр заявок (leads): новые / в работе / архив / удалить;
 *  - модерация отзывов (reviews): одобрить / снять / удалить.
 */
if (!file_exists(__DIR__ . '/config.php')) {
    header('Location: install.php');
    exit;
}

require __DIR__ . '/db.php';

session_start();

$logged = !empty($_SESSION['vgs_admin']);

function csrf_token()
{
    if (empty($_SESSION['vgs_csrf'])) {
        $_SESSION['vgs_csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['vgs_csrf'];
}

function csrf_check()
{
    if (empty($_SESSION['vgs_csrf']) || ($_POST['csrf'] ?? '') !== $_SESSION['vgs_csrf']) {
        http_response_code(403);
        exit('Запрос отклонён (CSRF).');
    }
}

function vgs_rd($t)
{
    header('Location: admin.php?t=' . $t);
    exit;
}

function vgs_fmt($dt)
{
    return $dt ? date('d.m.Y H:i', strtotime($dt)) : '—';
}

function vgs_stars($n)
{
    $n = max(1, min(5, (int)$n));
    return str_repeat('★', $n) . str_repeat('☆', 5 - $n);
}

$flash = '';
$loginError = '';

/* -------- вход -------- */
if (!$logged && $_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['act'] ?? '') === 'login') {
    $u = trim($_POST['username'] ?? '');
    $p = (string)($_POST['password'] ?? '');
    try {
        $pdo = vgs_db();
        $st  = $pdo->prepare('SELECT * FROM admins WHERE username = ? LIMIT 1');
        $st->execute(array($u));
        $row = $st->fetch();
        if ($row && password_verify($p, $row['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['vgs_admin']    = (int)$row['id'];
            $_SESSION['vgs_name']     = $row['username'];
            header('Location: admin.php');
            exit;
        }
        $loginError = 'Неверный логин или пароль.';
        sleep(1);
    } catch (Exception $e) {
        $loginError = 'Ошибка базы данных. Проверьте config.php / работу MySQL.';
    }
}

/* -------- действия (только после входа) -------- */
if ($logged && $_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $act = $_POST['act'] ?? '';
    $id  = (int)($_POST['id'] ?? 0);
    try {
        $pdo = vgs_db();
        if ($id > 0) {
            if ($act === 'lead_view')    { $pdo->prepare('UPDATE leads SET status = \'viewed\' WHERE id = ?')->execute(array($id)); $flash='Заявка отмечена как «в работе».'; vgs_rd('leads'); }
            if ($act === 'lead_archive') { $pdo->prepare('UPDATE leads SET status = \'archived\' WHERE id = ?')->execute(array($id)); $flash='Заявка в архиве.'; vgs_rd('leads'); }
            if ($act === 'lead_unarchive'){ $pdo->prepare('UPDATE leads SET status = \'new\' WHERE id = ?')->execute(array($id));  $flash='Заявка возвращена в новые.'; vgs_rd('leads'); }
            if ($act === 'lead_delete')  { $pdo->prepare('DELETE FROM leads WHERE id = ?')->execute(array($id));  $flash='Заявка удалена.'; vgs_rd('leads'); }
            if ($act === 'rev_approve')  { $pdo->prepare('UPDATE reviews SET approved = 1 WHERE id = ?')->execute(array($id)); $flash='Отзыв опубликован.'; vgs_rd('reviews'); }
            if ($act === 'rev_reject')   { $pdo->prepare('UPDATE reviews SET approved = 0 WHERE id = ?')->execute(array($id)); $flash='Отзыв снят с публикации.'; vgs_rd('reviews'); }
            if ($act === 'rev_delete')   { $pdo->prepare('DELETE FROM reviews WHERE id = ?')->execute(array($id)); $flash='Отзыв удалён.'; vgs_rd('reviews'); }
        }
    } catch (Exception $e) {
        $flash = 'Ошибка операции.';
    }
    if (!$flash) { vgs_rd('leads'); }
}

/* -------- данные для панели -------- */
$statNew     = 0;
$statPending = 0;
$statToday   = 0;
$leads       = array();
$revPending  = array();
$revApproved = array();
if ($logged) {
    try {
        $pdo = vgs_db();
        $statNew     = (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE status = 'new'")->fetchColumn();
        $statPending = (int)$pdo->query('SELECT COUNT(*) FROM reviews WHERE approved = 0')->fetchColumn();
        $statToday   = (int)$pdo->query('SELECT COUNT(*) FROM leads WHERE DATE(created_at) = CURDATE()')->fetchColumn();

        $leads = $pdo->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200')->fetchAll();

        $revPending  = $pdo->query('SELECT * FROM reviews WHERE approved = 0 ORDER BY created_at DESC LIMIT 200')->fetchAll();
        $revApproved = $pdo->query('SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT 100')->fetchAll();
    } catch (Exception $e) {
        $loginError = 'Ошибка базы данных: ' . $e->getMessage();
    }
}

$tab = $_GET['t'] ?? 'leads';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Админ-панель — ВОЛГАСТРОЙ 76</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#eef2f7;color:#223}
header{background:linear-gradient(90deg,#0b1526,#123a6b);color:#fff;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
header .brand{font-weight:800;font-size:17px}
header .brand span{color:#39bdf6}
header a{color:#9fd7ff;text-decoration:none;margin-left:18px}
.wrap{max-width:1100px;margin:20px auto;padding:0 16px}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}
.stat{flex:1;min-width:150px;background:#fff;border:1px solid #dbe3ee;border-radius:12px;padding:14px 18px}
.stat b{font-size:24px;display:block}
.stat span{color:#7a8aa0;font-size:12px}
.stat.red b{color:#ca3b4d}.stat.blue b{color:#1479d6}.stat.green b{color:#1e9e5a}
.tabs{display:flex;gap:8px;margin-bottom:16px}
.tabs a{padding:9px 18px;border-radius:8px;background:#fff;border:1px solid #dbe3ee;color:#32506f;text-decoration:none;font-weight:600}
.tabs a.on{background:#1479d6;border-color:#1479d6;color:#fff}
.card{background:#fff;border:1px solid #dbe3ee;border-radius:12px;padding:16px 18px;margin-bottom:14px}
.card h3{margin:0 0 6px;font-size:15px}
.leadt{font-size:13px;color:#32445f;white-space:pre-wrap}
.lead .meta{color:#7a8aa0;font-size:12px;margin-bottom:6px}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.b-new{background:#ffe1e4;color:#b3273a}.b-viewed{background:#e3efff;color:#1479d6}.b-arch{background:#e8ecef;color:#5b6b7d}
.btn{display:inline-block;border:0;border-radius:7px;padding:7px 13px;font-size:13px;cursor:pointer;font-weight:600;text-decoration:none;margin:4px 4px 0 0}
.btn-green{background:#1e9e5a;color:#fff}.btn-blue{background:#1479d6;color:#fff}.btn-gray{background:#aab6c4;color:#fff}.btn-red{background:#ca3b4d;color:#fff}
.btn-sm{padding:5px 10px;font-size:12px}
.login{max-width:380px;margin:80px auto;background:#fff;border:1px solid #dbe3ee;border-radius:14px;padding:30px}
.login h1{margin:0 0 18px;font-size:20px}
.login input{width:100%;padding:11px 12px;border:1px solid #ccd7e4;border-radius:8px;margin-bottom:12px;font-size:14px}
.login button{width:100%;padding:12px;border:0;border-radius:8px;background:#1479d6;color:#fff;font-size:15px;font-weight:700;cursor:pointer}
.alert{background:#fff6e0;border:1px solid #f0dcaa;color:#7a5b00;padding:10px 14px;border-radius:8px;margin-bottom:14px}
.flash{background:#e3f4ea;border:1px solid #b7e0c6;color:#1e6f40;padding:10px 14px;border-radius:8px;margin-bottom:14px}
.err{background:#ffe1e4;border:1px solid #f2b5bd;color:#a32335;padding:10px 14px;border-radius:8px;margin-bottom:14px}
.revtext{font-size:14px;color:#2a3a52;line-height:1.5;margin:8px 0}
.stars{color:#f5a83c;letter-spacing:2px}
.empty{color:#8a9bb0;padding:20px 0;text-align:center}
.foot{text-align:center;color:#7a8aa0;font-size:12px;margin:30px 0 24px}
hr.sep{border:0;border-top:1px dashed #dbe3ee;margin:18px 0}
a.mute{color:#5b6b7d}
</style>
</head>
<body>

<?php if (!$logged): ?>
  <div class="login">
    <h1>🔐 ВОЛГАСТРОЙ 76<br><small style="color:#7a8aa0;font-weight:400">Панель управления</small></h1>
    <?php if ($loginError): ?><div class="err"><?php echo htmlspecialchars($loginError, ENT_QUOTES, 'UTF-8'); ?></div><?php endif; ?>
    <form method="post" autocomplete="off">
      <input type="hidden" name="act" value="login">
      <input type="text" name="username" placeholder="Логин" autofocus required>
      <input type="password" name="password" placeholder="Пароль" required>
      <button type="submit">Войти</button>
    </form>
    <p style="text-align:center;margin-top:14px"><a href="/" class="mute" style="font-size:13px">← На сайт</a></p>
  </div>
<?php else: ?>

<header>
  <div class="brand">ВОЛГАСТРОЙ <span>76</span> · админ-панель</div>
  <div>
    <a href="/">Открыть сайт</a>
    <a href="logout.php">Выйти (<?php echo htmlspecialchars($_SESSION['vgs_name'] ?? '', ENT_QUOTES, 'UTF-8'); ?>)</a>
  </div>
</header>

<div class="wrap">
  <?php if ($loginError): ?><div class="err"><?php echo htmlspecialchars($loginError, ENT_QUOTES, 'UTF-8'); ?></div><?php endif; ?>
  <?php if ($flash): ?><div class="flash"><?php echo htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></div><?php endif; ?>

  <div class="stats">
    <div class="stat red"><b><?php echo $statNew; ?></b><span>Новых заявок</span></div>
    <div class="stat blue"><b><?php echo $statToday; ?></b><span>Заявок сегодня</span></div>
    <div class="stat green"><b><?php echo $statPending; ?></b><span>Отзывов на проверке</span></div>
  </div>

  <div class="tabs">
    <a href="?t=leads"   class="<?php echo $tab === 'leads' ? 'on' : ''; ?>">Заявки (<?php echo $statNew; ?>)</a>
    <a href="?t=reviews" class="<?php echo $tab === 'reviews' ? 'on' : ''; ?>">Отзывы (<?php echo $statPending; ?>)</a>
  </div>

  <?php if ($tab === 'leads'): ?>
    <?php if (!$leads): ?>
      <div class="card empty">Заявок пока нет.</div>
    <?php else: foreach ($leads as $l): ?>
      <div class="card lead">
        <div class="meta">
          <?php
            $st = $l['status'];
            $bs = $st === 'new' ? 'b-new' : ($st === 'archived' ? 'b-arch' : 'b-viewed');
            $bt = $st === 'new' ? 'Новая' : ($st === 'archived' ? 'Архив' : 'В работе');
          ?>
          <span class="badge <?php echo $bs; ?>"><?php echo $bt; ?></span>
          &nbsp;<?php echo htmlspecialchars(vgs_fmt($l['created_at']), ENT_QUOTES, 'UTF-8'); ?>
        </div>
        <h3><?php echo htmlspecialchars($l['name'], ENT_QUOTES, 'UTF-8'); ?> · <span style="color:#ca3b4d"><?php echo htmlspecialchars($l['phone'], ENT_QUOTES, 'UTF-8'); ?></span></h3>
        <div class="leadt"><b>Тема:</b> <?php echo htmlspecialchars($l['topic'], ENT_QUOTES, 'UTF-8'); ?><br><b>Сообщение:</b> <?php echo htmlspecialchars($l['message'], ENT_QUOTES, 'UTF-8'); ?></div>
        <div class="meta" style="margin-top:8px;color:#a4b1c2">IP: <?php echo htmlspecialchars($l['ip'], ENT_QUOTES, 'UTF-8'); ?></div>
        <form method="post" style="display:inline">
          <input type="hidden" name="csrf" value="<?php echo csrf_token(); ?>">
          <input type="hidden" name="id" value="<?php echo (int)$l['id']; ?>">
          <?php if ($l['status'] === 'new'): ?>
            <button class="btn btn-blue" name="act" value="lead_view">В работу</button>
          <?php endif; ?>
          <?php if ($l['status'] !== 'archived'): ?>
            <button class="btn btn-gray" name="act" value="lead_archive">В архив</button>
          <?php else: ?>
            <button class="btn btn-gray" name="act" value="lead_unarchive">Вернуть в новые</button>
          <?php endif; ?>
          <button class="btn btn-red btn-sm" name="act" value="lead_delete" onclick="return confirm('Удалить заявку?');">Удалить</button>
        </form>
      </div>
    <?php endforeach; endif; ?>

  <?php else: ?>

    <h3 style="margin:6px 0 4px;color:#32506f">На проверке (<?php echo count($revPending); ?>)</h3>
    <?php if (!$revPending): ?>
      <div class="card empty">Нет отзывов, ожидающих проверки.</div>
    <?php else: foreach ($revPending as $r): ?>
      <div class="card">
        <div class="stars"><?php echo vgs_stars($r['rating']); ?></div>
        <b><?php echo htmlspecialchars($r['name'], ENT_QUOTES, 'UTF-8'); ?></b>
        <span class="meta" style="color:#7a8aa0;font-size:12px">
          <?php echo htmlspecialchars($r['place'], ENT_QUOTES, 'UTF-8'); ?>
          <?php echo ($r['place'] && $r['service']) ? ' · ' : ''; ?>
          <?php echo htmlspecialchars($r['service'], ENT_QUOTES, 'UTF-8'); ?> · <?php echo htmlspecialchars(vgs_fmt($r['created_at']), ENT_QUOTES, 'UTF-8'); ?>
        </span>
        <div class="revtext"><?php echo nl2br(htmlspecialchars($r['text'], ENT_QUOTES, 'UTF-8')); ?></div>
        <form method="post" style="display:inline">
          <input type="hidden" name="csrf" value="<?php echo csrf_token(); ?>">
          <input type="hidden" name="id" value="<?php echo (int)$r['id']; ?>">
          <button class="btn btn-green" name="act" value="rev_approve">✔ Одобрить</button>
          <button class="btn btn-red btn-sm" name="act" value="rev_delete" onclick="return confirm('Удалить отзыв?');">Удалить</button>
        </form>
      </div>
    <?php endforeach; endif; ?>

    <hr class="sep">
    <h3 style="margin:6px 0 4px;color:#32506f">Опубликованные (<?php echo count($revApproved); ?>)</h3>
    <?php if (!$revApproved): ?>
      <div class="card empty">Пока нет опубликованных отзывов.</div>
    <?php else: foreach ($revApproved as $r): ?>
      <div class="card">
        <div class="stars"><?php echo vgs_stars($r['rating']); ?></div>
        <b><?php echo htmlspecialchars($r['name'], ENT_QUOTES, 'UTF-8'); ?></b>
        <span class="meta" style="color:#7a8aa0;font-size:12px">
          <?php echo htmlspecialchars($r['place'], ENT_QUOTES, 'UTF-8'); ?>
          <?php echo ($r['place'] && $r['service']) ? ' · ' : ''; ?>
          <?php echo htmlspecialchars($r['service'], ENT_QUOTES, 'UTF-8'); ?> · <?php echo htmlspecialchars(vgs_fmt($r['created_at']), ENT_QUOTES, 'UTF-8'); ?>
        </span>
        <div class="revtext"><?php echo nl2br(htmlspecialchars($r['text'], ENT_QUOTES, 'UTF-8')); ?></div>
        <form method="post" style="display:inline">
          <input type="hidden" name="csrf" value="<?php echo csrf_token(); ?>">
          <input type="hidden" name="id" value="<?php echo (int)$r['id']; ?>">
          <button class="btn btn-gray" name="act" value="rev_reject">Снять с публикации</button>
          <button class="btn btn-red btn-sm" name="act" value="rev_delete" onclick="return confirm('Удалить отзыв полностью?');">Удалить</button>
        </form>
      </div>
    <?php endforeach; endif; ?>

  <?php endif; ?>
</div>

<div class="foot">ВОЛГАСТРОЙ 76 · volgastroy76.ru · заявки и отзывы</div>
<?php endif; ?>
</body>
</html>