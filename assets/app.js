/* ВОЛГАСТРОЙ 76 — логика сайта (v3).
   Ванильный JS, без сборки и внешних библиотек — спокойно живёт на любом PHP-хостинге.
   Вместо «игрового» 3D — инженерные эскизы-чертежи на SVG: лёгкие и мгновенные. */
(function(){
'use strict';

var $  = function(s,c){ return (c||document).querySelector(s); };
var $$ = function(s,c){ return Array.prototype.slice.call((c||document).querySelectorAll(s)); };
var fmtR = function(n){ return Math.round(n).toLocaleString('ru-RU') + ' ₽'; };
var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
}, { threshold:.08, rootMargin:'0px 0px -40px 0px' });
$$('.rv').forEach(function(el){ io.observe(el); });

/* ===================== ПАРАЛЛАКС В ГЕРОЕ ===================== */
(function(){
  var hero = $('.hero'), bg = $('#heroBg');
  if(!hero || !bg || reduceMotion) return;
  if(!(window.matchMedia && matchMedia('(pointer:fine)').matches)) return;
  var mx = 0, my = 0, cx = 0, cy = 0, sy = 0, raf = null;
  function loop(){
    cx += (mx - cx) * .06;
    cy += (my - cy) * .06;
    bg.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + (cy + sy).toFixed(2) + 'px,0)';
    if(Math.abs(mx - cx) > .05 || Math.abs(my - cy) > .05 || Math.abs(sy) > .3){
      raf = requestAnimationFrame(loop);
    } else raf = null;
  }
  function kick(){ if(!raf) raf = requestAnimationFrame(loop); }
  hero.addEventListener('mousemove', function(e){
    var r = hero.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width  - .5) * -14;
    my = ((e.clientY - r.top)  / r.height - .5) * -10;
    kick();
  }, {passive:true});
  window.addEventListener('scroll', function(){
    var y = window.pageYOffset || 0;
    sy = Math.min(y * .16, 140);
    kick();
  }, {passive:true});
})();

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

var gHouseMat = optGroup('opt-house-mat', function(){ calc(); queueBP(); });
var gHouseKit = optGroup('opt-house-kit', function(){ calc(); queueBP(); });
var gPoolPav  = optGroup('opt-pool-pav',  function(){ calc(); queueBP(); });
var gDeckLay  = optGroup('opt-deck-lay',  function(){ calc(); queueBP(); });
var gNetType  = optGroup('opt-net-type',  function(){ calc(); queueBP(); });
var gNetDeep  = optGroup('opt-net-deep',  function(){ calc(); queueBP(); });
var gPileDia  = optGroup('opt-pile-dia',  function(){ calc(); queueBP(); });
var gFinLvl   = optGroup('opt-fin-lvl',   function(){ calc(); queueBP(); });

bindRange('r-house-area','o-house-area','м²');
bindRange('r-deck-area','o-deck-area','м²');
bindRange('r-net-len','o-net-len','м');
bindRange('r-pile-n','o-pile-n','шт');
bindRange('r-pile-rost','o-pile-rost','м');
bindRange('r-fin-area','o-fin-area','м²');

// чертёж перерисовываем не на каждый пиксель слайдера, а с паузой
var bpTimer = null;
function queueBP(){ clearTimeout(bpTimer); bpTimer = setTimeout(drawBP, 150); }
$$('input[type=range]').forEach(function(r){
  r.addEventListener('input', queueBP);
});
$$('.calc-in input[type=checkbox]').forEach(function(c){
  c.addEventListener('change', function(){ calc(); queueBP(); });
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
  calc(); queueBP();
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
      Fl.push(['Монтаж плинтуса и наличников', perimF, 'м.п.', lvl === 2 ? .05 : .05]);
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

/* ===================== ЧЕРТЁЖ-ЭСКИЗ (SVG) =====================
   Лёгкие схемы в стиле инженерной «кальки»: сетка, размерные линии,
   рамка и штамп. Перестраиваются вместе с параметрами калькулятора. */
var bpBox = $('#bp'), bpLbl = $('#bp-lbl');

function bcomm(x){ // число с запятой
  return String(Math.round(x * 10) / 10).replace('.', ',');
}
function bpT(x, y, str, cls, anchor){ // текст
  return '<text x="' + x + '" y="' + y + '" class="' + (cls||'t-d') + '"' +
    (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + str + '</text>';
}
function bpTick(x, y){ // засечка размерной линии (классика — под 45°)
  return '<line class="s-dim" x1="' + (x-4) + '" y1="' + (y+4) + '" x2="' + (x+4) + '" y2="' + (y-4) + '"/>';
}
function bpDimH(x1, x2, y, txt){ // горизонтальный размер
  return '<line class="s-dim" x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '"/>' +
    bpTick(x1, y) + bpTick(x2, y) +
    bpT((x1+x2)/2, y-7, txt, 't-d', 'middle');
}
function bpDimV(x, y1, y2, txt){ // вертикальный размер (подпись повёрнута)
  var mx = x, my = (y1+y2)/2;
  return '<line class="s-dim" x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '"/>' +
    bpTick(x, y1) + bpTick(x, y2) +
    '<text x="' + mx + '" y="' + my + '" class="t-d" text-anchor="middle" transform="rotate(-90 ' + mx + ' ' + (my+4) + ')">' + txt + '</text>';
}
function bpChip(x, y, txt){ // янтарная «плашка-заметка»
  var w = txt.length * 7 + 22;
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="23" rx="11.5" ' +
    'fill="rgba(245,168,60,.12)" stroke="rgba(245,168,60,.55)" stroke-width="1"/>' +
    bpT(x + w/2, y + 15.5, txt, 't-chip', 'middle');
}
function bpFrame(sheet, title, inner){ // рамка + штамп + сетка
  return '<svg class="bpd" viewBox="0 0 760 430" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<defs>' +
    '<pattern id="bpGrid" width="38" height="38" patternUnits="userSpaceOnUse">' +
      '<path d="M38 .5 H.5 V38" fill="none" stroke="rgba(124,201,255,.065)" stroke-width="1"/></pattern>' +
    '<pattern id="bpWtr" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="13" stroke="rgba(124,201,255,.4)" stroke-width="1.1"/></pattern>' +
  '</defs>' +
  '<rect x="0" y="0" width="760" height="430" fill="url(#bpGrid)"/>' +
  '<rect class="s-thin" x="12" y="12" width="736" height="406"/>' +
  '<path class="s-main" d="M12 40 V12 H40 M720 12 H748 V40 M748 390 V418 H720 M40 418 H12 V390" fill="none"/>' +
  // штамп
  '<rect class="s-thin" x="492" y="352" width="256" height="66"/>' +
  '<line class="s-thin" x1="492" y1="374" x2="748" y2="374"/>' +
  '<line class="s-thin" x1="492" y1="396" x2="748" y2="396"/>' +
  bpT(506, 369, 'ВОЛГАСТРОЙ 76', 't-t') +
  bpT(742, 369, 'лист ' + sheet, 't-u', 'end') +
  bpT(506, 391, title, 't-n') +
  bpT(506, 412, 'предварительный эскиз · не является проектом', 't-n') +
  inner + '</svg>';
}

function bpHouse(){
  var a = rv('r-house-area');
  var metal = gHouseMat.mult() > 1;
  var turnkey = gHouseKit.val() >= 24000;
  var wm = Math.sqrt(a * 1.3), dm = a / wm;
  var k = Math.min(360 / wm, 220 / dm);
  var pw = wm * k, ph = dm * k;
  var x0 = 340 - pw/2, y0 = 84 + (226 - ph)/2;
  var s = '';
  s += bpT(28, 44, 'ПЛАН · ' + a + ' м²', 't-t');
  s += bpT(28, 63, 'каркас: ' + (metal ? 'металл + сэндвич' : 'дерево 50×150'), 't-n');
  s += bpT(28, 79, 'комплектация: ' + (turnkey ? 'под ключ' : 'коробка'), 't-n');
  // свесы кровли
  s += '<rect class="s-dash" x="' + (x0-13) + '" y="' + (y0-13) + '" width="' + (pw+26) + '" height="' + (ph+26) + '"/>';
  // наружный контур (анимированная основная линия)
  s += '<path class="s-main draw" pathLength="100" d="M' + x0 + ' ' + y0 + ' h' + pw + ' v' + ph + ' h' + (-pw) + ' Z"/>';
  // внутренняя грань стены
  s += '<path class="s-thin" d="M' + (x0+9) + ' ' + (y0+9) + ' h' + (pw-18) + ' v' + (ph-18) + ' h' + (18-pw) + ' Z"/>';
  // коньковая линия
  s += '<line class="s-dash" x1="' + x0 + '" y1="' + (y0+ph/2) + '" x2="' + (x0+pw) + '" y2="' + (y0+ph/2) + '"/>';
  if(metal){ // швы панелей по длинным фасадам
    for(var i = 1; i < 6; i++){
      var sx = x0 + pw * i / 6;
      s += '<line class="s-thin" x1="' + sx + '" y1="' + y0 + '" x2="' + sx + '" y2="' + (y0+9) + '"/>';
      s += '<line class="s-thin" x1="' + sx + '" y1="' + (y0+ph-9) + '" x2="' + sx + '" y2="' + (y0+ph) + '"/>';
    }
  }
  if(turnkey){ // перегородки + дуга двери
    var px = x0 + pw * .62, py = y0 + ph * .55;
    s += '<line class="s-dash" x1="' + px + '" y1="' + (y0+9) + '" x2="' + px + '" y2="' + (y0+ph-9) + '"/>';
    s += '<line class="s-dash" x1="' + px + '" y1="' + py + '" x2="' + (x0+pw-9) + '" y2="' + py + '"/>';
    s += '<path class="s-thin" d="M' + (px+34) + ' ' + py + ' A34 34 0 0 1 ' + px + ' ' + (py-34) +
         ' M' + px + ' ' + (py-34) + ' L' + px + ' ' + py + ' L' + (px+34) + ' ' + py + '"/>';
  }
  if(isOn('c-house-fund')){ // сваи по периметру
    var pts = [[x0,y0],[x0+pw/2,y0],[x0+pw,y0],[x0,y0+ph/2],[x0+pw,y0+ph/2],[x0,y0+ph],[x0+pw/2,y0+ph],[x0+pw,y0+ph]];
    pts.forEach(function(p){ s += '<circle class="f-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="5"/>'; });
    s += bpChip(x0, y0 - 36, 'СВАЙНЫЙ ФУНДАМЕНТ');
  }
  s += bpDimH(x0, x0+pw, y0 + ph + 30, 'A ' + bcomm(wm) + ' м');
  s += bpDimV(x0 + pw + 26, y0, y0 + ph, 'B ' + bcomm(dm) + ' м');
  return s;
}

function bpPool(){
  var pav = gPoolPav.val();
  var s = '';
  s += bpT(28, 44, 'БАССЕЙН · чаша 8,0 × 4,0 м', 't-t');
  s += bpT(28, 63, 'глубина 1,5 м · скиммер · форсунки', 't-n');
  var bx = 190, by = 150, bw = 300, bh = 168;
  if(isOn('c-pool-deck')){ // терраса вокруг чаши
    var dx = bx-46, dy = by-46, dw = bw+92, dh = bh+92;
    s += '<rect class="s-fill" x="' + dx + '" y="' + dy + '" width="' + dw + '" height="' + dh + '"/>';
    for(var ly = dy + 11; ly < dy + dh - 5; ly += 12){
      s += '<line class="s-thin" x1="' + dx + '" y1="' + ly + '" x2="' + (dx+dw) + '" y2="' + ly + '"/>';
    }
    s += '<rect class="s-dash" x="' + dx + '" y="' + dy + '" width="' + dw + '" height="' + dh + '"/>';
    s += bpT(dx + 4, dy + dh - 8, 'ТЕРРАСА ~50 м²', 't-u');
  }
  if(pav > 0){ // павильон
    s += '<rect class="s-accd" x="' + (bx-26) + '" y="' + (by-24) + '" width="' + (bw+52) + '" height="' + (bh+48) + '" rx="26"/>';
    for(var i = 1; i < 5; i++){
      var rx = bx - 26 + (bw + 52) * i / 5;
      s += '<line class="s-dash" x1="' + rx + '" y1="' + (by-24) + '" x2="' + rx + '" y2="' + (by+bh+24) + '"/>';
    }
    s += bpChip(bx - 26, by - 56, 'ПАВИЛЬОН · ' + (pav > 40000 ? 'БОЛЬШОЙ' : 'МАЛЫЙ'));
  }
  // обрамление борта
  s += '<rect class="s-thin" x="' + (bx-10) + '" y="' + (by-10) + '" width="' + (bw+20) + '" height="' + (bh+20) + '"/>';
  // вода
  s += '<rect class="s-wfill" x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="8"/>';
  s += '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="8" fill="url(#bpWtr)" opacity=".5"/>';
  s += '<rect class="s-main draw" pathLength="100" x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="8"/>';
  // ступени — четверть-окружности в углу
  [20, 31, 42].forEach(function(r){
    s += '<path class="s-thin" d="M' + (bx+16+r) + ' ' + (by+16) + ' A' + r + ' ' + r + ' 0 0 1 ' + (bx+16) + ' ' + (by+16+r) + '"/>';
  });
  // лестница и скиммер
  s += '<circle class="s-thin" cx="' + (bx+bw-30) + '" cy="' + (by+12) + '" r="4"/>';
  s += '<circle class="s-thin" cx="' + (bx+bw-44) + '" cy="' + (by+12) + '" r="4"/>';
  s += '<rect class="s-acc" x="' + (bx+bw/2-14) + '" y="' + (by-3) + '" width="28" height="6"/>';
  s += bpDimH(bx, bx+bw, by + bh + 34, '8,0 м');
  s += bpDimV(bx - 34, by, by + bh, '4,0 м');
  // техузел справа
  if(isOn('c-pool-pipe') || isOn('c-pool-tech')){
    var tx = 600, ty = 190;
    if(isOn('c-pool-pipe')){
      s += '<rect class="s-thin" x="' + tx + '" y="' + ty + '" width="34" height="34"/>';
      s += '<circle class="s-thin" cx="' + (tx+17) + '" cy="' + (ty+52) + '" r="13"/>';
      s += '<path class="s-dash" d="M' + tx + ' ' + (ty+17) + ' H' + (bx+bw) +
           ' M' + tx + ' ' + (ty+52) + ' H' + (bx+bw+6) + ' V' + (by+bh) + '"/>';
      s += bpT(tx-6, ty-12, 'НАСОС / ФИЛЬТР', 't-u');
      s += bpT(tx-6, ty+82, 'обвязка ПВХ до d75', 't-n');
    }
    if(isOn('c-pool-tech')){
      s += '<rect class="s-dash" x="' + (tx-8) + '" y="' + (ty+96) + '" width="72" height="46"/>';
      s += '<circle class="s-thin" cx="' + (tx+8) + '" cy="' + (ty+119) + '" r="12"/>';
      s += '<circle class="s-thin" cx="' + (tx+39) + '" cy="' + (ty+119) + '" r="12"/>';
      s += bpT(tx-8, ty+160, 'ТЕХУЗЕЛ · 3 × 1 м³', 't-u');
    }
  }
  return s;
}

function bpNet(){
  var len = rv('r-net-len'), rate = gNetType.val(), deep = gNetDeep.mult() > 1;
  var nm = NET_NAMES[rate] || 'Сеть';
  var DZ = deep ? 168 : 108;
  var gy = 138, x1 = 84, x2 = 664;
  var color = { 2800:'#f5a83c', 2300:'#8fd0ff', 3500:'#ffcf8a', 2000:'#9fd0b1' }[rate] || '#8fd0ff';
  var s = '';
  s += bpT(28, 44, nm.toUpperCase() + ' · ' + len + ' м', 't-t');
  s += bpT(28, 63, deep ? 'глубокое заложение · до 1,8 м' : 'стандарт · до 1,2 м', 't-n');
  // поверхность
  s += '<line class="s-main draw" pathLength="100" x1="56" y1="' + gy + '" x2="704" y2="' + gy + '"/>';
  for(var gx = 64; gx <= 700; gx += 22){
    s += '<line class="s-thin" x1="' + gx + '" y1="' + gy + '" x2="' + gx + '" y2="' + (gy-9) + '"/>';
  }
  // трасшей
  s += '<path class="s-dash" d="M70 ' + gy + ' L94 ' + (gy+DZ+22) + ' H666 L700 ' + gy + '"/>';
  // труба
  s += '<rect x="' + x1 + '" y="' + (gy+DZ) + '" width="' + (x2-x1) + '" height="15" rx="7.5" ' +
       'fill="none" stroke="' + color + '" stroke-width="2.4"/>';
  // стакан колодца
  if(isOn('c-net-well')){
    s += '<rect class="s-thin" x="' + (x2+4) + '" y="' + (gy-26) + '" width="26" height="' + (DZ+41) + '"/>';
    s += '<line class="s-main" x1="' + (x2-2) + '" y1="' + (gy-26) + '" x2="' + (x2+36) + '" y2="' + (gy-26) + '"/>';
    s += bpT(x2+2, gy - 40, 'КОЛОДЕЦ', 't-u');
  }
  // ввод
  s += '<circle class="f-dot" cx="' + x1 + '" cy="' + (gy+DZ+7.5) + '" r="6"/>';
  s += bpT(x1 - 16, gy + DZ + 40, 'ВВОД В ДОМ', 't-u');
  // гильза под дорогой
  if(isOn('c-net-road')){
    s += '<rect class="s-accd" x="230" y="' + (gy+DZ-13) + '" width="96" height="41" rx="6"/>';
    s += bpT(230, gy + DZ + 46, 'ГИЛЬЗА ПОД ДОРОГОЙ', 't-chip');
  }
  // уклон
  s += '<path class="s-thin" d="M' + (x2-190) + ' ' + (gy+DZ-16) + ' h44 l-8 -5 m8 5 -8 5"/>';
  s += bpT(x2 - 250, gy + DZ - 22, 'уклон 2 см/м', 't-n');
  // размеры
  s += bpDimH(x1, x2, gy - 26, 'L = ' + len + ' м');
  s += bpDimV(56, gy, gy + DZ, 'H ' + (deep ? '1,8' : '1,2') + ' м');
  if(isOn('c-net-back')){
    s += bpChip(56, gy + DZ + 66, 'ВОССТАНОВЛЕНИЕ БЛАГОУСТРОЙСТВА ПО ТРАССЕ');
  }
  return s;
}

function bpDeck(){
  var ad = rv('r-deck-area'), diag = gDeckLay.val() > 1000;
  var wm = Math.sqrt(ad * 1.5), dm = ad / wm;
  var k = Math.min(380 / wm, 230 / dm);
  var pw = wm * k, ph = dm * k;
  var x0 = 360 - pw/2, y0 = 78 + (236 - ph)/2;
  var s = '';
  s += bpT(28, 44, 'ТЕРРАСА · ' + ad + ' м²', 't-t');
  s += bpT(28, 63, (diag ? 'диагональная укладка' : 'прямая укладка') + ' · зазор 4–5 мм', 't-n');
  s += '<defs><clipPath id="bpClipD"><rect x="' + x0 + '" y="' + y0 + '" width="' + pw + '" height="' + ph + '"/></clipPath></defs>';
  if(isOn('c-deck-frame')){ // металлокаркас — двойной контур
    s += '<rect class="s-thin" x="' + (x0-9) + '" y="' + (y0-9) + '" width="' + (pw+18) + '" height="' + (ph+18) + '"/>';
    [[x0-9,y0-9],[x0+pw,y0-9],[x0-9,y0+ph],[x0+pw,y0+ph]].forEach(function(p){
      s += '<rect class="s-acc" x="' + p[0] + '" y="' + p[1] + '" width="9" height="9"/>';
    });
  }
  // доски
  s += '<g clip-path="url(#bpClipD)">';
  if(diag){
    for(var d = -ph; d < pw + ph; d += 14){
      s += '<line class="s-thin" x1="' + (x0+d) + '" y1="' + y0 + '" x2="' + (x0+d+ph) + '" y2="' + (y0+ph) + '"/>';
    }
  } else {
    for(var ly = y0 + 12; ly < y0 + ph; ly += 24){
      s += '<line class="s-thin" x1="' + x0 + '" y1="' + ly + '" x2="' + (x0+pw) + '" y2="' + ly + '"/>';
    }
  }
  s += '</g>';
  s += '<path class="s-main draw" pathLength="100" d="M' + x0 + ' ' + y0 + ' h' + pw + ' v' + ph + ' h' + (-pw) + ' Z"/>';
  // ступени слева
  var stY = y0 + ph * .62;
  for(var st = 0; st < 3; st++){
    s += '<line class="s-thin" x1="' + (x0-24+st*8) + '" y1="' + (stY+st*10) + '" x2="' + x0 + '" y2="' + (stY+st*10) + '"/>';
  }
  s += bpT(x0 - 74, stY - 8, 'СТУПЕНИ', 't-u');
  // сваи вдоль кромки
  if(isOn('c-deck-pile')){
    var np = Math.max(3, Math.round(pw / 78));
    for(var i = 0; i <= np; i++){
      var px = x0 + pw * i / np;
      s += '<circle class="f-dot" cx="' + px + '" cy="' + (y0+ph+ (isOn('c-deck-frame')?9:0)) + '" r="5" transform="translate(0 1)"/>' +
           '<line class="s-thin" x1="' + px + '" y1="' + (y0+ph+6) + '" x2="' + px + '" y2="' + (y0+ph+18) + '"/>';
    }
    s += bpChip(x0, y0 - 34, 'СВАЙНОЕ ОСНОВАНИЕ');
  }
  s += bpDimH(x0, x0+pw, y0 + ph + (isOn('c-deck-pile') ? 48 : 30), 'A ' + bcomm(wm) + ' м');
  s += bpDimV(x0 + pw + 28, y0, y0 + ph, 'B ' + bcomm(dm) + ' м');
  if(isOn('c-deck-mat')) s += bpT(28, 400, '+ материалы (доска, лаги, крепёж) — в смете', 't-n');
  return s;
}

function bpPile(){
  var n = rv('r-pile-n'), dn = DIA_NAMES[gPileDia.val()] || '', rm = rv('r-pile-rost');
  var cols = Math.ceil(Math.sqrt(n * 1.6)), rowsN = Math.ceil(n / cols);
  var cell = Math.min(320 / Math.max(cols-1,1), 178 / Math.max(rowsN-1,1));
  var gw = (cols-1) * cell, gh = (rowsN-1) * cell;
  var x0 = 372 - gw/2, y0 = 200 - gh/2;
  var s = '';
  s += bpT(28, 44, 'СВАЙНОЕ ПОЛЕ · ' + n + ' шт', 't-t');
  s += bpT(28, 63, dn + ' · длина 2–3 м · оголовки', 't-n');
  if(rm > 0){
    s += '<rect class="s-accd" x="' + (x0-24) + '" y="' + (y0-24) + '" width="' + (gw+48) + '" height="' + (gh+48) + '"/>';
    s += bpT(x0 - 24, y0 + gh + 44, 'РОСТВЕРК ШВЕЛЛЕРОМ · ' + rm + ' м.п.', 't-u');
  } else {
    s += '<rect class="s-dash" x="' + (x0-24) + '" y="' + (y0-24) + '" width="' + (gw+48) + '" height="' + (gh+48) + '"/>';
  }
  var drawn = 0;
  for(var r = 0; r < rowsN; r++){
    for(var c = 0; c < cols && drawn < n; c++, drawn++){
      var px = x0 + c * cell, py = y0 + r * cell;
      s += '<circle class="f-dot" cx="' + px + '" cy="' + py + '" r="' + Math.min(8, cell * .3) + '"/>';
      s += '<circle class="f-acc" cx="' + px + '" cy="' + py + '" r="1.7"/>';
    }
  }
  // легенда
  s += '<circle class="f-dot" cx="36" cy="392" r="6"/>' + bpT(50, 396, 'свая винтовая', 't-n');
  s += '<rect class="s-accd" x="160" y="384" width="24" height="15"/>' + bpT(192, 396, rm > 0 ? 'ростверк в расчёте' : 'ростверк не нужен', 't-n');
  return s;
}

function bpFinish(){
  var af = rv('r-fin-area'), frate = gFinLvl.val();
  var fn = FIN_NAMES[frate] || 'Отделка';
  var side = Math.sqrt(af);
  var p = Math.min(320, Math.max(150, side * 21));
  var x0 = 330 - p/2, y0 = 210 - p/2;
  var s = '';
  s += bpT(28, 44, 'ПЛАН ПОМЕЩЕНИЯ · ' + af + ' м²', 't-t');
  s += bpT(28, 63, 'уровень: ' + fn.toLowerCase(), 't-n');
  // штриховка пола
  s += '<defs><clipPath id="bpClipF"><rect x="' + (x0+8) + '" y="' + (y0+8) + '" width="' + (p-16) + '" height="' + (p-16) + '"/></clipPath></defs>';
  s += '<g clip-path="url(#bpClipF)" opacity=".5">';
  for(var d = -p; d < p * 2; d += 16){
    s += '<line class="s-thin" x1="' + (x0+d) + '" y1="' + y0 + '" x2="' + (x0+d+p) + '" y2="' + (y0+p) + '"/>';
  }
  s += '</g>';
  // стены (с проёмом двери внизу)
  var doorX = x0 + p * .58, doorW = 46;
  s += '<path class="s-main draw" pathLength="100" d="M' + x0 + ' ' + (y0+p) + ' V' + y0 + ' H' + (x0+p) + ' V' + (y0+p) + ' H' + (doorX+doorW) +
       ' M' + doorX + ' ' + (y0+p) + ' H' + x0 + '"/>';
  s += '<path class="s-thin" d="M' + (x0+8) + ' ' + (y0+8) + ' h' + (p-16) + ' v' + (p-16) + '"/>';
  // окно на верхней стене
  s += '<rect class="s-acc" x="' + (x0 + p * .38) + '" y="' + (y0-3) + '" width="64" height="6"/>';
  // дуга двери
  s += '<path class="s-thin" d="M' + (doorX+doorW) + ' ' + (y0+p-doorW) + ' A' + doorW + ' ' + doorW + ' 0 0 0 ' + doorX + ' ' + (y0+p) + '"/>';
  // тёплый пол — змеевик
  if(isOn('c-fin-floor')){
    var wz = 'M' + (x0+18) + ' ' + (y0+p-22), dir = 1, yy = y0 + p - 22, step = 17;
    for(var r = 0; r < 4; r++){
      wz += ' h' + (dir * (p - 36)); dir = -dir; yy -= step; wz += ' v' + (-step + 0);
    }
    wz += ' h' + (dir * (p - 60));
    s += '<path class="s-acc" opacity=".85" d="' + wz + '" fill="none"/>';
    s += bpChip(28, 90, 'ТЁПЛЫЙ ПОЛ');
  }
  if(isOn('c-fin-elec')){
    s += '<rect class="s-acc" x="' + (x0+p-16) + '" y="' + (y0+16) + '" width="10" height="16"/>';
    var ptsE = [[x0+p*.24,y0+p*.26],[x0+p*.5,y0+p*.4],[x0+p*.72,y0+p*.3]];
    ptsE.forEach(function(pt){
      s += '<path class="s-dash" d="M' + (x0+p-11) + ' ' + (y0+24) + ' L' + pt[0] + ' ' + pt[1] + '"/>';
      s += '<circle class="f-dot" cx="' + pt[0] + '" cy="' + pt[1] + '" r="3.6"/>';
    });
    s += bpChip(28, 120, 'ЭЛЕКТРИКА ПОД КЛЮЧ');
  }
  if(isOn('c-fin-sant')){
    s += '<circle class="s-acc" cx="' + (x0+20) + '" cy="' + (y0+24) + '" r="6"/>' +
         '<circle class="s-acc" cx="' + (x0+38) + '" cy="' + (y0+24) + '" r="6"/>' +
         bpChip(28, 150, 'САНТЕХНИКА · 2 ТОЧКИ');
  }
  s += bpDimH(x0, x0+p, y0 + p + 32, bcomm(side) + ' м');
  s += bpDimV(x0 + p + 28, y0, y0 + p, bcomm(side) + ' м');
  return s;
}

var BP_SHEETS = { house:['A','план каркасного дома'], pool:['Б','бассейн · план'],
  net:['В','наружные сети · продольный профиль'], deck:['Г','терраса ДПК · план'],
  pile:['Д','свайное поле · план'], finish:['Е','отделка · план помещения'] };

function drawBP(){
  if(!bpBox) return;
  var inner = '', label = '';
  if(tab === 'house'){
    inner = bpHouse();
    var a = rv('r-house-area');
    label = (gHouseMat.mult() > 1 ? 'Металл + сэндвич' : 'Деревянный каркас') + ' · ' + a + ' м²';
  } else if(tab === 'pool'){
    inner = bpPool();
    label = 'Бассейн' + (gPoolPav.val() > 0 ? ' + павильон' : '');
  } else if(tab === 'net'){
    inner = bpNet();
    label = (NET_NAMES[gNetType.val()] || 'Сеть') + ' · ' + rv('r-net-len') + ' м';
  } else if(tab === 'deck'){
    inner = bpDeck();
    label = 'Терраса ДПК · ' + rv('r-deck-area') + ' м²' + (gDeckLay.val() > 1000 ? ' · диагональ' : '');
  } else if(tab === 'pile'){
    inner = bpPile();
    label = rv('r-pile-n') + ' свай ' + (DIA_NAMES[gPileDia.val()] || '');
  } else if(tab === 'finish'){
    inner = bpFinish();
    label = (FIN_NAMES[gFinLvl.val()] || 'Отделка') + ' · ' + rv('r-fin-area') + ' м²';
  }
  var sh = BP_SHEETS[tab] || ['A','эскиз'];
  bpBox.innerHTML = bpFrame(sh[0], sh[1].toUpperCase(), inner);
  if(bpLbl) bpLbl.textContent = label;
  // перезапуск анимации «вычерчивания»
  bpBox.classList.remove('redrw');
  void bpBox.offsetWidth;
  if(!reduceMotion) bpBox.classList.add('redrw');
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
  btn.disabled = true; btn.textContent = 'Отправляем…';

  post('/api/submit.php', {
    name:nm, phone:ph, subject:tp, message:ms,
    hp: $('#f-hp').value,
    calc: (attachCalc && CALC) ? CALC : null
  }).then(function(r){
    if(r.ok){
      okBox.classList.add('on');
      btn.textContent = 'Отправлено';
      form.reset(); setChip(false);
      $$('.form-card input').forEach(function(i){ i.classList.remove('bad'); });
      setTimeout(function(){ btn.disabled=false; btn.innerHTML=old; }, 5000);
    } else if(r.status === 429){
      errBox.innerHTML = 'Слишком много заявок с вашего адреса. ' + PHONES;
      errBox.classList.add('on'); btn.disabled=false; btn.innerHTML=old;
    } else {
      errBox.innerHTML = 'Не получилось отправить. ' + PHONES;
      errBox.classList.add('on'); btn.disabled=false; btn.innerHTML=old;
    }
  }).catch(function(){
    errBox.innerHTML = 'Нет связи с сервером. ' + PHONES;
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
  btn.disabled = true; btn.textContent = 'Отправляем…';

  post('/api/add-review.php', { name:nm, place:pl, service:sv, rating:rt, text:tx, hp:$('#r-hp').value })
  .then(function(r){
    if(r.ok){
      okBox.classList.add('on'); form.reset();
      $$('.rev-form input,.rev-form textarea').forEach(function(i){ i.classList.remove('bad'); });
      $('#rs5').checked = true;
    } else if(r.status === 429){
      errBox.innerHTML = 'Вы недавно уже оставляли отзыв. ' + PHONES; errBox.classList.add('on');
    } else {
      errBox.innerHTML = 'Не получилось отправить. ' + PHONES; errBox.classList.add('on');
    }
    btn.disabled = false; btn.innerHTML = old;
  }).catch(function(){
    errBox.innerHTML = 'Нет связи с сервером. ' + PHONES; errBox.classList.add('on');
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
drawBP();

// год в подвале
var y = $('#year'); if(y) y.textContent = new Date().getFullYear();
})();
