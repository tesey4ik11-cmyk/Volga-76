<?php
/**
 * ВОЛГАСТРОЙ 76 — Интерфейс модуля «Сметы и КП»
 * Подключается внутри admin.php при $tab === 'estimates'
 */

if (!defined('VGS_APP')) {
    define('VGS_APP', 1);
}

$actEst = $_GET['action'] ?? 'list';
$editId = (int)($_GET['id'] ?? 0);

// Подключаем API БД смет
require_once __DIR__ . '/api/estimates_db.php';
vgs_init_estimate_tables();

$pdo = vgs_db();

// Получаем список шаблонов
$templates = $pdo->query("SELECT * FROM estimate_templates WHERE is_active = 1 ORDER BY sort_order ASC, id ASC")->fetchAll();
// Получаем каталог работ
$catalogWorks = $pdo->query("SELECT * FROM works WHERE is_active = 1 ORDER BY category ASC, sort_order ASC, id ASC")->fetchAll();
// Получаем каталог материалов
$catalogMaterials = $pdo->query("SELECT * FROM materials WHERE is_active = 1 ORDER BY category ASC, sort_order ASC, id ASC")->fetchAll();

$currentEstimate = null;
if ($actEst === 'edit' && $editId > 0) {
    $st = $pdo->prepare("SELECT * FROM estimates WHERE id = ? LIMIT 1");
    $st->execute(array($editId));
    $currentEstimate = $st->fetch();
    if ($currentEstimate) {
        $currentEstimate['options'] = !empty($currentEstimate['options_json']) ? json_decode($currentEstimate['options_json'], true) : array();
        $data = !empty($currentEstimate['data_json']) ? json_decode($currentEstimate['data_json'], true) : array();
        $currentEstimate['sections'] = isset($data['sections']) ? $data['sections'] : array();
    }
}
?>

<style>
/* Стили модуля «Сметы и КП» */
.est-toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.est-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.btn-gold { background: #d97706; color: #fff; font-weight: 700; border: 0; border-radius: 8px; padding: 9px 16px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
.btn-gold:hover { background: #b45309; }

/* Таблица смет */
.est-table-wrap { overflow-x: auto; background: #fff; border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--sh); margin-bottom: 20px; }
.est-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.est-table th { background: #0f172a; color: #fff; padding: 12px 14px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
.est-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.est-table tr:hover td { background: #f8fafc; }
.est-num { font-family: monospace; font-weight: 800; color: #0284c7; font-size: 14px; }
.est-title { font-weight: 700; color: #0f172a; }
.est-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
.est-cost { font-weight: 800; font-size: 15px; color: #0f172a; }
.est-margin { font-size: 12px; color: #16a34a; font-weight: 600; margin-top: 2px; }

/* Бейджи статусов смет */
.badge-draft { background: #f1f5f9; color: #475569; }
.badge-calculating { background: #e0f2fe; color: #0369a1; }
.badge-sent { background: #fef3c7; color: #92400e; }
.badge-agreed { background: #ede9fe; color: #6d28d9; }
.badge-approved { background: #dcfce7; color: #15803d; font-weight: 800; }
.badge-rejected { background: #fee2e2; color: #b91c1c; }
.badge-archived { background: #f3f4f6; color: #9ca3af; }

/* Редактор сметы */
.wizard-box { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
@media (max-width: 1024px) {
  .wizard-box { grid-template-columns: 1fr; }
}

.step-card { background: #fff; border: 1px solid var(--line); border-radius: var(--r); padding: 18px 20px; margin-bottom: 16px; box-shadow: var(--sh); }
.step-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 14px; }
.step-title { font-size: 16px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px; }
.step-badge { background: #2563eb; color: #fff; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 12.5px; font-weight: 700; color: #334155; }
.form-control { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: inherit; }
.form-control:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }

/* Шаблоны типов */
.tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin-top: 10px; }
.tpl-card { border: 2px solid #e2e8f0; border-radius: 10px; padding: 12px; cursor: pointer; transition: all 0.2s; background: #f8fafc; }
.tpl-card:hover { border-color: #93c5fd; background: #fff; }
.tpl-card.selected { border-color: #2563eb; background: #eff6ff; }
.tpl-title { font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px; }
.tpl-desc { font-size: 11.5px; color: #64748b; line-height: 1.4; }

/* Опции чекбоксы */
.options-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; margin-top: 10px; }
.opt-label { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; background: #fafafa; }
.opt-label:hover { background: #f1f5f9; }
.opt-label input { width: 16px; height: 16px; cursor: pointer; }

/* Конструктор разделов и строк */
.section-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
.section-header { background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; }
.section-title-input { font-size: 15px; font-weight: 800; color: #1e3a8a; border: 0; background: transparent; padding: 4px; border-bottom: 1px dashed #94a3b8; width: 60%; }
.section-title-input:focus { outline: none; background: #fff; border-bottom: 1px solid #2563eb; }

.items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.items-table th { background: #f8fafc; padding: 8px 10px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
.items-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

/* Строки работ и материалов */
.work-row { background: #fff; font-weight: 600; }
.work-row:hover { background: #f8fafc; }
.mat-row { background: #fafafa; color: #334155; }
.mat-row td:first-child { padding-left: 28px; }
.mat-icon { color: #94a3b8; margin-right: 4px; font-weight: 800; }

.cell-num { width: 75px; }
.cell-num input { width: 100%; padding: 5px 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: right; }
.cell-name input { width: 100%; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.cell-unit { width: 70px; }
.cell-unit select, .cell-unit input { width: 100%; padding: 5px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; }

/* Замочек фиксации */
.btn-lock { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 6px; cursor: pointer; font-size: 13px; }
.btn-lock.locked { background: #fee2e2; border-color: #fca5a5; }

/* Плавающая панель итогов (Sticky Sidebar) */
.sticky-sidebar { position: sticky; top: 75px; background: #fff; border: 2px solid #0f172a; border-radius: var(--r); padding: 18px; box-shadow: 0 8px 24px rgba(15,23,42,0.1); }
.sticky-header { font-size: 17px; font-weight: 900; color: #0f172a; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
.summary-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13.5px; color: #475569; }
.summary-line b { color: #0f172a; font-weight: 700; }
.summary-total { border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 10px; display: flex; justify-content: space-between; align-items: baseline; }
.summary-total span { font-size: 15px; font-weight: 800; color: #0f172a; }
.summary-total b { font-size: 22px; font-weight: 900; color: #1e40af; }

.margin-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; margin: 14px 0; font-size: 12.5px; color: #166534; }
.margin-box b { font-size: 14px; }

.action-buttons { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.action-buttons .btn { margin: 0; width: 100%; text-align: center; padding: 11px; font-size: 14px; border-radius: 8px; }
</style>

<?php if ($actEst === 'list'): ?>
  <!-- ================================================================= -->
  <!-- 1. СПИСОК СМЕТ И КП -->
  <!-- ================================================================= -->
  <?php
    $q = trim($_GET['q'] ?? '');
    $statusFilter = trim($_GET['status'] ?? 'all');

    $where = array();
    $args = array();
    if ($statusFilter !== '' && $statusFilter !== 'all') {
        $where[] = 'status = ?';
        $args[] = $statusFilter;
    }
    if ($q !== '') {
        $where[] = '(number LIKE ? OR object_name LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR object_address LIKE ?)';
        $like = '%' . $q . '%';
        array_push($args, $like, $like, $like, $like, $like);
    }
    $wsql = $where ? (' WHERE ' . implode(' AND ', $where)) : '';
    $st = $pdo->prepare("SELECT * FROM estimates $wsql ORDER BY id DESC");
    $st->execute($args);
    $allEstimates = $st->fetchAll();
  ?>

  <div class="est-toolbar">
    <div class="est-filters">
      <form method="get" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input type="hidden" name="t" value="estimates">
        <input type="search" name="q" value="<?php echo h($q); ?>" placeholder="Поиск по номеру, объекту, клиенту…" class="form-control" style="width:260px;">
        <select name="status" class="form-control" onchange="this.form.submit()">
          <option value="all" <?php echo $statusFilter==='all'?'selected':''; ?>>Все статусы</option>
          <option value="draft" <?php echo $statusFilter==='draft'?'selected':''; ?>>Черновик</option>
          <option value="calculating" <?php echo $statusFilter==='calculating'?'selected':''; ?>>В расчёте</option>
          <option value="sent" <?php echo $statusFilter==='sent'?'selected':''; ?>>КП отправлено</option>
          <option value="agreed" <?php echo $statusFilter==='agreed'?'selected':''; ?>>Согласование</option>
          <option value="approved" <?php echo $statusFilter==='approved'?'selected':''; ?>>Утверждено</option>
          <option value="rejected" <?php echo $statusFilter==='rejected'?'selected':''; ?>>Отказ</option>
          <option value="archived" <?php echo $statusFilter==='archived'?'selected':''; ?>>Архив</option>
        </select>
        <button type="submit" class="btn btn-blue" style="margin:0">Найти</button>
        <?php if ($q !== '' || $statusFilter !== 'all'): ?>
          <a href="?t=estimates" class="btn btn-out" style="margin:0">Сбросить</a>
        <?php endif; ?>
      </form>
      <span class="pill">Всего смет: <?php echo count($allEstimates); ?></span>
    </div>

    <div>
      <a href="?t=estimates&action=new" class="btn-gold">
        <span style="font-size:18px;line-height:1">+</span> Создать смету / КП
      </a>
    </div>
  </div>

  <?php if (empty($allEstimates)): ?>
    <div class="card empty">
      Смет пока нет или ничего не найдено по фильтрам.<br>
      <a href="?t=estimates&action=new" class="btn btn-blue" style="margin-top:12px">+ Создать первую смету</a>
    </div>
  <?php else: ?>
    <div class="est-table-wrap">
      <table class="est-table">
        <thead>
          <tr>
            <th>Номер / Статус</th>
            <th>Объект / Адрес</th>
            <th>Площадь</th>
            <th>Заказчик / Контакты</th>
            <th>Итог (Клиенту)</th>
            <th>Маржа (Инженер)</th>
            <th>Дата</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($allEstimates as $row):
            $stt = $row['status'];
            $sttMap = array(
              'draft' => array('Черновик', 'badge-draft'),
              'calculating' => array('В расчёте', 'badge-calculating'),
              'sent' => array('КП отправлено', 'badge-sent'),
              'agreed' => array('Согласование', 'badge-agreed'),
              'approved' => array('Утверждено', 'badge-approved'),
              'rejected' => array('Отказ', 'badge-rejected'),
              'archived' => array('Архив', 'badge-archived'),
            );
            $badgeInfo = $sttMap[$stt] ?? array($stt, 'badge-draft');
            $telClean = preg_replace('/\D/', '', $row['customer_phone']);
          ?>
            <tr id="row-est-<?php echo (int)$row['id']; ?>">
              <td>
                <div class="est-num"><?php echo h($row['number']); ?></div>
                <span class="badge <?php echo $badgeInfo[1]; ?>" style="margin-top:4px"><?php echo $badgeInfo[0]; ?></span>
              </td>
              <td>
                <div class="est-title"><?php echo h($row['object_name'] ?: 'Без названия'); ?></div>
                <div class="est-sub">📍 <?php echo h($row['object_address'] ?: 'Ярославская обл.'); ?></div>
              </td>
              <td>
                <b><?php echo (float)$row['area'] > 0 ? (float)$row['area'] . ' м²' : '—'; ?></b>
              </td>
              <td>
                <div><b><?php echo h($row['customer_name'] ?: 'Не указан'); ?></b></div>
                <?php if ($row['customer_phone']): ?>
                  <div class="est-sub"><a href="tel:+<?php echo h($telClean); ?>" style="color:#0f5ea8;text-decoration:none">📞 <?php echo h($row['customer_phone']); ?></a></div>
                <?php endif; ?>
              </td>
              <td>
                <div class="est-cost"><?php echo number_format($row['grand_total'], 0, '.', ' '); ?> ₽</div>
                <div class="est-sub">Раб: <?php echo number_format($row['work_total'], 0, '.', ' '); ?> ₽ | Мат: <?php echo number_format($row['material_total'], 0, '.', ' '); ?> ₽</div>
              </td>
              <td>
                <?php
                  $margin = (float)$row['expected_margin'];
                  $marginClass = $margin >= 0 ? '#16a34a' : '#dc2626';
                  $gTot = (float)$row['grand_total'];
                  $pct = $gTot > 0 ? round(($margin / $gTot) * 100, 1) : 0;
                ?>
                <div style="font-weight:700;color:<?php echo $marginClass; ?>">
                  <?php echo number_format($margin, 0, '.', ' '); ?> ₽
                </div>
                <div class="est-sub" style="color:<?php echo $marginClass; ?>"><?php echo $pct; ?>%</div>
              </td>
              <td>
                <div style="font-size:12px;color:#475569"><?php echo date('d.m.Y', strtotime($row['created_at'])); ?></div>
                <div class="est-sub"><?php echo h($row['engineer_name'] ?: 'Звонарёв А.Б.'); ?></div>
              </td>
              <td style="white-space:nowrap">
                <a href="?t=estimates&action=edit&id=<?php echo (int)$row['id']; ?>" class="btn btn-blue btn-sm" title="Редактировать смету">✏️ Открыть</a>
                
                <!-- Кнопки генерации документов прямо в браузере -->
                <button type="button" class="btn btn-out btn-sm" onclick="downloadDocx(<?php echo (int)$row['id']; ?>)" title="Скачать КП в формате Word .docx">📄 DOCX</button>
                <button type="button" class="btn btn-out btn-sm" onclick="downloadPdf(<?php echo (int)$row['id']; ?>)" title="Скачать КП в формате PDF">📑 PDF</button>
                <button type="button" class="btn btn-out btn-sm" onclick="downloadXlsx(<?php echo (int)$row['id']; ?>)" title="Скачать смету в Excel .xlsx">📊 XLSX</button>

                <button type="button" class="btn btn-gray btn-sm" onclick="duplicateEstimate(<?php echo (int)$row['id']; ?>)" title="Создать на основе">📋 Копия</button>
                <button type="button" class="btn btn-red btn-sm" onclick="deleteEstimate(<?php echo (int)$row['id']; ?>)" title="Удалить смету">✕</button>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>

<?php else: ?>
  <!-- ================================================================= -->
  <!-- 2. МАСТЕР И РЕДАКТОР СМЕТЫ И КП (Создание / Редактирование) -->
  <!-- ================================================================= -->
  <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
    <a href="?t=estimates" class="btn btn-out" style="margin:0">← Вернуться к списку смет</a>
    <div style="font-size:13px;color:#64748b">
      <?php echo $editId > 0 ? ('Редактирование сметы #' . $editId) : 'Создание нового КП / сметы'; ?>
    </div>
  </div>

  <div class="wizard-box">
    <!-- Левая колонка: Мастер и Дерево сметы -->
    <div>
      <!-- ШАГ 1. Основные данные -->
      <div class="step-card">
        <div class="step-header">
          <div class="step-title">
            <span class="step-badge">1</span> Основные данные и реквизиты КП
          </div>
          <div style="font-size:12px;color:#64748b">Шаг 1 из 3</div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label>Номер предложения / сметы</label>
            <input type="text" id="inp_number" class="form-control" value="<?php echo h($currentEstimate['number'] ?? ('КП-ВГС-' . rand(100000, 999999))); ?>" required>
          </div>
          <div class="form-group">
            <label>Статус</label>
            <select id="inp_status" class="form-control">
              <option value="draft" <?php echo ($currentEstimate['status'] ?? 'draft')==='draft'?'selected':''; ?>>Черновик</option>
              <option value="calculating" <?php echo ($currentEstimate['status'] ?? '')==='calculating'?'selected':''; ?>>В расчёте</option>
              <option value="sent" <?php echo ($currentEstimate['status'] ?? '')==='sent'?'selected':''; ?>>КП отправлено клиенту</option>
              <option value="agreed" <?php echo ($currentEstimate['status'] ?? '')==='agreed'?'selected':''; ?>>Согласование условий</option>
              <option value="approved" <?php echo ($currentEstimate['status'] ?? '')==='approved'?'selected':''; ?>>Утверждено / В работе</option>
              <option value="rejected" <?php echo ($currentEstimate['status'] ?? '')==='rejected'?'selected':''; ?>>Отказ</option>
              <option value="archived" <?php echo ($currentEstimate['status'] ?? '')==='archived'?'selected':''; ?>>В архиве</option>
            </select>
          </div>
          <div class="form-group">
            <label>Название объекта</label>
            <input type="text" id="inp_object_name" class="form-control" value="<?php echo h($currentEstimate['object_name'] ?? ''); ?>" placeholder="Например: Модульное здание 50 м²">
          </div>
          <div class="form-group">
            <label>Площадь объекта (м²)</label>
            <input type="number" step="0.1" id="inp_area" class="form-control" value="<?php echo h($currentEstimate['area'] ?? '0'); ?>" oninput="onAreaChange(this.value)">
          </div>
          <div class="form-group">
            <label>Адрес объекта</label>
            <input type="text" id="inp_object_address" class="form-control" value="<?php echo h($currentEstimate['object_address'] ?? ''); ?>" placeholder="Ярославль, д. Бор...">
          </div>
          <div class="form-group">
            <label>ФИО Заказчика</label>
            <input type="text" id="inp_customer_name" class="form-control" value="<?php echo h($currentEstimate['customer_name'] ?? ''); ?>" placeholder="ФИО Заказчика">
          </div>
          <div class="form-group">
            <label>Телефон Заказчика</label>
            <input type="tel" id="inp_customer_phone" class="form-control" value="<?php echo h($currentEstimate['customer_phone'] ?? ''); ?>" placeholder="+7 (___) ___-__-__">
          </div>
          <div class="form-group">
            <label>Email Заказчика</label>
            <input type="email" id="inp_customer_email" class="form-control" value="<?php echo h($currentEstimate['customer_email'] ?? ''); ?>" placeholder="client@mail.ru">
          </div>
          <div class="form-group">
            <label>Срок выполнения</label>
            <input type="text" id="inp_lead_time" class="form-control" value="<?php echo h($currentEstimate['lead_time'] ?? '15-25 рабочих дней'); ?>">
          </div>
          <div class="form-group">
            <label>Срок действия КП</label>
            <input type="date" id="inp_valid_until" class="form-control" value="<?php echo h($currentEstimate['valid_until'] ?? date('Y-m-d', strtotime('+14 days'))); ?>">
          </div>
          <div class="form-group">
            <label>Ответственный инженер</label>
            <input type="text" id="inp_engineer_name" class="form-control" value="<?php echo h($currentEstimate['engineer_name'] ?? 'Звонарёв А.Б.'); ?>">
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label>Комментарий инженера / Примечание</label>
            <textarea id="inp_comment" class="form-control" rows="2"><?php echo h($currentEstimate['comment'] ?? ''); ?></textarea>
          </div>
        </div>
      </div>

      <!-- ШАГ 2. Выбор готового типа (Шаблона) -->
      <div class="step-card">
        <div class="step-header">
          <div class="step-title">
            <span class="step-badge">2</span> Выбор готового типа (Шаблон сметы)
          </div>
          <div style="font-size:12px;color:#64748b">Шаг 2 из 3</div>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0 0 10px">
          Выберите базовый тип объекта. Все разделы, работы, материалы и формулы пересчета по площади подгрузятся автоматически. Вы всегда сможете добавить или удалить любые строки вручную.
        </p>

        <div class="tpl-grid" id="tpl_grid">
          <?php foreach ($templates as $t):
            $tCode = $t['code'];
            $isCur = ($currentEstimate['template_code'] ?? 'murava') === $tCode;
          ?>
            <div class="tpl-card <?php echo $isCur ? 'selected' : ''; ?>" onclick="applyTemplate('<?php echo h($tCode); ?>')">
              <div class="tpl-title"><?php echo h($t['name']); ?></div>
              <div class="tpl-desc"><?php echo h($t['description']); ?></div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>

      <!-- ШАГ 3. Дополнительные опции (Чекбоксы) -->
      <div class="step-card">
        <div class="step-header">
          <div class="step-title">
            <span class="step-badge">3</span> Комплектация и опции
          </div>
          <div style="font-size:12px;color:#64748b">Шаг 3 из 3</div>
        </div>
        <p style="font-size:13px;color:#64748b;margin:0 0 10px">
          Включение и выключение опций автоматически добавляет или скрывает соответствующие работы и материалы в смете:
        </p>

        <div class="options-grid" id="options_container">
          <!-- Генерируется через JS -->
        </div>
      </div>

      <!-- РАЗДЕЛЫ, РАБОТЫ И МАТЕРИАЛЫ (Связка «Работа → Материалы») -->
      <div class="step-card" style="padding-bottom:10px">
        <div class="step-header">
          <div class="step-title">
            📋 Состав сметы: Разделы, Работы и Материалы
          </div>
          <div>
            <button type="button" class="btn btn-blue btn-sm" onclick="addNewSection()">+ Добавить раздел</button>
          </div>
        </div>

        <div id="sections_container">
          <!-- Контейнер разделов со строками -->
        </div>

        <div style="text-align:center;margin-top:14px;padding-top:14px;border-top:1px dashed #cbd5e1">
          <button type="button" class="btn btn-blue" onclick="addNewSection()">+ Добавить ещё раздел</button>
        </div>
      </div>
    </div>

    <!-- Правая колонка: Фиксированная плавающая панель итогов (Sticky Bar) -->
    <div>
      <div class="sticky-sidebar">
        <div class="sticky-header">
          Итоги сметы
        </div>

        <div class="summary-line">
          <span>Монтаж и сборка:</span>
          <b id="lbl_work_total">0 ₽</b>
        </div>
        <div class="summary-line">
          <span>Сертифицированные материалы:</span>
          <b id="lbl_mat_total">0 ₽</b>
        </div>
        <div class="summary-line">
          <span>Логистика и спецтехника:</span>
          <b id="lbl_del_total">0 ₽</b>
        </div>

        <div class="summary-total">
          <span>ИТОГО КЛИЕНТУ:</span>
          <b id="lbl_grand_total">0 ₽</b>
        </div>

        <div class="margin-box">
          <div style="font-weight:700;margin-bottom:4px">📊 Показатели инженера (Внутренние):</div>
          <div class="summary-line" style="margin-bottom:3px;font-size:12px">
            <span>Себестоимость (закупка + ФОТ):</span>
            <b id="lbl_cost_price">0 ₽</b>
          </div>
          <div class="summary-line" style="margin-bottom:0;font-size:12px">
            <span>Ожидаемая маржа:</span>
            <b id="lbl_margin" style="color:#166534">0 ₽ (0%)</b>
          </div>
        </div>

        <div class="action-buttons">
          <button type="button" class="btn btn-green" onclick="saveEstimateData()">
            💾 Сохранить смету
          </button>
          <button type="button" class="btn btn-blue" onclick="downloadCurrentDocx()">
            📄 Сформировать КП (.docx)
          </button>
          <button type="button" class="btn btn-gold" onclick="downloadCurrentPdf()">
            📑 Сформировать КП (.pdf)
          </button>
          <button type="button" class="btn btn-out" onclick="downloadCurrentXlsx()">
            📊 Сформировать смету (.xlsx)
          </button>
        </div>

        <div style="margin-top:14px;font-size:11.5px;color:#64748b;line-height:1.4">
          ✓ Снимок цен: цены фиксируются в смете и защищены от изменений в каталоге.<br>
          ✓ Замочек 🔒 сохраняет объем строки при смене площади объекта.
        </div>
      </div>
    </div>
  </div>
<?php endif; ?>

<!-- ================================================================= -->
<!-- СКРИПТЫ И ДВИЖОК СМЕТЧИКА -->
<!-- ================================================================= -->
<script src="assets/admin-doc-gen.js"></script>
<script>
// Глобальные справочники и шаблоны из базы данных
const VGS_TEMPLATES = <?php
  $tplMap = array();
  foreach ($templates as $t) {
    $tplMap[$t['code']] = array(
      'code' => $t['code'],
      'name' => $t['name'],
      'default_area' => (float)$t['default_area'],
      'description' => $t['description'],
      'options' => !empty($t['options_json']) ? json_decode($t['options_json'], true) : array(),
      'sections' => !empty($t['sections_json']) ? json_decode($t['sections_json'], true) : array(),
    );
  }
  echo json_encode($tplMap, JSON_UNESCAPED_UNICODE);
?>;

const VGS_CATALOG_WORKS = <?php echo json_encode($catalogWorks, JSON_UNESCAPED_UNICODE); ?>;
const VGS_CATALOG_MATERIALS = <?php echo json_encode($catalogMaterials, JSON_UNESCAPED_UNICODE); ?>;

// Текущее состояние сметы
let currentEstimateState = {
  id: <?php echo (int)$editId; ?>,
  template_code: '<?php echo addslashes($currentEstimate['template_code'] ?? 'murava'); ?>',
  area: <?php echo (float)($currentEstimate['area'] ?? 50); ?>,
  options: <?php echo !empty($currentEstimate['options']) ? json_encode($currentEstimate['options'], JSON_UNESCAPED_UNICODE) : 'null'; ?>,
  sections: <?php echo !empty($currentEstimate['sections']) ? json_encode($currentEstimate['sections'], JSON_UNESCAPED_UNICODE) : 'null'; ?>
};

// Инициализация при загрузке страницы редактирования
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('sections_container')) {
    initEstimateEditor();
  }
});

function initEstimateEditor() {
  // Если у нас новая смета или не заданы секции — берем шаблон Мурава
  if (!currentEstimateState.sections || currentEstimateState.sections.length === 0) {
    const tpl = VGS_TEMPLATES[currentEstimateState.template_code] || VGS_TEMPLATES['murava'];
    if (tpl) {
      currentEstimateState.options = JSON.parse(JSON.stringify(tpl.options || []));
      currentEstimateState.sections = JSON.parse(JSON.stringify(tpl.sections || []));
    }
  }

  renderOptions();
  renderSections();
  recalcTotals();
}

/**
 * Отрисовка чекбоксов опций (Шаг 3)
 */
function renderOptions() {
  const container = document.getElementById('options_container');
  if (!container) return;

  const opts = currentEstimateState.options || [];
  let html = '';
  opts.forEach((opt, idx) => {
    html += `
      <label class="opt-label">
        <input type="checkbox" id="opt_chk_${idx}" ${opt.checked ? 'checked' : ''} onchange="toggleOption(${idx}, this.checked)">
        <span>${escapeHtml(opt.name)}</span>
      </label>
    `;
  });
  container.innerHTML = html;
}

/**
 * Переключение опции
 */
function toggleOption(idx, isChecked) {
  if (currentEstimateState.options && currentEstimateState.options[idx]) {
    currentEstimateState.options[idx].checked = isChecked;
    const optId = currentEstimateState.options[idx].id;

    // Включение/выключение связанных разделов
    if (optId === 'delivery') {
      toggleDeliverySection(isChecked);
    }
    recalcTotals();
  }
}

function toggleDeliverySection(isChecked) {
  const secIdx = currentEstimateState.sections.findIndex(s => s.name && s.name.toLowerCase().includes('доставка') || s.name.toLowerCase().includes('логистика'));
  if (isChecked && secIdx === -1) {
    currentEstimateState.sections.push({
      name: 'РАЗДЕЛ: ЛОГИСТИКА И ДОСТАВКА',
      items: [{
        name: 'Доставка материалов манипулятором на объект (Ярославская обл.)',
        type: 'work',
        unit: 'рейс',
        quantity: 1,
        cost_price: 18000,
        unit_price: 25000,
        is_qty_locked: 1,
        materials: []
      }]
    });
    renderSections();
  } else if (!isChecked && secIdx !== -1) {
    currentEstimateState.sections.splice(secIdx, 1);
    renderSections();
  }
}

/**
 * Выбор шаблона объекта (Шаг 2)
 */
function applyTemplate(tplCode) {
  const tpl = VGS_TEMPLATES[tplCode];
  if (!tpl) return;

  if (currentEstimateState.sections && currentEstimateState.sections.length > 0) {
    if (!confirm('Применить шаблон «' + tpl.name + '»? Текущие строки сметы будут заменены эталонными строками выбранного типа.')) {
      return;
    }
  }

  currentEstimateState.template_code = tplCode;
  currentEstimateState.options = JSON.parse(JSON.stringify(tpl.options || []));
  currentEstimateState.sections = JSON.parse(JSON.stringify(tpl.sections || []));

  // Обновляем площадь и название объекта
  if (tpl.default_area > 0) {
    document.getElementById('inp_area').value = tpl.default_area;
    currentEstimateState.area = tpl.default_area;
  }
  document.getElementById('inp_object_name').value = tpl.name;

  // Обновляем визуальное выделение карточек
  document.querySelectorAll('.tpl-card').forEach(el => el.classList.remove('selected'));
  const clickedCard = document.querySelector(`.tpl-card[onclick*="'${tplCode}'"]`);
  if (clickedCard) clickedCard.classList.add('selected');

  renderOptions();
  renderSections();
  recalcTotals();
}

/**
 * Отрисовка дерева разделов, работ и материалов
 */
function renderSections() {
  const container = document.getElementById('sections_container');
  if (!container) return;

  const sections = currentEstimateState.sections || [];
  if (sections.length === 0) {
    container.innerHTML = '<div class="empty">В смете пока нет разделов. Нажмите «+ Добавить раздел».</div>';
    return;
  }

  let html = '';
  sections.forEach((sec, sIdx) => {
    html += `
      <div class="section-card" id="sec_card_${sIdx}">
        <div class="section-header">
          <input type="text" class="section-title-input" value="${escapeHtml(sec.name)}" onchange="updateSectionName(${sIdx}, this.value)" placeholder="Название раздела...">
          <div>
            <button type="button" class="btn btn-blue btn-sm" onclick="addNewWork(${sIdx})">+ Добавить работу</button>
            <button type="button" class="btn btn-red btn-sm" onclick="removeSection(${sIdx})" title="Удалить раздел">✕</button>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width:36%">Наименование позиции (Работа / Материал)</th>
              <th style="width:10%">Кол-во</th>
              <th style="width:8%">Ед.</th>
              <th style="width:14%">Себест. (₽)</th>
              <th style="width:14%">Ставка (₽)</th>
              <th style="width:12%;text-align:right">Сумма (₽)</th>
              <th style="width:6%"></th>
            </tr>
          </thead>
          <tbody>
    `;

    const items = sec.items || [];
    if (items.length === 0) {
      html += `<tr><td colspan="7" class="empty" style="padding:12px">В этом разделе пока нет работ. Нажмите «+ Добавить работу».</td></tr>`;
    } else {
      items.forEach((item, wIdx) => {
        const isLocked = item.is_qty_locked ? 1 : 0;
        const lockIcon = isLocked ? '🔒' : '🔓';
        const lockTitle = isLocked ? 'Объем зафиксирован: не меняется при смене площади' : 'Объем рассчитывается по площади';
        const wCost = round2((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0));

        html += `
          <tr class="work-row" id="work_row_${sIdx}_${wIdx}">
            <td class="cell-name">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="color:#0284c7;font-weight:800;font-size:12px">W${wIdx+1}</span>
                <input type="text" value="${escapeHtml(item.name || '')}" onchange="updateWorkField(${sIdx}, ${wIdx}, 'name', this.value)" placeholder="Наименование строительно-монтажной работы...">
              </div>
            </td>
            <td class="cell-num">
              <div style="display:flex;align-items:center;gap:3px">
                <input type="number" step="0.01" value="${item.quantity !== undefined && item.quantity !== null ? item.quantity : ''}" oninput="updateWorkField(${sIdx}, ${wIdx}, 'quantity', this.value)" placeholder="0">
                <button type="button" class="btn-lock ${isLocked ? 'locked' : ''}" onclick="toggleLock(${sIdx}, ${wIdx})" title="${lockTitle}">${lockIcon}</button>
              </div>
            </td>
            <td class="cell-unit">
              <input type="text" value="${escapeHtml(item.unit || '')}" onchange="updateWorkField(${sIdx}, ${wIdx}, 'unit', this.value)" placeholder="ед.">
            </td>
            <td class="cell-num">
              <input type="number" step="1" value="${item.cost_price !== undefined && item.cost_price !== null ? item.cost_price : ''}" oninput="updateWorkField(${sIdx}, ${wIdx}, 'cost_price', this.value)" placeholder="0" title="Себестоимость закупки/ФОТ">
            </td>
            <td class="cell-num">
              <input type="number" step="1" value="${item.unit_price !== undefined && item.unit_price !== null ? item.unit_price : ''}" oninput="updateWorkField(${sIdx}, ${wIdx}, 'unit_price', this.value)" placeholder="0" title="Цена продажи клиенту">
            </td>
            <td style="text-align:right;font-weight:800;color:#0f172a">
              ${formatMoney(wCost)}
            </td>
            <td style="text-align:right">
              <button type="button" class="btn btn-out btn-sm" onclick="addNewMaterial(${sIdx}, ${wIdx})" title="Добавить связанный материал к этой работе">+ Мат</button>
              <button type="button" class="btn btn-red btn-sm" onclick="removeWork(${sIdx}, ${wIdx})" title="Удалить работу">✕</button>
            </td>
          </tr>
        `;

        // Вложенные материалы под работой
        const materials = item.materials || [];
        materials.forEach((mat, mIdx) => {
          const mCost = round2((parseFloat(mat.quantity) || 0) * (parseFloat(mat.unit_price) || 0));
          html += `
            <tr class="mat-row" id="mat_row_${sIdx}_${wIdx}_${mIdx}">
              <td class="cell-name" style="padding-left:26px">
                <div style="display:flex;align-items:center;gap:4px">
                  <span class="mat-icon">↳</span>
                  <input type="text" value="${escapeHtml(mat.name || '')}" onchange="updateMaterialField(${sIdx}, ${wIdx}, ${mIdx}, 'name', this.value)" placeholder="Наименование материала/комплектующего...">
                </div>
              </td>
              <td class="cell-num">
                <input type="number" step="0.01" value="${mat.quantity !== undefined && mat.quantity !== null ? mat.quantity : ''}" oninput="updateMaterialField(${sIdx}, ${wIdx}, ${mIdx}, 'quantity', this.value)" placeholder="0">
              </td>
              <td class="cell-unit">
                <input type="text" value="${escapeHtml(mat.unit || '')}" onchange="updateMaterialField(${sIdx}, ${wIdx}, ${mIdx}, 'unit', this.value)" placeholder="ед.">
              </td>
              <td class="cell-num">
                <input type="number" step="1" value="${mat.cost_price !== undefined && mat.cost_price !== null ? mat.cost_price : ''}" oninput="updateMaterialField(${sIdx}, ${wIdx}, ${mIdx}, 'cost_price', this.value)" placeholder="0" title="Закупочная цена">
              </td>
              <td class="cell-num">
                <input type="number" step="1" value="${mat.unit_price !== undefined && mat.unit_price !== null ? mat.unit_price : ''}" oninput="updateMaterialField(${sIdx}, ${wIdx}, ${mIdx}, 'unit_price', this.value)" placeholder="0" title="Цена клиенту">
              </td>
              <td style="text-align:right;font-weight:700;color:#334155">
                ${formatMoney(mCost)}
              </td>
              <td style="text-align:right">
                <button type="button" class="btn btn-red btn-sm" onclick="removeMaterial(${sIdx}, ${wIdx}, ${mIdx})" title="Удалить материал">✕</button>
              </td>
            </tr>
          `;
        });
      });
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Пересчет объемов при изменении площади (если строка не зафиксирована 🔒)
 */
function onAreaChange(newArea) {
  const area = parseFloat(newArea) || 0;
  currentEstimateState.area = area;

  if (area <= 0) return;

  const sections = currentEstimateState.sections || [];
  sections.forEach(sec => {
    (sec.items || []).forEach(item => {
      // Если замочек 🔒 НЕ закрыт, пересчитываем объем
      if (!item.is_qty_locked) {
        if (item.unit === 'м²') {
          item.quantity = area;
        } else if (item.name.toLowerCase().includes('свай')) {
          item.quantity = Math.ceil(area / 2.08);
          // И связанные сваи/оголовки
          (item.materials || []).forEach(mat => {
            if (mat.unit === 'шт.') mat.quantity = item.quantity;
          });
        } else if (item.name.toLowerCase().includes('обвязк')) {
          item.quantity = Math.round(Math.sqrt(area) * 4 * 1.5);
          (item.materials || []).forEach(mat => {
            if (mat.unit === 'м.п.') mat.quantity = item.quantity;
          });
        } else if (item.unit === 'м.п.') {
          item.quantity = Math.round(Math.sqrt(area) * 4);
        }
      }
    });
  });

  renderSections();
  recalcTotals();
}

/**
 * Переключение замочка фиксации объема 🔒 / 🔓
 */
function toggleLock(sIdx, wIdx) {
  const item = currentEstimateState.sections[sIdx].items[wIdx];
  item.is_qty_locked = item.is_qty_locked ? 0 : 1;
  renderSections();
}

/**
 * Обновление полей работы
 */
function updateWorkField(sIdx, wIdx, field, val) {
  const item = currentEstimateState.sections[sIdx].items[wIdx];
  item[field] = val;
  recalcTotals();
}

/**
 * Обновление полей материала
 */
function updateMaterialField(sIdx, wIdx, mIdx, field, val) {
  const mat = currentEstimateState.sections[sIdx].items[wIdx].materials[mIdx];
  mat[field] = val;
  recalcTotals();
}

function updateSectionName(sIdx, val) {
  currentEstimateState.sections[sIdx].name = val;
}

function addNewSection() {
  currentEstimateState.sections.push({
    name: '',
    items: []
  });
  renderSections();
}

function removeSection(sIdx) {
  currentEstimateState.sections.splice(sIdx, 1);
  renderSections();
  recalcTotals();
}

function addNewWork(sIdx) {
  currentEstimateState.sections[sIdx].items.push({
    name: '',
    unit: '',
    quantity: '',
    cost_price: '',
    unit_price: '',
    is_qty_locked: 0,
    materials: []
  });
  renderSections();
  recalcTotals();
}

function removeWork(sIdx, wIdx) {
  currentEstimateState.sections[sIdx].items.splice(wIdx, 1);
  renderSections();
  recalcTotals();
}

function addNewMaterial(sIdx, wIdx) {
  if (!currentEstimateState.sections[sIdx].items[wIdx].materials) {
    currentEstimateState.sections[sIdx].items[wIdx].materials = [];
  }
  currentEstimateState.sections[sIdx].items[wIdx].materials.push({
    name: '',
    unit: '',
    quantity: '',
    cost_price: '',
    unit_price: ''
  });
  renderSections();
  recalcTotals();
}

function removeMaterial(sIdx, wIdx, mIdx) {
  currentEstimateState.sections[sIdx].items[wIdx].materials.splice(mIdx, 1);
  renderSections();
  recalcTotals();
}

/**
 * Пересчет сумм, себестоимости и маржи в реальном времени
 */
function recalcTotals() {
  let workTotal = 0;
  let workCostPrice = 0;
  let matTotal = 0;
  let matCostPrice = 0;
  let delTotal = 0;

  (currentEstimateState.sections || []).forEach(sec => {
    (sec.items || []).forEach(item => {
      const q = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : (parseFloat(item.quantity) || 0);
      const uPrice = parseFloat(item.unit_price) || 0;
      const cPrice = parseFloat(item.cost_price) || 0;
      const itemCost = round2(q * uPrice);
      const itemCostPrice = round2(q * cPrice);

      item.total_cost = itemCost;
      item.total_cost_price = itemCostPrice;

      if ((item.name || '').toLowerCase().includes('доставка')) {
        delTotal += itemCost;
      } else {
        workTotal += itemCost;
      }
      workCostPrice += itemCostPrice;

      (item.materials || []).forEach(mat => {
        const mq = typeof mat.quantity === 'number' && !isNaN(mat.quantity) ? mat.quantity : (parseFloat(mat.quantity) || 0);
        const muPrice = parseFloat(mat.unit_price) || 0;
        const mcPrice = parseFloat(mat.cost_price) || 0;
        const matCost = round2(mq * muPrice);
        const mCostPrice = round2(mq * mcPrice);

        mat.total_cost = matCost;
        mat.total_cost_price = mCostPrice;

        matTotal += matCost;
        matCostPrice += mCostPrice;
      });
    });
  });

  const grandTotal = workTotal + matTotal + delTotal;
  const totalCostPrice = workCostPrice + matCostPrice;
  const margin = grandTotal - totalCostPrice;
  const marginPct = grandTotal > 0 ? round1((margin / grandTotal) * 100) : 0;

  // Обновляем метки в Sticky Sidebar
  const lblWork = document.getElementById('lbl_work_total');
  const lblMat = document.getElementById('lbl_mat_total');
  const lblDel = document.getElementById('lbl_del_total');
  const lblGrand = document.getElementById('lbl_grand_total');
  const lblCost = document.getElementById('lbl_cost_price');
  const lblMargin = document.getElementById('lbl_margin');

  if (lblWork) lblWork.textContent = formatMoney(workTotal) + ' ₽';
  if (lblMat) lblMat.textContent = formatMoney(matTotal) + ' ₽';
  if (lblDel) lblDel.textContent = formatMoney(delTotal) + ' ₽';
  if (lblGrand) lblGrand.textContent = formatMoney(grandTotal) + ' ₽';
  if (lblCost) lblCost.textContent = formatMoney(totalCostPrice) + ' ₽';
  if (lblMargin) {
    lblMargin.textContent = `${formatMoney(margin)} ₽ (${marginPct}%)`;
    lblMargin.style.color = margin >= 0 ? '#166534' : '#dc2626';
  }

  currentEstimateState.work_total = workTotal;
  currentEstimateState.material_total = matTotal;
  currentEstimateState.delivery_total = delTotal;
  currentEstimateState.grand_total = grandTotal;
  currentEstimateState.work_cost_price = workCostPrice;
  currentEstimateState.material_cost_price = matCostPrice;
  currentEstimateState.expected_margin = margin;
}

/**
 * Сборка объекта сметы для сохранения и генерации документов
 */
function gatherEstimateObject() {
  recalcTotals();

  return {
    id: currentEstimateState.id || 0,
    number: document.getElementById('inp_number').value.trim() || 'КП-ВГС-' + Math.floor(Math.random() * 900000 + 100000),
    template_code: currentEstimateState.template_code || 'custom',
    status: document.getElementById('inp_status').value,
    object_name: document.getElementById('inp_object_name').value.trim(),
    area: parseFloat(document.getElementById('inp_area').value) || 0,
    object_address: document.getElementById('inp_object_address').value.trim(),
    customer_name: document.getElementById('inp_customer_name').value.trim(),
    customer_phone: document.getElementById('inp_customer_phone').value.trim(),
    customer_email: document.getElementById('inp_customer_email').value.trim(),
    lead_time: document.getElementById('inp_lead_time').value.trim() || '15-25 рабочих дней',
    valid_until: document.getElementById('inp_valid_until').value.trim() || '',
    engineer_name: document.getElementById('inp_engineer_name').value.trim() || 'Звонарёв А.Б.',
    comment: document.getElementById('inp_comment').value.trim(),
    options: currentEstimateState.options || [],
    sections: currentEstimateState.sections || [],
    work_total: currentEstimateState.work_total || 0,
    material_total: currentEstimateState.material_total || 0,
    delivery_total: currentEstimateState.delivery_total || 0,
    grand_total: currentEstimateState.grand_total || 0,
    expected_margin: currentEstimateState.expected_margin || 0,
  };
}

/**
 * Сохранение сметы через API
 */
async function saveEstimateData() {
  const est = gatherEstimateObject();

  try {
    const res = await fetch('api/admin-estimates.php?action=save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(est)
    });
    const json = await res.json();

    if (json.ok) {
      currentEstimateState.id = json.id;
      alert('✓ Смета ' + json.number + ' успешно сохранена в базе данных!');
      if (!window.location.search.includes('id=' + json.id)) {
        window.location.href = '?t=estimates&action=edit&id=' + json.id;
      }
    } else {
      alert('Ошибка при сохранении: ' + (json.err || 'Неизвестная ошибка'));
    }
  } catch (err) {
    alert('Сетевая ошибка при сохранении: ' + err.message);
  }
}

/**
 * Генерация DOCX для текущей открытой сметы
 */
async function downloadCurrentDocx() {
  if (!window.VGS_DOCS || !window.VGS_DOCS.downloadEstimateDocx) {
    alert('Генератор документов загружается, повторите через 2 секунды.');
    return;
  }
  const est = gatherEstimateObject();
  await window.VGS_DOCS.downloadEstimateDocx(est);
}

/**
 * Генерация PDF для текущей открытой сметы
 */
async function downloadCurrentPdf() {
  if (!window.VGS_DOCS || !window.VGS_DOCS.downloadEstimatePdf) {
    alert('Генератор документов загружается, повторите через 2 секунды.');
    return;
  }
  const est = gatherEstimateObject();
  await window.VGS_DOCS.downloadEstimatePdf(est);
}

/**
 * Генерация XLSX для текущей открытой сметы
 */
function downloadCurrentXlsx() {
  if (!window.VGS_DOCS || !window.VGS_DOCS.downloadEstimateXlsx) {
    alert('Генератор документов загружается, повторите через 2 секунды.');
    return;
  }
  const est = gatherEstimateObject();
  window.VGS_DOCS.downloadEstimateXlsx(est);
}

/* =================================================================
   Функции действий из списка смет (Таблица)
   ================================================================= */
async function downloadDocx(id) {
  const est = await fetchEstimate(id);
  if (est && window.VGS_DOCS) {
    await window.VGS_DOCS.downloadEstimateDocx(est);
  }
}

async function downloadPdf(id) {
  const est = await fetchEstimate(id);
  if (est && window.VGS_DOCS) {
    await window.VGS_DOCS.downloadEstimatePdf(est);
  }
}

async function downloadXlsx(id) {
  const est = await fetchEstimate(id);
  if (est && window.VGS_DOCS) {
    window.VGS_DOCS.downloadEstimateXlsx(est);
  }
}

async function fetchEstimate(id) {
  try {
    const res = await fetch('api/admin-estimates.php?action=get&id=' + id);
    const json = await res.json();
    if (json.ok && json.estimate) {
      return json.estimate;
    }
    alert('Не удалось загрузить данные сметы: ' + (json.err || 'Ошибка'));
  } catch (e) {
    alert('Ошибка соединения: ' + e.message);
  }
  return null;
}

async function duplicateEstimate(id) {
  if (!confirm('Создать новую смету на основе этой?')) return;
  try {
    const res = await fetch('api/admin-estimates.php?action=duplicate&id=' + id, { method: 'POST' });
    const json = await res.json();
    if (json.ok && json.id) {
      window.location.href = '?t=estimates&action=edit&id=' + json.id;
    } else {
      alert('Ошибка при копировании: ' + (json.err || 'Не удалось'));
    }
  } catch (e) {
    alert('Ошибка сети: ' + e.message);
  }
}

async function deleteEstimate(id) {
  if (!confirm('Вы уверены, что хотите удалить эту смету? Действие необратимо.')) return;
  try {
    const res = await fetch('api/admin-estimates.php?action=delete&id=' + id, { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      const row = document.getElementById('row-est-' + id);
      if (row) row.remove();
    } else {
      alert('Ошибка при удалении: ' + (json.err || 'Не удалось'));
    }
  } catch (e) {
    alert('Ошибка сети: ' + e.message);
  }
}

// Вспомогательные функции
function formatMoney(num) {
  return Math.round(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
function round1(num) {
  return Math.round((num + Number.EPSILON) * 10) / 10;
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
</script>
