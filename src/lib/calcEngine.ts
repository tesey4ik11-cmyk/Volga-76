import { ConfiguratorState, EstimateCalculation, EstimateRow } from '../types';
import { WORK_RATES, MATERIAL_RATES, RateItem } from '../data/estimateRates';

/**
 * Вспомогательное форматирование денежных сумм
 */
export function formatRuble(val: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(val)) + ' ₽';
}

/**
 * Профессиональный расчетный движок ВОЛГАСТРОЙ 76.
 * Полностью rate-based архитектура: объем × расценка = стоимость.
 * Без использования фиктивного распределения сумм (alloc).
 * Каждая позиция обоснована физическим объемом и региональной ставкой (ЯО, 2026).
 */
export function calculateEstimate(config: ConfiguratorState): EstimateCalculation {
  const rows: EstimateRow[] = [];
  let workSum = 0;
  let matSum = 0;

  // Хелпер добавления заголовка раздела
  const addHeader = (name: string, note = '') => {
    rows.push({
      name,
      note,
      cost: 0,
      kind: 'h',
    });
  };

  // Хелпер добавления строки работ или материалов
  const addRow = (
    rate: RateItem,
    volume: number,
    customName?: string,
    customNote?: string
  ) => {
    const vol = Math.round(volume * 100) / 100;
    if (vol <= 0) return;

    const cost = Math.round(vol * rate.price);
    const kind: 'w' | 'm' = rate.type === 'work' ? 'w' : 'm';

    if (kind === 'w') {
      workSum += cost;
    } else {
      matSum += cost;
    }

    const note =
      customNote ||
      `${vol} ${rate.unit} × ${formatRuble(rate.price)} (рынок ${formatRuble(rate.marketPrice)})`;

    rows.push({
      id: rate.id,
      name: customName || rate.name,
      note,
      cost,
      kind,
      volume: vol,
      unit: rate.unit,
      unitPrice: rate.price,
      marketPrice: rate.marketPrice,
      marketMin: rate.marketMin,
      marketMax: rate.marketMax,
      marketAverage: rate.marketAverage,
      marketMedian: rate.marketMedian,
      source: rate.source,
      sourceUrls: rate.sourceUrls,
      checkedAt: rate.checkedAt,
      assumptions: rate.assumptions,
    });
  };

  // ==========================================
  // КАТЕГОРИЯ 1: ДОМ (КАРКАСНЫЙ / МОДУЛЬНЫЙ)
  // ==========================================
  if (config.category === 'house') {
    const area = Math.max(15, config.houseArea || 48);
    const isMetal = config.houseMaterial === 'metal';
    const isTurnkey = config.houseKit === 'turnkey';

    // Геометрия дома: периметр стен и площадь кровли
    // Предполагаем соотношение сторон ~ 1 : 1.33
    const width = Math.sqrt(area * 1.33);
    const depth = area / width;
    const perim = 2 * (width + depth);
    const wallHeight = 2.7;
    const wallArea = Math.round(perim * wallHeight * 10) / 10;
    const roofArea = Math.round(area * 1.22 * 10) / 10; // с учетом свесов и уклона 22°

    // 1. Свайный фундамент (если выбран)
    if (config.houseFund) {
      addHeader('1. СВАЙНЫЙ ФУНДАМЕНТ (НИЖЕ ГЛУБИНЫ ПРОМЕРЗАНИЯ ЯО)');
      const pileCount = Math.max(12, Math.round(area / 3.5));
      const rostverkLen = Math.round(perim * 1.25); // швеллер обвязки

      // Работы
      addRow(WORK_RATES['pile-install-108'], pileCount);
      addRow(WORK_RATES['pile-laser-cut'], pileCount);
      addRow(WORK_RATES['pile-weld-cap'], pileCount);
      addRow(WORK_RATES['pile-concrete-fill'], pileCount);
      addRow(WORK_RATES['pile-rostverk-install'], rostverkLen);

      // Материалы
      if (config.houseMatInclude) {
        addRow(MATERIAL_RATES['pile-screw-108-mat'], pileCount);
        addRow(MATERIAL_RATES['pile-cap-mat'], pileCount);
        addRow(MATERIAL_RATES['pile-cps-mat'], Math.round(pileCount * 1.5));
        addRow(MATERIAL_RATES['pile-channel-140-mat'], rostverkLen);
      }
    }

    // 2. Силовой несущий каркас
    addHeader(
      isMetal
        ? '2. СИЛОВОЙ НЕСУЩИЙ МЕТАЛЛОКАРКАС'
        : '2. СИЛОВОЙ КАРКАС ИЗ СУХОЙ СТРОГАНОЙ ДОСКИ'
    );

    if (isMetal) {
      // Работы металлокаркаса
      addRow(WORK_RATES['frame-metal-fabrication-work'], area);
      addRow(WORK_RATES['frame-metal-erection-work'], area);
      addRow(WORK_RATES['frame-metal-truss-work'], roofArea);
      addRow(WORK_RATES['frame-metal-paint-work'], wallArea + roofArea);

      // Материалы металлокаркаса
      if (config.houseMatInclude) {
        addRow(MATERIAL_RATES['metal-tubes-mat'], area);
        addRow(MATERIAL_RATES['metal-hardware-mat'], area);
        addRow(
          MATERIAL_RATES['metal-primer-mat'],
          Math.round((wallArea + roofArea) * 0.25)
        );
      }
    } else {
      // Работы деревянного каркаса
      addRow(WORK_RATES['frame-wood-walls-work'], wallArea);
      addRow(WORK_RATES['frame-wood-floors-work'], area);
      addRow(WORK_RATES['frame-wood-rafters-work'], roofArea);
      addRow(
        WORK_RATES['frame-wood-antiseptic-work'],
        wallArea + area + roofArea
      );

      // Материалы деревянного каркаса
      if (config.houseMatInclude) {
        const lumberVol = Math.round(area * 0.16 * 10) / 10; // ~0.16 м³ пиломатериала на 1 м² пола
        addRow(MATERIAL_RATES['wood-lumber-dry-mat'], lumberVol);
        addRow(MATERIAL_RATES['wood-fasteners-mat'], area);
        addRow(MATERIAL_RATES['wood-membrane-mat'], wallArea + roofArea);
        addRow(
          MATERIAL_RATES['wood-antiseptic-mat'],
          Math.round((wallArea + area + roofArea) * 0.25)
        );
      }
    }

    // 3. Комплектация «ПОД КЛЮЧ»
    // ВНИМАНИЕ: Если выбрана «Силовая коробка» (frame), этот блок НЕ рассчитывается вовсе!
    if (isTurnkey) {
      addHeader('3. ОГРАЖДАЮЩИЕ КОНСТРУКЦИИ, УТЕПЛЕНИЕ И КРОВЛЯ (ПОД КЛЮЧ)');

      if (isMetal) {
        // Металлокаркас под ключ комплектуется сэндвич-панелями
        addRow(WORK_RATES['sandwich-wall-work'], wallArea);
        addRow(WORK_RATES['sandwich-roof-work'], roofArea);

        if (config.houseMatInclude) {
          addRow(MATERIAL_RATES['sandwich-wall-mat'], wallArea);
          addRow(MATERIAL_RATES['sandwich-roof-mat'], roofArea);
        }
      } else {
        // Деревянный каркас под ключ: утепление, OSB, металлочерепица Grand Line
        addRow(WORK_RATES['wood-facade-osb-work'], wallArea);
        addRow(WORK_RATES['insulation-walls-work'], wallArea);
        addRow(WORK_RATES['insulation-floor-roof-work'], area + roofArea);
        addRow(WORK_RATES['roof-metal-sheet-work'], roofArea);
        addRow(
          WORK_RATES['roof-gutters-soffits-work'],
          Math.round(perim * 1.1)
        );

        if (config.houseMatInclude) {
          addRow(MATERIAL_RATES['facade-osb-mat'], wallArea);
          // Объем базальтового утеплителя: стены 150мм + перекрытия 200мм + кровля 200мм
          const insulVol =
            Math.round(
              (wallArea * 0.15 + area * 0.20 + roofArea * 0.20) * 10
            ) / 10;
          addRow(MATERIAL_RATES['insulation-rockwool-mat'], insulVol);
          addRow(
            MATERIAL_RATES['vapor-barrier-mat'],
            wallArea + area + roofArea
          );
          addRow(MATERIAL_RATES['roof-metal-classic-mat'], roofArea);
          addRow(
            MATERIAL_RATES['roof-gutters-mat'],
            Math.round(perim * 0.6)
          );
          addRow(
            MATERIAL_RATES['roof-soffits-mat'],
            Math.round(perim * 0.5)
          );
        }
      }

      // 4. Окна и двери (строго поштучно!)
      addHeader('4. ОКОННЫЕ И ДВЕРНЫЕ БЛОКИ (ПОШТУЧНО ПО ГОСТ)');
      const windowCount = Math.max(3, Math.round(area / 12));
      const entryDoorCount = 1;

      addRow(WORK_RATES['window-install-work'], windowCount);
      addRow(WORK_RATES['entry-door-install-work'], entryDoorCount);

      if (config.houseMatInclude) {
        addRow(MATERIAL_RATES['window-rehau-mat'], windowCount);
        addRow(MATERIAL_RATES['entry-door-thermo-mat'], entryDoorCount);
      }
    }

    // 5. Автокран / Спецтехника (если включен)
    if (config.houseCrane) {
      addHeader('5. СПЕЦТЕХНИКА И МОНТАЖНЫЙ КРАН');
      const craneShifts = Math.max(2, Math.ceil(area / 35));
      const craneRate: RateItem = {
        id: 'crane-shift',
        name: 'Аренда автокрана 25т (машино-смена 8 часов с ГСМ и оператором)',
        unit: 'смена',
        marketPrice: 24000,
        marketMin: 21000,
        marketMax: 27500,
        marketAverage: 24167,
        marketMedian: 24000,
        price: 21600,
        category: 'metal-frame',
        type: 'work',
        region: 'Ярославская область',
        source: 'Диспетчерская служба «Спецтехника 76» Ярославль, Тормозное шоссе',
        sourceUrls: ['https://spec-tehnika76.ru/arenda-krana', 'https://yaroslavl.tiu.ru/arenda-avtokrana'],
        date: '2026-02',
        checkedAt: '2026-02-15',
        assumptions: 'Машино-смена 7+1 час, подача в пределах Ярославля и пригорода до 30 км, аттестованный крановщик, топливо включено',
        notes: 'Разгрузка и монтаж крупногабаритных конструкций на объекте',
      };
      addRow(craneRate, craneShifts);
    }
  }

  // ==========================================
  // КАТЕГОРИЯ 2: ВИНТОВЫЕ СВАИ (СВАЙНОЕ ПОЛЕ)
  // ==========================================
  else if (config.category === 'pile') {
    const count = Math.max(4, config.pileCount || 20);
    const dia = config.pileDia || '89';

    addHeader(`1. ВИНТОВЫЕ СВАИ Ø${dia} ММ (ЗАВОДСКОЕ ПРОИЗВОДСТВО ЯО)`);

    // Подбор расценок по диаметру
    const installWorkKey = `pile-install-${dia}`;
    const pileMatKey = `pile-screw-${dia}-mat`;

    const installWork = WORK_RATES[installWorkKey] || WORK_RATES['pile-install-89'];
    const pileMat = MATERIAL_RATES[pileMatKey] || MATERIAL_RATES['pile-screw-89-mat'];

    // 1. Работы по завинчиванию
    addRow(installWork, count);
    addRow(WORK_RATES['pile-laser-cut'], count);
    addRow(WORK_RATES['pile-weld-cap'], count);

    // Бетонирование внутренней полости сваи (только если выбрано pileFill!)
    if (config.pileFill) {
      addRow(WORK_RATES['pile-concrete-fill'], count);
    }

    // 2. Материалы свайного поля
    addRow(pileMat, count);
    addRow(MATERIAL_RATES['pile-cap-mat'], count);

    if (config.pileFill) {
      // 1.5 мешка на сваю L=2.5м
      addRow(MATERIAL_RATES['pile-cps-mat'], Math.round(count * 1.5));
    }

    // 3. Обвязка швеллером (только если выбрано pileRostverk!)
    if (config.pileRostverk) {
      addHeader('2. ОБВЯЗКА ШВЕЛЛЕРОМ 140 ГОСТ (РОСТВЕРК)');
      // Длина швеллера оценивается ~ 1.7 м на сваю
      const channelLen = Math.round(count * 1.7);
      addRow(WORK_RATES['pile-rostverk-install'], channelLen);
      addRow(MATERIAL_RATES['pile-channel-140-mat'], channelLen);
    }
  }

  // ==========================================
  // КАТЕГОРИЯ 3: ТЕРРАСА ИЗ ДПК
  // ==========================================
  else if (config.category === 'deck') {
    const area = Math.max(6, config.deckArea || 24);
    const isDiag = config.deckLayout === 'diag';
    const stepsCount = config.deckSteps ?? 2;

    // Габариты террасы для расчета периметра
    const width = Math.sqrt(area * 1.4);
    const depth = area / width;
    const perim = Math.round(2 * (width + depth) * 10) / 10;

    addHeader('1. НАСТИЛ ТЕРРАСНОЙ ДОСКИ ДПК И ЛАГИ');

    if (isDiag) {
      // Диагональная укладка 45°: сложная подрезка, учащенный шаг лаг 280 мм, фриз по периметру
      addRow(WORK_RATES['deck-lags-diag-work'], area);
      addRow(WORK_RATES['deck-frieze-work'], perim);

      // Материалы с запасом 10% на косую подрезку
      const boardArea = Math.round(area * 1.1 * 10) / 10;
      addRow(MATERIAL_RATES['deck-board-dpk-mat'], boardArea);
      addRow(MATERIAL_RATES['deck-lags-dpk-mat'], Math.round(area * 4.2)); // шаг 280мм
      addRow(MATERIAL_RATES['deck-clips-mat'], area);
      addRow(MATERIAL_RATES['deck-frieze-mat'], perim);
    } else {
      // Прямая укладка: шаг лаг 380 мм
      addRow(WORK_RATES['deck-lags-straight-work'], area);
      addRow(MATERIAL_RATES['deck-board-dpk-mat'], area);
      addRow(MATERIAL_RATES['deck-lags-dpk-mat'], Math.round(area * 3.2));
      addRow(MATERIAL_RATES['deck-clips-mat'], area);
    }

    // 2. Свайный фундамент под террасу (только если выбрано deckPiles!)
    if (config.deckPiles) {
      addHeader('2. СВАЙНЫЙ ФУНДАМЕНТ ТЕРРАСЫ');
      const pileCount = Math.max(6, Math.round(area / 2.8));
      addRow(WORK_RATES['pile-install-76'], pileCount);
      addRow(WORK_RATES['pile-laser-cut'], pileCount);
      addRow(WORK_RATES['pile-weld-cap'], pileCount);
      addRow(MATERIAL_RATES['pile-screw-76-mat'], pileCount);
      addRow(MATERIAL_RATES['pile-cap-mat'], pileCount);
    }

    // 3. Ограждения террасы (только если выбрано deckRail!)
    if (config.deckRail) {
      addHeader('3. БАЛЮСТРАДА И ОГРАЖДЕНИЯ ДПК');
      // Длина перил = периметр минус проход к ступеням 1.8 м
      const railLen = Math.max(3, Math.round(perim - 1.8));
      const postCount = Math.max(4, Math.ceil(railLen / 1.8) + 2);

      addRow(WORK_RATES['deck-railing-work'], railLen);
      addRow(MATERIAL_RATES['deck-posts-mat'], postCount);
      addRow(MATERIAL_RATES['deck-rail-mat'], railLen);
    }

    // 4. Ступени террасы (только если deckSteps > 0!)
    if (stepsCount > 0) {
      addHeader('4. ВХОДНЫЕ СТУПЕНИ ИЗ ДПК');
      addRow(WORK_RATES['deck-step-work'], stepsCount);
      addRow(MATERIAL_RATES['deck-step-mat'], stepsCount);
    }
  }

  // ==========================================
  // КАТЕГОРИЯ 4: КОМПОЗИТНЫЙ БАССЕЙН
  // ==========================================
  else if (config.category === 'pool') {
    addHeader('1. КОМПОЗИТНАЯ ЧАША И СТРОИТЕЛЬНО-МОНТАЖНЫЕ РАБОТЫ');
    addRow(WORK_RATES['pool-earth-prep-work'], 1);
    addRow(WORK_RATES['pool-bowl-install-work'], 1);
    addRow(MATERIAL_RATES['pool-bowl-52-mat'], 1);

    // 2. Фильтрация и водоподготовка (только если выбрано poolPipe!)
    if (config.poolPipe) {
      addHeader('2. СИСТЕМА ФИЛЬТРАЦИИ И ТРУБНАЯ ОБВЯЗКА ПВХ');
      addRow(WORK_RATES['pool-filtration-work'], 1);
      addRow(MATERIAL_RATES['pool-filtration-station-mat'], 1);
    }

    // 3. Кессон-бокс техпомещения (только если выбрано poolTech!)
    if (config.poolTech) {
      addHeader('3. КЕССОН ТЕХПОМЕЩЕНИЯ ДЛЯ ОБОРУДОВАНИЯ');
      addRow(WORK_RATES['pool-tech-room-work'], 1);
      addRow(MATERIAL_RATES['pool-tech-box-mat'], 1);
    }

    // 4. Павильон бассейна (только если poolPavilion !== 'none'!)
    if (config.poolPavilion === 'slide') {
      addHeader('4. ТЕЛЕСКОПИЧЕСКИЙ РАЗДВИЖНОЙ ПАВИЛЬОН НА РЕЛЬСАХ');
      addRow(WORK_RATES['pool-pavilion-slide-work'], 1);
      addRow(MATERIAL_RATES['pool-pavilion-slide-mat'], 1);
    } else if (config.poolPavilion === 'poly') {
      addHeader('4. АРОЧНЫЙ СТАЦИОНАРНЫЙ НАВЕС ИЗ ПОЛИКАРБОНАТА');
      addRow(WORK_RATES['pool-pavilion-poly-work'], 1);
      addRow(MATERIAL_RATES['pool-pavilion-poly-mat'], 1);
    }

    // 5. Терраса вокруг бассейна (только если выбрано poolDeck!)
    if (config.poolDeck) {
      addHeader('5. ОБХОДНАЯ ЗОНА ТЕРРАСЫ ДПК НА СВАЯХ');
      const deckAroundArea = 22; // настил шириной 1.2 м вокруг чаши 5.2×3.2 м
      const pilesCount = 8;

      addRow(WORK_RATES['deck-lags-straight-work'], deckAroundArea);
      addRow(MATERIAL_RATES['deck-board-dpk-mat'], deckAroundArea);
      addRow(
        MATERIAL_RATES['deck-lags-dpk-mat'],
        Math.round(deckAroundArea * 3.2)
      );
      addRow(MATERIAL_RATES['deck-clips-mat'], deckAroundArea);

      // Сваи под обходную террасу
      addRow(WORK_RATES['pile-install-76'], pilesCount);
      addRow(MATERIAL_RATES['pile-screw-76-mat'], pilesCount);
      addRow(MATERIAL_RATES['pile-cap-mat'], pilesCount);
    }
  }

  // ==========================================
  // КАТЕГОРИЯ 5: ИНЖЕНЕРНЫЕ СЕТИ
  // ==========================================
  else if (config.category === 'net') {
    const len = Math.max(5, config.netLength || 25);
    const isDeep = config.netDeep; // 1.7м vs 1.2м
    const netType = config.netType || 'both';

    // 1. Земляные работы (зависят от глубины)
    addHeader(
      isDeep
        ? `1. ЗЕМЛЯНЫЕ РАБОТЫ (ГЛУБИНА 1.7 М — НИЖЕ ПРОМЕРЗАНИЯ ЯО)`
        : `1. ЗЕМЛЯНЫЕ РАБОТЫ (ГЛУБИНА 1.2 М)`
    );

    const trenchRate = isDeep
      ? WORK_RATES['trench-excavation-17']
      : WORK_RATES['trench-excavation-12'];

    addRow(trenchRate, len);
    addRow(WORK_RATES['trench-sand-cushion-work'], len);
    addRow(WORK_RATES['trench-backfill-work'], len);
    addRow(WORK_RATES['geo-survey-net-work'], 1);

    // Песчаная подушка (материал)
    const sandVol = Math.round(len * 0.15 * 10) / 10;
    addRow(MATERIAL_RATES['sand-building-mat'], sandVol);

    // 2. Трубопроводы в зависимости от выбранного типа сети
    if (netType === 'k1' || netType === 'both') {
      addHeader('2. НАРУЖНАЯ КАНАЛИЗАЦИЯ К1 Ø110');
      addRow(WORK_RATES['pipe-k1-lay-work'], len);
      addRow(MATERIAL_RATES['pipe-k1-pvc-mat'], len);

      // Смотровые колодцы (только если netHasWells && netWellsCount > 0!)
      const wellsCount = config.netHasWells ? config.netWellsCount || 2 : 0;
      if (wellsCount > 0) {
        addHeader('3. СМОТРОВЫЕ КОЛОДЦЫ КС 10-9');
        addRow(WORK_RATES['well-ks10-install-work'], wellsCount);
        addRow(MATERIAL_RATES['well-ks10-rings-mat'], wellsCount);
        addRow(MATERIAL_RATES['well-pn10-pp10-mat'], wellsCount);
        addRow(MATERIAL_RATES['well-hatch-t-mat'], wellsCount);
      }
    }

    if (netType === 'water' || netType === 'both') {
      addHeader(
        netType === 'both'
          ? '4. НАРУЖНЫЙ ПИТЬЕВОЙ ВОДОПРОВОД ПНД Ø32'
          : '2. НАРУЖНЫЙ ПИТЬЕВОЙ ВОДОПРОВОД ПНД Ø32'
      );
      addRow(WORK_RATES['pipe-water-lay-work'], len);
      addRow(MATERIAL_RATES['pipe-water-pnd-mat'], len);
    }

    if (netType === 'heating') {
      addHeader('2. ДВУХНИТОЧНАЯ ТЕПЛОТРАССА В ППУ-ПЭ ИЗОЛЯЦИИ');
      addRow(WORK_RATES['heat-pipe-lay-work'], len);
      addRow(WORK_RATES['heat-test-odk-work'], 1);
      addRow(MATERIAL_RATES['heat-pipes-ppu-mat'], len);
      // Стыковые муфты каждые 12 метров
      const jointsCount = Math.max(2, Math.ceil(len / 12) * 2);
      addRow(MATERIAL_RATES['heat-joints-ppu-mat'], jointsCount);

      // Тепловые камеры (только если netHeatingChambers && netHeatingChambersCount > 0!)
      const chambersCount = config.netHeatingChambers
        ? config.netHeatingChambersCount || 1
        : 0;
      if (chambersCount > 0) {
        addHeader('3. ТЕПЛОВЫЕ КАМЕРЫ УТ С ЗАПОРНОЙ АРМАТУРОЙ');
        addRow(WORK_RATES['heat-chamber-install-work'], chambersCount);
        addRow(MATERIAL_RATES['heat-chamber-ut-mat'], chambersCount);
      }
    }

    if (netType === 'storm') {
      addHeader('2. ЛИВНЕВАЯ КАНАЛИЗАЦИЯ SN8 Ø160');
      addRow(WORK_RATES['storm-pipe-lay-work'], len);
      addRow(MATERIAL_RATES['storm-pipe-sn8-mat'], len);

      // Дождеприемники (только если netStormInlets && netStormInletsCount > 0!)
      const inletsCount = config.netStormInlets
        ? config.netStormInletsCount || 2
        : 0;
      if (inletsCount > 0) {
        addHeader('3. ДОЖДЕПРИЕМНИКИ С ЧУГУННЫМИ РЕШЕТКАМИ С250');
        addRow(WORK_RATES['storm-inlet-install-work'], inletsCount);
        addRow(MATERIAL_RATES['storm-inlet-box-mat'], inletsCount);
        addRow(MATERIAL_RATES['storm-iron-grate-mat'], inletsCount);
      }
    }
  }

  // ==========================================
  // КАТЕГОРИЯ 6: ВНУТРЕННЯЯ ОТДЕЛКА
  // ==========================================
  else if (config.category === 'finish') {
    const area = Math.max(15, config.finishArea || 50);
    const isFull = config.finishLevel === 'full';

    // Оценка площади стен по полу: ~ 2.8 м² стены на 1 м² пола
    const wallArea = Math.round(area * 2.8);

    addHeader('1. СТЕНЫ: ПОДГОТОВИТЕЛЬНЫЕ И ВЫРАВНИВАЮЩИЕ РАБОТЫ');
    addRow(WORK_RATES['finish-gkl-walls-work'], wallArea);
    addRow(WORK_RATES['finish-putty-work'], wallArea);
    addRow(MATERIAL_RATES['finish-gklv-mat'], wallArea);
    addRow(MATERIAL_RATES['finish-putty-mat'], wallArea);

    if (isFull) {
      addHeader('2. ФИНИШНАЯ МАЛЯРНАЯ ОТДЕЛКА СТЕН');
      addRow(WORK_RATES['finish-paint-work'], wallArea);
      addRow(MATERIAL_RATES['finish-paint-mat'], wallArea);
    }

    // 3. Чистовой пол (только если finishFloor === true!)
    if (config.finishFloor) {
      addHeader('3. УСТРОЙСТВО ПОЛОВ И НАСТИЛ КВАРЦВИНИЛА SPC');
      addRow(WORK_RATES['finish-floor-screed-work'], area);
      addRow(WORK_RATES['finish-floor-spc-work'], area);
      addRow(MATERIAL_RATES['finish-screed-mat'], area);
      addRow(MATERIAL_RATES['finish-spc-mat'], area);
    }

    // 4. Теплый пол (только если finishWarm === true!)
    if (config.finishWarm) {
      addHeader('4. ВОДЯНОЙ ТЕПЛЫЙ ПОЛ PEX-A С КОЛЛЕКТОРОМ');
      addRow(WORK_RATES['finish-warm-floor-work'], area);
      addRow(WORK_RATES['finish-warm-cabinet-work'], 1);

      // Расход трубы: ~6.5 м.п. на 1 м² пола
      addRow(MATERIAL_RATES['finish-warm-pipe-mat'], Math.round(area * 6.5));
      addRow(MATERIAL_RATES['finish-warm-mats-mat'], area);
      addRow(MATERIAL_RATES['finish-warm-collector-mat'], 1);
    }

    // 5. Электромонтажные работы (только если finishElectric === true!)
    if (config.finishElectric) {
      addHeader('5. ЭЛЕКТРОМОНТАЖНЫЕ РАБОТЫ И ЩИТОВОЕ ОБОРУДОВАНИЕ');
      const cableLen = Math.round(area * 4.5);
      const pointsCount = Math.max(8, Math.round(area * 0.7));

      addRow(WORK_RATES['finish-electric-wiring-work'], cableLen);
      addRow(WORK_RATES['finish-electric-box-work'], pointsCount);
      addRow(WORK_RATES['finish-electric-panel-work'], 1);

      addRow(MATERIAL_RATES['finish-cable-vvg-mat'], cableLen);
      addRow(MATERIAL_RATES['finish-boxes-mat'], pointsCount);
      addRow(MATERIAL_RATES['finish-panel-kit-mat'], 1);
    }
  }

  // Строгое соблюдение баланса сметы: totalCost = workCost + materialCost
  const totalCost = workSum + matSum;

  const titlesMap: Record<string, { title: string; subtitle: string }> = {
    house: {
      title: 'Смета на строительство модульного/каркасного дома',
      subtitle: `Площадь ${config.houseArea || 48} м² • ${
        config.houseKit === 'turnkey' ? 'Комплектация «Под ключ»' : 'Силовая коробка (каркас)'
      } • ${config.houseMaterial === 'metal' ? 'Металлокаркас' : 'Сухая строганая древесина'}`,
    },
    pile: {
      title: 'Смета на свайный фундамент',
      subtitle: `${config.pileCount || 20} винтовых свай Ø${config.pileDia || '89'} мм • Погружение ниже глубины промерзания ЯО`,
    },
    deck: {
      title: 'Смета на террасу из древесно-полимерного композита',
      subtitle: `Площадь ${config.deckArea || 24} м² • ${
        config.deckLayout === 'diag' ? 'Диагональная укладка 45°' : 'Прямая укладка'
      } • Полнотелый ДПК`,
    },
    pool: {
      title: 'Смета на композитный бассейн «под ключ»',
      subtitle: `Чаша 5.2 × 3.2 × 1.45 м • ${
        config.poolPavilion === 'slide'
          ? 'Раздвижной павильон'
          : config.poolPavilion === 'poly'
          ? 'Арочный навес'
          : 'Без павильона'
      }`,
    },
    net: {
      title: 'Смета на наружные инженерные коммуникации',
      subtitle: `Трасса ${config.netLength || 25} м • Глубина ${
        config.netDeep ? '1.7 м (ниже промерзания)' : '1.2 м'
      }`,
    },
    finish: {
      title: 'Смета на внутреннюю отделку помещений',
      subtitle: `Площадь ${config.finishArea || 50} м² • ${
        config.finishLevel === 'full' ? 'Чистовая отделка под ключ' : 'White Box (предчистовая)'
      }`,
    },
  };

  const { title, subtitle } = titlesMap[config.category] || {
    title: 'Индивидуальная строительная смета',
    subtitle: 'Прямой расчет по региональным расценкам Ярославской области',
  };

  return {
    title,
    subtitle,
    totalCost,
    workCost: workSum,
    materialCost: matSum,
    rows,
  };
}
