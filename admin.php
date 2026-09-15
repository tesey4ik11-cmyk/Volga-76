<?php
/**
 * Админ-панель ВОЛГАСТРОЙ 76 (v2):
 *  - вход по логину/паролю (сессия + password_hash);
 *  - заявки (leads): новые / в работе / архив / удалить, поиск, фильтр, расчёт клиента;
 *  - отзывы (reviews): одобрить / снять / удалить;
 *  - экспорт заявок в CSV;
 *  - постраничный вывод, чтобы не грузить слабый хостинг.
 */
if (!file_exists(__DIR__ . '/api/config.php')) {
    header('Location: install.php');
    exit;
}

require __DIR__ . '/api/db.php';

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
    if (empty($_SESSION['vgs_csrf']) || !hash_equals($_SESSION['vgs_csrf'], (string)($_POST['csrf'] ?? ''))) {
        http_response_code(403);
        exit('Запрос отклонён (CSRF).');
    }
}

function vgs_rd($t, $extra = '')
{
    header('Location: admin.php?t=' . urlencode($t) . $extra);
    exit;
}

function vgs_fmt($dt)
{
    return $dt ? date('d.m.Y H:i', strtotime($dt)) : '—';
}

function vgs_ago($dt)
{
    if (!$dt) { return ''; }
    $s = time() - strtotime($dt);
    if ($s < 60)    { return 'только что'; }
    if ($s < 3600)  { return floor($s/60) . ' мин назад'; }
    if ($s < 86400) { return floor($s/3600) . ' ч назад'; }
    if ($s < 604800){ return floor($s/86400) . ' дн назад'; }
    return '';
}

function vgs_stars($n)
{
    $n = max(1, min(5, (int)$n));
    return str_repeat('★', $n) . str_repeat('☆', 5 - $n);
}

function h($s)
{
    return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
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
            $_SESSION['vgs_admin'] = (int)$row['id'];
            $_SESSION['vgs_name']  = $row['username'];
            header('Location: admin.php');
            exit;
        }
        $loginError = 'Неверный логин или пароль.';
        sleep(1);
    } catch (Exception $e) {
        $loginError = 'Ошибка базы данных. Проверьте api/config.php / работу MySQL.';
    }
}

/* -------- экспорт CSV -------- */
if ($logged && ($_GET['export'] ?? '') === 'leads') {
    try {
        $pdo = vgs_db();
        $rows = $pdo->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5000')->fetchAll();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=leads-' . date('Y-m-d') . '.csv');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // BOM для Excel
        fputcsv($out, array('ID','Дата','Имя','Телефон','Тема','Сообщение','Расчёт','Статус','IP'), ';');
        foreach ($rows as $r) {
            fputcsv($out, array(
                $r['id'], vgs_fmt($r['created_at']), $r['name'], $r['phone'],
                $r['topic'], $r['message'], ($r['calc'] ?? ''), $r['status'], $r['ip']
            ), ';');
        }
        fclose($out);
        exit;
    } catch (Exception $e) {
        $flash = 'Не удалось выгрузить CSV.';
    }
}

/* -------- действия -------- */
if ($logged && $_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $act = $_POST['act'] ?? '';
    $id  = (int)($_POST['id'] ?? 0);
    $back = $_POST['back'] ?? '';
    try {
        $pdo = vgs_db();
        if ($id > 0) {
            if ($act === 'lead_view')     { $pdo->prepare("UPDATE leads SET status = 'viewed' WHERE id = ?")->execute(array($id)); vgs_rd('leads', $back); }
            if ($act === 'lead_archive')  { $pdo->prepare("UPDATE leads SET status = 'archived' WHERE id = ?")->execute(array($id)); vgs_rd('leads', $back); }
            if ($act === 'lead_unarchive'){ $pdo->prepare("UPDATE leads SET status = 'new' WHERE id = ?")->execute(array($id)); vgs_rd('leads', $back); }
            if ($act === 'lead_delete')   { $pdo->prepare('DELETE FROM leads WHERE id = ?')->execute(array($id)); vgs_rd('leads', $back); }
            if ($act === 'rev_approve')   { $pdo->prepare('UPDATE reviews SET approved = 1 WHERE id = ?')->execute(array($id)); vgs_cache_drop('reviews'); vgs_rd('reviews'); }
            if ($act === 'rev_reject')    { $pdo->prepare('UPDATE reviews SET approved = 0 WHERE id = ?')->execute(array($id)); vgs_cache_drop('reviews'); vgs_rd('reviews'); }
            if ($act === 'rev_delete')    { $pdo->prepare('DELETE FROM reviews WHERE id = ?')->execute(array($id)); vgs_cache_drop('reviews'); vgs_rd('reviews'); }
        }
        if ($act === 'leads_archive_all') {
            $pdo->exec("UPDATE leads SET status = 'archived' WHERE status = 'viewed'");
            vgs_rd('leads');
        }
    } catch (Exception $e) {
        $flash = 'Ошибка операции.';
    }
    vgs_rd('leads');
}

/* -------- данные -------- */
$statNew = $statPending = $statToday = $statWeek = 0;
$leads = $revPending = $revApproved = array();
$totalLeads = 0;

$tab    = $_GET['t'] ?? 'leads';
$q      = trim($_GET['q'] ?? '');
$filter = $_GET['f'] ?? 'all';
$page   = max(1, (int)($_GET['p'] ?? 1));
$PER    = 25;

if ($logged) {
    try {
        $pdo = vgs_db();
        $isSq = vgs_is_sqlite();
        $today = $isSq ? "date(created_at) = date('now')" : 'DATE(created_at) = CURDATE()';
        $week  = $isSq ? "created_at >= datetime('now','-7 days')" : 'created_at >= (NOW() - INTERVAL 7 DAY)';

        $statNew     = (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE status = 'new'")->fetchColumn();
        $statPending = (int)$pdo->query('SELECT COUNT(*) FROM reviews WHERE approved = 0')->fetchColumn();
        $statToday   = (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE $today")->fetchColumn();
        $statWeek    = (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE $week")->fetchColumn();

        if ($tab === 'leads') {
            $where = array(); $args = array();
            if (in_array($filter, array('new','viewed','archived'), true)) {
                $where[] = 'status = ?'; $args[] = $filter;
            }
            if ($q !== '') {
                $where[] = '(name LIKE ? OR phone LIKE ? OR message LIKE ? OR topic LIKE ?)';
                $like = '%' . $q . '%';
                array_push($args, $like, $like, $like, $like);
            }
            $wsql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';

            $cst = $pdo->prepare('SELECT COUNT(*) FROM leads' . $wsql);
            $cst->execute($args);
            $totalLeads = (int)$cst->fetchColumn();

            $off = ($page - 1) * $PER;
            $st = $pdo->prepare('SELECT * FROM leads' . $wsql . ' ORDER BY created_at DESC LIMIT ' . $PER . ' OFFSET ' . $off);
            $st->execute($args);
            $leads = $st->fetchAll();
        } else {
            $revPending  = $pdo->query('SELECT * FROM reviews WHERE approved = 0 ORDER BY created_at DESC LIMIT 100')->fetchAll();
            $revApproved = $pdo->query('SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT 60')->fetchAll();
        }
    } catch (Exception $e) {
        $loginError = 'Ошибка базы данных: ' . $e->getMessage();
    }
}
$pages = max(1, (int)ceil($totalLeads / $PER));
$qs = '&q=' . urlencode($q) . '&f=' . urlencode($filter) . '&p=' . $page;
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0b1526">
<title>Админ-панель — ВОЛГАСТРОЙ 76</title>
<style>
:root{
  --bg:#eef2f7; --card:#fff; --line:#dbe3ee; --ink:#223; --muted:#7a8aa0;
  --blue:#1479d6; --blue-d:#0f5ea8; --red:#ca3b4d; --green:#1e9e5a; --sun:#f5a83c;
  --r:12px; --sh:0 2px 10px rgba(16,40,80,.06);
}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  background:var(--bg);color:var(--ink);font-size:15px;-webkit-text-size-adjust:100%}
header{background:linear-gradient(100deg,#0b1526,#123a6b);color:#fff;padding:13px 20px;
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;
  position:sticky;top:0;z-index:20;box-shadow:0 2px 14px rgba(0,0,0,.2)}
header .brand{font-weight:800;font-size:16px}
header .brand span{color:#39bdf6}
header nav a{color:#9fd7ff;text-decoration:none;margin-left:16px;font-size:14px;font-weight:600}
header nav a:hover{color:#fff}
.wrap{max-width:1120px;margin:18px auto;padding:0 14px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:11px;margin:14px 0}
.stat{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;box-shadow:var(--sh)}
.stat b{font-size:26px;display:block;line-height:1.1;font-variant-numeric:tabular-nums}
.stat span{color:var(--muted);font-size:12px}
.stat.red b{color:var(--red)}.stat.blue b{color:var(--blue)}.stat.green b{color:var(--green)}.stat.sun b{color:#c87f0a}
.tabs{display:flex;gap:7px;margin-bottom:14px;flex-wrap:wrap}
.tabs a{padding:9px 16px;border-radius:10px;background:var(--card);border:1px solid var(--line);
  color:#32506f;text-decoration:none;font-weight:700;font-size:14px}
.tabs a.on{background:var(--blue);border-color:var(--blue);color:#fff}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:13px}
.toolbar form{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.toolbar input[type=search]{padding:9px 13px;border:1px solid var(--line);border-radius:9px;font-size:14px;
  min-width:220px;background:#fff}
.toolbar select{padding:9px 11px;border:1px solid var(--line);border-radius:9px;font-size:14px;background:#fff}
.pill{padding:7px 13px;border-radius:100px;background:#fff;border:1px solid var(--line);
  font-size:13px;font-weight:700;color:#4a6484}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:15px 17px;
  margin-bottom:11px;box-shadow:var(--sh)}
.card.hot{border-left:4px solid var(--red)}
.card h3{margin:0 0 6px;font-size:15.5px}
.leadt{font-size:13.5px;color:#32445f;white-space:pre-wrap;line-height:1.55}
.calcbox{background:#f2f7fd;border:1px solid #cfe0f2;border-left:3px solid var(--blue);border-radius:8px;
  padding:10px 13px;margin-top:9px;font-size:12.5px;white-space:pre-wrap;color:#264b70;line-height:1.55}
.lead .meta{color:var(--muted);font-size:12px;margin-bottom:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.b-new{background:#ffe1e4;color:#b3273a}.b-viewed{background:#e3efff;color:var(--blue)}
.b-arch{background:#e8ecef;color:#5b6b7d}
.tel{font-size:17px;font-weight:800;color:var(--red);text-decoration:none}
.tel:hover{text-decoration:underline}
.btn{display:inline-block;border:0;border-radius:8px;padding:8px 14px;font-size:13.5px;cursor:pointer;
  font-weight:700;text-decoration:none;margin:5px 5px 0 0;font-family:inherit}
.btn-green{background:var(--green);color:#fff}.btn-blue{background:var(--blue);color:#fff}
.btn-gray{background:#aab6c4;color:#fff}.btn-red{background:var(--red);color:#fff}
.btn-out{background:#fff;border:1px solid var(--line);color:#41608a}
.btn:hover{filter:brightness(1.07)}
.btn-sm{padding:6px 11px;font-size:12.5px}
.login{max-width:380px;margin:70px auto;background:var(--card);border:1px solid var(--line);
  border-radius:16px;padding:30px;box-shadow:0 10px 40px rgba(16,40,80,.12)}
.login h1{margin:0 0 18px;font-size:20px}
.login input{width:100%;padding:12px;border:1px solid #ccd7e4;border-radius:9px;margin-bottom:11px;font-size:15px}
.login button{width:100%;padding:13px;border:0;border-radius:9px;background:var(--blue);color:#fff;
  font-size:15px;font-weight:700;cursor:pointer}
.alert,.flash,.err{padding:11px 15px;border-radius:9px;margin-bottom:13px;font-size:14px}
.flash{background:#e3f4ea;border:1px solid #b7e0c6;color:#1e6f40}
.err{background:#ffe1e4;border:1px solid #f2b5bd;color:#a32335}
.revtext{font-size:14px;color:#2a3a52;line-height:1.55;margin:8px 0}
.stars{color:var(--sun);letter-spacing:2px}
.empty{color:#8a9bb0;padding:26px 0;text-align:center}
.foot{text-align:center;color:var(--muted);font-size:12px;margin:26px 0 24px}
hr.sep{border:0;border-top:1px dashed var(--line);margin:20px 0}
a.mute{color:#5b6b7d}
.pager{display:flex;gap:6px;justify-content:center;margin:16px 0;flex-wrap:wrap}
.pager a,.pager span{padding:7px 12px;border-radius:8px;background:#fff;border:1px solid var(--line);
  text-decoration:none;color:#41608a;font-size:13.5px;font-weight:700}
.pager span.cur{background:var(--blue);color:#fff;border-color:var(--blue)}
@media(max-width:640px){
  .wrap{margin:12px auto}
  .stat b{font-size:22px}
  .toolbar input[type=search]{min-width:0;flex:1}
  header .brand{font-size:14.5px}
  header nav a{margin-left:11px;font-size:13px}
}
</style>
</head>
<body>

<?php if (!$logged): ?>
  <div class="login">
    <h1>🔐 ВОЛГАСТРОЙ 76<br><small style="color:#7a8aa0;font-weight:400;font-size:14px">Панель управления</small></h1>
    <?php if ($loginError): ?><div class="err"><?php echo h($loginError); ?></div><?php endif; ?>
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
  <nav>
    <a href="/" target="_blank">Открыть сайт ↗</a>
    <a href="?export=leads">Выгрузить CSV</a>
    <a href="logout.php">Выйти (<?php echo h($_SESSION['vgs_name'] ?? ''); ?>)</a>
  </nav>
</header>

<div class="wrap">
  <?php if ($loginError): ?><div class="err"><?php echo h($loginError); ?></div><?php endif; ?>
  <?php if ($flash): ?><div class="flash"><?php echo h($flash); ?></div><?php endif; ?>

  <div class="stats">
    <div class="stat red"><b><?php echo $statNew; ?></b><span>Новых заявок</span></div>
    <div class="stat blue"><b><?php echo $statToday; ?></b><span>Заявок сегодня</span></div>
    <div class="stat sun"><b><?php echo $statWeek; ?></b><span>За 7 дней</span></div>
    <div class="stat green"><b><?php echo $statPending; ?></b><span>Отзывов на проверке</span></div>
  </div>

  <div class="tabs">
    <a href="?t=leads"   class="<?php echo $tab === 'leads' ? 'on' : ''; ?>">📋 Заявки<?php echo $statNew ? ' (' . $statNew . ')' : ''; ?></a>
    <a href="?t=reviews" class="<?php echo $tab === 'reviews' ? 'on' : ''; ?>">⭐ Отзывы<?php echo $statPending ? ' (' . $statPending . ')' : ''; ?></a>
  </div>

  <?php if ($tab === 'leads'): ?>
    <div class="toolbar">
      <form method="get">
        <input type="hidden" name="t" value="leads">
        <input type="search" name="q" value="<?php echo h($q); ?>" placeholder="Поиск: имя, телефон, текст…">
        <select name="f" onchange="this.form.submit()">
          <option value="all"      <?php echo $filter==='all'?'selected':''; ?>>Все статусы</option>
          <option value="new"      <?php echo $filter==='new'?'selected':''; ?>>Только новые</option>
          <option value="viewed"   <?php echo $filter==='viewed'?'selected':''; ?>>В работе</option>
          <option value="archived" <?php echo $filter==='archived'?'selected':''; ?>>Архив</option>
        </select>
        <button class="btn btn-blue" type="submit">Найти</button>
        <?php if ($q !== '' || $filter !== 'all'): ?>
          <a class="btn btn-out" href="?t=leads">Сбросить</a>
        <?php endif; ?>
      </form>
      <span class="pill">Найдено: <?php echo $totalLeads; ?></span>
    </div>

    <?php if (!$leads): ?>
      <div class="card empty"><?php echo ($q !== '' || $filter !== 'all') ? 'Ничего не найдено — попробуйте изменить запрос.' : 'Заявок пока нет.'; ?></div>
    <?php else: foreach ($leads as $l):
      $st = $l['status'];
      $bs = $st === 'new' ? 'b-new' : ($st === 'archived' ? 'b-arch' : 'b-viewed');
      $bt = $st === 'new' ? 'Новая' : ($st === 'archived' ? 'Архив' : 'В работе');
      $tel = preg_replace('/\D/', '', $l['phone']);
    ?>
      <div class="card lead <?php echo $st === 'new' ? 'hot' : ''; ?>">
        <div class="meta">
          <span class="badge <?php echo $bs; ?>"><?php echo $bt; ?></span>
          <span><?php echo h(vgs_fmt($l['created_at'])); ?></span>
          <?php if ($a = vgs_ago($l['created_at'])): ?><span style="color:#a4b1c2">· <?php echo h($a); ?></span><?php endif; ?>
        </div>
        <h3><?php echo h($l['name']); ?> · <a class="tel" href="tel:+<?php echo h($tel); ?>"><?php echo h($l['phone']); ?></a></h3>
        <div class="leadt"><b>Тема:</b> <?php echo h($l['topic']); ?>
<b>Сообщение:</b> <?php echo h($l['message']); ?></div>
        <?php if (!empty($l['calc'])): ?>
          <div class="calcbox">🧮 <?php echo h($l['calc']); ?></div>
        <?php endif; ?>
        <div class="meta" style="margin-top:8px;color:#a4b1c2">IP: <?php echo h($l['ip']); ?></div>
        <form method="post" style="display:inline">
          <input type="hidden" name="csrf" value="<?php echo csrf_token(); ?>">
          <input type="hidden" name="id" value="<?php echo (int)$l['id']; ?>">
          <input type="hidden" name="back" value="<?php echo h($qs); ?>">
          <?php if ($st === 'new'): ?>
            <button class="btn btn-blue" name="act" value="lead_view">▶ В работу</button>
          <?php endif; ?>
          <?php if ($st !== 'archived'): ?>
            <button class="btn btn-gray" name="act" value="lead_archive">В архив</button>
          <?php else: ?>
            <button class="btn btn-gray" name="act" value="lead_unarchive">Вернуть в новые</button>
          <?php endif; ?>
          <button class="btn btn-red btn-sm" name="act" value="lead_delete" onclick="return confirm('Удалить заявку?');">Удалить</button>
        </form>
      </div>
    <?php endforeach; endif; ?>

    <?php if ($pages > 1): ?>
      <div class="pager">
        <?php for ($i = 1; $i <= $pages; $i++):
          if ($i > 3 && $i < $pages - 1 && abs($i - $page) > 1) { if ($i === 4) echo '<span>…</span>'; continue; }
        ?>
          <?php if ($i === $page): ?>
            <span class="cur"><?php echo $i; ?></span>
          <?php else: ?>
            <a href="?t=leads&q=<?php echo urlencode($q); ?>&f=<?php echo urlencode($filter); ?>&p=<?php echo $i; ?>"><?php echo $i; ?></a>
          <?php endif; ?>
        <?php endfor; ?>
      </div>
    <?php endif; ?>

  <?php else: ?>

    <h3 style="margin:6px 0 8px;color:#32506f">На проверке (<?php echo count($revPending); ?>)</h3>
    <?php if (!$revPending): ?>
      <div class="card empty">Нет отзывов, ожидающих проверки.</div>
    <?php else: foreach ($revPending as $r): ?>
      <div class="card">
        <div class="stars"><?php echo vgs_stars($r['rating']); ?></div>
        <b><?php echo h($r['name']); ?></b>
        <span style="color:#7a8aa0;font-size:12px">
          <?php echo h($r['place']); ?><?php echo ($r['place'] && $r['service']) ? ' · ' : ''; ?><?php echo h($r['service']); ?> · <?php echo h(vgs_fmt($r['created_at'])); ?>
        </span>
        <div class="revtext"><?php echo nl2br(h($r['text'])); ?></div>
        <form method="post" style="display:inline">
          <input type="hidden" name="csrf" value="<?php echo csrf_token(); ?>">
          <input type="hidden" name="id" value="<?php echo (int)$r['id']; ?>">
          <button class="btn btn-green" name="act" value="rev_approve">✔ Одобрить</button>
          <button class="btn btn-red btn-sm" name="act" value="rev_delete" onclick="return confirm('Удалить отзыв?');">Удалить</button>
        </form>
      </div>
    <?php endforeach; endif; ?>

    <hr class="sep">
    <h3 style="margin:6px 0 8px;color:#32506f">Опубликованные (<?php echo count($revApproved); ?>)</h3>
    <?php if (!$revApproved): ?>
      <div class="card empty">Пока нет опубликованных отзывов.</div>
    <?php else: foreach ($revApproved as $r): ?>
      <div class="card">
        <div class="stars"><?php echo vgs_stars($r['rating']); ?></div>
        <b><?php echo h($r['name']); ?></b>
        <span style="color:#7a8aa0;font-size:12px">
          <?php echo h($r['place']); ?><?php echo ($r['place'] && $r['service']) ? ' · ' : ''; ?><?php echo h($r['service']); ?> · <?php echo h(vgs_fmt($r['created_at'])); ?>
        </span>
        <div class="revtext"><?php echo nl2br(h($r['text'])); ?></div>
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
