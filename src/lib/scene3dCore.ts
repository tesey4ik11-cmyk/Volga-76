import * as THREE from 'three';

// Engineering CAD & Architectural Palette
export const C = {
  blue: 0x2563eb,
  blueLight: 0x38bdf8,
  blueDark: 0x1e3a8a,
  blueprint: 0x0284c7,
  steel: 0x94a3b8,
  steelDark: 0x475569,
  wood: 0xc89658,
  woodDark: 0x8a5f31,
  woodPlank: 0xb57c3d,
  panel: 0xe2e8f0,
  panelDark: 0x94a3b8,
  concrete: 0x64748b,
  water: 0x0284c7,
  waterSurface: 0x38bdf8,
  pipeOrange: 0xe25822, // Sewer SN4
  pipeBlue: 0x2563eb,   // Water PND SDR11
  ground: 0x0b1324,
  sand: 0xd4a373,
};

// Procedural Canvas Textures Cache
const _texCache: Record<string, THREE.Texture> = {};

/**
 * Deep dispose of Three.js Object3D hierarchy (geometries, materials, textures)
 * Avoids WebGL GPU memory leaks when rebuilding or changing models.
 */
export function disposeHierarchy(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || (child as any).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          // Dispose textures attached to material properties
          for (const key of Object.keys(mat)) {
            const val = (mat as any)[key];
            if (val && typeof val === 'object' && val.isTexture && typeof val.dispose === 'function') {
              // Only dispose if not in singleton procedural cache
              const isCached = Object.values(_texCache).includes(val);
              if (!isCached) {
                val.dispose();
              }
            }
          }
          mat.dispose();
        });
      }
    }
  });
}

function getCanvasTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat?: [number, number]
): THREE.Texture {
  if (_texCache[key]) return _texCache[key];
  if (typeof document === 'undefined') {
    return new THREE.Texture();
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  _texCache[key] = tex;
  return tex;
}

export function woodTex(): THREE.Texture {
  return getCanvasTexture('wood_grain', 256, 256, (g, w, h) => {
    g.fillStyle = '#b78044';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const y = Math.random() * h;
      g.strokeStyle = 'rgba(0,0,0,0.08)';
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 8, w * 0.7, y + (Math.random() - 0.5) * 8, w, y);
      g.stroke();
    }
  }, [2, 2]);
}

export function metalTex(): THREE.Texture {
  return getCanvasTexture('metal_brushed', 128, 128, (g, w, h) => {
    g.fillStyle = '#94a3b8';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      const y = Math.random() * h;
      g.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  }, [1, 1]);
}

export function panelTex(): THREE.Texture {
  return getCanvasTexture('sandwich_panel', 256, 256, (g, w, h) => {
    g.fillStyle = '#dbe4ee';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 48) {
      g.strokeStyle = 'rgba(0,0,0,0.22)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.4)';
      g.beginPath();
      g.moveTo(0, y + 2);
      g.lineTo(w, y + 2);
      g.stroke();
    }
  }, [2, 2]);
}

export function dpkTex(): THREE.Texture {
  return getCanvasTexture('dpk_deck', 256, 256, (g, w, h) => {
    g.fillStyle = '#78553e';
    g.fillRect(0, 0, w, h);
    const step = 32;
    for (let x = 0; x < w; x += step) {
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
      for (let y = 0; y < h; y += 16) {
        g.strokeStyle = 'rgba(255,255,255,0.06)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x + 2, y);
        g.lineTo(x + step - 2, y);
        g.stroke();
      }
    }
  }, [2, 2]);
}

export function dpkDiagTex(): THREE.Texture {
  return getCanvasTexture('dpk_deck_diag', 256, 256, (g, w, h) => {
    g.fillStyle = '#78553e';
    g.fillRect(0, 0, w, h);
    const step = 28;
    g.strokeStyle = 'rgba(0,0,0,0.42)';
    g.lineWidth = 3;
    for (let d = -w; d < w + h; d += step) {
      g.beginPath();
      g.moveTo(d, 0);
      g.lineTo(d + h, h);
      g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 1;
    for (let d = -w; d < w + h; d += step) {
      for (let s = 0; s < h; s += 20) {
        g.beginPath();
        g.moveTo(d + s, s);
        g.lineTo(d + s + step * 0.7, s);
        g.stroke();
      }
    }
  }, [3, 3]);
}

function mStd(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.2,
    ...opts,
  });
}

function beam(
  w: number,
  h: number,
  d: number,
  rotY = 0,
  x = 0,
  y = 0,
  z = 0,
  mat: THREE.Material
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function screwPile(
  x: number,
  z: number,
  depth = 2.5,
  radius = 0.08,
  isBlueprint = false,
  topY = 0.5,
  customCapW?: number
): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const pileMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : mStd(0x334155, { metalness: 0.8, roughness: 0.3 });

  const capMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : mStd(0x1e293b, { metalness: 0.85, roughness: 0.25 });

  const totalH = depth + topY;
  // Pile steel shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, totalH, 20), pileMat);
  shaft.position.y = (topY - depth) / 2;
  shaft.castShadow = true;
  g.add(shaft);

  // Pile blade (лопасть сваи 250-350 мм)
  const bladeRadius = radius * 3.2;
  const blade = new THREE.Mesh(
    new THREE.CylinderGeometry(bladeRadius, bladeRadius, 0.02, 20),
    pileMat
  );
  blade.position.y = -depth + 0.5;
  blade.rotation.x = 0.2;
  g.add(blade);

  // Top plate cap (оголовок сваи)
  const capW = customCapW ?? Math.max(0.18, radius * 3.0);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(capW, 0.03, capW), capMat);
  cap.position.y = topY;
  cap.castShadow = true;
  g.add(cap);

  return g;
}

export function buildGroundBase(size = 14, isBlueprint = false): THREE.Group {
  const g = new THREE.Group();

  if (isBlueprint) {
    const grid = new THREE.GridHelper(size, 28, 0x0284c7, 0x1e3a8a);
    grid.position.y = 0;
    g.add(grid);

    const circle = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, size * 0.48, 0, Math.PI * 2, true).getPoints(64)
      ),
      new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.4 })
    );
    circle.rotation.x = Math.PI / 2;
    g.add(circle);
    return g;
  }

  // Dark graphite ground with subtle blueprint grid
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(size * 0.48, size * 0.48, 0.25, 48),
    new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      roughness: 0.9,
      metalness: 0.1,
    })
  );
  pad.position.y = -0.13;
  pad.receiveShadow = true;
  g.add(pad);

  // Blue engineering rim
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(size * 0.48, 0.02, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.01;
  g.add(ring);

  // Engineering grid
  const gh = new THREE.GridHelper(size, 20, 0x2563eb, 0x1e293b);
  (gh.material as THREE.Material).transparent = true;
  (gh.material as THREE.Material).opacity = 0.25;
  gh.position.y = 0.005;
  g.add(gh);

  return g;
}

/**
 * Procedural House Model with mathematically correct Gable Roof,
 * Rafters, Ridge beam, Both Slopes, Foundation, Posts, and reactive Material/Turnkey modes.
 */
export function buildHouseModel({
  w = 6.0,
  d = 4.5,
  h = 2.6,
  metal = true,
  turnkey = true,
  hasPiles = true,
  isBlueprint = false,
}: {
  w?: number;
  d?: number;
  h?: number;
  metal?: boolean;
  turnkey?: boolean;
  hasPiles?: boolean;
  isBlueprint?: boolean;
}) {
  const g = new THREE.Group();
  const s = metal ? 0.09 : 0.08;

  const frameMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : metal
    ? mStd(C.steel, { map: metalTex(), metalness: 0.65, roughness: 0.35 })
    : mStd(C.wood, { map: woodTex(), roughness: 0.85 });

  const darkMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : metal
    ? mStd(C.steelDark, { metalness: 0.7, roughness: 0.3 })
    : mStd(C.woodDark, { roughness: 0.9 });

  // 1. Foundation: Screw piles if enabled
  if (hasPiles) {
    const px = [-w / 2, 0, w / 2];
    const pz = [-d / 2, 0, d / 2];
    px.forEach((a) => {
      pz.forEach((b) => {
        g.add(screwPile(a, b, 1.4, 0.075, isBlueprint));
      });
    });
  }

  // 2. Foundation steel beam channel (ростверк)
  const baseY = 0.5;
  [-d / 2, d / 2].forEach((z) => g.add(beam(w + s * 2, s * 1.4, s * 1.4, 0, 0, baseY, z, darkMat)));
  [-w / 2, w / 2].forEach((x) => g.add(beam(s * 1.4, s * 1.4, d, 0, x, baseY, 0, darkMat)));
  g.add(beam(w, s * 1.2, s * 1.2, 0, 0, baseY, 0, darkMat));

  // 3. Floor joists and deck
  const floorY = baseY + 0.08;
  for (let i = -2; i <= 2; i++) {
    g.add(beam(w, s * 0.7, s * 0.7, 0, 0, floorY - 0.03, i * (d / 4.6), frameMat));
  }
  const floorMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x1e293b, wireframe: true })
    : metal
    ? mStd(0x475569)
    : mStd(C.woodPlank, { map: woodTex() });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), floorMat);
  floor.position.y = floorY;
  floor.receiveShadow = true;
  g.add(floor);

  // 4. Perimeter Structural Posts
  const posts: [number, number][] = [];
  const stepX = w / 4;
  const stepZ = d / 3;
  for (let i = 0; i <= 4; i++) {
    posts.push([-w / 2 + i * stepX, -d / 2]);
    posts.push([-w / 2 + i * stepX, d / 2]);
  }
  for (let j = 1; j < 3; j++) {
    posts.push([-w / 2, -d / 2 + j * stepZ]);
    posts.push([w / 2, -d / 2 + j * stepZ]);
  }
  posts.forEach(([x, z]) => {
    g.add(beam(s, h, s, 0, x, floorY + h / 2, z, frameMat));
  });

  // 5. Top structural tie beams
  const topY = floorY + h;
  [-d / 2, d / 2].forEach((z) => g.add(beam(w + s * 2, s, s, 0, 0, topY, z, darkMat)));
  [-w / 2, w / 2].forEach((x) => g.add(beam(s, s, d, 0, x, topY, 0, darkMat)));

  // 6. Gable Roof Construction (Стропильная система и двускатная кровля)
  // Конструктивный расчёт: конёк всегда ВЫШЕ карнизов (СП 20 / СП 31-105-2002).
  // Уклон рассчитывается из полупролёта здания (d / 2) и высоты подъёма конька.
  const halfBuildingD = d / 2;
  const roofH = Math.max(1.3, halfBuildingD * 0.55); // нормативная высота подъёма конька
  const ridgeY = topY + roofH;
  const overhangZ = 0.38; // карнизный свес за внешнюю грань стен
  const overhangX = 0.32; // фронтонный свес за торцевые стены

  // Угол наклона ската кровли к горизонту:
  const pitchAngle = Math.atan2(roofH, halfBuildingD);

  // Расчёт реальных геометрических точек кровли:
  // Конёк: Z = 0, Y = ridgeY
  // Мауэрлат / верх стены: Z = halfBuildingD, Y = topY
  // Карнизный свес: Z = halfBuildingD + overhangZ, Y = topY - overhangZ * Math.tan(pitchAngle)
  const eaveY = topY - overhangZ * Math.tan(pitchAngle);

  // Полный вылет ската от конька до карниза по горизонтали (Z) и вертикали (Y):
  const spanZ = halfBuildingD + overhangZ;
  const dropY = ridgeY - eaveY; // перепад высоты от конька до карниза
  const rafterLen = Math.hypot(spanZ, dropY);

  // Геометрический центр (середина) ската:
  const midZ = spanZ / 2;
  const midY = (ridgeY + eaveY) / 2;

  // Стропильные пары вдоль длины здания с шагом ~600-800 мм
  const numRafters = 5;
  const stepRafter = w / (numRafters - 1);
  for (let i = 0; i < numRafters; i++) {
    const rx = -w / 2 + i * stepRafter;

    // Передняя стропильная нога (от конька Z=0 вниз к переднему карнизу Z=+spanZ)
    const rafF = new THREE.Mesh(new THREE.BoxGeometry(s * 0.85, s * 0.85, rafterLen), frameMat);
    rafF.position.set(rx, midY, midZ);
    rafF.rotation.x = pitchAngle;
    rafF.castShadow = true;
    g.add(rafF);

    // Задняя стропильная нога (от конька Z=0 вниз к заднему карнизу Z=-spanZ)
    const rafB = new THREE.Mesh(new THREE.BoxGeometry(s * 0.85, s * 0.85, rafterLen), frameMat);
    rafB.position.set(rx, midY, -midZ);
    rafB.rotation.x = -pitchAngle;
    rafB.castShadow = true;
    g.add(rafB);

    // Горизонтальная затяжка / ригель (исключает распирание стен)
    const tieY = topY + roofH * 0.42;
    const tieHalfSpan = (ridgeY - tieY) / Math.tan(pitchAngle);
    g.add(beam(s * 0.7, s * 0.7, tieHalfSpan * 2, 0, rx, tieY, 0, frameMat));
  }

  // Коньковый прогон (коньковый брус)
  const ridgeBeam = new THREE.Mesh(
    new THREE.BoxGeometry(w + overhangX * 2, 0.12, s),
    darkMat
  );
  ridgeBeam.position.set(0, ridgeY - 0.04, 0);
  ridgeBeam.castShadow = true;
  g.add(ridgeBeam);

  // Карнизные лобовые доски
  const fasciaMat = darkMat;
  const fasciaFront = new THREE.Mesh(
    new THREE.BoxGeometry(w + overhangX * 2, 0.14, 0.03),
    fasciaMat
  );
  fasciaFront.position.set(0, eaveY - 0.02, spanZ);
  g.add(fasciaFront);

  const fasciaRear = new THREE.Mesh(
    new THREE.BoxGeometry(w + overhangX * 2, 0.14, 0.03),
    fasciaMat
  );
  fasciaRear.position.set(0, eaveY - 0.02, -spanZ);
  g.add(fasciaRear);

  // 7. Enclosure: Walls, Roof slopes, Windows, Door if turnkey
  if (turnkey) {
    // Cladding Material
    const wallMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, wireframe: true })
      : metal
      ? mStd(0xdbe4ee, { map: panelTex(), metalness: 0.2, roughness: 0.5 })
      : mStd(0xd7ccc8, { map: woodTex(), roughness: 0.8 });

    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), wallMat);
    backWall.position.set(0, floorY + h / 2, -d / 2);
    backWall.castShadow = true;
    g.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, d), wallMat);
    leftWall.position.set(-w / 2, floorY + h / 2, 0);
    leftWall.castShadow = true;
    g.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, d), wallMat);
    rightWall.position.set(w / 2, floorY + h / 2, 0);
    rightWall.castShadow = true;
    g.add(rightWall);

    // Front wall sections with door and window cutouts
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, h, 0.04), wallMat);
    frontWallLeft.position.set(-w * 0.32, floorY + h / 2, d / 2);
    g.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(w * 0.35, h, 0.04), wallMat);
    frontWallRight.position.set(w * 0.32, floorY + h / 2, d / 2);
    g.add(frontWallRight);

    // Door in center-left
    const doorMat = mStd(0x451a03, { roughness: 0.7 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.05, 0.06), doorMat);
    door.position.set(-0.5, floorY + 1.025, d / 2 + 0.01);
    g.add(door);

    // Windows with glass reflections
    const glassMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.4 })
      : new THREE.MeshStandardMaterial({
          color: 0x1e3a8a,
          roughness: 0.05,
          metalness: 0.85,
          transparent: true,
          opacity: 0.8,
        });

    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.05), glassMat);
    win1.position.set(1.5, floorY + 1.4, d / 2 + 0.01);
    g.add(win1);

    // ROOF SLOPES: BOTH FRONT AND REAR FULLY ALIGNED WITH OVERHANGS
    // Конёк выше карнизов, оба ската сходятся в коньке Z=0, Y=ridgeY
    const roofSheetMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      : mStd(metal ? 0x1e293b : 0x1e3a8a, { metalness: 0.55, roughness: 0.35 });

    const slopeThickness = 0.045;
    const slopeWidth = w + overhangX * 2;
    const slopeDepth = rafterLen + 0.04;

    // Front Roof Slope
    const slopeFront = new THREE.Mesh(
      new THREE.BoxGeometry(slopeWidth, slopeThickness, slopeDepth),
      roofSheetMat
    );
    slopeFront.position.set(0, midY + 0.03, midZ);
    slopeFront.rotation.x = pitchAngle;
    slopeFront.castShadow = true;
    slopeFront.receiveShadow = true;
    g.add(slopeFront);

    // Rear Roof Slope (Matches Front Slope Symmetrically)
    const slopeRear = new THREE.Mesh(
      new THREE.BoxGeometry(slopeWidth, slopeThickness, slopeDepth),
      roofSheetMat
    );
    slopeRear.position.set(0, midY + 0.03, -midZ);
    slopeRear.rotation.x = -pitchAngle;
    slopeRear.castShadow = true;
    slopeRear.receiveShadow = true;
    g.add(slopeRear);

    // Ridge cap (металлический конёк)
    const ridgeCap = new THREE.Mesh(
      new THREE.BoxGeometry(slopeWidth + 0.06, 0.05, 0.32),
      mStd(0x0f172a, { metalness: 0.75, roughness: 0.25 })
    );
    ridgeCap.position.set(0, ridgeY + 0.035, 0);
    g.add(ridgeCap);

    // Gable triangular ends (фронтоны)
    [-w / 2, w / 2].forEach((gx) => {
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-halfBuildingD, 0);
      gableShape.lineTo(halfBuildingD, 0);
      gableShape.lineTo(0, roofH);
      gableShape.closePath();

      const gableGeo = new THREE.ShapeGeometry(gableShape);
      const gableMesh = new THREE.Mesh(gableGeo, wallMat);
      gableMesh.rotation.y = Math.PI / 2;
      gableMesh.position.set(gx, topY, 0);
      gableMesh.castShadow = true;
      gableMesh.receiveShadow = true;
      g.add(gableMesh);
    });
  }

  return g;
}

/**
 * Procedural Pool Model with Hollow Composite Shell, Water, Terrace Deck on Piles,
 * Tech Equipment Room, and Sliding/Fixed Polycarbonate Enclosures.
 */
export function buildPoolModel({
  w = 5.2,
  d = 3.2,
  deck = true,
  pavilion = true,
  pavilionType = 'poly',
  techRoom = false,
  isBlueprint = false,
}: {
  w?: number;
  d?: number;
  deck?: boolean;
  pavilion?: boolean;
  pavilionType?: 'none' | 'poly' | 'slide';
  techRoom?: boolean;
  isBlueprint?: boolean;
}) {
  const g = new THREE.Group();
  const poolDepth = 1.45; // 1.45m depth
  const wallT = 0.08;     // 80mm composite shell wall thickness

  // Elevation hierarchy:
  // Terrace Deck Top: Y = 0.67
  // Pile Caps Top: Y = 0.52 (piles support deck from underneath, never pierce through)
  // Pool Rim (Coping): Y = 0.60 (recessed 7 cm below terrace deck)
  // Water Surface: Y = 0.52 (8 cm below pool rim, 15 cm below deck)
  // Pool Bottom: Y = 0.60 - poolDepth = -0.85
  const poolRimY = 0.60;
  const poolBottomY = poolRimY - poolDepth;
  const deckTopY = 0.67;
  const pileTopY = 0.52;

  // Composite pool shell materials (vibrant cyan gelcoat interior)
  const shellMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : mStd(0x0284c7, { roughness: 0.18, metalness: 0.12 });

  const copingMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : mStd(0xe2e8f0, { roughness: 0.35, metalness: 0.1 });

  // 1. Bottom slab
  const bottom = new THREE.Mesh(
    new THREE.BoxGeometry(w, wallT, d),
    shellMat
  );
  bottom.position.set(0, poolBottomY + wallT / 2, 0);
  bottom.receiveShadow = true;
  g.add(bottom);

  // Pool Walls
  const wallH = poolDepth;
  const wallY = poolBottomY + wallH / 2;

  // Front wall (+Z)
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallT), shellMat);
  frontWall.position.set(0, wallY, d / 2 - wallT / 2);
  frontWall.receiveShadow = true;
  g.add(frontWall);

  // Back wall (-Z)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallT), shellMat);
  backWall.position.set(0, wallY, -d / 2 + wallT / 2);
  backWall.receiveShadow = true;
  g.add(backWall);

  // Left wall (-X)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d - wallT * 2), shellMat);
  leftWall.position.set(-w / 2 + wallT / 2, wallY, 0);
  leftWall.receiveShadow = true;
  g.add(leftWall);

  // Right wall (+X)
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d - wallT * 2), shellMat);
  rightWall.position.set(w / 2 - wallT / 2, wallY, 0);
  rightWall.receiveShadow = true;
  g.add(rightWall);

  // Perimeter Coping Stone (борт чаши на уровне Y = 0.60)
  const rimW = 0.12;
  const rimH = 0.04;
  const rimFB = new THREE.Mesh(new THREE.BoxGeometry(w + rimW * 2, rimH, rimW), copingMat);
  rimFB.position.set(0, poolRimY + rimH / 2, d / 2);
  g.add(rimFB);
  const rimBB = new THREE.Mesh(new THREE.BoxGeometry(w + rimW * 2, rimH, rimW), copingMat);
  rimBB.position.set(0, poolRimY + rimH / 2, -d / 2);
  g.add(rimBB);
  const rimLB = new THREE.Mesh(new THREE.BoxGeometry(rimW, rimH, d), copingMat);
  rimLB.position.set(-w / 2, poolRimY + rimH / 2, 0);
  g.add(rimLB);
  const rimRB = new THREE.Mesh(new THREE.BoxGeometry(rimW, rimH, d), copingMat);
  rimRB.position.set(w / 2, poolRimY + rimH / 2, 0);
  g.add(rimRB);

  // 2. Realistic Water Volume inside hollow basin
  const innerW = w - wallT * 2;
  const innerD = d - wallT * 2;
  const waterSurfaceY = poolRimY - 0.08; // 8 cm below rim
  const waterH = waterSurfaceY - poolBottomY - wallT;

  const waterMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 })
    : new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.04,
        metalness: 0.35,
        transparent: true,
        opacity: 0.84,
      });

  const waterMesh = new THREE.Mesh(
    new THREE.BoxGeometry(innerW, waterH, innerD),
    waterMat
  );
  waterMesh.position.set(0, poolBottomY + wallT + waterH / 2, 0);
  g.add(waterMesh);

  // Underwater pool steps (Римская лестница в торце бассейна)
  const stepMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : mStd(0x38bdf8, { roughness: 0.2 });

  for (let s = 1; s <= 3; s++) {
    const sw = innerW * 0.55;
    const sd = 0.28;
    const sh = 0.28 * s;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, sd), stepMat);
    stepMesh.position.set(0, poolBottomY + wallT + sh / 2, -innerD / 2 + sd * (4 - s) - sd / 2);
    g.add(stepMesh);
  }

  // Stainless steel ladder (Лестница из нержавеющей стали на борту)
  const ssMat = mStd(0xe2e8f0, { metalness: 0.95, roughness: 0.15 });
  const ladderX = innerW / 2 - 0.4;
  const ladderZ = innerD / 2 - 0.1;
  [-0.2, 0.2].forEach((dx) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 12), ssMat);
    rail.position.set(ladderX + dx, poolRimY + 0.35 - 0.45, ladderZ);
    g.add(rail);
  });
  for (let step = 0; step < 3; step++) {
    const rStep = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 12), ssMat);
    rStep.rotation.z = Math.PI / 2;
    rStep.position.set(ladderX, poolRimY + 0.1 - step * 0.28, ladderZ);
    g.add(rStep);
  }

  // 3. Surrounding DPK Terrace resting on screw piles
  if (deck) {
    const deckMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      : mStd(C.woodPlank, { map: dpkTex(), roughness: 0.82 });

    const bw = 1.2; // deck border width around pool
    const deckThick = 0.04;
    const deckY = deckTopY - deckThick / 2; // deck surface at deckTopY (0.67)

    // Four decking platform wings around the pool bowl
    const makeDeckWing = (ww: number, dd: number, x: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ww, deckThick, dd), deckMat);
      m.position.set(x, deckY, z);
      m.receiveShadow = true;
      g.add(m);
    };

    makeDeckWing(w + bw * 2, bw, 0, -d / 2 - bw / 2);
    makeDeckWing(w + bw * 2, bw, 0, d / 2 + bw / 2);
    makeDeckWing(bw, d, -w / 2 - bw / 2, 0);
    makeDeckWing(bw, d, w / 2 + bw / 2, 0);

    // Steel subframe beams under decking (ростверк под настилом, Y = 0.52..0.63)
    const subframeMat = mStd(0x1e293b, { metalness: 0.8, roughness: 0.3 });
    [-d / 2 - bw / 2, d / 2 + bw / 2].forEach((sz) => {
      g.add(beam(w + bw * 2, 0.09, 0.08, 0, 0, pileTopY + 0.045, sz, subframeMat));
    });
    [-w / 2 - bw / 2, w / 2 + bw / 2].forEach((sx) => {
      g.add(beam(0.08, 0.09, d + bw * 2, 0, sx, pileTopY + 0.045, 0, subframeMat));
    });

    // Foundation screw piles: topY = 0.52 (they stop directly under the subframe!)
    const pilesPositions = [
      [-w / 2 - bw + 0.25, -d / 2 - bw + 0.25],
      [w / 2 + bw - 0.25, -d / 2 - bw + 0.25],
      [-w / 2 - bw + 0.25, d / 2 + bw - 0.25],
      [w / 2 + bw - 0.25, d / 2 + bw - 0.25],
      [0, -d / 2 - bw + 0.25],
      [0, d / 2 + bw - 0.25],
      [-w / 2 - bw + 0.25, 0],
      [w / 2 + bw - 0.25, 0],
    ];
    pilesPositions.forEach(([px, pz]) => {
      g.add(screwPile(px, pz, 1.8, 0.06, isBlueprint, pileTopY));
    });
  }

  // 4. Tech Room / Equipment Pavilion (Техпомещение для насоса и фильтрации)
  if (techRoom) {
    const techGroup = new THREE.Group();
    const bw = deck ? 1.2 : 0.4;
    const trW = 1.35;
    const trD = 1.1;
    const trH = 1.15;
    const trX = -w / 2 - bw - trW / 2 + 0.25;
    const trZ = -d / 2 + trD / 2;
    const trY = deck ? deckTopY + trH / 2 : trH / 2;

    const boxMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
      : mStd(0x334155, { metalness: 0.6, roughness: 0.4 });
    const lidMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      : mStd(0x1e293b, { metalness: 0.7, roughness: 0.3 });

    // Enclosure cabinet housing
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(trW, trH, trD), boxMat);
    cabinet.position.set(trX, trY, trZ);
    cabinet.castShadow = true;
    techGroup.add(cabinet);

    // Opening top inspection lid / hatch
    const lid = new THREE.Mesh(new THREE.BoxGeometry(trW + 0.06, 0.05, trD + 0.06), lidMat);
    lid.position.set(trX, trY + trH / 2 + 0.025, trZ);
    techGroup.add(lid);

    // Sand filter tank (Синяя бочка фильтра с вентилем)
    const filterMat = mStd(0x0284c7, { roughness: 0.2, metalness: 0.2 });
    const filterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 16), filterMat);
    filterTank.position.set(trX - 0.25, trY - 0.15, trZ);
    techGroup.add(filterTank);

    // Multiport top valve on filter tank
    const valveMat = mStd(0x111827, { roughness: 0.3 });
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), valveMat);
    valve.position.set(trX - 0.25, trY + 0.22, trZ);
    techGroup.add(valve);

    // Pressure gauge (манометр с белым циферблатом)
    const gaugeMat = mStd(0xffffff, { roughness: 0.1 });
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), gaugeMat);
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(trX - 0.25, trY + 0.32, trZ + 0.08);
    techGroup.add(gauge);

    // Circulation pump (циркуляционный насос)
    const pumpMat = mStd(0x047857, { metalness: 0.5, roughness: 0.3 });
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.38), pumpMat);
    pump.position.set(trX + 0.26, trY - 0.32, trZ);
    techGroup.add(pump);

    // Connecting PVC pipe lines (трубная обвязка ПВХ)
    const pipeMat = mStd(0x94a3b8, { roughness: 0.4 });
    const connPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.52, 12), pipeMat);
    connPipe.rotation.z = Math.PI / 2;
    connPipe.position.set(trX, trY - 0.15, trZ);
    techGroup.add(connPipe);

    g.add(techGroup);
  }

  // 5. Pool Enclosure / Pavilion
  const activePavilion = pavilionType !== 'none';
  if (activePavilion) {
    const archMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({
          color: 0x60a5fa,
          transparent: true,
          opacity: 0.62,
          roughness: 0.12,
          metalness: 0.2,
          side: THREE.DoubleSide,
        });

    const hoopMat = mStd(0x475569, { metalness: 0.9, roughness: 0.2 });
    const railMat = mStd(0x94a3b8, { metalness: 0.92, roughness: 0.18 });
    const baseY = deck ? deckTopY + 0.02 : poolRimY + 0.02;

    if (pavilionType === 'slide') {
      // Telescopic sliding enclosure with ground rails and 3 nested arched segments
      const railLen = w + 2.4;
      const spanRadius = (d + 0.85) / 2;

      // Dual heavy-duty ground rails along both sides of pool
      [-spanRadius, spanRadius].forEach((rz) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.035, 0.07), railMat);
        rail.position.set(0, baseY + 0.017, rz);
        g.add(rail);

        // End track stops
        [-railLen / 2 + 0.05, railLen / 2 - 0.05].forEach((ex) => {
          const stopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.09), hoopMat);
          stopMesh.position.set(ex, baseY + 0.04, rz);
          g.add(stopMesh);
        });
      });

      // 3 Telescopic sliding segments with graduated dimensions fully covering pool length
      const segLen = (w + 0.8) / 2.75;
      const segments = [
        { r: spanRadius - 0.08, wSec: segLen, xOffset: -w / 3.0 },
        { r: spanRadius, wSec: segLen, xOffset: 0 },
        { r: spanRadius + 0.08, wSec: segLen, xOffset: w / 3.0 },
      ];

      segments.forEach((seg, idx) => {
        // Structural arch hoops (front, middle, back of each sliding section)
        [-seg.wSec / 2, 0, seg.wSec / 2].forEach((ax) => {
          const archHoop = new THREE.Mesh(
            new THREE.TorusGeometry(seg.r, 0.035, 10, 36, Math.PI),
            hoopMat
          );
          archHoop.rotation.y = Math.PI / 2;
          archHoop.position.set(seg.xOffset + ax, baseY, 0);
          g.add(archHoop);

          // Roller wheel carriages resting on rails
          [-seg.r, seg.r].forEach((wz) => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 14), hoopMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(seg.xOffset + ax, baseY + 0.025, wz);
            g.add(wheel);
          });
        });

        // Longitudinal stringers / purlins along the arch for realistic rigidity
        [-seg.r * 0.7, 0, seg.r * 0.7].forEach((pz) => {
          const py = Math.sqrt(Math.max(0, seg.r * seg.r - pz * pz));
          const stringer = new THREE.Mesh(new THREE.BoxGeometry(seg.wSec, 0.03, 0.03), hoopMat);
          stringer.position.set(seg.xOffset, baseY + py, pz);
          g.add(stringer);
        });

        // Crystal-clear UV-treated polycarbonate skin for each sliding segment
        const skinGeo = new THREE.CylinderGeometry(
          seg.r,
          seg.r,
          seg.wSec,
          36,
          1,
          true,
          0,
          Math.PI
        );
        const skinMesh = new THREE.Mesh(skinGeo, archMat);
        skinMesh.rotation.z = Math.PI / 2;
        skinMesh.position.set(seg.xOffset, baseY, 0);
        g.add(skinMesh);

        // End glazing wall with entrance door frame on outer sections (first and last)
        if (idx === 0 || idx === segments.length - 1) {
          const endAx = idx === 0 ? -seg.wSec / 2 : seg.wSec / 2;
          const endGeo = new THREE.CircleGeometry(seg.r, 36, 0, Math.PI);
          const endWall = new THREE.Mesh(endGeo, archMat);
          endWall.rotation.y = Math.PI / 2;
          endWall.position.set(seg.xOffset + endAx, baseY, 0);
          g.add(endWall);

          // Door frame on end wall
          const doorW = 0.8;
          const doorH = seg.r * 0.85;
          const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, doorH, doorW), hoopMat);
          doorFrame.position.set(seg.xOffset + endAx, baseY + doorH / 2, 0);
          g.add(doorFrame);
        }
      });
    } else {
      // Fixed arched polycarbonate barrel pavilion
      const archRadius = (d + 1.2) / 2;

      for (let i = -2; i <= 2; i++) {
        const x = (i * w) / 4.4;
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(archRadius, 0.035, 10, 36, Math.PI),
          hoopMat
        );
        hoop.rotation.y = Math.PI / 2;
        hoop.position.set(x, baseY, 0);
        g.add(hoop);
      }

      // Longitudinal roof purlins
      [-archRadius * 0.7, 0, archRadius * 0.7].forEach((pz) => {
        const py = Math.sqrt(Math.max(0, archRadius * archRadius - pz * pz));
        const purlin = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.03, 0.03), hoopMat);
        purlin.position.set(0, baseY + py, pz);
        g.add(purlin);
      });

      const cylinderGeo = new THREE.CylinderGeometry(
        archRadius,
        archRadius,
        w + 0.4,
        36,
        1,
        true,
        0,
        Math.PI
      );
      const cover = new THREE.Mesh(cylinderGeo, archMat);
      cover.rotation.z = Math.PI / 2;
      cover.position.set(0, baseY, 0);
      g.add(cover);
    }
  }

  return g;
}

/**
 * Procedural Terrace Model with Joists, Piles, Boards, Railings, and Steps
 */
export function buildTerraceModel({
  w = 5.5,
  d = 3.6,
  railing = true,
  hasSteps = true,
  stepsCount,
  hasPiles = true,
  deckLayout = 'straight',
  isBlueprint = false,
}: {
  w?: number;
  d?: number;
  railing?: boolean;
  hasSteps?: boolean;
  stepsCount?: number;
  hasPiles?: boolean;
  deckLayout?: 'straight' | 'diag';
  isBlueprint?: boolean;
}) {
  const g = new THREE.Group();
  const pileTopY = 0.50;

  // Foundation screw piles (reactive to hasPiles)
  if (hasPiles) {
    const px = [-w / 2 + 0.35, 0, w / 2 - 0.35];
    const pz = [-d / 2 + 0.35, 0, d / 2 - 0.35];
    px.forEach((x) => {
      pz.forEach((z) => {
        g.add(screwPile(x, z, 1.8, 0.075, isBlueprint, pileTopY));
      });
    });
  }

  // Steel channel subframe (ростверк 120 мм, Y = 0.50..0.58)
  const subMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : mStd(0x1e293b, { metalness: 0.85, roughness: 0.25 });

  [-d / 2, d / 2].forEach((z) => g.add(beam(w, 0.12, 0.08, 0, 0, 0.54, z, subMat)));
  [-w / 2, w / 2].forEach((x) => g.add(beam(0.08, 0.12, d, 0, x, 0.54, 0, subMat)));

  // DPK joists step 380 mm (лаги ДПК)
  const joistMat = mStd(0x334155);
  if (deckLayout === 'diag') {
    // Under diagonal decking, joists are spaced closer (280mm)
    for (let x = -w / 2 + 0.28; x < w / 2; x += 0.28) {
      g.add(beam(0.04, 0.06, d, 0, x, 0.61, 0, joistMat));
    }
  } else {
    for (let x = -w / 2 + 0.38; x < w / 2; x += 0.38) {
      g.add(beam(0.04, 0.06, d, 0, x, 0.61, 0, joistMat));
    }
  }

  // DPK Deck surface (выбор прямой или диагональной раскладки)
  const isDiag = deckLayout === 'diag';
  const deckTexture = isDiag ? dpkDiagTex() : dpkTex();

  const deckMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : mStd(C.woodPlank, { map: deckTexture, roughness: 0.82 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), deckMat);
  deck.position.set(0, 0.66, 0);
  deck.receiveShadow = true;
  g.add(deck);

  // If diagonal, add geometric diagonal plank grooves across deck for crystal-clear visual contrast
  if (isDiag) {
    const seamMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7 })
      : mStd(0x271911, { roughness: 0.95 });
    const step = 0.32;
    const diagHypot = Math.hypot(w, d) * 1.25;
    for (let offset = -w * 1.2; offset <= w * 1.2; offset += step) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, diagHypot), seamMat);
      seam.position.set(offset, 0.684, 0);
      seam.rotation.y = Math.PI / 4;
      g.add(seam);
    }

    // Perimeter framing frieze border around diagonal deck (обвязочная торцевая планка)
    const friezeMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      : mStd(0x452714, { roughness: 0.7 });
    const fW = 0.12;
    g.add(beam(w, 0.042, fW, 0, 0, 0.665, -d / 2 + fW / 2, friezeMat));
    g.add(beam(w, 0.042, fW, 0, 0, 0.665, d / 2 - fW / 2, friezeMat));
    g.add(beam(fW, 0.042, d - fW * 2, 0, -w / 2 + fW / 2, 0.665, 0, friezeMat));
    g.add(beam(fW, 0.042, d - fW * 2, 0, w / 2 - fW / 2, 0.665, 0, friezeMat));
  }

  // Railings: full modular composite WPC balustrade (столбы, перила, балясины с шагом 15см)
  if (railing) {
    const postMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
      : mStd(0x1e293b, { metalness: 0.75, roughness: 0.3 });
    const capMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      : mStd(0x0f172a, { metalness: 0.85, roughness: 0.25 });
    const woodRailMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      : mStd(0x523928, { roughness: 0.7 });

    const deckY = 0.68;
    const postH = 0.92;
    const topHandrailY = deckY + postH;
    const bottomRailY = deckY + 0.12;

    // Helper: add a complete decorative WPC post (100x100mm with pyramid cap)
    const addPost = (px: number, pz: number) => {
      // Main post shaft
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.10, postH, 0.10), postMat);
      shaft.position.set(px, deckY + postH / 2, pz);
      shaft.castShadow = true;
      g.add(shaft);

      // Base collar
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.13), capMat);
      base.position.set(px, deckY + 0.02, pz);
      g.add(base);

      // Pyramid top cap
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 4), capMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(px, deckY + postH + 0.03, pz);
      g.add(cap);
    };

    // Posts at all 4 corners + midpoints
    const postPositions = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [-w / 2, d / 2],
      [w / 2, d / 2],
      [0, -d / 2],
      [-w / 2, 0],
      [w / 2, 0],
    ];
    postPositions.forEach(([px, pz]) => addPost(px, pz));

    // Top molded handrails (поручни 90x45 мм)
    g.add(beam(w, 0.05, 0.09, 0, 0, topHandrailY, -d / 2, woodRailMat));
    g.add(beam(0.09, 0.05, d, 0, -w / 2, topHandrailY, 0, woodRailMat));
    g.add(beam(0.09, 0.05, d, 0, w / 2, topHandrailY, 0, woodRailMat));

    // Front partial return handrails (leaving center clear for steps)
    const frontWingW = (w - 1.8) / 2;
    if (frontWingW > 0.4) {
      g.add(beam(frontWingW, 0.05, 0.09, 0, -w / 2 + frontWingW / 2, topHandrailY, d / 2, woodRailMat));
      g.add(beam(frontWingW, 0.05, 0.09, 0, w / 2 - frontWingW / 2, topHandrailY, d / 2, woodRailMat));
      addPost(-w / 2 + frontWingW, d / 2);
      addPost(w / 2 - frontWingW, d / 2);
    }

    // Bottom subrail beams (нижние ригели)
    g.add(beam(w, 0.04, 0.06, 0, 0, bottomRailY, -d / 2, postMat));
    g.add(beam(0.06, 0.04, d, 0, -w / 2, bottomRailY, 0, postMat));
    g.add(beam(0.06, 0.04, d, 0, w / 2, bottomRailY, 0, postMat));

    // Balusters: vertical square composite spindles (35x35mm) spaced every 15cm
    const balH = topHandrailY - bottomRailY - 0.05;
    const balY = bottomRailY + balH / 2 + 0.025;

    // Back side balusters
    for (let x = -w / 2 + 0.16; x < w / 2 - 0.1; x += 0.15) {
      g.add(beam(0.035, balH, 0.035, 0, x, balY, -d / 2, postMat));
    }
    // Left side balusters (FULL ROW visible in side view!)
    for (let z = -d / 2 + 0.16; z < d / 2 - 0.1; z += 0.15) {
      g.add(beam(0.035, balH, 0.035, 0, -w / 2, balY, z, postMat));
    }
    // Right side balusters (FULL ROW visible in side view!)
    for (let z = -d / 2 + 0.16; z < d / 2 - 0.1; z += 0.15) {
      g.add(beam(0.035, balH, 0.035, 0, w / 2, balY, z, postMat));
    }
  }

  // Steps down to ground level (strictly conditional based on hasSteps and stepsCount)
  const numSteps = stepsCount !== undefined ? stepsCount : hasSteps ? 2 : 0;
  if (numSteps > 0) {
    const stepMat = deckMat;
    const stepDepth = 0.32;
    const stepHeight = 0.60 / (numSteps + 1);

    for (let s = 1; s <= numSteps; s++) {
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, stepHeight, stepDepth),
        stepMat
      );
      const sy = 0.66 - s * stepHeight + stepHeight / 2;
      const sz = d / 2 + s * stepDepth - stepDepth / 2;
      stepMesh.position.set(0, sy, sz);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      g.add(stepMesh);
    }
  }

  return g;
}

/**
 * Procedural Piles Field Model with EXACT Pile Count, reactive diameter, and obvyazka (binding) toggle
 */
export function buildPilesModel({
  count = 20,
  w = 6.0,
  d = 4.5,
  dia = '89',
  hasRostverk = true,
  isBlueprint = false,
}: {
  count?: number;
  w?: number;
  d?: number;
  dia?: '76' | '89' | '108' | '133';
  hasRostverk?: boolean;
  isBlueprint?: boolean;
}) {
  const g = new THREE.Group();

  // Distinct visual scaling for standard pile diameters (76, 89, 108, 133 mm)
  const diaMap: Record<string, { r: number; cap: number }> = {
    '76': { r: 0.048, cap: 0.18 },
    '89': { r: 0.066, cap: 0.22 },
    '108': { r: 0.090, cap: 0.27 },
    '133': { r: 0.122, cap: 0.34 },
  };
  const pileCfg = diaMap[dia || '89'] || diaMap['89'];
  const pileRadius = pileCfg.r;
  const pileCapW = pileCfg.cap;
  const pileTopY = 0.52;

  // Find optimal cols x rows grid that accommodates at least `count` piles
  let bestCols = 4;
  let bestRows = Math.ceil(count / 4);
  let minDiff = Infinity;

  for (let c = 2; c <= Math.min(count, 12); c++) {
    const r = Math.ceil(count / c);
    const gridCapacity = c * r;
    const aspectGrid = (c * w) / (r * d);
    const diff = (gridCapacity - count) * 2 + Math.abs(Math.log(aspectGrid || 1));
    if (gridCapacity >= count && diff < minDiff) {
      minDiff = diff;
      bestCols = c;
      bestRows = r;
    }
  }

  const cols = bestCols;
  const rows = bestRows;
  const dx = w / (cols - 1 || 1);
  const dz = d / (rows - 1 || 1);

  // Generate exact requested pile count with custom pile radius and cap
  let placed = 0;
  for (let j = 0; j < rows && placed < count; j++) {
    for (let i = 0; i < cols && placed < count; i++) {
      const x = -w / 2 + i * dx;
      const z = -d / 2 + j * dz;
      g.add(screwPile(x, z, 2.5, pileRadius, isBlueprint, pileTopY, pileCapW));
      placed++;
    }
  }

  // Steel channel binding (Обвязка швеллером 140 по лазерному горизонту)
  if (hasRostverk) {
    const roasterMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
      : mStd(0x1e293b, { metalness: 0.85, roughness: 0.25 });

    for (let i = 0; i < cols; i++) {
      const x = -w / 2 + i * dx;
      g.add(beam(0.08, 0.12, d, 0, x, pileTopY + 0.06, 0, roasterMat));
    }
    for (let j = 0; j < rows; j++) {
      const z = -d / 2 + j * dz;
      g.add(beam(w, 0.12, 0.08, 0, 0, pileTopY + 0.06, z, roasterMat));
    }
  }

  return g;
}

/**
 * Procedural Engineering Networks Model:
 * Transparent ground sides showing trench boundaries, sand bedding,
 * Sewer & Water pipes with laser slope, inspection wells, heating network with chambers,
 * and stormwater drainage with cast-iron grates.
 */
export function buildNetworksModel({
  type = 'both',
  depth = 1.7,
  hasWells = true,
  wellsCount = 2,
  hasHeating = false,
  heatingChambersCount = 1,
  hasStorm = false,
  stormInletsCount = 2,
  isBlueprint = false,
}: {
  type?: 'water' | 'sewer' | 'both' | 'k1' | 'heating' | 'storm';
  depth?: number;
  hasWells?: boolean;
  wellsCount?: number;
  hasHeating?: boolean;
  heatingChambersCount?: number;
  hasStorm?: boolean;
  stormInletsCount?: number;
  isBlueprint?: boolean;
}) {
  const g = new THREE.Group();
  const len = 7.5;

  // Slope calculation: 2 cm per meter for sewer pipe = 15 cm drop over 7.5m
  const drop = 0.02 * len;
  const slopeAngle = Math.atan2(drop, len);

  const isDedicatedHeating = type === 'heating';
  const isDedicatedStorm = type === 'storm';
  const showSewer = type === 'both' || type === 'k1' || type === 'sewer';
  const showWater = type === 'both' || type === 'water';
  const showHeating = isDedicatedHeating || hasHeating;
  const showStorm = isDedicatedStorm || hasStorm;

  // 1. Transparent Ground / Trench Boundaries (прозрачная земля для видимости траншеи)
  const groundMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.9,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      });

  const trenchEdgeMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    linewidth: 2,
  });

  // Left soil embankment
  const leftSide = new THREE.Mesh(new THREE.BoxGeometry(1.8, depth, len), groundMat);
  leftSide.position.set(-1.6, -depth / 2, 0);
  g.add(leftSide);

  // Right soil embankment
  const rightSide = new THREE.Mesh(new THREE.BoxGeometry(1.8, depth, len), groundMat);
  rightSide.position.set(1.6, -depth / 2, 0);
  g.add(rightSide);

  // High-contrast trench boundary lines (бровки траншеи)
  [-0.7, 0.7].forEach((bx) => {
    const edgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(bx, 0.02, -len / 2),
      new THREE.Vector3(bx, 0.02, len / 2),
    ]);
    g.add(new THREE.Line(edgeGeo, trenchEdgeMat));

    const bottomEdgeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(bx * 0.75, -depth + 0.02, -len / 2),
      new THREE.Vector3(bx * 0.75, -depth + 0.02, len / 2),
    ]);
    const bottomLineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
    g.add(new THREE.Line(bottomEdgeGeo, bottomLineMat));
  });

  // 2. Sand bedding (песчаная подушка 150 мм на дне траншеи)
  const sandMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : mStd(0xd4a373, { roughness: 0.88 });

  const sand = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.15, len), sandMat);
  sand.position.set(0, -depth + 0.075, 0);
  sand.receiveShadow = true;
  g.add(sand);

  // 3. Sewer Pipe (Рыжая труба SN4 Ø110 с уклоном 2 см/м)
  if (showSewer) {
    const sewerMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0xf97316, wireframe: true })
      : mStd(C.pipeOrange, { metalness: 0.25, roughness: 0.35 });

    const sewerPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, len, 24),
      sewerMat
    );
    sewerPipe.rotation.x = Math.PI / 2 + slopeAngle;
    const sewerX = showWater ? 0.22 : 0;
    sewerPipe.position.set(sewerX, -depth + 0.22, 0);
    sewerPipe.castShadow = true;
    g.add(sewerPipe);

    // Laser alignment ray (лазерный луч контроля уклона 2 см/м)
    const laserMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(sewerX, -depth + 0.30, -len / 2),
      new THREE.Vector3(sewerX, -depth + 0.30 - drop, len / 2),
    ]);
    g.add(new THREE.Line(laserGeo, laserMat));
  }

  // 4. Water Pipe (Синяя питьевая труба ПНД Ø32 мм)
  if (showWater) {
    const waterPipeMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
      : mStd(C.pipeBlue, { metalness: 0.2, roughness: 0.3 });

    const waterPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, len, 24),
      waterPipeMat
    );
    waterPipe.rotation.x = Math.PI / 2;
    const waterX = showSewer ? -0.22 : 0;
    waterPipe.position.set(waterX, -depth + 0.26, 0);
    waterPipe.castShadow = true;
    g.add(waterPipe);
  }

  // 5. Inspection Wells / Chambers (Смотровые колодцы КС 10-9 с люком)
  if (hasWells && wellsCount > 0 && !isDedicatedHeating && !isDedicatedStorm) {
    const wellMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true })
      : mStd(0x64748b, { roughness: 0.85 });
    const coverMat = mStd(0x0f172a, { metalness: 0.9, roughness: 0.2 });

    const effectiveWells = Math.min(wellsCount, 3);
    const zPositions = effectiveWells === 1 ? [0] : [-len / 3, len / 3];

    zPositions.forEach((wz) => {
      // Concrete well shaft from trench bottom to surface
      const wellH = depth + 0.05;
      const well = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, wellH, 20),
        wellMat
      );
      const wellX = showWater && showSewer ? 0.22 : 0;
      well.position.set(wellX, -depth + wellH / 2, wz);
      g.add(well);

      // Cast-iron lid / rim at ground level
      const cover = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.06, 20),
        coverMat
      );
      cover.position.set(wellX, 0.03, wz);
      g.add(cover);
    });
  }

  // 6. Heating Network (Теплосеть: двойная предизолированная ППУ труба + тепловые камеры)
  if (showHeating) {
    const heatPipeMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0xeab308, wireframe: true })
      : mStd(0xfacc15, { metalness: 0.3, roughness: 0.4 }); // Yellow casing

    // Supply & return twin heating pipes
    const heatXOffsets = isDedicatedHeating ? [-0.08, 0.08] : [-0.42, -0.54];
    heatXOffsets.forEach((hx) => {
      const hPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, len, 20),
        heatPipeMat
      );
      hPipe.rotation.x = Math.PI / 2;
      hPipe.position.set(hx, -depth + 0.45, 0);
      g.add(hPipe);
    });

    // Heating Chambers (Тепловые камеры УТ)
    if (heatingChambersCount > 0) {
      const chamberMat = mStd(0x475569, { roughness: 0.8 });
      const hatchMat = mStd(0x1e293b, { metalness: 0.9, roughness: 0.2 });

      const chW = 0.85;
      const chD = 0.85;
      const chH = depth + 0.04;
      const chamberX = isDedicatedHeating ? 0 : -0.48;
      const chamber = new THREE.Mesh(new THREE.BoxGeometry(chW, chH, chD), chamberMat);
      chamber.position.set(chamberX, -depth + chH / 2, -len / 4);
      g.add(chamber);

      const chHatch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), hatchMat);
      chHatch.position.set(chamberX, 0.03, -len / 4);
      g.add(chHatch);
    }
  }

  // 7. Stormwater Drainage (Ливневая / дождевая канализация + дождеприемники с решеткой)
  if (showStorm) {
    const stormPipeMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true })
      : mStd(0x1e293b, { roughness: 0.6 }); // Black corrugated pipe

    const stormPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, len, 20),
      stormPipeMat
    );
    stormPipe.rotation.x = Math.PI / 2 + slopeAngle * 0.8;
    const stormX = isDedicatedStorm ? 0 : 0.50;
    stormPipe.position.set(stormX, -depth + 0.40, 0);
    g.add(stormPipe);

    // Storm Inlets (Дождеприемные колодцы с чугунной решеткой)
    if (stormInletsCount > 0) {
      const inletMat = mStd(0x334155, { roughness: 0.7 });
      const grateMat = mStd(0x0f172a, { metalness: 0.95, roughness: 0.15 });

      const inletPositions = [-len / 3.5, len / 3.5];
      inletPositions.forEach((iz) => {
        const inlet = new THREE.Mesh(new THREE.BoxGeometry(0.48, depth + 0.02, 0.48), inletMat);
        inlet.position.set(stormX, -depth + (depth + 0.02) / 2, iz);
        g.add(inlet);

        // Slotted drainage grate at ground level
        const grate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.52), grateMat);
        grate.position.set(stormX, 0.02, iz);
        g.add(grate);

        // Grate slots lines
        for (let s = -0.18; s <= 0.18; s += 0.06) {
          const slot = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.01, 0.42), mStd(0x000000));
          slot.position.set(stormX + s, 0.042, iz);
          g.add(slot);
        }
      });
    }
  }

  return g;
}

/**
 * Procedural Interior / Finish 3D View Model
 * Shows the internal room cutaway with walls, flooring, underfloor heating, and electrical wiring.
 */
export function buildInteriorModel({
  finishLevel = 'full',
  hasFloor = true,
  hasWarmFloor = true,
  hasElectric = true,
  isBlueprint = false,
}: {
  finishLevel?: 'base' | 'full';
  hasFloor?: boolean;
  hasWarmFloor?: boolean;
  hasElectric?: boolean;
  isBlueprint?: boolean;
}) {
  const g = new THREE.Group();
  const roomW = 5.2;
  const roomD = 3.8;
  const roomH = 2.7;
  const wallT = 0.15;
  const isFull = finishLevel === 'full';

  // 1. Structural Concrete Floor Slab
  const slabMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
    : mStd(0x334155, { roughness: 0.9 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.20, roomD), slabMat);
  slab.position.set(0, -0.10, 0);
  slab.receiveShadow = true;
  g.add(slab);

  // 2. Walls (Back, Left, Right - Front open for clear interior camera view)
  const wallMat = isBlueprint
    ? new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
    : isFull
    ? mStd(0xf8fafc, { roughness: 0.65 }) // Clean off-white finish paint
    : mStd(0xcbd5e1, { roughness: 0.95 }); // Base grey plaster / gypsum drywall

  // Back wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, wallT), wallMat);
  backWall.position.set(0, roomH / 2, -roomD / 2 - wallT / 2);
  backWall.receiveShadow = true;
  g.add(backWall);

  // Left wall with panoramic window opening
  const leftWallBottom = new THREE.Mesh(new THREE.BoxGeometry(wallT, 0.85, roomD), wallMat);
  leftWallBottom.position.set(-roomW / 2 - wallT / 2, 0.425, 0);
  g.add(leftWallBottom);

  const leftWallTop = new THREE.Mesh(new THREE.BoxGeometry(wallT, 0.45, roomD), wallMat);
  leftWallTop.position.set(-roomW / 2 - wallT / 2, roomH - 0.225, 0);
  g.add(leftWallTop);

  // Window frame & double glazing on left wall
  const winFrameMat = mStd(0x0f172a, { metalness: 0.8, roughness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
  });
  const windowH = roomH - 0.85 - 0.45;
  const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, windowH, roomD * 0.75), glassMat);
  winGlass.position.set(-roomW / 2 - wallT / 2, 0.85 + windowH / 2, 0);
  g.add(winGlass);

  // Right wall with interior doorway
  const rightWallBack = new THREE.Mesh(new THREE.BoxGeometry(wallT, roomH, roomD * 0.45), wallMat);
  rightWallBack.position.set(roomW / 2 + wallT / 2, roomH / 2, -roomD * 0.275);
  g.add(rightWallBack);

  const rightWallFront = new THREE.Mesh(new THREE.BoxGeometry(wallT, roomH, roomD * 0.25), wallMat);
  rightWallFront.position.set(roomW / 2 + wallT / 2, roomH / 2, roomD * 0.375);
  g.add(rightWallFront);

  const rightWallLintel = new THREE.Mesh(new THREE.BoxGeometry(wallT, roomH - 2.1, roomD * 0.3), wallMat);
  rightWallLintel.position.set(roomW / 2 + wallT / 2, 2.1 + (roomH - 2.1) / 2, 0.1);
  g.add(rightWallLintel);

  // 3. Interior Door
  if (isFull) {
    const doorMat = mStd(0x78350f, { roughness: 0.5 }); // Contemporary oak door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.08, roomD * 0.28), doorMat);
    door.position.set(roomW / 2 + wallT / 2, 1.04, 0.1);
    g.add(door);

    // Chrome handle
    const handleMat = mStd(0xe2e8f0, { metalness: 0.95, roughness: 0.1 });
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.03), handleMat);
    handle.position.set(roomW / 2 + wallT / 2 - 0.04, 1.0, 0.2);
    g.add(handle);
  }

  // 4. Accent Wall in Turnkey Full Finish (деревянные рейки на акцентной стене)
  if (isFull && !isBlueprint) {
    const slatMat = mStd(0xb45309, { roughness: 0.65 });
    for (let x = -roomW / 2 + 0.3; x < -roomW / 2 + 2.1; x += 0.08) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, roomH, 0.025), slatMat);
      slat.position.set(x, roomH / 2, -roomD / 2 + 0.015);
      g.add(slat);
    }

    // Modern baseboards (плинтус 80 мм)
    const baseboardMat = mStd(0x1e293b, { roughness: 0.4 });
    g.add(beam(roomW, 0.08, 0.02, 0, 0, 0.04, -roomD / 2 + 0.01, baseboardMat));
  }

  // 5. Underfloor Heating (Монтаж теплого пола: змеевик PEX + коллекторный шкаф)
  if (hasWarmFloor) {
    const pexMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true })
      : mStd(0xef4444, { metalness: 0.15, roughness: 0.3 }); // Red PEX pipe

    // Underfloor heating pipe loops
    const stepZ = 0.22;
    for (let z = -roomD / 2 + 0.35; z <= roomD / 2 - 0.35; z += stepZ) {
      const pipeRun = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, roomW - 0.8, 12),
        pexMat
      );
      pipeRun.rotation.z = Math.PI / 2;
      pipeRun.position.set(0, 0.03, z);
      g.add(pipeRun);
    }

    // Wall-mounted heating manifold collector (коллекторная группа с расходомерами)
    const manifoldGroup = new THREE.Group();
    const manifoldBoxMat = mStd(0xffffff, { roughness: 0.3 });
    const mCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.14), manifoldBoxMat);
    mCabinet.position.set(roomW / 2 - 0.35, 0.55, -roomD / 2 + 0.08);
    manifoldGroup.add(mCabinet);

    const brassMat = mStd(0xd97706, { metalness: 0.85, roughness: 0.2 });
    [-0.1, 0.1].forEach((my) => {
      const brassPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 12), brassMat);
      brassPipe.rotation.z = Math.PI / 2;
      brassPipe.position.set(roomW / 2 - 0.35, 0.55 + my, -roomD / 2 + 0.08);
      manifoldGroup.add(brassPipe);
    });
    g.add(manifoldGroup);
  }

  // 6. Flooring (Монтаж чистового покрытия или стяжки)
  if (hasFloor) {
    const floorY = hasWarmFloor ? 0.055 : 0.03;
    const floorThick = 0.025;
    // Layered cutaway: when both warm floor and finished floor are active,
    // rear 60% shows the floor finish, while front 40% reveals the heating coils and insulation!
    const isCutaway = hasWarmFloor;
    const activeD = isCutaway ? roomD * 0.60 : roomD;
    const centerZ = isCutaway ? -roomD / 2 + activeD / 2 : 0;

    const floorMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: isFull ? 0x38bdf8 : 0x94a3b8, wireframe: true })
      : isFull
      ? mStd(C.woodPlank, { map: dpkTex(), roughness: 0.5 })
      : mStd(0x94a3b8, { roughness: 0.95 });

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(roomW, floorThick, activeD),
      floorMat
    );
    floorMesh.position.set(0, floorY + floorThick / 2, centerZ);
    floorMesh.receiveShadow = true;
    g.add(floorMesh);

    // If cutaway, add an anodized metal transition edge profile
    if (isCutaway) {
      const edgeMat = mStd(0x1e293b, { metalness: 0.85, roughness: 0.25 });
      const edge = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.028, 0.04), edgeMat);
      edge.position.set(0, floorY + 0.014, -roomD / 2 + activeD);
      g.add(edge);
    }
  }

  // 7. Electrical Wiring & Distribution Panel (Разводка электрики, щит, розетки, выключатели)
  if (hasElectric) {
    const panelGroup = new THREE.Group();
    // Distribution electrical board (щит с автоматами на стене)
    const panelBoxMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      : mStd(0x1e293b, { metalness: 0.7, roughness: 0.3 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.08), panelBoxMat);
    panel.position.set(-roomW / 2 + 0.8, 1.55, -roomD / 2 + 0.04);
    panelGroup.add(panel);

    // Rows of DIN circuit breakers (модульные автоматы)
    const breakerMat = mStd(0xf1f5f9, { roughness: 0.2 });
    [-0.1, 0.1].forEach((by) => {
      const breakerRow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.04), breakerMat);
      breakerRow.position.set(-roomW / 2 + 0.8, 1.55 + by, -roomD / 2 + 0.07);
      panelGroup.add(breakerRow);
    });

    // Electrical cable conduit run along top wall
    const conduitMat = isBlueprint
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      : mStd(0x64748b, { roughness: 0.5 });
    const conduit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, roomW - 0.4, 12),
      conduitMat
    );
    conduit.rotation.z = Math.PI / 2;
    conduit.position.set(0, roomH - 0.18, -roomD / 2 + 0.025);
    panelGroup.add(conduit);

    // Wall Switches at 90cm
    const switchMat = mStd(0xffffff, { roughness: 0.15 });
    const lightSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), switchMat);
    lightSwitch.position.set(roomW / 2 - 0.1, 0.92, -roomD / 2 + 0.02);
    panelGroup.add(lightSwitch);

    // Double Sockets at 30cm
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.02), switchMat);
    socket.position.set(0, 0.32, -roomD / 2 + 0.02);
    panelGroup.add(socket);

    // Ceiling spotlights / track lights
    const spotMat = mStd(0x0f172a, { metalness: 0.9, roughness: 0.2 });
    const spotPositions = [
      [-1.2, -0.6],
      [1.2, -0.6],
      [-1.2, 0.6],
      [1.2, 0.6],
    ];
    spotPositions.forEach(([sx, sz]) => {
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), spotMat);
      spot.position.set(sx, roomH - 0.02, sz);
      panelGroup.add(spot);
    });

    g.add(panelGroup);

    // Soft warm interior illumination point light
    const interiorLight = new THREE.PointLight(0xffedd5, 1.2, 8);
    interiorLight.position.set(0, roomH - 0.3, 0);
    g.add(interiorLight);
  }

  return g;
}

export interface HotspotItem {
  id: string;
  title: string;
  spec: string;
  position: [number, number, number];
}

export const HERO_HOTSPOTS: HotspotItem[] = [
  {
    id: 'hs-piles',
    title: 'ФУНДАМЕНТ // СВАЙНОЕ ПОЛЕ',
    spec: 'Винтовые сваи Ø89×3000 мм · Литая лопасть 250 мм · Заполнение ствола М300 · Заглубление 2.5 м (ниже промерзания 1.45 м)',
    position: [0, 0.45, 2.2],
  },
  {
    id: 'hs-frame',
    title: 'НЕСУЩИЙ КАРКАС // СП 20',
    spec: 'Профильная труба 100×50×4 мм или сухой строганный брус 150×50 (влажность 12%) · Сварные узлы 09Г2С',
    position: [-2.2, 1.8, 0],
  },
  {
    id: 'hs-roof',
    title: 'СТРОПИЛЬНАЯ СИСТЕМА И КРОВЛЯ',
    spec: 'Расчёт на IV снеговой район ЯО (2.0 кПа) · Металлочерепица 0.5 мм Grand Line · Диффузионная мембрана 130 г/м²',
    position: [0, 3.8, 0],
  },
  {
    id: 'hs-terrace',
    title: 'ТЕРРАСА ИЗ ДПК И ОБВЯЗКА',
    spec: 'Полнотелая доска ДПК 160×25 · Шаг лаг 380 мм · Нержавеющие кляймеры AISI 304 · Дренажная щебёночная подушка',
    position: [2.2, 0.65, 1.8],
  },
];
