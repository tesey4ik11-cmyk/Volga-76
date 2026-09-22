<?php
/**
 * ВОЛГАСТРОЙ 76 — Подсистема «Сметы и КП»
 * База данных, инициализация таблиц, справочники и шаблоны.
 */

if (!defined('VGS_APP')) {
    define('VGS_APP', 1);
}

require_once __DIR__ . '/db.php';

/**
 * Инициализация таблиц сметной подсистемы (совместимо с SQLite и MySQL)
 */
function vgs_init_estimate_tables()
{
    $pdo = vgs_db();
    $isSq = vgs_is_sqlite();

    $ai = $isSq ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT UNSIGNED AUTO_INCREMENT PRIMARY KEY';
    $txt = $isSq ? 'TEXT' : 'VARCHAR(255)';
    $num = $isSq ? 'REAL DEFAULT 0' : 'DECIMAL(12,2) NOT NULL DEFAULT 0.00';
    $dt = $isSq ? "TEXT DEFAULT (datetime('now'))" : 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP';
    $engine = $isSq ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';

    // 1. Таблица смет (estimates)
    $sqlEstimates = "CREATE TABLE IF NOT EXISTS estimates (
        id $ai,
        number $txt NOT NULL,
        template_code $txt NOT NULL DEFAULT 'custom',
        status $txt NOT NULL DEFAULT 'draft',
        customer_name $txt NOT NULL DEFAULT '',
        customer_phone $txt NOT NULL DEFAULT '',
        customer_email $txt NOT NULL DEFAULT '',
        object_name $txt NOT NULL DEFAULT '',
        object_address $txt NOT NULL DEFAULT '',
        area $num,
        lead_time $txt NOT NULL DEFAULT '15-25 рабочих дней',
        valid_until $txt NOT NULL DEFAULT '',
        engineer_name $txt NOT NULL DEFAULT 'Звонарёв А.Б.',
        comment TEXT,
        options_json TEXT,
        data_json TEXT,
        work_cost_price $num,
        work_total $num,
        material_cost_price $num,
        material_total $num,
        delivery_total $num,
        grand_total $num,
        expected_margin $num,
        created_at $dt,
        updated_at " . ($isSq ? "TEXT DEFAULT (datetime('now'))" : "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") . "
    )$engine";

    // 2. Справочник типовых работ (works)
    $sqlWorks = "CREATE TABLE IF NOT EXISTS works (
        id $ai,
        category $txt NOT NULL DEFAULT 'general',
        name $txt NOT NULL,
        unit $txt NOT NULL DEFAULT 'компл.',
        cost_price $num,
        default_price $num,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
    )$engine";

    // 3. Справочник материалов (materials)
    $sqlMaterials = "CREATE TABLE IF NOT EXISTS materials (
        id $ai,
        category $txt NOT NULL DEFAULT 'general',
        name $txt NOT NULL,
        unit $txt NOT NULL DEFAULT 'шт.',
        cost_price $num,
        default_price $num,
        supplier $txt NOT NULL DEFAULT '',
        article $txt NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
    )$engine";

    // 4. Шаблоны типовых смет (estimate_templates)
    $sqlTemplates = "CREATE TABLE IF NOT EXISTS estimate_templates (
        id $ai,
        code $txt NOT NULL,
        name $txt NOT NULL,
        default_area $num,
        description TEXT,
        options_json TEXT,
        sections_json TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0
    )$engine";

    $pdo->exec($sqlEstimates);
    $pdo->exec($sqlWorks);
    $pdo->exec($sqlMaterials);
    $pdo->exec($sqlTemplates);

    // Создаем индексы безопасно
    try {
        $pdo->exec("ALTER TABLE estimates ADD INDEX ix_est_num (number)");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE estimates ADD INDEX ix_est_status (status)");
    } catch (Exception $e) {}

    // Шаблоны и справочники наполняются при первом запуске
    $cntWorks = (int)$pdo->query("SELECT COUNT(*) FROM works")->fetchColumn();
    if ($cntWorks === 0) {
        vgs_seed_works_and_materials($pdo);
    }

    $cntTemplates = (int)$pdo->query("SELECT COUNT(*) FROM estimate_templates")->fetchColumn();
    if ($cntTemplates === 0) {
        vgs_seed_templates($pdo);
    }
}

/**
 * Начальное наполнение каталога работ и материалов
 */
function vgs_seed_works_and_materials($pdo)
{
    $works = array(
        array('foundation', 'Разметка осей свайного поля с нивелиром', 'компл.', 6000, 12000, 'Геодезическая разбивка осей, высотных отметок и диагоналей'),
        array('foundation', 'Монтаж винтовых свай Ø89 с закручиванием', 'шт.', 950, 1500, 'Механизированное/гидравлическое закручивание ниже глубины промерзания'),
        array('foundation', 'Монтаж винтовых свай Ø108 с закручиванием', 'шт.', 1100, 1750, 'Монтаж свай повышенной несущей способности'),
        array('foundation', 'Обрезка свай в горизонт и бетонирование полости', 'шт.', 350, 600, 'Срезка по оптическому уровню и заполнение ЦПС М300'),
        array('foundation', 'Монтаж и приварка оголовков 200×200', 'шт.', 250, 450, 'Сварка с антикоррозийной обработкой швов'),
        array('foundation', 'Обвязка свайного поля швеллером 16П', 'м.п.', 650, 950, 'Монтаж металлического ростверка с приваркой'),
        array('foundation', 'Обвязка свайного поля брусом 150×150', 'м.п.', 450, 750, 'Укладка антисептированного обвязочного бруса'),
        
        array('flooring', 'Монтаж несущих балок перекрытия пола', 'м²', 550, 850, 'Монтаж прогонов из профильной трубы 100×50'),
        array('flooring', 'Устройство чернового настила пола (ЦСП / фанера)', 'м²', 400, 680, 'Укладка влагостойких плит'),
        array('flooring', 'Монтаж террасного настила из ДПК', 'м²', 900, 1450, 'Монтаж доски ДПК по алюминиевым лагам'),
        array('flooring', 'Устройство стяжки пола с армированием', 'м²', 600, 950, 'Бетонная стяжка под эксплуатационные нагрузки'),
        
        array('framing', 'Сборка и монтаж несущего металлокаркаса', 'м²', 650, 920, 'Монтаж каркаса из профильных труб и ферм'),
        array('walls', 'Монтаж стеновых сэндвич-панелей и доборных элементов', 'м²', 320, 480, 'Монтаж PIR/минераловатных сэндвич-панелей'),
        array('walls', 'Антисептирование и защитная окраска металлоконструкций', 'м²', 180, 320, 'Грунтование и двухслойная окраска эмалью'),
        
        array('roofing', 'Монтаж стропильной системы и прогонов кровли', 'м²', 320, 490, 'Монтаж металлических ферм и связей'),
        array('roofing', 'Монтаж кровельных сэндвич-панелей PIR 150 мм', 'м²', 310, 460, 'Укладка кровельных панелей с герметизацией замков'),
        
        array('engineering', 'Разработка проекта АС/КР и планов свайного поля', 'компл.', 15000, 35000, 'Рабочая документация с расчетными нагрузками'),
        array('engineering', 'Исполнительная документация и акт освидетельствования', 'компл.', 5000, 12000, 'Полный комплект закрывающих инженерных актов'),
        array('engineering', 'Монтаж электрического ввода и распределительного щита', 'компл.', 18000, 32000, 'Щит в сборе, УЗО, автоматы, контур заземления'),
        
        array('logistics', 'Доставка материалов манипулятором на объект', 'рейс', 18000, 25000, 'Транспортировка и разгрузка длинномером/манипулятором'),
    );

    $st = $pdo->prepare("INSERT INTO works (category, name, unit, cost_price, default_price, description) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($works as $w) {
        $st->execute($w);
    }

    $materials = array(
        array('foundation', 'Свая винтовая Ø89×3000 ст3сп5 толщина 4 мм', 'шт.', 1850, 2295, 'Северсталь', 'SV-89-3000'),
        array('foundation', 'Свая винтовая Ø108×2500 ст3сп5 толщина 4 мм', 'шт.', 2150, 2690, 'Северсталь', 'SV-108-2500'),
        array('foundation', 'Оголовок усиленный 200×200 толщина 4 мм', 'шт.', 320, 450, 'ВОЛГАСТРОЙ 76', 'OG-200'),
        array('foundation', 'Швеллер 16П горячекатаный Ст3сп', 'м.п.', 1380, 1780, 'Металлсервис', 'SHV-16P'),
        array('foundation', 'Сухая смесь ЦПС М300 для бетонирования ствола', 'мешок', 190, 280, 'ЯрЦемент', 'CPS-M300'),
        array('foundation', 'Бетон товарный М300 (В22.5)', 'м³', 4800, 6500, 'Бетон-Регион', 'BET-M300'),
        
        array('flooring', 'Профильная труба 100×50×3 мм', 'м.п.', 620, 890, 'Северсталь', 'TR-100-50-3'),
        array('flooring', 'Плита ЦСП 16 мм влагостойкая 3200×1250', 'м²', 680, 980, 'ТАМАК', 'CSP-16'),
        array('flooring', 'Террасная доска ДПК полнотелая 160×24', 'м²', 1950, 2750, 'Savewood', 'DPK-160'),
        array('flooring', 'Лага алюминиевая 40×40 для ДПК', 'м.п.', 380, 520, 'Savewood', 'LAG-40'),
        
        array('walls', 'Сэндвич-панель PIR 120 мм стеновая с замком Z-Lock', 'м²', 640, 860, 'Профхолод', 'PIR-W-120'),
        array('walls', 'Фасонные и доборные элементы 0.5 мм RAL 7024', 'компл.', 14000, 19500, 'Металл Профиль', 'FAS-7024'),
        array('walls', 'Грунт-эмаль 3 в 1 антикоррозийная быстросохнущая', 'л', 420, 650, 'Ярославские краски', 'EM-3IN1'),
        
        array('roofing', 'Сэндвич-панель PIR 150 мм кровельная', 'м²', 850, 1120, 'Профхолод', 'PIR-R-150'),
        array('roofing', 'Саморезы кровельные с шайбой EPDM 5.5×190', 'пачка', 1200, 1750, 'Harpoon', 'SAM-EPDM'),
        
        array('engineering', 'Кабель ВВГнг-LS 3×2.5 ГОСТ в негорючей гофре', 'м.п.', 75, 110, 'Рыбинсккабель', 'VVG-3X25'),
        array('engineering', 'Щит распределительный навесной IP54 на 12 модулей', 'шт.', 2200, 3400, 'IEK', 'SHR-12'),
    );

    $stm = $pdo->prepare("INSERT INTO materials (category, name, unit, cost_price, default_price, supplier, article) VALUES (?, ?, ?, ?, ?, ?, ?)");
    foreach ($materials as $m) {
        $stm->execute($m);
    }
}

/**
 * Наполнение шаблонов типовых объектов (Модульное здание, Каркасник, Сваи, Терраса и т.д.)
 */
function vgs_seed_templates($pdo)
{
    $templates = array(
        array(
            'code' => 'murava',
            'name' => 'Модульное здание 50 м²',
            'default_area' => 50.0,
            'description' => 'Модульное здание 50 м²: свайный фундамент, перекрытия пола, сэндвич-панели стен, кровля PIR и проектная документация (ровно 680 172 ₽).',
            'options' => array(
                array('id' => 'delivery', 'name' => 'Доставка манипулятором', 'checked' => true),
                array('id' => 'montage', 'name' => 'Монтаж под ключ', 'checked' => true),
                array('id' => 'materials', 'name' => 'Сертифицированные материалы', 'checked' => true),
                array('id' => 'painting', 'name' => 'Покраска металлоконструкций', 'checked' => true),
                array('id' => 'project', 'name' => 'Проектирование АС/КР', 'checked' => true),
                array('id' => 'docs', 'name' => 'Исполнительная документация', 'checked' => true),
                array('id' => 'warm', 'name' => 'Утепление PIR', 'checked' => true),
                array('id' => 'electric', 'name' => 'Электрика и щит', 'checked' => false),
                array('id' => 'water', 'name' => 'Водоснабжение', 'checked' => false),
                array('id' => 'sewer', 'name' => 'Канализация', 'checked' => false),
                array('id' => 'finish', 'name' => 'Чистовая отделка', 'checked' => false),
            ),
            'sections' => array(
                array(
                    'name' => 'РАЗДЕЛ 1. СВАЙНЫЙ ФУНДАМЕНТ',
                    'items' => array(
                        array(
                            'name' => 'Разметка осей свайного поля с нивелиром',
                            'type' => 'work',
                            'unit' => 'компл.',
                            'quantity' => 1,
                            'cost_price' => 6000,
                            'unit_price' => 12000,
                            'formula_bind' => 'fixed',
                            'is_qty_locked' => 1,
                            'materials' => array(),
                        ),
                        array(
                            'name' => 'Монтаж винтовых свай Ø89×3000 с закручиванием ниже глубины промерзания',
                            'type' => 'work',
                            'unit' => 'шт.',
                            'quantity' => 24,
                            'cost_price' => 950,
                            'unit_price' => 1500,
                            'formula_bind' => 'ceil(area / 2.08)',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Свая винтовая Ø89×3000 ст3сп5 толщина 4 мм', 'unit' => 'шт.', 'quantity' => 24, 'cost_price' => 1850, 'unit_price' => 2295),
                                array('name' => 'Оголовок усиленный 200×200 толщина 4 мм', 'unit' => 'шт.', 'quantity' => 24, 'cost_price' => 320, 'unit_price' => 450),
                                array('name' => 'Бетонирование полости (ЦПС М300)', 'unit' => 'м³', 'quantity' => 0.5, 'cost_price' => 4800, 'unit_price' => 6500),
                            ),
                        ),
                        array(
                            'name' => 'Обвязка свайного поля швеллером 16П с антикоррозийной обработкой швов',
                            'type' => 'work',
                            'unit' => 'м.п.',
                            'quantity' => 42,
                            'cost_price' => 650,
                            'unit_price' => 950,
                            'formula_bind' => 'round(sqrt(area) * 4 * 1.5, 0)',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Швеллер 16П горячекатаный Ст3сп', 'unit' => 'м.п.', 'quantity' => 42, 'cost_price' => 1380, 'unit_price' => 1780),
                            ),
                        ),
                    ),
                ),
                array(
                    'name' => 'РАЗДЕЛ 2. ПОЛ',
                    'items' => array(
                        array(
                            'name' => 'Монтаж несущих балок перекрытия и ростверка',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 50,
                            'cost_price' => 550,
                            'unit_price' => 850,
                            'formula_bind' => 'area * 1.0',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Профильная труба 100×50×3 мм (прогоны пола)', 'unit' => 'м.п.', 'quantity' => 60, 'cost_price' => 620, 'unit_price' => 890),
                            ),
                        ),
                        array(
                            'name' => 'Устройство настила пола из влагостойкой ЦСП 16 мм',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 50,
                            'cost_price' => 400,
                            'unit_price' => 680,
                            'formula_bind' => 'area * 1.0',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Плита ЦСП 16 мм влагостойкая 3200×1250', 'unit' => 'м²', 'quantity' => 50, 'cost_price' => 680, 'unit_price' => 980),
                            ),
                        ),
                    ),
                ),
                array(
                    'name' => 'РАЗДЕЛ 3. СТЕНЫ И ОГРАЖДАЮЩИЕ КОНСТРУКЦИИ',
                    'items' => array(
                        array(
                            'name' => 'Сборка и монтаж несущего металлокаркаса стен',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 50,
                            'cost_price' => 650,
                            'unit_price' => 920,
                            'formula_bind' => 'area * 1.0',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Фасонные и доборные элементы RAL 7024 с крепежом', 'unit' => 'компл.', 'quantity' => 1, 'cost_price' => 14000, 'unit_price' => 19500),
                            ),
                        ),
                        array(
                            'name' => 'Монтаж стеновых сэндвич-панелей PIR 120 мм с герметизацией швов',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 96,
                            'cost_price' => 320,
                            'unit_price' => 480,
                            'formula_bind' => 'round(sqrt(area) * 4 * 3.4, 0)',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Сэндвич-панель PIR 120 мм стеновая с замком Z-Lock', 'unit' => 'м²', 'quantity' => 96, 'cost_price' => 640, 'unit_price' => 860),
                            ),
                        ),
                    ),
                ),
                array(
                    'name' => 'РАЗДЕЛ 4. КРОВЛЯ',
                    'items' => array(
                        array(
                            'name' => 'Монтаж стропильной системы и прогонов кровли',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 56,
                            'cost_price' => 320,
                            'unit_price' => 490,
                            'formula_bind' => 'round(area * 1.12, 0)',
                            'is_qty_locked' => 0,
                            'materials' => array(),
                        ),
                        array(
                            'name' => 'Укладка кровельных сэндвич-панелей PIR 150 мм',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 56,
                            'cost_price' => 310,
                            'unit_price' => 460,
                            'formula_bind' => 'round(area * 1.12, 0)',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Сэндвич-панель PIR 150 мм кровельная', 'unit' => 'м²', 'quantity' => 56, 'cost_price' => 850, 'unit_price' => 1120),
                            ),
                        ),
                    ),
                ),
                array(
                    'name' => 'РАЗДЕЛ 5. ИНЖЕНЕРНОЕ ПРОЕКТИРОВАНИЕ И ДОКУМЕНТАЦИЯ',
                    'items' => array(
                        array(
                            'name' => 'Разработка рабочей документации АС/КР и планов свайного поля',
                            'type' => 'work',
                            'unit' => 'компл.',
                            'quantity' => 1,
                            'cost_price' => 15000,
                            'unit_price' => 35000,
                            'formula_bind' => 'fixed',
                            'is_qty_locked' => 1,
                            'materials' => array(),
                        ),
                        array(
                            'name' => 'Подготовка исполнительной документации и актов скрытых работ',
                            'type' => 'work',
                            'unit' => 'компл.',
                            'quantity' => 1,
                            'cost_price' => 5000,
                            'unit_price' => 12000,
                            'formula_bind' => 'fixed',
                            'is_qty_locked' => 1,
                            'materials' => array(),
                        ),
                    ),
                ),
                array(
                    'name' => 'РАЗДЕЛ 6. ЛОГИСТИКА И ДОСТАВКА',
                    'items' => array(
                        array(
                            'name' => 'Доставка материалов манипулятором на объект (Ярославская обл.)',
                            'type' => 'work',
                            'unit' => 'рейс',
                            'quantity' => 1,
                            'cost_price' => 18000,
                            'unit_price' => 25000,
                            'formula_bind' => 'fixed',
                            'is_qty_locked' => 1,
                            'materials' => array(),
                        ),
                    ),
                ),
            ),
        ),
        array(
            'code' => 'screw_piles',
            'name' => 'Свайный фундамент',
            'default_area' => 36.0,
            'description' => 'Комплексный расчет свайного поля под дом, баню или террасу: винтовые сваи, оголовки, бетонирование и ростверк.',
            'options' => array(
                array('id' => 'delivery', 'name' => 'Доставка свай и техники', 'checked' => true),
                array('id' => 'montage', 'name' => 'Закручивание и нивелировка', 'checked' => true),
                array('id' => 'materials', 'name' => 'Сваи и оголовки', 'checked' => true),
                array('id' => 'painting', 'name' => 'Антикоррозийная покраска', 'checked' => true),
                array('id' => 'docs', 'name' => 'Акт испытания несущей способности', 'checked' => true),
            ),
            'sections' => array(
                array(
                    'name' => 'РАЗДЕЛ 1. СВАЙНЫЕ РАБОТЫ И МАТЕРИАЛЫ',
                    'items' => array(
                        array(
                            'name' => 'Геодезическая разметка осей свайного поля',
                            'type' => 'work',
                            'unit' => 'компл.',
                            'quantity' => 1,
                            'cost_price' => 5000,
                            'unit_price' => 10000,
                            'formula_bind' => 'fixed',
                            'is_qty_locked' => 1,
                            'materials' => array(),
                        ),
                        array(
                            'name' => 'Механизированный монтаж винтовых свай Ø108×2500',
                            'type' => 'work',
                            'unit' => 'шт.',
                            'quantity' => 16,
                            'cost_price' => 1100,
                            'unit_price' => 1750,
                            'formula_bind' => 'ceil(area / 2.25)',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Свая винтовая Ø108×2500 ст3сп5 толщина 4 мм', 'unit' => 'шт.', 'quantity' => 16, 'cost_price' => 2150, 'unit_price' => 2690),
                                array('name' => 'Оголовок усиленный 200×200 толщина 4 мм', 'unit' => 'шт.', 'quantity' => 16, 'cost_price' => 320, 'unit_price' => 450),
                                array('name' => 'ЦПС М300 для бетонирования ствола', 'unit' => 'мешок', 'quantity' => 16, 'cost_price' => 190, 'unit_price' => 280),
                            ),
                        ),
                        array(
                            'name' => 'Обвязка свайного поля брусом 150×150 с антисептированием',
                            'type' => 'work',
                            'unit' => 'м.п.',
                            'quantity' => 32,
                            'cost_price' => 450,
                            'unit_price' => 750,
                            'formula_bind' => 'round(sqrt(area) * 4 * 1.3, 0)',
                            'is_qty_locked' => 0,
                            'materials' => array(),
                        ),
                    ),
                ),
            ),
        ),
        array(
            'code' => 'frame_house',
            'name' => 'Каркасный дом',
            'default_area' => 84.0,
            'description' => 'Теплый энергоэффективный каркасный дом: фундамент, силовой каркас, утепление 200 мм, фасад и кровля металлочерепица.',
            'options' => array(
                array('id' => 'delivery', 'name' => 'Доставка материалов', 'checked' => true),
                array('id' => 'montage', 'name' => 'Монтаж бригадой ВОЛГАСТРОЙ', 'checked' => true),
                array('id' => 'materials', 'name' => 'Пиломатериал камерной сушки', 'checked' => true),
                array('id' => 'warm', 'name' => 'Утепление Rockwool 200 мм', 'checked' => true),
                array('id' => 'finish', 'name' => 'Внешняя фасадная отделка', 'checked' => true),
            ),
            'sections' => array(
                array(
                    'name' => 'РАЗДЕЛ 1. ФУНДАМЕНТ',
                    'items' => array(
                        array(
                            'name' => 'Монтаж свайного поля из винтовых свай Ø108×2500',
                            'type' => 'work',
                            'unit' => 'шт.',
                            'quantity' => 28,
                            'cost_price' => 1100,
                            'unit_price' => 1750,
                            'formula_bind' => 'ceil(area / 3.0)',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Свая винтовая Ø108×2500 с оголовком и бетонированием', 'unit' => 'шт.', 'quantity' => 28, 'cost_price' => 2500, 'unit_price' => 3250),
                            ),
                        ),
                    ),
                ),
                array(
                    'name' => 'РАЗДЕЛ 2. СИЛОВОЙ КАРКАС И ПЕРЕКРЫТИЯ',
                    'items' => array(
                        array(
                            'name' => 'Сборка силового каркаса стен и перекрытий из сухой строганой доски',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 84,
                            'cost_price' => 1200,
                            'unit_price' => 1850,
                            'formula_bind' => 'area * 1.0',
                            'is_qty_locked' => 0,
                            'materials' => array(),
                        ),
                    ),
                ),
            ),
        ),
        array(
            'code' => 'terrace',
            'name' => 'Терраса с настилом ДПК',
            'default_area' => 24.0,
            'description' => 'Открытая или полузакрытая терраса с винтовыми сваями, металлокаркасом и премиальной доской ДПК.',
            'options' => array(
                array('id' => 'delivery', 'name' => 'Доставка', 'checked' => true),
                array('id' => 'montage', 'name' => 'Монтаж под ключ', 'checked' => true),
                array('id' => 'materials', 'name' => 'Доска ДПК и подсистема', 'checked' => true),
                array('id' => 'painting', 'name' => 'Покраска каркаса', 'checked' => true),
            ),
            'sections' => array(
                array(
                    'name' => 'РАЗДЕЛ 1. ОСНОВАНИЕ И КАРКАС ТЕРРАСЫ',
                    'items' => array(
                        array(
                            'name' => 'Монтаж свай винтовых Ø89×2500 с обвязкой профильной трубой',
                            'type' => 'work',
                            'unit' => 'компл.',
                            'quantity' => 1,
                            'cost_price' => 22000,
                            'unit_price' => 38000,
                            'formula_bind' => 'fixed',
                            'is_qty_locked' => 1,
                            'materials' => array(),
                        ),
                        array(
                            'name' => 'Монтаж настила из террасной доски ДПК по алюминиевым лагам',
                            'type' => 'work',
                            'unit' => 'м²',
                            'quantity' => 24,
                            'cost_price' => 900,
                            'unit_price' => 1450,
                            'formula_bind' => 'area * 1.0',
                            'is_qty_locked' => 0,
                            'materials' => array(
                                array('name' => 'Террасная доска ДПК полнотелая 160×24', 'unit' => 'м²', 'quantity' => 24, 'cost_price' => 1950, 'unit_price' => 2750),
                                array('name' => 'Лага алюминиевая 40×40 для ДПК с клипсами', 'unit' => 'м.п.', 'quantity' => 48, 'cost_price' => 380, 'unit_price' => 520),
                            ),
                        ),
                    ),
                ),
            ),
        ),
        array(
            'code' => 'custom',
            'name' => 'Свободная смета',
            'default_area' => 0.0,
            'description' => 'Чистая сметная форма без предустановленных строк. Инженер вручную добавляет разделы, работы и связанные материалы.',
            'options' => array(
                array('id' => 'delivery', 'name' => 'Доставка', 'checked' => true),
                array('id' => 'montage', 'name' => 'Монтаж', 'checked' => true),
                array('id' => 'materials', 'name' => 'Материалы', 'checked' => true),
            ),
            'sections' => array(
                array(
                    'name' => 'РАЗДЕЛ 1. ОСНОВНЫЕ РАБОТЫ',
                    'items' => array(),
                ),
            ),
        ),
    );

    $st = $pdo->prepare("INSERT INTO estimate_templates (code, name, default_area, description, options_json, sections_json) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($templates as $t) {
        $st->execute(array(
            $t['code'],
            $t['name'],
            $t['default_area'],
            $t['description'],
            json_encode($t['options'], JSON_UNESCAPED_UNICODE),
            json_encode($t['sections'], JSON_UNESCAPED_UNICODE),
        ));
    }
}

/**
 * Подсчет итогов сметы по её данным
 */
function vgs_calc_estimate_totals(&$sections)
{
    $workCostPrice = 0;
    $workTotal = 0;
    $matCostPrice = 0;
    $matTotal = 0;
    $deliveryTotal = 0;

    foreach ($sections as &$sec) {
        // Поддержка структуры rows (React / AdminPanelModal / estimateCalculator)
        if (isset($sec['rows']) && is_array($sec['rows'])) {
            foreach ($sec['rows'] as &$row) {
                $qty = isset($row['quantity']) && is_numeric($row['quantity']) ? (float)$row['quantity'] : 0.0;
                $isDeliv = !empty($row['is_delivery']) || (mb_stripos($row['name'] ?? '', 'доставка') !== false);

                $wPrice = isset($row['work_price']) && is_numeric($row['work_price']) ? (float)$row['work_price'] : 0.0;
                $wCost = isset($row['work_cost_price']) && is_numeric($row['work_cost_price']) ? (float)$row['work_cost_price'] : 0.0;
                $mPrice = isset($row['material_price']) && is_numeric($row['material_price']) ? (float)$row['material_price'] : 0.0;
                $mCost = isset($row['material_cost_price']) && is_numeric($row['material_cost_price']) ? (float)$row['material_cost_price'] : 0.0;

                if ($isDeliv) {
                    $delivRowPrice = $mPrice > 0 ? $mPrice : $wPrice;
                    $rowDelivTotal = round($qty * $delivRowPrice, 2);
                    $deliveryTotal += $rowDelivTotal;
                    $row['total_cost'] = $rowDelivTotal;
                } else {
                    $rowWorkTotal = round($qty * $wPrice, 2);
                    $rowWorkCost = round($qty * $wCost, 2);
                    $rowMatTotal = round($qty * $mPrice, 2);
                    $rowMatCost = round($qty * $mCost, 2);

                    $workTotal += $rowWorkTotal;
                    $workCostPrice += $rowWorkCost;
                    $matTotal += $rowMatTotal;
                    $matCostPrice += $rowMatCost;

                    $row['total_cost'] = round($rowWorkTotal + $rowMatTotal, 2);
                    $row['total_cost_price'] = round($rowWorkCost + $rowMatCost, 2);
                }
            }
            continue;
        }

        // Поддержка структуры items (типовые шаблоны / seed_templates)
        if (!isset($sec['items']) || !is_array($sec['items'])) {
            $sec['items'] = array();
            continue;
        }
        foreach ($sec['items'] as &$item) {
            $qty = isset($item['quantity']) && is_numeric($item['quantity']) ? (float)$item['quantity'] : 0.0;
            $costPrice = isset($item['cost_price']) && is_numeric($item['cost_price']) ? (float)$item['cost_price'] : 0.0;
            $unitPrice = isset($item['unit_price']) && is_numeric($item['unit_price']) ? (float)$item['unit_price'] : 0.0;
            
            $itemTotalCost = round($qty * $unitPrice, 2);
            $itemTotalCostPrice = round($qty * $costPrice, 2);
            $item['total_cost'] = $itemTotalCost;
            $item['total_cost_price'] = $itemTotalCostPrice;

            if (mb_stripos($item['name'] ?? '', 'доставка') !== false) {
                $deliveryTotal += $itemTotalCost;
            } else {
                $workTotal += $itemTotalCost;
            }
            $workCostPrice += $itemTotalCostPrice;

            if (isset($item['materials']) && is_array($item['materials'])) {
                foreach ($item['materials'] as &$mat) {
                    $mQty = isset($mat['quantity']) && is_numeric($mat['quantity']) ? (float)$mat['quantity'] : 0.0;
                    $mCostPrice = isset($mat['cost_price']) && is_numeric($mat['cost_price']) ? (float)$mat['cost_price'] : 0.0;
                    $mUnitPrice = isset($mat['unit_price']) && is_numeric($mat['unit_price']) ? (float)$mat['unit_price'] : 0.0;

                    $mTotal = round($mQty * $mUnitPrice, 2);
                    $mTotalCostPrice = round($mQty * $mCostPrice, 2);
                    $mat['total_cost'] = $mTotal;
                    $mat['total_cost_price'] = $mTotalCostPrice;

                    $matTotal += $mTotal;
                    $matCostPrice += $mTotalCostPrice;
                }
            }
        }
    }

    $workTotal = round($workTotal, 2);
    $workCostPrice = round($workCostPrice, 2);
    $matTotal = round($matTotal, 2);
    $matCostPrice = round($matCostPrice, 2);
    $deliveryTotal = round($deliveryTotal, 2);

    $grandTotal = round($workTotal + $matTotal + $deliveryTotal, 2);
    $totalCostPrice = round($workCostPrice + $matCostPrice, 2);
    $margin = round($grandTotal - $totalCostPrice, 2);
    $marginPct = $grandTotal > 0 ? round(($margin / $grandTotal) * 100, 1) : 0;

    return array(
        'work_cost_price' => $workCostPrice,
        'work_total' => $workTotal,
        'material_cost_price' => $matCostPrice,
        'material_total' => $matTotal,
        'delivery_total' => $deliveryTotal,
        'grand_total' => $grandTotal,
        'expected_margin' => $margin,
        'margin_percent' => $marginPct,
    );
}
