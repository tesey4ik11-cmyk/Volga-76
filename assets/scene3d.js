/* ВОЛГАСТРОЙ 76 — 3D-сцены на Three.js.
   Геометрия строится процедурно (никаких моделей для скачивания).
   Грузится лениво: только когда блок появился на экране и если устройство тянет. */

import * as THREE from './vendor/three.module.min.js';

const C = {
  blue:0x2ea8ff, blueD:0x1479d6, sun:0xf5a83c, sunD:0xd07f14,
  wood:0xc08a4e, woodD:0x8a5f31, steel:0x9fb3c8, steelD:0x5a6b7d,
  water:0x1f9fd8, panel:0xdfe7ef, ground:0x0a1626, pipe:0xe06a2b,
  pipeBlue:0x2f7fd0, dark:0x0a1424, concrete:0x94a3b3
};

const mStd = (color, o={}) => new THREE.MeshStandardMaterial({ color, roughness:.72, metalness:.08, ...o });

/* ---------- Процедурные текстуры ----------
   Рисуются на canvas один раз и кэшируются. Ни одного запроса к серверу,
   вес нулевой, а поверхности перестают быть «пластиковыми». */
const _texCache = {};
function _canvasTex(key, w, h, draw, repeat){
  if(_texCache[key]) return _texCache[key];
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if(repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  _texCache[key] = t;
  return t;
}
function _noise(g, w, h, n, alpha, size){
  for(let i = 0; i < n; i++){
    const x = Math.random()*w, y = Math.random()*h;
    g.fillStyle = 'rgba(0,0,0,' + (Math.random()*alpha).toFixed(3) + ')';
    g.fillRect(x, y, size, size);
  }
}
/** Древесина: волокна + сучки. Для ДПК и бруса. */
function woodTex(base='#c08a4e', dark='#8a5f31'){
  return _canvasTex('wood'+base, 256, 256, (g,w,h)=>{
    g.fillStyle = base; g.fillRect(0,0,w,h);
    for(let i = 0; i < 90; i++){
      const y = Math.random()*h;
      g.strokeStyle = 'rgba(0,0,0,' + (0.03 + Math.random()*0.09).toFixed(3) + ')';
      g.lineWidth = 0.6 + Math.random()*2.4;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(w*.3, y + (Math.random()-.5)*9, w*.7, y + (Math.random()-.5)*9, w, y + (Math.random()-.5)*5);
      g.stroke();
    }
    for(let i = 0; i < 3; i++){
      const x = Math.random()*w, y = Math.random()*h, r = 3 + Math.random()*5;
      const kn = g.createRadialGradient(x,y,0,x,y,r);
      kn.addColorStop(0, dark); kn.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = kn; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }
    _noise(g, w, h, 900, .05, 2);
  }, [1,1]);
}
/** Бетон/штукатурка: крапчатая шероховатость. */
function concreteTex(base='#b9c3cc'){
  return _canvasTex('conc'+base, 256, 256, (g,w,h)=>{
    g.fillStyle = base; g.fillRect(0,0,w,h);
    for(let i = 0; i < 2600; i++){
      const x = Math.random()*w, y = Math.random()*h;
      const v = Math.random();
      g.fillStyle = v > .5 ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.09)';
      g.fillRect(x, y, 1 + Math.random()*2, 1 + Math.random()*2);
    }
    for(let i = 0; i < 24; i++){
      const x = Math.random()*w, y = Math.random()*h, r = 6 + Math.random()*20;
      const p = g.createRadialGradient(x,y,0,x,y,r);
      p.addColorStop(0,'rgba(0,0,0,.05)'); p.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle = p; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }
  }, [1,1]);
}
/** Грунт: комковатая земля для стенок траншеи. */
function soilTex(base='#7a5c3f'){
  return _canvasTex('soil'+base, 256, 256, (g,w,h)=>{
    g.fillStyle = base; g.fillRect(0,0,w,h);
    for(let i = 0; i < 1500; i++){
      const x = Math.random()*w, y = Math.random()*h, r = 1 + Math.random()*6;
      g.fillStyle = Math.random() > .5
        ? 'rgba(0,0,0,' + (Math.random()*.22).toFixed(2) + ')'
        : 'rgba(190,160,120,' + (Math.random()*.18).toFixed(2) + ')';
      g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }
  }, [1,1]);
}
/** Трава/дёрн. */
function grassTex(base='#4a7a3c'){
  return _canvasTex('grass'+base, 256, 256, (g,w,h)=>{
    g.fillStyle = base; g.fillRect(0,0,w,h);
    // Всё рисуем с оборачиванием через края — тогда текстура стыкуется без шва.
    const wrap = (fn)=>{
      for(let ox = -1; ox <= 1; ox++) for(let oy = -1; oy <= 1; oy++){
        g.save(); g.translate(ox*w, oy*h); fn(); g.restore();
      }
    };
    wrap(()=>{
      for(let i = 0; i < 26; i++){
        const x = Math.random()*w, y = Math.random()*h, r = 12 + Math.random()*34;
        const p = g.createRadialGradient(x,y,0,x,y,r);
        const dark = Math.random() > .5;
        p.addColorStop(0, dark ? 'rgba(26,52,22,.38)' : 'rgba(142,168,92,.26)');
        p.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = p; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
      }
    });
    wrap(()=>{
      for(let i = 0; i < 900; i++){
        const x = Math.random()*w, y = Math.random()*h;
        g.strokeStyle = Math.random() > .5
          ? 'rgba(22,58,22,' + (Math.random()*.38).toFixed(2) + ')'
          : 'rgba(152,198,112,' + (Math.random()*.32).toFixed(2) + ')';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(x,y); g.lineTo(x + (Math.random()-.5)*3, y - 2 - Math.random()*3); g.stroke();
      }
    });
  }, [1,1]);
}
/** Мелкая плитка/мозаика для дна бассейна. */
function tileTex(base='#2ba6d6', line='#1b7ba8'){
  return _canvasTex('tile'+base, 256, 256, (g,w,h)=>{
    g.fillStyle = base; g.fillRect(0,0,w,h);
    const s = 32;
    g.strokeStyle = line; g.lineWidth = 2;
    for(let i = 0; i <= w; i += s){
      g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke();
      g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke();
    }
    for(let x = 0; x < w; x += s) for(let y = 0; y < h; y += s){
      g.fillStyle = 'rgba(255,255,255,' + (Math.random()*.1).toFixed(3) + ')';
      g.fillRect(x+1, y+1, s-2, s-2);
    }
  }, [1,1]);
}
/** Профлист / металлочерепица: продольные рёбра жёсткости. */
function roofTex(base='#3c5e80'){
  return _canvasTex('roof'+base, 256, 256, (g,w,h)=>{
    g.fillStyle = base; g.fillRect(0,0,w,h);
    const step = 16;
    for(let x = 0; x < w; x += step){
      const gr = g.createLinearGradient(x, 0, x + step, 0);
      gr.addColorStop(0,   'rgba(0,0,0,.30)');
      gr.addColorStop(.28, 'rgba(255,255,255,.20)');
      gr.addColorStop(.55, 'rgba(255,255,255,.06)');
      gr.addColorStop(1,   'rgba(0,0,0,.26)');
      g.fillStyle = gr; g.fillRect(x, 0, step, h);
    }
    // поперечные стыки листов
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2;
    for(let y = 0; y < h; y += 128){
      g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke();
    }
    _noise(g, w, h, 700, .05, 2);
  }, [1,1]);
}
/** Сэндвич-панель: горизонтальные стыки и лёгкая шагрень. */
function _panelTex(){
  return _canvasTex('panel', 256, 256, (g,w,h)=>{
    g.fillStyle = '#e3eaf1'; g.fillRect(0,0,w,h);
    g.strokeStyle = 'rgba(0,0,0,.20)'; g.lineWidth = 2;
    for(let y = 0; y < h; y += 64){
      g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.moveTo(0,y+2); g.lineTo(w,y+2); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.20)';
    }
    _noise(g, w, h, 500, .035, 2);
  }, [1,1]);
}
/** Доска-имитация бруса: горизонтальный сайдинг. */
function _sidingTex(){
  return _canvasTex('siding', 256, 256, (g,w,h)=>{
    g.fillStyle = '#c7a97e'; g.fillRect(0,0,w,h);
    const step = 32;
    for(let y = 0; y < h; y += step){
      const gr = g.createLinearGradient(0, y, 0, y + step);
      gr.addColorStop(0,   'rgba(255,255,255,.22)');
      gr.addColorStop(.62, 'rgba(0,0,0,.05)');
      gr.addColorStop(1,   'rgba(0,0,0,.34)');
      g.fillStyle = gr; g.fillRect(0, y, w, step);
      for(let i = 0; i < 26; i++){
        const yy = y + Math.random()*step;
        g.strokeStyle = 'rgba(90,60,30,' + (Math.random()*.13).toFixed(3) + ')';
        g.lineWidth = .8;
        g.beginPath(); g.moveTo(0,yy); g.lineTo(w,yy); g.stroke();
      }
    }
  }, [1,1]);
}
/** Металл со следами шлифовки. */
function metalTex(base='#9fb3c8'){
  return _canvasTex('metal'+base, 128, 128, (g,w,h)=>{
    g.fillStyle = base; g.fillRect(0,0,w,h);
    for(let i = 0; i < 260; i++){
      const y = Math.random()*h;
      g.strokeStyle = Math.random() > .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';
      g.lineWidth = Math.random()*1.4;
      g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke();
    }
  }, [1,1]);
}
/** Карта нормалей из карты цвета: превращает рисунок в рельеф.
    Считаем градиент яркости по соседним пикселям (Sobel-lite). */
function normalFromTex(srcTex, key, strength=2.6){
  const ck = 'n_' + key;
  if(_texCache[ck]) return _texCache[ck];
  const img = srcTex.image;
  const w = img.width, h = img.height;
  const sc = document.createElement('canvas');
  sc.width = w; sc.height = h;
  const sg = sc.getContext('2d');
  sg.drawImage(img, 0, 0);
  const src = sg.getImageData(0, 0, w, h).data;

  const oc = document.createElement('canvas');
  oc.width = w; oc.height = h;
  const og = oc.getContext('2d');
  const out = og.createImageData(w, h);
  const lum = (x, y) => {
    const xx = (x + w) % w, yy = (y + h) % h;
    const i = (yy * w + xx) * 4;
    return (src[i] * .299 + src[i+1] * .587 + src[i+2] * .114) / 255;
  };
  for(let y = 0; y < h; y++){
    for(let x = 0; x < w; x++){
      const dx = (lum(x-1,y) - lum(x+1,y)) * strength;
      const dy = (lum(x,y-1) - lum(x,y+1)) * strength;
      let nx = dx, ny = dy, nz = 1;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4;
      out.data[i]   = (nx * .5 + .5) * 255;
      out.data[i+1] = (ny * .5 + .5) * 255;
      out.data[i+2] = (nz * .5 + .5) * 255;
      out.data[i+3] = 255;
    }
  }
  og.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(oc);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.copy(srcTex.repeat);
  _texCache[ck] = t;
  return t;
}

/** Материал с рельефом: цвет + нормали от той же картинки. */
function mTex(tex, key, o={}, nStrength=2.6){
  const n = normalFromTex(tex, key, nStrength);
  n.repeat.copy(tex.repeat);
  return new THREE.MeshStandardMaterial({
    map: tex, normalMap: n,
    normalScale: new THREE.Vector2(o.nrm ?? .7, o.nrm ?? .7),
    roughness: o.roughness ?? .8, metalness: o.metalness ?? .05,
    color: o.color ?? 0xffffff, side: o.side, transparent: o.transparent,
    opacity: o.opacity, emissive: o.emissive, emissiveIntensity: o.emissiveIntensity,
    envMapIntensity: o.envMapIntensity ?? 1
  });
}

/** Включить тени у всего поддерева. */
export function shade(obj, cast=true, receive=true){
  obj.traverse(o=>{ if(o.isMesh){ o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}

/* --------------------------------------------------------------
   Базовая сцена: свет, камера, орбита пальцем/мышью, resize, RAF.
----------------------------------------------------------------*/
export class Stage3D {
  constructor(canvas, opts={}){
    this.canvas = canvas;
    this.opts = Object.assign({
      camDist:9, camHeight:4.2, fov:38, autoRotate:true, autoSpeed:.16,
      minPolar:.55, maxPolar:1.46, groundY:0, exposure:1.05, dpr:1.7
    }, opts);

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias:true, alpha:true, powerPreference:'low-power'
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.opts.exposure;
    // Мягкие тени — главное, что отличает «схему» от «фотографии».
    // На слабых устройствах карта теней меньше: качество чуть ниже, но кадр не проседает.
    const weak = (navigator.hardwareConcurrency || 4) <= 4
              || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    this.lowEnd = weak;
    if(this.opts.shadowSize == null) this.opts.shadowSize = weak ? 1024 : 2048;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = weak ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x060d1a, 16, 46);

    this.camera = new THREE.PerspectiveCamera(this.opts.fov, 1, .1, 120);
    this.target = new THREE.Vector3(0, this.opts.targetY ?? 1.1, 0);

    this.theta = this.opts.theta ?? -0.62;
    this.phi   = this.opts.phi   ?? 1.09;
    this.dist  = this.opts.camDist;
    this.velo  = 0;
    this.drag  = false;
    this.userTouched = false;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this._lights();
    this._events();
    this._tick = this._tick.bind(this);
    this.clock = new THREE.Clock();
    this.running = false;
    this.resize();
  }

  _lights(){
    // Небесная подсветка: холодная сверху, отражённая от земли снизу.
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x24344a, 1.15));

    // Солнце — единственный источник теней. Тёплое, под углом, как днём.
    const key = new THREE.DirectionalLight(0xfff0d8, 3.1);
    key.position.set(7.5, 12, 6.5);
    key.castShadow = true;
    const S = this.opts.shadowSize || 2048;
    key.shadow.mapSize.set(S, S);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 46;
    const ext = this.opts.shadowExtent || 13;
    key.shadow.camera.left = -ext; key.shadow.camera.right = ext;
    key.shadow.camera.top  =  ext; key.shadow.camera.bottom = -ext;
    key.shadow.bias = -0.0009;
    key.shadow.normalBias = 0.022;
    key.shadow.radius = 3.2;
    this.scene.add(key);
    this.sun = key;

    // Заполняющий — смягчает теневую сторону, тени не даёт.
    const fill = new THREE.DirectionalLight(0x9ecbf5, .85);
    fill.position.set(-5, 4.5, 7);
    this.scene.add(fill);

    // Контровой — отделяет объект от фона.
    const rim = new THREE.DirectionalLight(0x5fc2ff, 1.25);
    rim.position.set(-7, 5.5, -6.5);
    this.scene.add(rim);

    this._env();
  }

  /** Процедурное небо как envMap: солнечный диск, градиент, земля.
      Одна текстура 256×128 — в отражениях читается как настоящее окружение. */
  _env(){
    const W = 256, H = 128;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0,    '#6fb4f2');   // зенит
    grd.addColorStop(0.34, '#a9d6f8');
    grd.addColorStop(0.47, '#dfeaf2');   // дымка у горизонта
    grd.addColorStop(0.5,  '#8e9c9c');   // линия горизонта
    grd.addColorStop(0.62, '#4a5b52');   // трава/земля вдали
    grd.addColorStop(1,    '#25302c');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);

    // солнце — даёт живой блик на воде и металле
    const sx = W * 0.18, sy = H * 0.22;
    const sun = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.13);
    sun.addColorStop(0, 'rgba(255,252,238,1)');
    sun.addColorStop(0.28, 'rgba(255,240,205,.55)');
    sun.addColorStop(1, 'rgba(255,235,195,0)');
    g.fillStyle = sun; g.fillRect(0, 0, W, H * 0.55);

    // облачные пятна — разбивают пустой градиент в отражениях
    g.globalAlpha = .3;
    for(let i = 0; i < 14; i++){
      const x = Math.random() * W, y = Math.random() * H * 0.4;
      const r = 8 + Math.random() * 26;
      const cl = g.createRadialGradient(x, y, 0, x, y, r);
      cl.addColorStop(0, 'rgba(255,255,255,.85)');
      cl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cl;
      g.beginPath(); g.ellipse(x, y, r, r * .5, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.scene.environment = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
  }

  _events(){
    const el = this.canvas;
    const down = (x)=>{ this.drag=true; this.lastX=x; this.userTouched=true;
      this.canvas.parentElement?.classList.add('grabbing'); };
    const move = (x)=>{ if(!this.drag) return;
      const dx = (x - this.lastX)/this.canvas.clientWidth;
      this.theta -= dx * 3.0; this.velo = -dx * 3.0; this.lastX = x; };
    const up = ()=>{ this.drag=false; this.canvas.parentElement?.classList.remove('grabbing'); };

    el.addEventListener('pointerdown', e=>{ el.setPointerCapture?.(e.pointerId); down(e.clientX); });
    el.addEventListener('pointermove', e=>move(e.clientX));
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', ()=>el.style.cursor='grabbing');
    window.addEventListener('pointerup', ()=>el.style.cursor='grab');

    this._ro = new ResizeObserver(()=>this.resize());
    this._ro.observe(el.parentElement || el);
  }

  resize(){
    const host = this.canvas.parentElement || this.canvas;
    const w = host.clientWidth || 480, h = host.clientHeight || 340;
    if(!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.dpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
    this.onResizeFit && this.onResizeFit();
  }

  start(){ if(this.running) return; this.running = true; this.clock.start(); this._tick(); }
  stop(){ this.running = false; if(this._raf) cancelAnimationFrame(this._raf); }

  _tick(){
    if(!this.running) return;
    this._raf = requestAnimationFrame(this._tick);
    const dt = Math.min(this.clock.getDelta(), .05);

    if(!this.drag){
      if(Math.abs(this.velo) > .0004){ this.theta += this.velo; this.velo *= .93; }
      else if(this.opts.autoRotate) this.theta += this.opts.autoSpeed * dt;
    }
    this.phi = Math.max(this.opts.minPolar, Math.min(this.opts.maxPolar, this.phi));

    const st = Math.sin(this.phi), ct = Math.cos(this.phi);
    this.camera.position.set(
      this.target.x + this.dist * st * Math.sin(this.theta),
      this.target.y + this.dist * ct,
      this.target.z + this.dist * st * Math.cos(this.theta)
    );
    this.camera.lookAt(this.target);

    this.onFrame && this.onFrame(dt, this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
  }

  /** Подогнать камеру так, чтобы объект помещался в кадр при ЛЮБОМ угле поворота.
      Считаем по описанной сфере: модель крутится вокруг Y, поэтому берём
      горизонтальный радиус по диагонали X/Z. */
  fit(object, pad = 1.1){
    const box = new THREE.Box3().setFromObject(object);
    if(box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const rHoriz = Math.sqrt(size.x*size.x + size.z*size.z) / 2;
    const rVert  = size.y / 2;
    const R = Math.sqrt(rHoriz*rHoriz + rVert*rVert) || 1;

    const aspect = this.camera.aspect || 1;
    const vFov = this.camera.fov * Math.PI / 180;
    // горизонтальный угол обзора — на узком экране он меньше вертикального
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const minFov = Math.min(vFov, hFov);

    this.dist = (R / Math.sin(minFov / 2)) * pad;
    this.target.set(center.x, center.y * .72, center.z);
  }

  clearRoot(){
    while(this.root.children.length){
      const c = this.root.children.pop();
      c.traverse?.(o=>{ o.geometry?.dispose?.();
        if(Array.isArray(o.material)) o.material.forEach(m=>m.dispose()); else o.material?.dispose?.(); });
    }
  }

  dispose(){
    this.stop(); this.clearRoot(); this._ro?.disconnect();
    this.renderer.dispose();
  }
}

/* --------------------------------------------------------------
   Строительные блоки
----------------------------------------------------------------*/
function beam(w,h,d,color,x=0,y=0,z=0,mat){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat || mStd(color));
  m.position.set(x,y,z); return m;
}

/** Пустая группа — чтобы собирать композицию из нескольких моделей */
export function group(){ return new THREE.Group(); }

/** Площадка-основание с сеткой — «участок» */
export function groundPad(size=14, grid=true){
  const g = new THREE.Group();
  const gt = grassTex('#4e6f3e');
  gt.repeat.set(9, 9);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(size*.52, size*.52, .35, 56),
    new THREE.MeshStandardMaterial({ map:gt, color:0x7d9670, roughness:1, metalness:0 })
  );
  pad.position.y = -.18;
  pad.receiveShadow = true;
  g.add(pad);
  // Тонкий контур площадки. Раньше был яркий «чертёжный» диск —
  // для фотореалистичной подачи оставляем еле заметный ободок.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(size*.52, .018, 8, 80),
    new THREE.MeshBasicMaterial({ color:C.blue, transparent:true, opacity:.16 })
  );
  ring.rotation.x = Math.PI/2; ring.position.y = .01; g.add(ring);
  if(grid){
    const gh = new THREE.GridHelper(size, size, 0x2ea8ff, 0x2a4a3a);
    gh.material.transparent = true; gh.material.opacity = .07; gh.position.y = .006;
    g.add(gh);
  }
  return g;
}

/** Винтовая свая со спиралью */
export function screwPile(x=0, z=0, len=1.5, dia=.1){
  const g = new THREE.Group();
  const steel = mStd(C.steelD, { metalness:.62, roughness:.42 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(dia,dia,len,12), steel);
  shaft.position.y = -len/2 + .42; g.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(dia*3.4, .05, dia*3.4), mStd(C.steel,{metalness:.6,roughness:.4}));
  cap.position.y = .44; g.add(cap);
  // лопасть
  const blade = new THREE.Mesh(
    new THREE.TorusGeometry(dia*2.1, dia*.34, 5, 14, Math.PI*1.7),
    mStd(C.steelD,{metalness:.6,roughness:.45})
  );
  blade.rotation.x = Math.PI/2; blade.position.y = -len + .58; blade.scale.z = .42; g.add(blade);
  g.position.set(x, 0, z);
  shade(g);
  return g;
}

/** Каркасный дом: сваи, ростверк, стойки, стропила, кровля */
export function houseModel({ w=5.2, d=3.9, h=2.5, metal=false, roof=true, walls=.0 }={}){
  const g = new THREE.Group();
  const frameMat = metal ? mStd(C.steel,{map:metalTex('#9fb3c8'),metalness:.55,roughness:.4}) : mTex(woodTex(), 'woodframe', { color:0xd6a066, roughness:.78, metalness:.02, nrm:.55 });
  const frameDark = metal ? mStd(C.steelD,{metalness:.55,roughness:.42}) : mStd(C.woodD,{roughness:.85});
  const s = metal ? .1 : .085;

  // свайное поле
  const px=[-w/2, 0, w/2], pz=[-d/2, 0, d/2];
  px.forEach(a=>pz.forEach(b=>{ if(!(a===0&&b===0)) g.add(screwPile(a,b,1.35,.062)); }));

  // ростверк
  [-d/2, d/2].forEach(z=> g.add(beam(w+s*2, s*1.5, s*1.5, 0, 0, .5, z, frameDark)));
  [-w/2, w/2].forEach(x=> g.add(beam(s*1.5, s*1.5, d, 0, x, .5, 0, frameDark)));
  // лаги пола
  for(let i=-2;i<=2;i++) g.add(beam(w, s*.8, s*.8, 0, 0, .52, i*(d/4.6), frameMat));
  // пол
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, .05, d), mStd(metal?0x6d7b8a:C.woodD,{roughness:.9}));
  floor.position.y = .58; g.add(floor);

  // стойки по периметру
  const posts = [];
  const stepX = w/4, stepZ = d/3;
  for(let i=0;i<=4;i++){ posts.push([-w/2 + i*stepX, -d/2]); posts.push([-w/2 + i*stepX, d/2]); }
  for(let j=1;j<3;j++){ posts.push([-w/2, -d/2 + j*stepZ]); posts.push([w/2, -d/2 + j*stepZ]); }
  posts.forEach(([x,z])=>{
    const p = beam(s, h, s, 0, x, .6 + h/2, z, frameMat); g.add(p);
  });
  // верхняя обвязка
  [-d/2, d/2].forEach(z=> g.add(beam(w+s, s, s, 0, 0, .6+h, z, frameDark)));
  [-w/2, w/2].forEach(x=> g.add(beam(s, s, d, 0, x, .6+h, 0, frameDark)));

  // Стены. При walls>=.5 — сплошные панели с окнами (вид «как построено»);
  // при меньшем значении остаются полупрозрачными, чтобы был виден каркас.
  if(walls > 0){
    const solid = walls >= .5;
    let wallMat;
    if(solid){
      const wt = metal ? _panelTex() : _sidingTex();
      wt.repeat.set(Math.max(2, Math.round(w/2.2)), Math.max(2, Math.round(h/1.5)));
      wallMat = metal
        ? mTex(wt, 'sandwich', { color:0xd8e2ec, roughness:.5, metalness:.1, nrm:.35 }, 1.4)
        : mTex(wt, 'siding',   { color:0xd9c9ac, roughness:.78, metalness:.02, nrm:.75 }, 2.4);
    } else { wallMat = null; }
    wallMat = wallMat
      || new THREE.MeshStandardMaterial({
          color:C.panel, roughness:.55, metalness:.05,
          transparent:true, opacity:walls, side:THREE.DoubleSide });

    const glass = new THREE.MeshStandardMaterial({
      color:0x1d3447, roughness:.04, metalness:.85, transparent:true, opacity:.82,
      envMapIntensity:2.8, side:THREE.DoubleSide });
    const frameW = mStd(0xf2f4f7, { roughness:.5 });

    const mk = (ww,hh,x,y,z,ry)=>{
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ww,hh), wallMat);
      m.position.set(x,y,z); m.rotation.y = ry;
      if(solid){ m.castShadow = true; m.receiveShadow = true; }
      g.add(m);
    };
    mk(w,h,0,.6+h/2,-d/2,0); mk(w,h,0,.6+h/2,d/2,0);
    mk(d,h,-w/2,.6+h/2,0,Math.PI/2); mk(d,h,w/2,.6+h/2,0,Math.PI/2);

    if(solid){
      // окна по длинным стенам + дверь — без них коробка выглядит нежилой
      const nWin = Math.max(2, Math.round(w / 2.4));
      const wwin = Math.min(1.25, w / (nWin + 1.4)), hwin = Math.min(1.15, h * .46);
      for(let i = 0; i < nWin; i++){
        const x = -w/2 + (i + .5) * (w / nWin);
        [-1, 1].forEach(sg=>{
          const y = .6 + h * .58;
          const z = sg * (d/2 + .02);
          // стекло
          const gl = new THREE.Mesh(new THREE.PlaneGeometry(wwin, hwin), glass);
          gl.position.set(x, y, z); g.add(gl);
          // рама — четыре планки по контуру, а не сплошной щит
          const t = .055;
          const bar = (bw,bh,bx,by)=>{
            const m = new THREE.Mesh(new THREE.BoxGeometry(bw,bh,.05), frameW);
            m.position.set(x+bx, y+by, z - sg*.012); m.castShadow = true; g.add(m);
          };
          bar(wwin + t*2, t, 0,  hwin/2);
          bar(wwin + t*2, t, 0, -hwin/2);
          bar(t, hwin, -wwin/2, 0);
          bar(t, hwin,  wwin/2, 0);
          // импост
          bar(t*.8, hwin, 0, 0);
        });
      }
      const dw = .9, dh = Math.min(2.02, h * .86);
      const door = new THREE.Mesh(new THREE.BoxGeometry(dw, dh, .06),
        mTex(woodTex('#8d6234','#5d3f1f'), 'door', { color:0xa5764a, roughness:.7, nrm:.5 }));
      door.position.set(w * .22, .6 + dh/2, -d/2 - .03);
      door.castShadow = true; g.add(door);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), mStd(0xcfd8e2, { metalness:.8, roughness:.25 }));
      hd.position.set(w * .22 + dw*.36, .6 + dh*.5, -d/2 - .07); g.add(hd);
    }
  }

  if(roof){
    // односкатная кровля 11°
    const rise = Math.tan(11*Math.PI/180) * d;
    const rg = new THREE.Group();
    for(let i=0;i<=4;i++){
      const x = -w/2 + i*stepX;
      const raf = new THREE.Mesh(new THREE.BoxGeometry(s*.9, s*.9, Math.sqrt(d*d + rise*rise)), frameMat);
      raf.position.set(x, .6+h+rise/2, 0);
      raf.rotation.x = -Math.atan2(rise, d);
      rg.add(raf);
    }
    const rt = roofTex();
    rt.repeat.set(Math.max(3, Math.round(w*1.1)), 1);
    const sheet = new THREE.Mesh(
      new THREE.BoxGeometry(w+.34, .045, Math.sqrt(d*d+rise*rise)+.3),
      mTex(rt, 'roofsheet', { color:0x6f89a8, metalness:.55, roughness:.42, nrm:.85 }, 2.2)
    );
    sheet.position.set(0, .66+h+rise/2, 0);
    sheet.rotation.x = -Math.atan2(rise, d);
    rg.add(sheet);
    g.add(rg);
  }
  shade(g);
  return g;
}

/** Бассейн: чаша, вода, обвязка, борт из ДПК.
    Чаша поднята над уровнем земли (y=0 — низ), иначе её скрывает площадка. */
export function poolModel({ w=4.4, d=3.0, deck=true, pavilion=false }={}){
  const g = new THREE.Group();
  const depth = .78;            // высота борта чаши
  const t = .1;                 // толщина стенки
  const rim = depth;            // уровень верхнего борта

  const shellMat = mTex(concreteTex('#e8eef5'), 'concshell', { color:0xdfe7f0, roughness:.62, metalness:.02, nrm:.35 });

  // стенки чаши
  g.add(beam(w + t*2, depth, t, 0, 0, depth/2, -d/2 - t/2, shellMat));
  g.add(beam(w + t*2, depth, t, 0, 0, depth/2,  d/2 + t/2, shellMat));
  g.add(beam(t, depth, d, 0, -w/2 - t/2, depth/2, 0, shellMat));
  g.add(beam(t, depth, d, 0,  w/2 + t/2, depth/2, 0, shellMat));

  // голубой лайнер внутри — вода читается, а не «чёрная яма»
  const linerMat = new THREE.MeshStandardMaterial({
    color:0x1b93c6, roughness:.3, metalness:.04,
    emissive:0x0d6590, emissiveIntensity:.5, side:THREE.BackSide
  });
  const liner = new THREE.Mesh(new THREE.BoxGeometry(w, depth, d), linerMat);
  liner.position.y = depth/2;
  g.add(liner);
  // дно
  const _btile = tileTex(); _btile.repeat.set(Math.max(2,Math.round(w)), Math.max(2,Math.round(d)));
  g.add(beam(w, .08, d, 0, 0, .04, 0, mStd(0x2ba6d6, { map:_btile, roughness:.3 })));

  // вода
  const waterGeo = new THREE.PlaneGeometry(w - .05, d - .05, 40, 30);
  // Рябь как карта нормалей: даёт дробление бликов, без неё вода — плоское стекло.
  const rip = _canvasTex('ripple', 128, 128, (gg,ww,hh)=>{
    gg.fillStyle = '#8fd8f2'; gg.fillRect(0,0,ww,hh);
    for(let i = 0; i < 130; i++){
      const x = Math.random()*ww, y = Math.random()*hh, r = 3 + Math.random()*13;
      const p2 = gg.createRadialGradient(x,y,0,x,y,r);
      p2.addColorStop(0,'rgba(255,255,255,.5)');
      p2.addColorStop(.5,'rgba(120,180,220,.25)');
      p2.addColorStop(1,'rgba(0,0,0,0)');
      gg.fillStyle = p2; gg.beginPath(); gg.arc(x,y,r,0,Math.PI*2); gg.fill();
    }
  }, [3,3]);
  const waterMat = new THREE.MeshStandardMaterial({
    color:0x17a6dc, transparent:true, opacity:.9,
    roughness:.07, metalness:.32,
    normalMap: normalFromTex(rip, 'ripple', 1.5),
    normalScale: new THREE.Vector2(.32,.32),
    emissive:0x0a6fa0, emissiveIntensity:.5, envMapIntensity:2.0
  });
  waterMat.normalMap.repeat.set(3,3);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI/2;
  water.position.y = rim - .13;
  water.receiveShadow = true;
  g.add(water);
  g.userData.waterMat = waterMat;
  g.userData.water = water;
  g.userData.waterBase = waterGeo.attributes.position.array.slice();

  // борт ДПК вровень с верхом чаши
  if(deck){
    const dm = mTex(woodTex(), 'woodframe', { color:0xd0995e, roughness:.84, metalness:.02, nrm:.6 });
    const bw = .95, y = rim;
    const mkDeck = (ww,dd,x,z)=>{ const m = new THREE.Mesh(new THREE.BoxGeometry(ww,.07,dd), dm);
      m.position.set(x, y, z); g.add(m); };
    mkDeck(w + t*2 + bw*2, bw, 0, -d/2 - t - bw/2);
    mkDeck(w + t*2 + bw*2, bw, 0,  d/2 + t + bw/2);
    mkDeck(bw, d + t*2, -w/2 - t - bw/2, 0);
    mkDeck(bw, d + t*2,  w/2 + t + bw/2, 0);
    // расшивка досок
    const lineMat = new THREE.MeshBasicMaterial({ color:C.woodD, transparent:true, opacity:.45 });
    for(let i=1;i<6;i++){
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(w + t*2 + bw*2, .072, .014), lineMat);
      l1.position.set(0, y+.002, -d/2 - t - bw + i*(bw/6)); g.add(l1);
      const l2 = l1.clone(); l2.position.z = d/2 + t + i*(bw/6); g.add(l2);
    }
    // опоры настила
    for(let i=-1;i<=1;i+=2){
      for(let j=-1;j<=1;j+=2){
        g.add(screwPile(i*(w/2 + t + bw*.55), j*(d/2 + t + bw*.55), 1.0, .05));
      }
    }
  }

  // техника и обвязка ПВХ
  const pipeMat = mStd(C.pipeBlue, { roughness:.38, metalness:.15 });
  const tech = new THREE.Group();
  tech.position.set(w/2 + 1.75, 0, -d/2 + .3);
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.48,18), mStd(0x35485f,{metalness:.5,roughness:.4}));
  pump.rotation.z = Math.PI/2; pump.position.y = .3; tech.add(pump);
  const filter = new THREE.Mesh(new THREE.CapsuleGeometry(.28,.46,6,16), mStd(0x59748a,{roughness:.45}));
  filter.position.set(-.8,.52,0); tech.add(filter);
  for(let i=0;i<3;i++){
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.68,16), mStd(0x2a6e92,{roughness:.5}));
    tank.position.set(.5, .36, -.05 + i*.7); tech.add(tank);
  }
  const mkPipe = (len,x,y,z)=>{ const p = new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,len,10), pipeMat);
    p.rotation.z = Math.PI/2; p.position.set(x,y,z); tech.add(p); };
  mkPipe(1.7, -1.5, .3, .3);
  mkPipe(1.3, -1.25, .62, -.1);
  g.add(tech);

  if(pavilion){
    const pv = new THREE.Group();
    const arcMat = new THREE.MeshStandardMaterial({
      color:0xcfeaff, transparent:true, opacity:.17, roughness:.03, metalness:.25, side:THREE.DoubleSide });
    const frameMat = mStd(C.steel, { metalness:.6, roughness:.32 });
    const R = w*.62;   // чуть шире чаши, чтобы арка накрывала борт
    // Полуторус лежит в плоскости XY — это и есть арка поперёк чаши.
    for(let i=0;i<=4;i++){
      const z = -d/2 + i*(d/4);
      const arc = new THREE.Mesh(new THREE.TorusGeometry(R,.05,6,26,Math.PI), frameMat);
      arc.position.set(0, rim, z);
      pv.add(arc);
    }
    // Полуцилиндр-остекление: ось вдоль Z, открытая часть снизу.
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, d, 30, 1, true, Math.PI/2, Math.PI), arcMat);
    shell.rotation.x = Math.PI/2;
    shell.position.y = rim;
    pv.add(shell);
    // конёк
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,d,8), frameMat);
    ridge.rotation.x = Math.PI/2; ridge.position.set(0, rim + R, 0);
    pv.add(ridge);
    // Реальные павильоны — низкие и вытянутые, а не полукруг в полный рост.
    // Сплющиваем по высоте относительно уровня борта.
    pv.position.y = rim;
    pv.scale.y = .60;
    pv.children.forEach(ch => { ch.position.y -= rim; });
    g.add(pv);
  }
  shade(g);
  return g;
}

/** Траншея с трубами наружных сетей.
    Важно: модель строится ВВЕРХ от y=0 (дно траншеи), иначе её скрывает площадка. */
export function netsModel({ len=8, type='k1', deep=false, well=true }={}){
  const g = new THREE.Group();
  const depth = deep ? 1.55 : 1.05;   // высота грунтовых стенок
  const width = 1.35;                 // ширина траншеи — шире, чтобы заглянуть внутрь
  const bank  = 1.5;                  // ширина «берега» грунта

  const soil    = mTex(soilTex(), 'soil', { color:0x9c7a55, roughness:1, metalness:0, nrm:.8 }, 2.8);   // грунт
  const soilTop = mTex(grassTex(), 'grassbank', { color:0x6f9459, roughness:1, metalness:0, nrm:.35 }, 1.4);  // дёрн
  const sand    = mStd(0xd6bf96, { roughness:1 });          // песчаная подушка

  const mk = (w,h,d,x,y,z,m)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); g.add(b); };

  // два массива грунта по бокам траншеи
  const zOff = width/2 + bank/2;
  mk(len, depth, bank, 0, depth/2, -zOff, soil);
  mk(len, depth, bank, 0, depth/2,  zOff, soil);
  // дёрн сверху
  mk(len, .12, bank, 0, depth + .06, -zOff, soilTop);
  mk(len, .12, bank, 0, depth + .06,  zOff, soilTop);
  // дно траншеи + песчаная подушка
  mk(len, .1,  width, 0, .05, 0, soil);
  mk(len, .16, width*.88, 0, .18, 0, sand);

  // труба
  const colors = { k1:0xe0672b, v1:0x2f7fd0, gvs:0xcf4a3a, dren:0x4e8f4e };
  const radii  = { k1:.22, v1:.13, gvs:.18, dren:.16 };
  const rad  = radii[type] || .18;
  const pmat = mStd(colors[type] || 0xe0672b, { roughness:.42, metalness:.05 });
  const pipeY = .26 + rad;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 22), pmat);
  pipe.rotation.z = Math.PI/2;
  pipe.position.set(0, pipeY, 0);
  g.add(pipe);

  // раструбы канализации
  if(type === 'k1'){
    for(let i=-2;i<=2;i++){
      const s = new THREE.Mesh(new THREE.CylinderGeometry(rad*1.22, rad*1.22, .18, 20), mStd(0xb8541f,{roughness:.5}));
      s.rotation.z = Math.PI/2;
      s.position.set(i*(len/5.4), pipeY, 0);
      g.add(s);
    }
  }
  // ППУ-скорлупа
  if(type === 'gvs'){
    const ins = new THREE.Mesh(new THREE.CylinderGeometry(rad*1.5, rad*1.5, len, 20),
      new THREE.MeshStandardMaterial({ color:0xe6e6e6, roughness:.85, transparent:true, opacity:.45 }));
    ins.rotation.z = Math.PI/2; ins.position.set(0, pipeY, 0); g.add(ins);
  }
  // дренаж — щебневая обсыпка
  if(type === 'dren'){
    const gravel = new THREE.Mesh(new THREE.BoxGeometry(len, .3, width*.8),
      new THREE.MeshStandardMaterial({ color:0x8d8d86, roughness:1, transparent:true, opacity:.75 }));
    gravel.position.set(0, pipeY, 0); g.add(gravel);
  }

  if(well){
    const wl = new THREE.Group();
    wl.position.set(len/2 - 1.0, 0, 0);
    const rings = new THREE.Mesh(
      new THREE.CylinderGeometry(.62, .62, depth + .25, 24, 1, true),
      mStd(C.concrete, { map:concreteTex('#a8b4bf'), roughness:.95, side:THREE.DoubleSide })
    );
    rings.position.y = (depth + .25)/2; wl.add(rings);
    // швы колец
    for(let i=1;i<3;i++){
      const r = new THREE.Mesh(new THREE.TorusGeometry(.63,.02,6,26), mStd(0x7d8b99,{roughness:.9}));
      r.rotation.x = Math.PI/2; r.position.y = i*((depth+.25)/3); wl.add(r);
    }
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(.66,.66,.1,24), mStd(0x3d4650,{metalness:.5,roughness:.55}));
    lid.position.y = depth + .3; wl.add(lid);
    const hatch = new THREE.Mesh(new THREE.TorusGeometry(.27,.05,8,22), mStd(0x2b333c,{metalness:.6,roughness:.5}));
    hatch.rotation.x = Math.PI/2; hatch.position.y = depth + .37; wl.add(hatch);
    g.add(wl);
  }
  shade(g);
  return g;
}

/** Терраса ДПК на сваях */
export function deckModel({ w=5.4, d=3.6, diag=false, rail=true }={}){
  const g = new THREE.Group();
  const nx = 4, nz = 3;
  for(let i=0;i<=nx;i++) for(let j=0;j<=nz;j++)
    g.add(screwPile(-w/2 + i*(w/nx), -d/2 + j*(d/nz), 1.2, .055));

  const frameMat = mStd(C.steelD,{metalness:.5,roughness:.45});
  for(let j=0;j<=nz;j++) g.add(beam(w+.1,.09,.09,0,0,.46,-d/2+j*(d/nz),frameMat));
  for(let i=0;i<=nx;i++) g.add(beam(.09,.09,d,0,-w/2+i*(w/nx),.46,0,frameMat));
  // лаги
  for(let i=0;i<=12;i++) g.add(beam(.06,.06,d,0,-w/2+i*(w/12),.53,0,mStd(C.steel,{metalness:.4})));

  // доски ДПК
  const boardMat = mTex(woodTex(), 'woodframe', { color:0xd0995e, roughness:.85, metalness:.02, nrm:.6 });
  const grp = new THREE.Group();
  const bw = .16, gap = .022;
  if(!diag){
    const n = Math.floor(d/(bw+gap));
    for(let i=0;i<n;i++){
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, .025, bw), boardMat);
      b.position.set(0, .585, -d/2 + bw/2 + i*(bw+gap));
      grp.add(b);
    }
  } else {
    const diagLen = Math.sqrt(w*w+d*d);
    const n = Math.floor(diagLen/(bw+gap));
    for(let i=0;i<n;i++){
      const b = new THREE.Mesh(new THREE.BoxGeometry(diagLen, .025, bw), boardMat);
      b.position.set(0,.585, -diagLen/2 + bw/2 + i*(bw+gap));
      b.rotation.y = Math.PI/4;
      grp.add(b);
    }
    // подрезка по контуру
    const clip = new THREE.Mesh(new THREE.BoxGeometry(w,.06,d),
      new THREE.MeshBasicMaterial({visible:false}));
    clip.position.y=.585;
    grp.children.forEach(b=>{
      const half = new THREE.Box3().setFromObject(clip);
      if(Math.abs(b.position.z) > (w+d)/2) b.visible=false;
    });
  }
  g.add(grp);

  if(rail){
    const rm = mStd(C.steelD,{metalness:.55,roughness:.4});
    const postH=.95;
    const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    for(let i=0;i<=6;i++){
      const x=-w/2+i*(w/6);
      g.add(beam(.05,postH,.05,0,x,.6+postH/2,-d/2,rm));
    }
    g.add(beam(w,.06,.06,0,0,.6+postH,-d/2,rm));
    g.add(beam(w,.035,.035,0,0,.6+postH*.55,-d/2,rm));
    // ступени
    const st = new THREE.Group();
    for(let i=0;i<3;i++){
      const s=new THREE.Mesh(new THREE.BoxGeometry(1.3,.045,.3),boardMat);
      s.position.set(0, .52 - i*.18, d/2 + .2 + i*.3); st.add(s);
    }
    g.add(st);
  }
  shade(g);
  return g;
}

/** Только свайное поле + ростверк */
export function pilesModel({ n=16, dia=.09, rost=true }={}){
  const g = new THREE.Group();
  const cols = Math.max(2, Math.round(Math.sqrt(n*1.4)));
  const rows = Math.max(2, Math.ceil(n/cols));
  const sx = 1.15, sz = 1.15;
  const w = (cols-1)*sx, d = (rows-1)*sz;
  let c=0;
  for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){
    if(c++>=n) break;
    g.add(screwPile(-w/2 + i*sx, -d/2 + j*sz, 1.5, dia));
  }
  if(rost){
    const rm = mStd(C.steelD,{metalness:.55,roughness:.42});
    for(let j=0;j<rows;j++) g.add(beam(w+.2,.1,.11,0,0,.5,-d/2+j*sz,rm));
    for(let i=0;i<cols;i++) g.add(beam(.11,.1,d+.2,0,-w/2+i*sx,.5,0,rm));
  }
  shade(g);
  return g;
}

/** Комната в разрезе — для «Отделки» */
export function finishModel({ lvl=1, warm=false }={}){
  const g = new THREE.Group();
  const w=4.6,d=3.4,h=2.5;
  const wallCol = lvl>=3 ? 0xeef2f7 : (lvl===2 ? 0xd6dee8 : 0x9aa6b4);
  const wm = mStd(wallCol,{roughness:.9,side:THREE.DoubleSide});
  const floorCol = lvl>=3 ? C.wood : (lvl===2 ? 0xb6a189 : 0x8c8c8c);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(w,.08,d), mStd(floorCol,{roughness:.75}));
  floor.position.y=.04; g.add(floor);
  if(lvl>=2){
    const lm = new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.12});
    for(let i=1;i<9;i++){ const l=new THREE.Mesh(new THREE.BoxGeometry(w,.085,.012),lm);
      l.position.set(0,.042,-d/2+i*(d/9)); g.add(l); }
  }
  // Две стены «в разрез» — интерьер остаётся открытым для обзора
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w,h), wm);
  back.position.set(0,h/2,-d/2); g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(d,h), wm);
  left.position.set(-w/2,h/2,0); left.rotation.y=Math.PI/2; g.add(left);
  // потолок только узкими карнизами вдоль этих стен, чтобы не перекрывать вид
  const cm = mTex(concreteTex('#f2f6fa'), 'concwall', { roughness:.94, metalness:.02, nrm:.32 });
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(w,.06,.45), cm);
  c1.position.set(0,h-.03,-d/2+.22); g.add(c1);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(.45,.06,d), cm);
  c2.position.set(-w/2+.22,h-.03,0); g.add(c2);
  // плинтус
  if(lvl>=2){
    const pm = mStd(0xffffff,{roughness:.7});
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(w,.09,.04), pm);
    p1.position.set(0,.13,-d/2+.02); g.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(.04,.09,d), pm);
    p2.position.set(-w/2+.02,.13,0); g.add(p2);
  }

  if(lvl>=2){
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.15),
      new THREE.MeshStandardMaterial({color:0x8fd0ff,roughness:.06,metalness:.5,
        emissive:0x2a6f9e,emissiveIntensity:.7,side:THREE.DoubleSide}));
    win.position.set(.5,1.35,-d/2+.02); g.add(win);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.62,1.27,.05), mStd(0xffffff,{roughness:.6}));
    fr.position.set(.5,1.35,-d/2-.02); g.add(fr);
  }
  if(lvl>=3){
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.16,14,10),
      new THREE.MeshStandardMaterial({color:0xfff3d8,emissive:0xffd98a,emissiveIntensity:1.4}));
    lamp.position.set(0,h-.34,0); g.add(lamp);
    const pl = new THREE.PointLight(0xffd08a, 8, 8, 2); pl.position.set(0,h-.35,0); g.add(pl);
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.9,.42,.75), mStd(0x35506b,{roughness:.9}));
    sofa.position.set(-.7,.29,.7); g.add(sofa);
    const back2 = new THREE.Mesh(new THREE.BoxGeometry(1.9,.5,.2), mStd(0x2c445c,{roughness:.9}));
    back2.position.set(-.7,.55,1.02); g.add(back2);
  }
  if(warm){
    const pipeM = new THREE.MeshStandardMaterial({color:0xff6b4a,roughness:.5,
      emissive:0x8c2d13,emissiveIntensity:.45});
    for(let i=0;i<8;i++){
      const t=new THREE.Mesh(new THREE.TorusGeometry(.34,.028,6,18,Math.PI),pipeM);
      t.rotation.x=Math.PI/2; t.position.set(-w/2+.5+i*.52,.1, i%2? .34:-.34);
      t.rotation.z = i%2?0:Math.PI;
      g.add(t);
    }
  }
  shade(g);
  return g;
}

/* --------------------------------------------------------------
   Может ли устройство тянуть 3D
----------------------------------------------------------------*/
export function can3D(){
  try{
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return false;
    const nav = navigator;
    if(nav.connection && (nav.connection.saveData ||
       /2g/.test(nav.connection.effectiveType||''))) return false;
    if((nav.deviceMemory||4) < 1.5) return false;
    if((nav.hardwareConcurrency||4) < 2) return false;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if(!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context'); lose && lose.loseContext();
    return true;
  }catch(e){ return false; }
}
