/* ВОЛГАСТРОЙ 76 — логика сайта.
   Ванильный JS, без сборки. 3D подключается лениже и только если устройство тянет. */
(function(){
'use strict';

var $  = function(s,c){ return (c||document).querySelector(s); };
var $$ = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
var fmtR = function(n){ return Math.round(n).toLocaleString('ru-RU') + ' \u20BD'; };

/* ===================== ШАПКА / МЕНЮ ===================== */
var header = $('header'), burger = $('#burger'), mmenu = $('#mmenu');
burger.addEventListener('click', function(){
  var open = mmenu.classList.toggle('open');
  burger.classList.toggle('on', open);
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
});
$$('#mmenu a').forEach(function(a){
  a.addEventListener('click', function(){ mmenu.classList.remove('open'); burger.classList.remove('on'); });
});

var progress = $('.progress');
var ticking = false;
function onScroll(){
  var y = window.pageYOffset || document.documentElement.scrollTop;
  header.classList.toggle('stuck', y > 12);
  var h = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y/h,1) : 0) + ')';
  ticking = false;
}
window.addEventListener('scroll', function(){
  if(!ticking){ ticking = true; requestAnimationFrame(onScroll); }
}, {passive:true});
onScroll();

/* активный пункт меню */
var navLinks = $$('nav.main a');
var secIds = navLinks.map(function(a){ return a.getAttribute('href'); })
  .filter(function(h){ return h && h.charAt(0)==='#'; });
var spy = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(e.isIntersecting){
      navLinks.forEach(function(a){ a.classList.toggle('on', a.getAttribute('href') === '#'+e.target.id); });
    }
  });
}, { rootMargin:'-45% 0px -50% 0px' });
secIds.forEach(function(id){ var el = document.querySelector(id); if(el) spy.observe(el); });

/* ===================== ПОЯВЛЕНИЕ БЛОКОВ ===================== */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){
    if(e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target); }
  });
}, { threshold:.1, rootMargin:'0px 0px -40px 0px' });
$$('.rv').forEach(function(el){ io.observe(el); });

/* ===================== ЛАЙТБОКС ===================== */
var lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
var gal = [], galIdx = 0;
function collectGallery(){
  gal = $$('[data-lb]').map(function(b){
    return { src: b.getAttribute('data-lb'), cap: b.getAttribute('data-cap') || '' };
  });
}
function openLb(i){
  collectGallery();
  galIdx = i; showLb();
  lb.classList.add('on'); document.body.style.overflow='hidden';
}
function showLb(){
  var it = gal[galIdx]; if(!it) return;
  lbImg.src = it.src; lbCap.textContent = it.cap;
}
function closeLb(){ lb.classList.remove('on'); document.body.style.overflow=''; lbImg.src=''; }
function stepLb(d){ galIdx = (galIdx + d + gal.length) % gal.length; showLb(); }
document.addEventListener('click', function(e){
  var t = e.target.closest && e.target.closest('[data-lb]');
  if(t){ collectGallery(); openLb(gal.findIndex(function(g){ return g.src === t.getAttribute('data-lb'); })); }
});
$('#lb-close').addEventListener('click', function(e){ e.stopPropagation(); closeLb(); });
$('#lb-prev').addEventListener('click', function(e){ e.stopPropagation(); stepLb(-1); });
$('#lb-next').addEventListener('click', function(e){ e.stopPropagation(); stepLb(1); });
lb.addEventListener('click', function(e){ if(e.target === lb || e.target === lbImg) closeLb(); });
document.addEventListener('keydown', function(e){
  if(!lb.classList.contains('on')) return;
  if(e.key === 'Escape') closeLb();
  if(e.key === 'ArrowLeft') stepLb(-1);
  if(e.key === 'ArrowRight') stepLb(1);
});

/* ===================== КАЛЬКУЛЯТОР ===================== */
var tab = 'house';
var CALC = null;   // последний расчёт — уходит вместе с заявкой

function optGroup(id, cb){
  var box = document.getElementById(id);
  if(!box) return { val:function(){return 0}, mult:function(){return 1}, name:function(){return ''} };
  box.addEventListener('click', function(e){
    var o = e.target.closest('.opt'); if(!o) return;
    $$('.opt', box).forEach(function(x){ x.classList.remove('on'); });
    o.classList.add('on'); cb && cb();
  });
  return {
    val:  function(){ var o = $('.opt.on', box); return o ? +o.dataset.v : 0; },
    mult: function(){ var o = $('.opt.on', box); return o && o.dataset.mult ? +o.dataset.mult : 1; },
    name: function(){ var o = $('.opt.on', box); return o ? (o.dataset.n || o.textContent.trim()) : ''; },
    key:  function(){ var o = $('.opt.on', box); return o ? (o.dataset.k || '') : ''; }
  };
}
function paintRange(r){
  var p = (r.value - r.min) / (r.max - r.min) * 100;
  r.style.setProperty('--p', p + '%');
}
function bindRange(rid, oid, suffix){
  var r = document.getElementById(rid), o = document.getElementById(oid);
  if(!r) return;
  paintRange(r);
  r.addEventListener('input', function(){
    o.textContent = (+r.value).toLocaleString('ru-RU') + ' ' + suffix;
    paintRange(r); calc();
  });
}

var gHouseMat = optGroup('opt-house-mat', function(){ calc(); sync3D(true); });
var gHouseKit = optGroup('opt-house-kit', function(){ calc(); sync3D(true); });
var gPoolPav  = optGroup('opt-pool-pav',  function(){ calc(); sync3D(true); });
var gDeckLay  = optGroup('opt-deck-lay',  function(){ calc(); sync3D(true); });
var gNetType  = optGroup('opt-net-type',  function(){ calc(); sync3D(true); });
var gNetDeep  = optGroup('opt-net-deep',  function(){ calc(); sync3D(true); });
var gPileDia  = optGroup('opt-pile-dia',  function(){ calc(); sync3D(true); });
var gFinLvl   = optGroup('opt-fin-lvl',   function(){ calc(); sync3D(true); });

bindRange('r-house-area','o-house-area','м²');
bindRange('r-deck-area','o-deck-area','м²');
bindRange('r-net-len','o-net-len','м');
bindRange('r-pile-n','o-pile-n','шт');
bindRange('r-pile-rost','o-pile-rost','м');
bindRange('r-fin-area','o-fin-area','м²');

// 3D пересобираем не на каждый пиксель слайдера, а с паузой
var reTimer = null;
$$('input[type=range]').forEach(function(r){
  r.addEventListener('input', function(){
    clearTimeout(reTimer); reTimer = setTimeout(function(){ sync3D(true); }, 190);
  });
});
$$('.calc-in input[type=checkbox]').forEach(function(c){
  c.addEventListener('change', function(){ calc(); sync3D(true); });
});
function isOn(id){ var el = document.getElementById(id); return !!(el && el.checked); }
function rv(id){ var el = document.getElementById(id); return el ? +el.value : 0; }

function activateTab(name){
  if(!document.getElementById('pane-'+name)) return;
  tab = name;
  $$('.calc-tabs button').forEach(function(b){
    var on = b.dataset.tab === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true':'false');
  });
  $$('.tabpane').forEach(function(p){ p.hidden = true; });
  document.getElementById('pane-'+name).hidden = false;
  calc(); sync3D(true);
}
$$('.calc-tabs button').forEach(function(b){
  b.addEventListener('click', function(){ activateTab(b.dataset.tab); });
});
$$('[data-goto]').forEach(function(a){
  a.addEventListener('click', function(){
    activateTab(a.dataset.goto);
    var c = document.getElementById('calc');
    if(c) c.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

var NET_NAMES = { 2800:'Канализация К1', 2300:'Водопровод В1', 3500:'ГВС / теплосеть', 2000:'Дренаж' };
var NET_KEYS  = { 2800:'k1', 2300:'v1', 3500:'gvs', 2000:'dren' };
var DIA_NAMES = { 900:'Ø57', 1100:'Ø76', 1350:'Ø89', 1700:'Ø108' };
var FIN_NAMES = { 4000:'Черновая', 7500:'Чистовая', 12000:'Под ключ' };

function calc(){
  var sum = 0, per = '', rows = [], title = '';

  /* Смета строится так: сначала берём ту же итоговую цену, что и в прайсе,
     а затем РАСКЛАДЫВАЕМ её на операции по весам. Поэтому детализация
     никогда не расходится с ценами на странице «Цены».
       H(...)              — заголовок раздела
       alloc(base, items)  — разложить сумму base по позициям
                             items: [название, количество, единица, вес]
                             (вес нормируется автоматически, сумма строк = base)
       F(...)              — отдельная позиция фиксированной стоимостью   */
  var kind = 'w';                       // 'w' работы | 'm' материалы
  function H(t){ rows.push([t, '', 0, 'h']); }
  function F(name, note, value){
    var v = Math.round(value); sum += v;
    rows.push([name, note, v, kind]); return v;
  }
  function alloc(base, items){
    base = Math.round(base);
    var tw = 0, i;
    for(i = 0; i < items.length; i++) tw += items[i][3];
    if(tw <= 0) return;
    var acc = 0;
    for(i = 0; i < items.length; i++){
      var it = items[i];
      var v = (i === items.length - 1) ? (base - acc) : Math.round(base * it[3] / tw);
      acc += v; sum += v;
      var q = it[1], unit = it[2], note;
      if(q > 0){
        var price = Math.round(v / q);
        note = fmtR(price) + ' × ' + (Math.round(q * 100) / 100).toLocaleString('ru-RU') + ' ' + unit;
      } else {
        note = unit;
      }
      rows.push([it[0], note, v, kind]);
    }
  }

  if(tab === 'house'){
    var a = rv('r-house-area'), rate = gHouseKit.val(), mult = gHouseMat.mult();
    var metal = mult > 1, turnkey = rate >= 24000;
    var kitName = turnkey ? 'Под ключ' : 'Коробка';
    var matName = metal ? 'металл + сэндвич' : 'деревянный каркас';
    var side = Math.sqrt(a / 1.35);
    var perim = Math.round((side * 1.35 + side) * 2);
    var wallA = Math.round(perim * 2.7);
    var roofA = Math.round(a * 1.18);
    var base  = a * rate * mult;

    kind = 'w';
    H('Работы по каркасу и кровле');
    var L = [['Геодезическая разметка, вынос осей', a, 'м²', turnkey ? .03 : .04]];
    if(metal){
      L.push(['Сборка и сварка металлокаркаса', a, 'м²', turnkey ? .18 : .30]);
      L.push(['Антикоррозийная обработка, покраска', a, 'м²', turnkey ? .08 : .12]);
      L.push(['Монтаж сэндвич-панелей стен', wallA, 'м²', turnkey ? .16 : .24]);
    } else {
      L.push(['Сборка каркаса из бруса', a, 'м²', turnkey ? .20 : .34]);
      L.push(['Обшивка стен, ветрозащита, контробрешётка', wallA, 'м²', turnkey ? .13 : .22]);
    }
    L.push(['Стропильная система и обрешётка', roofA, 'м²', turnkey ? .08 : .16]);
    L.push(['Монтаж кровельного покрытия', roofA, 'м²', turnkey ? .10 : .18]);
    L.push(['Подшивка свесов, водосточная система', perim, 'м.п.', turnkey ? .04 : .06]);
    if(turnkey){
      L.push(['Монтаж окон и дверей', Math.max(2, Math.round(a / 12)), 'шт', .09]);
      L.push(['Утепление контура: пол, стены, кровля', a, 'м²', .12]);
      L.push(['Внутренняя черновая обшивка', wallA, 'м²', .10]);
      L.push(['Электрика: штробы, кабель, точки', a, 'м²', .10]);
    }
    alloc(base, L);

    if(isOn('c-house-fund')){
      H('Фундамент');
      var np = Math.max(6, Math.round(a / 4.5));
      alloc(2500 * a, [
        ['Завинчивание винтовых свай Ø89', np, 'шт', .55],
        ['Оголовки, бетонирование стволов', np, 'шт', .18],
        ['Обвязка швеллером по периметру', perim, 'м.п.', .27]
      ]);
    }
    if(isOn('c-house-crane')){
      F('Манипулятор и доставка на объект', 'подача, разгрузка, работа стрелой', 60000);
    }
    if(isOn('c-house-mat')){
      kind = 'm';
      H('Материалы');
      var M = [];
      if(metal){
        M.push(['Профильная труба, швеллер, метизы', a, 'м²', .34]);
        M.push(['Сэндвич-панели 100/150 мм', wallA, 'м²', .30]);
      } else {
        M.push(['Пиломатериал камерной сушки', a, 'м²', .34]);
        M.push(['Плиты OSB, ветро- и пароизоляция', wallA, 'м²', .18]);
        M.push(['Крепёж, метизы, расходники', a, 'м²', .12]);
      }
      M.push(['Кровельное покрытие, доборные элементы', roofA, 'м²', .20]);
      M.push(['Утеплитель и изоляция', a, 'м²', turnkey ? .10 : .16]);
      if(turnkey) M.push(['Окна, двери, водосток', a, 'м²', .16]);
      alloc(12000 * a, M);
    }
    title = 'Дом / здание';
    per = '~' + a + ' м² · ' + matName + ' · ' + kitName.toLowerCase();

  } else if(tab === 'pool'){
    var pav = gPoolPav.val();
    kind = 'w';
    if(pav > 0){
      H('Павильон');
      alloc(pav, [
        ['Сборка несущих арок и направляющих', 5, 'секц.', .42],
        ['Монтаж поликарбоната / остекления', 34, 'м²', .40],
        ['Фурнитура, уплотнители, регулировка хода', 1, 'компл.', .18]
      ]);
    }
    if(isOn('c-pool-pipe')){
      H('Обвязка и оборудование');
      alloc(120000, [
        ['Монтаж насоса и песчаного фильтра', 1, 'компл.', .30],
        ['Разводка труб ПВХ, краны, фитинги', 45, 'м.п.', .28],
        ['Монтаж закладных: скиммер, форсунки, донный слив', 6, 'шт', .16],
        ['Подключение электрики и автоматики', 1, 'компл.', .14],
        ['Опрессовка, пусконаладка, инструктаж', 1, 'компл.', .12]
      ]);
    }
    if(isOn('c-pool-tech')){
      H('Техпомещение');
      alloc(80000, [
        ['Монтаж накопительных ёмкостей', 3, 'шт', .48],
        ['Дренаж, отвод воды, обратный клапан', 1, 'компл.', .32],
        ['Обвязка техпомещения, крепления', 1, 'компл.', .20]
      ]);
    }
    if(isOn('c-pool-deck')){
      H('Терраса вокруг чаши, 50 м²');
      alloc(800000 * 0.47, [
        ['Монтаж каркаса и лаг', 50, 'м²', .42],
        ['Укладка доски ДПК', 50, 'м²', .34],
        ['Ступени, обрамление борта, люки', 14, 'м.п.', .24]
      ]);
      kind = 'm';
      alloc(800000 * 0.53, [
        ['Доска ДПК, лаги, клипсы, крепёж', 50, 'м²', 1]
      ]);
      kind = 'w';
    }
    title = 'Бассейн';
    per = 'монтаж, обвязка и оборудование';

  } else if(tab === 'deck'){
    var ad = rv('r-deck-area'), lay = gDeckLay.val();
    var diag = lay > 1000;
    var sideD = Math.sqrt(ad / 1.5);
    var perimD = Math.round((sideD * 1.5 + sideD) * 2);

    kind = 'w';
    H('Подготовка и укладка');
    alloc(lay * ad, [
      ['Разметка, планировка основания', ad, 'м²', .07],
      ['Геотекстиль и щебёночная подсыпка', ad, 'м²', .13],
      ['Монтаж лаг с выставлением уровня', ad, 'м²', .22],
      ['Укладка доски ДПК' + (diag ? ' по диагонали' : ''), ad, 'м²', diag ? .40 : .38],
      ['Торцевание, обрамление периметра', perimD, 'м.п.', .13],
      ['Технические люки и примыкания', Math.max(1, Math.round(ad / 50)), 'компл.', .07]
    ]);
    if(isOn('c-deck-frame')){
      H('Металлокаркас');
      alloc(1600 * ad, [
        ['Сварка каркаса под настил', ad, 'м²', .62],
        ['Зачистка швов, грунтовка и покраска', ad, 'м²', .38]
      ]);
    }
    if(isOn('c-deck-pile')){
      H('Свайное основание');
      var npd = Math.max(4, Math.round(ad / 2.2));
      alloc(3200 * ad, [
        ['Завинчивание свай под террасу', npd, 'шт', .58],
        ['Подрезка в уровень, оголовки', npd, 'шт', .22],
        ['Обвязка и крепление к каркасу', npd, 'шт', .20]
      ]);
    }
    if(isOn('c-deck-mat')){
      kind = 'm';
      H('Материалы');
      alloc(5200 * ad, [
        ['Доска ДПК 160×25 мм', ad, 'м²', .66],
        ['Лаги, монтажные клипсы, крепёж', ad, 'м²', .22],
        ['Геотекстиль, щебень', ad, 'м²', .12]
      ]);
    }
    title = 'Терраса ДПК';
    per = ad + ' м²' + (diag ? ' · диагональная укладка' : ' · прямая укладка');

  } else if(tab === 'net'){
    var len = rv('r-net-len'), nrate = gNetType.val(), nmult = gNetDeep.mult();
    var nm = NET_NAMES[nrate] || 'Сеть';
    var deepN = nmult > 1;
    var dep = deepN ? 1.8 : 1.2;
    var trench = Math.round(len * dep * 0.7);
    var joints = Math.max(2, Math.round(len / 6));

    kind = 'w';
    H('Земляные работы');
    var N = [
      ['Разработка траншеи' + (deepN ? ' до 1,8 м' : ' до 1,2 м'), trench, 'м³', deepN ? .30 : .26],
      ['Песчаная подушка под трубу', len, 'м.п.', .07],
      ['Обратная засыпка с трамбовкой', trench, 'м³', .07]
    ];
    alloc(len * nrate * nmult * (deepN ? .44 : .40), N);

    H('Монтаж трубопровода');
    var T = [
      ['Укладка трубы ' + nm.toLowerCase(), len, 'м.п.', .44],
      ['Сварка и соединение стыков', joints, 'шт', .17],
      ['Выставление уклона, нивелирование', len, 'м.п.', .11]
    ];
    if(nrate === 3500) T.push(['Теплоизоляция трубопровода', len, 'м.п.', .14]);
    T.push(['Опрессовка и испытание системы', 1, 'компл.', .13]);
    T.push(['Сигнальная лента, исполнительная схема', len, 'м.п.', .05]);
    alloc(len * nrate * nmult * (deepN ? .56 : .60), T);

    if(isOn('c-net-well')){
      H('Колодцы и узлы');
      alloc(25000, [
        ['Монтаж колец и днища колодца', 1, 'шт', .52],
        ['Люк, горловина, обустройство', 1, 'компл.', .28],
        ['Герметизация швов и вводов', 1, 'компл.', .20]
      ]);
    }
    if(isOn('c-net-road')){
      F('Прокол / гильза под дорогой', 'бестраншейный переход', 25000);
    }
    if(isOn('c-net-back')){
      H('Благоустройство');
      alloc(800 * len, [
        ['Планировка и уплотнение грунта', len, 'м.п.', .45],
        ['Восстановление покрытия и газона', len, 'м.п.', .55]
      ]);
    }
    title = nm;
    per = 'трасса ' + len + ' м' + (deepN ? ' · глубокое заложение' : '');

  } else if(tab === 'pile'){
    var n = rv('r-pile-n'), drate = gPileDia.val(), rm = rv('r-pile-rost');
    var dn = DIA_NAMES[drate] || ('Ø' + drate);

    kind = 'w';
    H('Свайное поле');
    alloc(n * drate, [
      ['Геодезическая разметка свайного поля', n, 'шт', .07],
      ['Завинчивание свай ' + dn, n, 'шт', .72],
      ['Подрезка свай в один горизонт', n, 'шт', .11],
      ['Бетонирование стволов', n, 'шт', .10]
    ]);
    if(isOn('c-pile-cap')){
      alloc(450 * n, [['Монтаж оголовков, покраска узлов', n, 'шт', 1]]);
    }
    if(rm > 0){
      H('Ростверк');
      alloc(rm * 1800, [
        ['Обвязка швеллером по контуру', rm, 'м.п.', .74],
        ['Сварные узлы, косынки, зачистка', Math.max(4, Math.round(rm / 3)), 'шт', .26]
      ]);
    }
    if(isOn('c-pile-mat')){
      kind = 'm';
      H('Материалы');
      var P = [['Сваи винтовые ' + dn + ' с доставкой', n, 'шт', rm > 0 ? .82 : 1]];
      if(rm > 0) P.push(['Швеллер, метизы, грунт-эмаль', rm, 'м.п.', .18]);
      alloc(2800 * n, P);
    }
    title = 'Винтовые сваи';
    per = n + ' свай ' + dn + (rm > 0 ? ' · ростверк ' + rm + ' м' : '');

  } else if(tab === 'finish'){
    var af = rv('r-fin-area'), frate = gFinLvl.val();
    var fn = FIN_NAMES[frate] || 'Отделка';
    var lvl = frate >= 12000 ? 3 : (frate >= 7500 ? 2 : 1);
    var wallF = Math.round(af * 2.6);
    var perimF = Math.round(Math.sqrt(af) * 4.2);

    kind = 'w';
    H('Отделочные работы');
    var Fl = [
      ['Выравнивание и подготовка стен', wallF, 'м²', lvl === 1 ? .28 : (lvl === 2 ? .16 : .11)],
      ['Обшивка стен, монтаж листов', wallF, 'м²', lvl === 1 ? .34 : (lvl === 2 ? .19 : .13)],
      ['Устройство и выравнивание пола', af, 'м²', lvl === 1 ? .20 : (lvl === 2 ? .12 : .09)],
      ['Монтаж потолка с каркасом', af, 'м²', lvl === 1 ? .18 : (lvl === 2 ? .11 : .08)]
    ];
    if(lvl >= 2){
      Fl.push(['Шпаклёвка и шлифовка под покраску', wallF, 'м²', lvl === 2 ? .15 : .11]);
      Fl.push(['Финишное покрытие стен', wallF, 'м²', lvl === 2 ? .11 : .09]);
      Fl.push(['Укладка напольного покрытия', af, 'м²', lvl === 2 ? .11 : .09]);
      Fl.push(['Монтаж плинтуса и наличников', perimF, 'м.п.', .05]);
    }
    if(lvl >= 3){
      Fl.push(['Монтаж межкомнатных дверей', Math.max(2, Math.round(af / 22)), 'шт', .09]);
      Fl.push(['Установка светильников и розеток', Math.max(6, Math.round(af / 4)), 'точка', .08]);
      Fl.push(['Малярные работы, финишная доводка', af, 'м²', .08]);
      Fl.push(['Уборка и вывоз строительного мусора', 1, 'компл.', .05]);
    }
    alloc(frate * af, Fl);

    if(isOn('c-fin-elec')){
      H('Инженерия');
      alloc(1200 * af, [
        ['Штробление, прокладка кабеля', af, 'м²', .55],
        ['Щит, автоматы, точки подключения', Math.max(6, Math.round(af / 4)), 'точка', .45]
      ]);
    }
    if(isOn('c-fin-sant')){
      alloc(60000, [
        ['Разводка водоснабжения и канализации', 2, 'точка', .60],
        ['Установка и подключение приборов', 2, 'шт', .40]
      ]);
    }
    if(isOn('c-fin-floor')){
      alloc(1500 * af, [
        ['Укладка контура тёплого пола', af, 'м²', .52],
        ['Стяжка и подключение терморегулятора', af, 'м²', .48]
      ]);
    }
    title = 'Отделка';
    per = fn.toLowerCase() + ' · ' + af + ' м²';
  }

  /* Итоги по видам: работы и материалы отдельно */
  var sumW = 0, sumM = 0;
  rows.forEach(function(r){
    if(r[3] === 'h') return;
    if(r[3] === 'm') sumM += r[2]; else sumW += r[2];
  });

  $('#calc-sum').textContent = '≈ ' + fmtR(sum);
  $('#calc-per').textContent = per;
  $('#calc-br').innerHTML = rows.map(function(r){
    if(r[3] === 'h') return '<div class="br-h">' + r[0] + '</div>';
    return '<div class="br-r">' +
      '<span class="br-n">' + r[0] + '<i>' + r[1] + '</i></span>' +
      '<b>' + fmtR(r[2]) + '</b></div>';
  }).join('') +
  (sumM > 0
    ? '<div class="br-t"><span>Работы</span><b>' + fmtR(sumW) + '</b></div>' +
      '<div class="br-t"><span>Материалы</span><b>' + fmtR(sumM) + '</b></div>'
    : '');

  // если смета прокручена до конца — убираем градиент-подсказку
  var brEl = $('#calc-br');
  if(brEl && !brEl._scrollBound){
    brEl._scrollBound = true;
    brEl.addEventListener('scroll', function(){
      var end = brEl.scrollTop + brEl.clientHeight >= brEl.scrollHeight - 4;
      brEl.classList.toggle('is-end', end);
    }, { passive:true });
  }
  if(brEl){
    brEl.scrollTop = 0;
    brEl.classList.toggle('is-end', brEl.scrollHeight <= brEl.clientHeight + 4);
  }

  CALC = { tab:tab, title:title, per:per, sum:sum, sumW:sumW, sumM:sumM, rows:rows };
  return CALC;
}
/* текст расчёта, который уедет в заявку и в письмо */
function calcText(){
  if(!CALC) return '';
  var t = 'РАСЧЁТ С САЙТА — ' + CALC.title + '\n' + CALC.per + '\n';
  CALC.rows.forEach(function(r){
    if(r[3] === 'h'){ t += '\n' + r[0].toUpperCase() + '\n'; return; }
    t += '• ' + r[0] + ' (' + r[1] + ') — ' + fmtR(r[2]) + '\n';
  });
  if(CALC.sumM > 0){
    t += '\nРаботы: ' + fmtR(CALC.sumW) + '\nМатериалы: ' + fmtR(CALC.sumM) + '\n';
  }
  t += 'ИТОГО ≈ ' + fmtR(CALC.sum) + ' (предварительно, ±20%)';
  return t;
}

/* ===================== 3D ===================== */
var S = null;            // модуль scene3d
var heroStage = null, calcStage = null;
var heroPool = null;

function loadScene3D(){
  if(S) return Promise.resolve(S);
  return import('./scene3d.js').then(function(mod){ S = mod; return mod; });
}

/* --- герой --- */
function initHero(){
  var host = $('#hero3d'); if(!host) return;
  loadScene3D().then(function(S){
    if(!S.can3D()) return;
    var cv = document.createElement('canvas');
    host.insertBefore(cv, host.firstChild);
    heroStage = new S.Stage3D(cv, { camDist:13.6, fov:40, theta:-0.72, phi:1.06, targetY:.55, autoSpeed:.12 });

    // Вся композиция в одной группе — так её легко уместить в кадр целиком
    var scene = S.group();
    scene.add(S.groundPad(13.5));

    var house = S.houseModel({ w:4.4, d:3.3, h:2.2, metal:false, roof:true, walls:.72 });
    house.position.set(-2.5, 0, -1.0);
    scene.add(house);

    heroPool = S.poolModel({ w:3.4, d:2.4, deck:true });
    heroPool.position.set(2.5, 0, .7);
    scene.add(heroPool);

    var nets = S.netsModel({ len:5.2, type:'k1', deep:false, well:true });
    nets.position.set(-1.6, -.02, 3.6); nets.rotation.y = .26; nets.scale.setScalar(.82);
    scene.add(nets);

    var piles = S.pilesModel({ n:6, dia:.07, rost:true });
    piles.position.set(3.5, 0, -2.9); piles.scale.setScalar(.72);
    scene.add(piles);

    scene.scale.setScalar(.92);
    heroStage.root.add(scene);
    heroStage.fit(scene, 0.84);
    heroStage.onResizeFit = function(){ heroStage.fit(scene, 0.84); };

    var wBase = heroPool.userData.waterBase, wGeo = heroPool.userData.water.geometry;
    heroStage.onFrame = function(dt, t){
      if(!wBase) return;
      var p = wGeo.attributes.position, arr = p.array;
      for(var i=0;i<arr.length;i+=3){
        arr[i+2] = wBase[i+2] + Math.sin(t*1.7 + wBase[i]*2.2) * .022
                             + Math.cos(t*1.2 + wBase[i+1]*2.6) * .016;
      }
      p.needsUpdate = true;
    };
    host.classList.add('ready');
    heroStage.start();
    watchVisibility(host, heroStage);
  }).catch(function(){ /* нет 3D — остаётся фото */ });
}

/* --- 3D в калькуляторе --- */
function initCalc3D(){
  var host = $('#calc3d'); if(!host) return;
  loadScene3D().then(function(S){
    if(!S.can3D()){ host.style.display='none'; return; }
    var cv = document.createElement('canvas');
    host.insertBefore(cv, host.firstChild);
    calcStage = new S.Stage3D(cv, { camDist:11.5, fov:42, theta:-0.62, phi:1.06, targetY:.7, autoSpeed:.2 });
    calcStage.root.add(S.groundPad(13));
    sync3D(true);
    calcStage.start();
    watchVisibility(host, calcStage);
  }).catch(function(){ host.style.display='none'; });
}

var modelNode = null;
function sync3D(rebuild){
  if(!calcStage || !S) return;
  if(!rebuild) return;
  if(modelNode){
    calcStage.root.remove(modelNode);
    modelNode.traverse && modelNode.traverse(function(o){
      o.geometry && o.geometry.dispose && o.geometry.dispose();
      if(o.material){ Array.isArray(o.material) ? o.material.forEach(function(m){m.dispose()}) : o.material.dispose(); }
    });
    modelNode = null;
  }
  var lbl = $('#calc3d .lbl');
  var m = null, label = '';

  if(tab === 'house'){
    var a = rv('r-house-area'), side = Math.sqrt(Math.max(a,16));
    var w = Math.min(7.2, side*1.16), d = Math.min(5.4, side*.86);
    // «Коробка» — это уже стены + кровля, поэтому она тоже сплошная.
    // Разница с «под ключ» в окнах/дверях, а не в прозрачности.
    m = S.houseModel({ w:w, d:d, h:2.45, metal:gHouseMat.mult()>1,
      roof:true, walls: gHouseKit.val()>=24000 ? .8 : .62 });
    label = (gHouseMat.mult()>1 ? 'Металл + сэндвич' : 'Деревянный каркас') + ' · ' + a + ' м²';

  } else if(tab === 'pool'){
    m = S.poolModel({ w:4.6, d:3.1, deck:isOn('c-pool-deck'), pavilion:gPoolPav.val()>0 });
    label = 'Бассейн' + (gPoolPav.val()>0 ? ' + павильон' : '');

  } else if(tab === 'deck'){
    var ad = rv('r-deck-area'), s2 = Math.sqrt(Math.max(ad,12));
    m = S.deckModel({ w:Math.min(7.4,s2*1.2), d:Math.min(5.2,s2*.85),
      diag:gDeckLay.val()>1000, rail:true });
    label = 'Терраса ДПК · ' + ad + ' м²' + (gDeckLay.val()>1000?' · диагональ':'');

  } else if(tab === 'net'){
    var key = NET_KEYS[gNetType.val()] || 'k1';
    m = S.netsModel({ len:8.6, type:key, deep:gNetDeep.mult()>1, well:isOn('c-net-well') });
    label = (NET_NAMES[gNetType.val()]||'Сеть') + ' · ' + rv('r-net-len') + ' м';

  } else if(tab === 'pile'){
    m = S.pilesModel({ n:Math.min(rv('r-pile-n'),40), dia:gPileDia.val()/12000, rost:rv('r-pile-rost')>0 });
    label = rv('r-pile-n') + ' свай ' + (DIA_NAMES[gPileDia.val()]||'');

  } else if(tab === 'finish'){
    var lv = gFinLvl.val()>=12000 ? 3 : (gFinLvl.val()>=7500 ? 2 : 1);
    m = S.finishModel({ lvl:lv, warm:isOn('c-fin-floor') });
    label = (FIN_NAMES[gFinLvl.val()]||'Отделка') + ' · ' + rv('r-fin-area') + ' м²';
  }
  if(m){
    modelNode = m;
    calcStage.root.add(m);
    calcStage.fit(m, 0.92);
    // при повороте телефона кадр пересобирается под новую пропорцию
    calcStage.onResizeFit = function(){ if(modelNode) calcStage.fit(modelNode, 0.92); };
    // Траншею и отделку нужно смотреть сверху — иначе стенки закрывают содержимое.
    calcStage.phi = (tab === 'net' || tab === 'finish') ? 0.80 : 1.09;
  }
  if(lbl) lbl.textContent = label;
}

/* пауза рендера, когда блок вне экрана или вкладка скрыта */
function watchVisibility(host, stage){
  var vio = new IntersectionObserver(function(es){
    es.forEach(function(e){ e.isIntersecting ? stage.start() : stage.stop(); });
  }, { threshold:.03 });
  vio.observe(host);
  document.addEventListener('visibilitychange', function(){
    document.hidden ? stage.stop() : (isInView(host) && stage.start());
  });
}
function isInView(el){
  var r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

/* ===================== ТЕЛЕФОННАЯ МАСКА ===================== */
function maskPhone(inp){
  function f(v){
    var d = v.replace(/\D/g,'');
    if(d.charAt(0)==='8') d = '7'+d.slice(1);
    else if(d.charAt(0)!=='7') d = '7'+d;
    if(!d) return '+7 (';
    if(d.length>11) d = d.slice(0,11);
    var r = '+7';
    if(d.length>1) r += ' (' + d.slice(1,4);
    if(d.length>=4) r += ') ' + d.slice(4,7);
    if(d.length>=7) r += '-' + d.slice(7,9);
    if(d.length>=9) r += '-' + d.slice(9,11);
    return r;
  }
  inp.addEventListener('input', function(){
    var n = f(this.value);
    if(n !== this.value){
      this.value = n;
      try{ this.setSelectionRange(n.length,n.length); }catch(e){}
    }
    this.classList.remove('bad');
  });
  inp.addEventListener('focus', function(){
    if(!this.value) this.value = '+7 (';
    var self = this;
    setTimeout(function(){ try{ self.setSelectionRange(self.value.length,self.value.length); }catch(e){} },0);
  });
  inp.addEventListener('blur', function(){ if(this.value === '+7 (') this.value=''; });
}
maskPhone($('#f-phone'));

/* ===================== ЧИП «РАСЧЁТ ПРИЛОЖЕН» ===================== */
var attachCalc = false;
var chip = $('#calc-chip');
function setChip(on){
  attachCalc = on;
  chip.classList.toggle('on', on);
  if(on && CALC){
    $('#chip-title').textContent = CALC.title + ' · ' + CALC.per;
    $('#chip-sum').textContent = '≈ ' + fmtR(CALC.sum);
  }
}
$('#calc-send').addEventListener('click', function(){
  calc(); setChip(true);
  var topic = { house:'Дом / каркасное здание', pool:'Бассейн / оборудование / павильон',
    net:'Наружные сети (канализация, вода, тепло)', deck:'Терраса / сваи / забор',
    pile:'Терраса / сваи / забор', finish:'Отделка' }[tab];
  if(topic){
    var sel = $('#f-topic');
    Array.prototype.forEach.call(sel.options, function(o,i){ if(o.text === topic) sel.selectedIndex = i; });
  }
  $('#contacts').scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(function(){ $('#f-name').focus({preventScroll:true}); }, 600);
});
$('#chip-drop').addEventListener('click', function(){ setChip(false); });

/* ===================== ПЕЧАТЬ КП ===================== */
$('#calc-print').addEventListener('click', function(){
  var c = calc(); if(!c) return;
  var d = new Date();
  var rows = c.rows.map(function(r){
    if(r[3] === 'h'){
      return '<tr class="sec"><td colspan="3">'+r[0]+'</td></tr>';
    }
    return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td style="text-align:right;white-space:nowrap">'+fmtR(r[2])+'</td></tr>';
  }).join('');
  if(c.sumM > 0){
    rows += '<tr class="sub"><td colspan="2">Работы</td><td style="text-align:right">'+fmtR(c.sumW)+'</td></tr>' +
            '<tr class="sub"><td colspan="2">Материалы</td><td style="text-align:right">'+fmtR(c.sumM)+'</td></tr>';
  }
  $('#kp').innerHTML =
    '<div class="hdr"><div><b style="font-size:15pt">ВОЛГАСТРОЙ 76</b><br>' +
      '<span style="font-size:10pt;color:#555">Дома · бассейны · наружные сети · террасы</span></div>' +
      '<div style="text-align:right;font-size:10pt">+7 999 234-29-39 · Андрей<br>+7 901 172-26-20 · Станислав<br>volgastroy76.ru</div></div>' +
    '<h1>Предварительный расчёт: ' + c.title + '</h1>' +
    '<div class="kp-sub">' + c.per + ' · от ' + d.toLocaleDateString('ru-RU') + '</div>' +
    '<table><thead><tr><th>Позиция</th><th>Расчёт</th><th style="text-align:right">Стоимость</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>' +
    '<div class="tot">Итого ≈ ' + fmtR(c.sum) + '</div>' +
    '<div class="note">Расчёт ориентировочный (погрешность ±20%) и не является публичной офертой. ' +
    'Точная стоимость фиксируется в договоре после бесплатного выезда и замера. ' +
    'Состав работ приведён построчно; объёмы уточняются на замере. ' +
    'Гарантия на работы — 12 месяцев.</div>';
  window.print();
});

/* ===================== ФОРМА ЗАЯВКИ ===================== */
function post(url, data){
  return fetch(url, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  }).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(j){
      return { ok: r.ok && j && j.ok, status:r.status, j:j };
    });
  });
}
var PHONES = 'Позвоните нам: <a href="tel:+79011722620" style="color:#7cc9ff;font-weight:800">+7 901 172-26-20</a>';

$('#lead-form').addEventListener('submit', function(e){
  e.preventDefault();
  var form = this;
  var nm = $('#f-name').value.trim() || 'Аноним';
  var ph = $('#f-phone').value.trim();
  var tp = $('#f-topic').value;
  var ms = $('#f-msg').value.trim();
  var okBox = $('#form-ok'), errBox = $('#form-err');
  okBox.classList.remove('on'); errBox.classList.remove('on');

  if(ph.replace(/\D/g,'').length < 11){
    $('#f-phone').classList.add('bad'); $('#f-phone').focus();
    errBox.textContent = 'Проверьте номер телефона — нужно 11 цифр.'; errBox.classList.add('on');
    return;
  }
  if(attachCalc && CALC){
    ms = (ms ? ms + '\n\n' : '') + calcText();
  }
  if(!ms) ms = '—';

  var btn = form.querySelector('button[type=submit]');
  var old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '⏳ Отправляем…';

  post('/api/submit.php', {
    name:nm, phone:ph, subject:tp, message:ms,
    hp: $('#f-hp').value,
    calc: (attachCalc && CALC) ? CALC : null
  }).then(function(r){
    if(r.ok){
      okBox.classList.add('on');
      btn.innerHTML = '✅ Отправлено!';
      form.reset(); setChip(false);
      $$('.form-card input').forEach(function(i){ i.classList.remove('bad'); });
      setTimeout(function(){ btn.disabled=false; btn.innerHTML=old; }, 5000);
    } else if(r.status === 429){
      errBox.innerHTML = '⚠️ Слишком много заявок с вашего адреса. ' + PHONES;
      errBox.classList.add('on'); btn.disabled=false; btn.innerHTML=old;
    } else {
      errBox.innerHTML = '⚠️ Не получилось отправить. ' + PHONES;
      errBox.classList.add('on'); btn.disabled=false; btn.innerHTML=old;
    }
  }).catch(function(){
    errBox.innerHTML = '⚠️ Нет связи. ' + PHONES;
    errBox.classList.add('on'); btn.disabled=false; btn.innerHTML=old;
  });
});

/* ===================== ОТЗЫВЫ ===================== */
function esc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function starStr(n){
  n = Math.max(1, Math.min(5, parseInt(n,10)||5));
  return '★★★★★'.slice(0,n) + '☆☆☆☆☆'.slice(0,5-n);
}
function revCard(r){
  var first = esc((r.name||'?').trim().charAt(0).toUpperCase() || '?');
  var meta = esc(r.place||'') + ((r.place && r.service) ? ' · ' : '') + esc(r.service||'');
  var dt = '';
  try{
    if(r.created_at){
      dt = new Date(String(r.created_at).replace(' ','T'))
        .toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
    }
  }catch(e){}
  if(dt) meta += (meta ? ' · ' : '') + esc(dt);
  return '<article class="rev"><div class="stars" aria-label="Оценка '+ (r.rating||5) +' из 5">' + starStr(r.rating) + '</div>' +
    '<p>«' + esc(r.text) + '»</p><div class="who"><div class="av">' + first + '</div>' +
    '<div><b>' + esc(r.name) + '</b><span>' + meta + '</span></div></div></article>';
}
var allRevs = [], shown = 0, PAGE = 6;
function renderRevs(){
  var grid = $('#rev-list');
  var slice = allRevs.slice(0, shown + PAGE);
  shown = slice.length;
  grid.innerHTML = slice.map(revCard).join('');
  $('#rev-more').hidden = shown >= allRevs.length;
  $('#rev-more').textContent = 'Показать ещё (' + (allRevs.length - shown) + ')';
}
$('#rev-more').addEventListener('click', renderRevs);

function updScore(){
  if(!allRevs.length) return;
  var s = allRevs.reduce(function(a,r){ return a + (parseInt(r.rating,10)||5); }, 0) / allRevs.length;
  $('#rev-avg').textContent = s.toFixed(1).replace('.', ',');
  $('#rev-stars').textContent = starStr(Math.round(s));
  $('#rev-count').textContent = allRevs.length + ' ' + plural(allRevs.length, ['отзыв','отзыва','отзывов']);
}
function plural(n, f){
  n = Math.abs(n) % 100; var n1 = n % 10;
  if(n > 10 && n < 20) return f[2];
  if(n1 > 1 && n1 < 5) return f[1];
  if(n1 === 1) return f[0];
  return f[2];
}
fetch('/api/reviews.php').then(function(r){
  if(!r.ok) throw 0; return r.json();
}).then(function(rows){
  if(rows && rows.length){
    allRevs = rows; shown = 0; renderRevs(); updScore();
  }
}).catch(function(){ /* остаются статичные отзывы из HTML */ });

$('#rev-form').addEventListener('submit', function(e){
  e.preventDefault();
  var form = this;
  var nm = $('#r-name').value.trim(), pl = $('#r-place').value.trim();
  var sv = $('#r-service').value, tx = $('#r-text').value.trim();
  var rt = 5;
  try{ rt = parseInt(form.querySelector('input[name=r-rating]:checked').value,10) || 5; }catch(err){}
  var okBox = $('#rev-ok'), errBox = $('#rev-err');
  okBox.classList.remove('on'); errBox.classList.remove('on');

  if(nm.length < 2){
    errBox.textContent = 'Укажите имя.'; errBox.classList.add('on');
    $('#r-name').classList.add('bad'); $('#r-name').focus(); return;
  }
  if(tx.length < 20){
    errBox.textContent = 'Расскажите чуть подробнее — минимум 20 символов (сейчас '+tx.length+').';
    errBox.classList.add('on'); $('#r-text').classList.add('bad'); $('#r-text').focus(); return;
  }
  var btn = form.querySelector('button[type=submit]');
  var old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '⏳ Отправляем…';

  post('/api/add-review.php', { name:nm, place:pl, service:sv, rating:rt, text:tx, hp:$('#r-hp').value })
  .then(function(r){
    if(r.ok){
      okBox.classList.add('on'); form.reset();
      $$('.rev-form input,.rev-form textarea').forEach(function(i){ i.classList.remove('bad'); });
      $('#rs5').checked = true;
    } else if(r.status === 429){
      errBox.innerHTML = '⚠️ Вы недавно уже оставляли отзыв. ' + PHONES; errBox.classList.add('on');
    } else {
      errBox.innerHTML = '⚠️ Не получилось отправить. ' + PHONES; errBox.classList.add('on');
    }
    btn.disabled = false; btn.innerHTML = old;
  }).catch(function(){
    errBox.innerHTML = '⚠️ Нет связи. ' + PHONES; errBox.classList.add('on');
    btn.disabled = false; btn.innerHTML = old;
  });
});
$('#r-text').addEventListener('input', function(){
  var n = this.value.trim().length;
  $('#r-count').textContent = n < 20 ? ('ещё ' + (20-n)) : (n + '/1000');
  this.classList.remove('bad');
});

/* ===================== СТАРТ ===================== */
calc();
activateTab('house');

// 3D грузим после первой отрисовки, чтобы не мешать LCP
if('requestIdleCallback' in window){
  requestIdleCallback(function(){ initHero(); initCalc3D(); }, {timeout:2200});
} else {
  setTimeout(function(){ initHero(); initCalc3D(); }, 900);
}

// год в подвале
var y = $('#year'); if(y) y.textContent = new Date().getFullYear();
})();
