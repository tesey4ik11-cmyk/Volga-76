export interface TemplateMaterial {
  name: string;
  unit: string;
  quantity: number;
  cost_price: number;
  unit_price: number;
}

export interface TemplateItem {
  name: string;
  type: string;
  unit: string;
  quantity: number;
  cost_price: number;
  unit_price: number;
  is_qty_locked?: number;
  materials?: TemplateMaterial[];
}

export interface TemplateSection {
  name: string;
  items: TemplateItem[];
}

export interface EstimateTemplate {
  id: string;
  category?: string;
  name: string;
  badge?: string;
  icon?: string;
  description?: string;
  defaultArea?: number;
  sections: TemplateSection[];
}

export const pZ: EstimateTemplate[] = [{id:"tech_block_murava",category:"house",name:"Технический блок «Мурава» 50 м² (PIR сэндвич)",badge:"Модульные здания",icon:"🏗️",description:"Комплекс под ключ: свайный фундамент Ø89, каркас, утепление PIR 120/150 мм, кровля, проект АС/КР, доставка",defaultArea:50,sections:[{name:"РАЗДЕЛ 1. СВАЙНЫЙ ФУНДАМЕНТ",items:[{name:"Разметка осей свайного поля с оптическим нивелиром",type:"work",unit:"компл.",quantity:1,cost_price:6e3,unit_price:12e3,is_qty_locked:1,materials:[]},{name:"Монтаж винтовых свай Ø89×3000 ст3сп5 с бетонированием и оголовками",type:"work",unit:"шт.",quantity:24,cost_price:950,unit_price:1500,is_qty_locked:0,materials:[{name:"Свая винтовая Ø89×3000 ст3сп5 толщина 4 мм (Северсталь)",unit:"шт.",quantity:24,cost_price:1850,unit_price:2295},{name:"Оголовок усиленный 200×200 толщина 4 мм",unit:"шт.",quantity:24,cost_price:320,unit_price:450},{name:"Бетонирование полости свай (ЦПС М300)",unit:"м³",quantity:.5,cost_price:4800,unit_price:6500}]},{name:"Обвязка свайного поля швеллером 16П с антикоррозийной обработкой швов",type:"work",unit:"м.п.",quantity:42,cost_price:650,unit_price:950,is_qty_locked:0,materials:[{name:"Швеллер 16П горячекатаный Ст3сп",unit:"м.п.",quantity:42,cost_price:1380,unit_price:1780}]}]},{name:"РАЗДЕЛ 2. ПОЛ И НЕСУЩЕЕ ПЕРЕКРЫТИЕ",items:[{name:"Монтаж несущих прогонов перекрытия пола",type:"work",unit:"м²",quantity:50,cost_price:550,unit_price:850,is_qty_locked:0,materials:[{name:"Профильная труба 100×50×3 мм (прогоны пола)",unit:"м.п.",quantity:60,cost_price:620,unit_price:890}]},{name:"Устройство настила пола из влагостойкой ЦСП 16 мм",type:"work",unit:"м²",quantity:50,cost_price:400,unit_price:680,is_qty_locked:0,materials:[{name:"Плита ЦСП 16 мм влагостойкая 3200×1250",unit:"м²",quantity:50,cost_price:680,unit_price:980}]}]},{name:"РАЗДЕЛ 3. СТЕНЫ И ОГРАЖДАЮЩИЕ КОНСТРУКЦИИ",items:[{name:"Сборка и монтаж несущего металлокаркаса стен",type:"work",unit:"м²",quantity:50,cost_price:650,unit_price:920,is_qty_locked:0,materials:[{name:"Фасонные и доборные элементы RAL 7024 с крепежом",unit:"компл.",quantity:1,cost_price:14e3,unit_price:19500}]},{name:"Монтаж стеновых сэндвич-панелей PIR 120 мм с герметизацией швов",type:"work",unit:"м²",quantity:96,cost_price:320,unit_price:480,is_qty_locked:0,materials:[{name:"Сэндвич-панель PIR 120 мм стеновая с замком Z-Lock",unit:"м²",quantity:96,cost_price:640,unit_price:860}]}]},{name:"РАЗДЕЛ 4. КРОВЛЯ",items:[{name:"Монтаж стропильной системы и прогонов кровли",type:"work",unit:"м²",quantity:56,cost_price:320,unit_price:490,is_qty_locked:0,materials:[]},{name:"Укладка кровельных сэндвич-панелей PIR 150 мм",type:"work",unit:"м²",quantity:56,cost_price:310,unit_price:460,is_qty_locked:0,materials:[{name:"Сэндвич-панель PIR 150 мм кровельная",unit:"м²",quantity:56,cost_price:850,unit_price:1120}]}]},{name:"РАЗДЕЛ 5. ИНЖЕНЕРНОЕ ПРОЕКТИРОВАНИЕ И ДОКУМЕНТАЦИЯ",items:[{name:"Разработка рабочей документации АС/КР и планов свайного поля",type:"work",unit:"компл.",quantity:1,cost_price:15e3,unit_price:35e3,is_qty_locked:1,materials:[]},{name:"Подготовка исполнительной документации и актов скрытых работ",type:"work",unit:"компл.",quantity:1,cost_price:5e3,unit_price:12e3,is_qty_locked:1,materials:[]}]},{name:"РАЗДЕЛ 6. ЛОГИСТИКА И ДОСТАВКА",items:[{name:"Доставка материалов манипулятором на объект (Ярославская обл.)",type:"work",unit:"рейс",quantity:1,cost_price:18e3,unit_price:25e3,is_qty_locked:1,materials:[]}]}]},{id:"screw_piles_field",category:"pile",name:"Свайное поле (Винтовые сваи Ø108 с оголовками и бетонированием)",badge:"Фундаменты",icon:"🔩",description:"Разметка нивелиром, механизированное завинчивание свай Ø108×2500 ниже промерзания, срезка, бетонирование полости ЦПС, оголовки 200×200, обвязка",defaultArea:36,sections:[{name:"РАЗДЕЛ 1. ПОДГОТОВИТЕЛЬНЫЕ И ГЕОДЕЗИЧЕСКИЕ РАБОТЫ",items:[{name:"Выезд инженера, разметка свайного поля оптическим нивелиром Sokkia",type:"work",unit:"компл.",quantity:1,cost_price:4e3,unit_price:8500,is_qty_locked:1,materials:[]}]},{name:"РАЗДЕЛ 2. МОНТАЖ ВИНТОВЫХ СВАЙ",items:[{name:"Механизированное завинчивание свай Ø108×2500 ниже глубины промерзания",type:"work",unit:"шт.",quantity:16,cost_price:1100,unit_price:1750,is_qty_locked:0,materials:[{name:"Свая винтовая Ø108×2500 ст3сп5 толщина стенки 4 мм",unit:"шт.",quantity:16,cost_price:2150,unit_price:2690},{name:"Оголовок усиленный 200×200 с ребрами жесткости",unit:"шт.",quantity:16,cost_price:320,unit_price:450},{name:"Бетонирование полости свай сухой смесью ЦПС М300",unit:"мешок",quantity:8,cost_price:190,unit_price:280}]},{name:"Нивелирование оголовков в единый горизонт и обварка по контуру",type:"work",unit:"шт.",quantity:16,cost_price:250,unit_price:420,is_qty_locked:0,materials:[{name:"Антикоррозийный грунт-эмаль для сварных швов 3в1",unit:"банка",quantity:2,cost_price:450,unit_price:720}]}]},{name:"РАЗДЕЛ 3. ОБВЯЗКА РОСТВЕРКОМ",items:[{name:"Монтаж металлической обвязки швеллером 140 ГОСТ",type:"work",unit:"м.п.",quantity:28,cost_price:600,unit_price:920,is_qty_locked:0,materials:[{name:"Швеллер 14П стальной горячекатаный Ст3",unit:"м.п.",quantity:28,cost_price:1150,unit_price:1480}]}]},{name:"РАЗДЕЛ 4. ДОСТАВКА И ЛОГИСТИКА",items:[{name:"Доставка свай и металлопроката автотранспортом подрядчика",type:"work",unit:"рейс",quantity:1,cost_price:7e3,unit_price:12e3,is_qty_locked:1,materials:[]}]}]},{id:"frame_house",category:"house",name:"Каркасный дом / баня под ключ (Сухая строганая доска)",badge:"Дома и бани",icon:"🏡",description:"Силовой каркас из сухой камерной строганой доски, перекрестное утепление 150/200 мм Rockwool, пароизоляция, фасад, кровля металлочерепица Grand Line, окна Rehau",defaultArea:64,sections:[{name:"РАЗДЕЛ 1. ФУНДАМЕНТ И НИЖНЯЯ ОБВЯЗКА",items:[{name:"Устройство свайного поля Ø108 с обвязкой брусом 150×150",type:"work",unit:"шт.",quantity:20,cost_price:1400,unit_price:2100,is_qty_locked:0,materials:[{name:"Сваи винтовые Ø108×2500 с оголовками и ЦПС",unit:"шт.",quantity:20,cost_price:2600,unit_price:3350},{name:"Брус хвойный 150×150 антисептированный ГОСТ",unit:"м³",quantity:3.5,cost_price:18500,unit_price:23500}]}]},{name:"РАЗДЕЛ 2. СИЛОВОЙ КАРКАС И СТРОПИЛЬНАЯ СИСТЕМА",items:[{name:"Монтаж силового каркаса стен и перекрытий (сухая строганая доска 45×145)",type:"work",unit:"м²",quantity:64,cost_price:900,unit_price:1450,is_qty_locked:0,materials:[{name:"Сухая строганая доска 45×145 камерной сушки",unit:"м³",quantity:6.8,cost_price:22e3,unit_price:27500},{name:"Крепеж усиленный, перфорация, конструкционные саморезы",unit:"компл.",quantity:1,cost_price:12e3,unit_price:18e3}]},{name:"Монтаж стропильной системы двухскатной кровли",type:"work",unit:"м²",quantity:78,cost_price:550,unit_price:850,is_qty_locked:0,materials:[{name:"Доска стропильная 45×195 сухая строганая",unit:"м³",quantity:3.2,cost_price:22e3,unit_price:27500}]}]},{name:"РАЗДЕЛ 3. ТЕПЛОИЗОЛЯЦИЯ И ВЕТРО-ВЛАГОЗАЩИТА",items:[{name:"Утепление базальтовыми плитами Rockwool 150 мм (стены) + 200 мм (кровля)",type:"work",unit:"м²",quantity:140,cost_price:280,unit_price:450,is_qty_locked:0,materials:[{name:"Базальтовый утеплитель Rockwool Лайт Баттс Скандик",unit:"м³",quantity:24,cost_price:3400,unit_price:4200},{name:"Мембрана ветрозащитная диффузионная Tyvek / Изоспан AQ",unit:"м²",quantity:180,cost_price:85,unit_price:125},{name:"Пароизоляция с проклейкой нахлестов Delta / Изоспан RS",unit:"м²",quantity:180,cost_price:75,unit_price:110}]}]},{name:"РАЗДЕЛ 4. КРОВЛЯ И ФАСАД",items:[{name:"Монтаж металлочерепицы Grand Line Classic с водосточной системой",type:"work",unit:"м²",quantity:78,cost_price:650,unit_price:1050,is_qty_locked:0,materials:[{name:"Металлочерепица Grand Line 0.5 мм Satin RAL 7024 с доборами",unit:"м²",quantity:78,cost_price:890,unit_price:1180},{name:"Водосточная система Grand Line металлическая 125/90",unit:"компл.",quantity:1,cost_price:16500,unit_price:22e3}]},{name:"Облицовка фасада имитацией бруса с покраской в цеху",type:"work",unit:"м²",quantity:110,cost_price:700,unit_price:1150,is_qty_locked:0,materials:[{name:"Имитация бруса сосна сорт АВ 140×20 окрашенная",unit:"м²",quantity:110,cost_price:950,unit_price:1320}]}]},{name:"РАЗДЕЛ 5. ОКНА И ВХОДНАЯ ДВЕРЬ",items:[{name:"Монтаж двухкамерных стеклопакетов Rehau Grazio 70 мм по ГОСТ",type:"work",unit:"шт.",quantity:5,cost_price:2500,unit_price:4200,is_qty_locked:1,materials:[{name:"Оконный блок Rehau Grazio 70 энергосберегающий 1200×1400",unit:"шт.",quantity:5,cost_price:15500,unit_price:20500},{name:"Входная дверь с терморазрывом утепленная Гардиан",unit:"шт.",quantity:1,cost_price:34e3,unit_price:44e3}]}]}]},{id:"dpk_terrace",category:"deck",name:"Терраса из ДПК (Полнотелая доска на металлокаркасе/сваях)",badge:"Террасы и настилы",icon:"🪵",description:"Настил износостойкой террасной доски ДПК, алюминиевые/композитные лаги, скрытые кляймеры, ступени, ограждения балюстрады",defaultArea:24,sections:[{name:"РАЗДЕЛ 1. ОСНОВАНИЕ И СВАЙНЫЙ КАРКАС ТЕРРАСЫ",items:[{name:"Монтаж точечных свай Ø76 с оголовками под лаги террасы",type:"work",unit:"шт.",quantity:9,cost_price:900,unit_price:1450,is_qty_locked:0,materials:[{name:"Винтовая свая Ø76×2000 ст3сп5 с оголовком 150×150",unit:"шт.",quantity:9,cost_price:1550,unit_price:1980}]},{name:"Монтаж несущей сварной рамы из профильной трубы 80×40 с окраской",type:"work",unit:"м.п.",quantity:32,cost_price:350,unit_price:580,is_qty_locked:0,materials:[{name:"Труба профильная 80×40×2 мм с грунтовкой Hammerite",unit:"м.п.",quantity:32,cost_price:380,unit_price:520}]}]},{name:"РАЗДЕЛ 2. НАСТИЛ ИЗ ТЕРРАСНОЙ ДОСКИ ДПК",items:[{name:"Укладка террасной доски ДПК со скрытым крепежом на лаги 350 мм",type:"work",unit:"м²",quantity:24,cost_price:650,unit_price:1100,is_qty_locked:0,materials:[{name:"Террасная доска полнотелая ДПК 140×20 с текстурой дерева",unit:"м²",quantity:24,cost_price:2450,unit_price:3150},{name:"Лага опорная монтажная композитная 40×30",unit:"м.п.",quantity:75,cost_price:290,unit_price:390},{name:"Клипсы нержавеющие монтажные со стартовыми уголками",unit:"компл.",quantity:24,cost_price:420,unit_price:600}]}]},{name:"РАЗДЕЛ 3. СТУПЕНИ И ОГРАЖДЕНИЯ",items:[{name:"Изготовление ступеней крыльца из ДПК (2 подъема)",type:"work",unit:"шт.",quantity:2,cost_price:1800,unit_price:3200,is_qty_locked:1,materials:[{name:"Ступень из ДПК полнотелая 345×23×3000",unit:"шт.",quantity:2,cost_price:2800,unit_price:3800}]},{name:"Монтаж перил и столбов балюстрады из ДПК",type:"work",unit:"м.п.",quantity:8,cost_price:800,unit_price:1350,is_qty_locked:0,materials:[{name:"Комплект ограждений ДПК (столб, перила, балясины)",unit:"м.п.",quantity:8,cost_price:2900,unit_price:3900}]}]}]},{id:"composite_pool",category:"pool",name:"Композитный бассейн «под ключ» (Чаша 5.2×3.2 м)",badge:"Бассейны",icon:"🏊‍♂️",description:"Земляные работы котлована, песчано-гравийная подушка, монтаж чаши 5.2×3.2×1.45 м, фильтрация, песчаный фильтр, бокс-кессон, термоизоляция",defaultArea:17,sections:[{name:"РАЗДЕЛ 1. ЗЕМЛЯНЫЕ И ПОДГОТОВИТЕЛЬНЫЕ РАБОТЫ",items:[{name:"Разработка котлована механизированным способом с планировкой дна",type:"work",unit:"компл.",quantity:1,cost_price:25e3,unit_price:42e3,is_qty_locked:1,materials:[]},{name:"Устройство уплотненной щебеночно-песчаной подушки с трамбовкой",type:"work",unit:"м²",quantity:22,cost_price:550,unit_price:950,is_qty_locked:1,materials:[{name:"Песок карьерный мытый + щебень гранитный фр. 20-40",unit:"м³",quantity:7,cost_price:1950,unit_price:2700},{name:"Геотекстиль иглопробивной 300 г/м²",unit:"м²",quantity:35,cost_price:75,unit_price:120}]}]},{name:"РАЗДЕЛ 2. МОНТАЖ ЧАШИ И УТЕПЛЕНИЕ",items:[{name:"Установка композитной чаши 5.2×3.2×1.45 м с обратной засыпкой гарцовкой",type:"work",unit:"компл.",quantity:1,cost_price:45e3,unit_price:75e3,is_qty_locked:1,materials:[{name:"Композитная чаша «Адмирал 520» с гидробарьерным слоем",unit:"шт.",quantity:1,cost_price:44e4,unit_price:56e4},{name:"Утеплитель экструдированный пенополистирол XPS 50 мм",unit:"м²",quantity:45,cost_price:360,unit_price:510},{name:"ЦПС сухая смесь для гарцовки пазух котлована",unit:"мешок",quantity:40,cost_price:210,unit_price:290}]}]},{name:"РАЗДЕЛ 3. ОБОРУДОВАНИЕ ВОДОПОДГОТОВКИ И ТЕХПОМЕЩЕНИЕ",items:[{name:"Монтаж станции фильтрации (насос, песчаный фильтр 6-поз. клапан, скиммер)",type:"work",unit:"компл.",quantity:1,cost_price:22e3,unit_price:38e3,is_qty_locked:1,materials:[{name:"Песчаная фильтровальная установка Kripsol + насос с префильтром",unit:"компл.",quantity:1,cost_price:85e3,unit_price:115e3},{name:"Трубная обвязка ПВХ клеевая Ø50 мм (Германия)",unit:"компл.",quantity:1,cost_price:28e3,unit_price:39e3},{name:"Кессон полипропиленовый подземный для насосного оборудования",unit:"шт.",quantity:1,cost_price:38e3,unit_price:52e3}]}]}]},{id:"utility_networks",category:"net",name:"Наружные инженерные коммуникации (Водопровод, Канализация К1)",badge:"Инженерные сети",icon:"⚡",description:"Разработка траншеи 1.7 м (ниже промерзания), укладка ПНД трубы ПЭ100 SDR11, канализация рыжая Ostendorf 110, греющий кабель, засыпка",defaultArea:25,sections:[{name:"РАЗДЕЛ 1. ЗЕМЛЯНЫЕ РАБОТЫ (ГЛУБИНА 1.7 М)",items:[{name:"Разработка траншеи мини-экскаватором на глубину 1.7 м (ниже промерзания ЯО)",type:"work",unit:"м.п.",quantity:25,cost_price:450,unit_price:780,is_qty_locked:0,materials:[]},{name:"Устройство песчаной постели 100 мм и обратная послойная засыпка",type:"work",unit:"м.п.",quantity:25,cost_price:250,unit_price:420,is_qty_locked:0,materials:[{name:"Песок карьерный мытый для подсыпки",unit:"м³",quantity:4.5,cost_price:1100,unit_price:1600}]}]},{name:"РАЗДЕЛ 2. ТРУБОПРОВОДЫ ВОДОПРОВОДА И КАНАЛИЗАЦИИ",items:[{name:"Укладка трубы ПНД Ø32 с саморегулирующимся греющим кабелем и теплоизоляцией",type:"work",unit:"м.п.",quantity:25,cost_price:320,unit_price:540,is_qty_locked:0,materials:[{name:"Труба ПЭ100 SDR11 питьевая Ø32×3.0",unit:"м.п.",quantity:25,cost_price:85,unit_price:125},{name:"Греющий кабель саморегулирующийся 16 Вт/м с муфтой",unit:"м.п.",quantity:25,cost_price:340,unit_price:490},{name:"Энергофлекс трубная изоляция 35/13",unit:"м.п.",quantity:25,cost_price:65,unit_price:95}]},{name:"Укладка наружной канализации ПВХ Ø110 с нормативным уклоном 2 см/м",type:"work",unit:"м.п.",quantity:25,cost_price:380,unit_price:620,is_qty_locked:0,materials:[{name:"Труба канализационная наружная рыжая 110×3.2 SN4 Ostendorf",unit:"м.п.",quantity:25,cost_price:390,unit_price:540}]}]}]},{id:"interior_finishing",category:"finish",name:"Внутренняя чистовая отделка (White Box + Чистовая)",badge:"Отделка помещений",icon:"🎨",description:"Выравнивание стен ГКЛВ, шпаклевка Sheetrock, покраска моющейся краской Tikkurila, полусухая стяжка, кварцвинил SPC, водяной теплый пол",defaultArea:50,sections:[{name:"РАЗДЕЛ 1. СТЕНЫ: ВЫРАВНИВАНИЕ И МАЛЯРНЫЕ РАБОТЫ",items:[{name:"Обшивка стен влагостойким гипсокартоном ГКЛВ Knauf 12.5 мм по каркасу",type:"work",unit:"м²",quantity:140,cost_price:400,unit_price:680,is_qty_locked:0,materials:[{name:"Гипсокартон влагостойкий Knauf ГКЛВ 2500×1200×12.5",unit:"м²",quantity:140,cost_price:240,unit_price:340},{name:"Профиль стоечный ПС 50×50 и направляющий ПН 50×40 Knauf 0.6 мм",unit:"компл.",quantity:1,cost_price:18e3,unit_price:26e3}]},{name:"Шпаклевка стен под покраску со стеклохолстом и финишная окраска в 2 слоя",type:"work",unit:"м²",quantity:140,cost_price:550,unit_price:920,is_qty_locked:0,materials:[{name:"Шпаклевка полимерная финишная Danogips SuperFinish",unit:"ведро",quantity:8,cost_price:1950,unit_price:2600},{name:"Краска интерьерная стойкая к мытью Tikkurila Perfecta",unit:"л",quantity:35,cost_price:480,unit_price:680}]}]},{name:"РАЗДЕЛ 2. ПОЛ И ВОДЯНОЙ ТЕПЛЫЙ ПОЛ",items:[{name:"Монтаж контуров водяного теплого пола PEX-a на маты с бобышками",type:"work",unit:"м²",quantity:50,cost_price:450,unit_price:750,is_qty_locked:0,materials:[{name:"Труба PEX-a 16×2.0 с кислородным барьером EVOH",unit:"м.п.",quantity:320,cost_price:78,unit_price:110},{name:"Коллекторная группа в сборе с расходомерами и насосно-смесительным узлом",unit:"компл.",quantity:1,cost_price:32e3,unit_price:45e3}]},{name:"Настил замкового каменно-полимерного ламината SPC с подложкой",type:"work",unit:"м²",quantity:50,cost_price:320,unit_price:520,is_qty_locked:0,materials:[{name:"Кварцвинил SPC 43 класс 4 мм с интегрированной подложкой",unit:"м²",quantity:50,cost_price:1650,unit_price:2250}]}]}]}];

export const ESTIMATE_TEMPLATES = pZ;

import {
  AdminEstimate,
  EstimateSection,
  EstimateItem,
  EstimateMaterial,
  calculateEstimateTotals,
} from '../utils/estimateCalculator';

export function createEstimateFromTemplate(templateId: string, customArea?: number): AdminEstimate {
  const tmpl = pZ.find((t) => t.id === templateId) || pZ[0];
  const area = customArea && customArea > 0 ? customArea : tmpl.defaultArea;
  const ratio = tmpl.defaultArea > 0 ? area / tmpl.defaultArea : 1;

  const sections: EstimateSection[] = tmpl.sections.map((sec, sIdx) => {
    const items: EstimateItem[] = sec.items.map((item, pIdx) => {
      const isLocked = item.is_qty_locked === 1;
      const qty = isLocked ? item.quantity : Math.round(item.quantity * ratio * 100) / 100;
      const unitPrice = item.unit_price;
      const costPrice = item.cost_price || Math.round(item.unit_price * 0.7);
      const totalCost = Math.round(qty * unitPrice);
      const totalCostPrice = Math.round(qty * costPrice);

      const materials: EstimateMaterial[] = (item.materials || []).map((mat, mIdx) => {
        const matQty = isLocked ? mat.quantity : Math.round(mat.quantity * ratio * 100) / 100;
        const matUnitPrice = mat.unit_price;
        const matCostPrice = mat.cost_price || Math.round(mat.unit_price * 0.85);
        return {
          id: `tmpl-mat-${sIdx}-${pIdx}-${mIdx}`,
          name: mat.name,
          unit: mat.unit,
          quantity: matQty,
          unit_price: matUnitPrice,
          cost_price: matCostPrice,
          total_cost: Math.round(matQty * matUnitPrice),
          total_cost_price: Math.round(matQty * matCostPrice),
          // compatibility aliases
          qty: matQty,
          unitPrice: matUnitPrice,
          totalPrice: Math.round(matQty * matUnitPrice),
        };
      });

      return {
        id: `tmpl-pos-${sIdx}-${pIdx}`,
        name: item.name,
        type: item.type || 'work',
        unit: item.unit,
        quantity: qty,
        unit_price: unitPrice,
        cost_price: costPrice,
        total_cost: totalCost,
        total_cost_price: totalCostPrice,
        is_qty_locked: item.is_qty_locked,
        materials,
        // compatibility aliases
        qty,
        unitPrice,
        totalPrice: totalCost,
      };
    });

    return {
      id: `tmpl-sec-${sIdx}`,
      title: sec.name,
      name: sec.name,
      items,
      positions: items,
      totalWork: 0,
      totalMaterials: 0,
      totalSum: 0,
    };
  });

  const year = new Date().getFullYear();
  const randNum = Math.floor(1000 + Math.random() * 9000);

  const initialEstimate: Partial<AdminEstimate> = {
    number: `КП-${year}-${randNum}`,
    title: tmpl.name,
    customer_name: 'Частный заказчик',
    customer_phone: '+7 (___) ___-__-__',
    object_name: tmpl.name,
    object_address: 'Ярославская обл.',
    client_name: 'Частный заказчик',
    client_phone: '+7 (___) ___-__-__',
    client_address: 'Ярославская обл.',
    category: tmpl.category,
    status: 'draft',
    area,
    sections,
    total_rub: 0,
    work_rub: 0,
    mat_rub: 0,
    delivery_rub: 0,
    overhead_rub: 0,
    profit_rub: 0,
    notes: `Сформировано по типовому проекту «${tmpl.name}». Расчет составлен по сметным нормативам ВОЛГАСТРОЙ 76 для климатической зоны Ярославской области.`,
  };

  return calculateEstimateTotals(initialEstimate as any);
}


