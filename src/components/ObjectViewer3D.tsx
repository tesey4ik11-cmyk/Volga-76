import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  buildGroundBase,
  buildHouseModel,
  buildPoolModel,
  buildTerraceModel,
  buildPilesModel,
  buildNetworksModel,
  buildInteriorModel,
  disposeHierarchy,
  HERO_HOTSPOTS,
  HotspotItem,
} from '../lib/scene3dCore';
import { ServiceCategory } from '../types';
import { RotateCcw, Box, Compass, Layers, Smartphone, MoveHorizontal, ZoomIn } from 'lucide-react';

export interface Dynamic3DOptions {
  category?: ServiceCategory;
  metal?: boolean;
  turnkey?: boolean;
  w?: number;
  d?: number;
  h?: number;
  hasPiles?: boolean;
  railing?: boolean;
  pavilion?: boolean;
  deck?: boolean;
  pilesCount?: number;
  networkType?: 'water' | 'sewer' | 'both' | 'k1' | 'heating' | 'storm';
  poolPavilion?: 'none' | 'poly' | 'slide';
  techRoom?: boolean;
  deckLayout?: 'straight' | 'diag';
  hasSteps?: boolean;
  stepsCount?: number;
  depth?: number;
  pileDia?: '76' | '89' | '108' | '133';
  hasRostverk?: boolean;
  hasWells?: boolean;
  wellsCount?: number;
  hasHeating?: boolean;
  heatingChambersCount?: number;
  hasStorm?: boolean;
  stormInletsCount?: number;
  finishLevel?: 'base' | 'full';
  finishFloor?: boolean;
  finishWarm?: boolean;
  finishElectric?: boolean;
}

interface ObjectViewer3DProps {
  category?: ServiceCategory;
  options?: Dynamic3DOptions;
  showHotspots?: boolean;
  interactive?: boolean;
  className?: string;
  autoRotateSpeed?: number;
  height?: string;
}

export const ObjectViewer3D: React.FC<ObjectViewer3DProps> = ({
  category = 'house',
  options,
  showHotspots = true,
  interactive = true,
  className = '',
  autoRotateSpeed = 0.35,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const groundGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Orbit state
  const isDraggingRef = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ theta: 0.65, phi: 1.15, radius: 10.5 });
  const targetLookAt = useRef(new THREE.Vector3(0, 0.9, 0));

  // User interaction timer to resume gentle auto-rotation after 2.5s
  const userInteractedAtRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);

  // Touch gesture classification refs
  const touchStateRef = useRef<{
    status: 'idle' | 'deciding' | 'horizontal_orbit' | 'vertical_scroll' | 'pinch_zoom';
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    initialDistance: number;
    initialRadius: number;
  }>({
    status: 'idle',
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    initialDistance: 0,
    initialRadius: 10.5,
  });

  // Mobile mode: 'scroll' (Обзор: свайпы скроллят) vs 'rotate' (Вращение: свайпы вращают)
  const [mobileMode, setMobileMode] = useState<'scroll' | 'rotate'>('scroll');
  const [showMobileHint, setShowMobileHint] = useState<boolean>(true);
  const [hintDismissed, setHintDismissed] = useState<boolean>(false);

  const [isBlueprint, setIsBlueprint] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<HotspotItem | null>(null);
  const [screenHotspots, setScreenHotspots] = useState<{ item: HotspotItem; x: number; y: number; visible: boolean }[]>([]);
  const [webglError, setWebglError] = useState(false);
  const [viewAngle, setViewAngle] = useState<'iso' | 'front' | 'top'>('iso');

  // Active serialized key to guarantee reactive re-renders whenever ANY option changes
  const optionsKey = JSON.stringify({ category, ...options });

  // Rebuild model inside scene reactively
  const updateSceneModel = useCallback((blueprint: boolean) => {
    if (!sceneRef.current || !modelGroupRef.current || !groundGroupRef.current) return;

    const opts: Dynamic3DOptions = options || {};
    const currentCategory = opts.category || category;
    const isMetal = opts.metal ?? true;
    const isTurnkey = opts.turnkey ?? true;
    const objW = opts.w ?? (currentCategory === 'house' ? 6.0 : currentCategory === 'pool' ? 5.0 : 5.5);
    const objD = opts.d ?? (currentCategory === 'house' ? 4.5 : currentCategory === 'pool' ? 3.2 : 3.6);
    const objH = opts.h ?? 2.6;
    const hasPiles = opts.hasPiles ?? true;
    const railing = opts.railing ?? true;
    const pavilion = opts.pavilion ?? true;
    const deck = opts.deck ?? true;
    const pilesCount = opts.pilesCount ?? 24;
    const networkType = opts.networkType ?? 'both';

    // Clear and dispose old model to prevent WebGL memory leaks
    while (modelGroupRef.current.children.length > 0) {
      const obj = modelGroupRef.current.children[0];
      disposeHierarchy(obj);
      modelGroupRef.current.remove(obj);
    }
    while (groundGroupRef.current.children.length > 0) {
      const obj = groundGroupRef.current.children[0];
      disposeHierarchy(obj);
      groundGroupRef.current.remove(obj);
    }

    // Ground base
    groundGroupRef.current.add(buildGroundBase(14, blueprint));

    // Build specific procedural model according to active options
    let newModel: THREE.Group;
    switch (currentCategory) {
      case 'house':
        newModel = buildHouseModel({
          w: objW,
          d: objD,
          h: objH,
          metal: isMetal,
          turnkey: isTurnkey,
          hasPiles,
          isBlueprint: blueprint,
        });
        break;
      case 'pool':
        newModel = buildPoolModel({
          w: objW,
          d: objD,
          deck,
          pavilion,
          pavilionType: opts.poolPavilion ?? (pavilion ? 'poly' : 'none'),
          techRoom: opts.techRoom ?? false,
          isBlueprint: blueprint,
        });
        break;
      case 'deck':
        newModel = buildTerraceModel({
          w: objW,
          d: objD,
          railing,
          hasSteps: opts.hasSteps ?? true,
          stepsCount: opts.stepsCount,
          hasPiles,
          deckLayout: opts.deckLayout ?? 'straight',
          isBlueprint: blueprint,
        });
        break;
      case 'pile':
        newModel = buildPilesModel({
          count: pilesCount,
          w: objW,
          d: objD,
          dia: opts.pileDia ?? '89',
          hasRostverk: opts.hasRostverk ?? true,
          isBlueprint: blueprint,
        });
        break;
      case 'net':
        newModel = buildNetworksModel({
          type: networkType,
          depth: opts.depth ?? (opts.h ?? 1.7),
          hasWells: opts.hasWells ?? true,
          wellsCount: opts.wellsCount ?? 2,
          hasHeating: opts.hasHeating ?? (networkType === 'heating'),
          heatingChambersCount: opts.heatingChambersCount ?? 1,
          hasStorm: opts.hasStorm ?? (networkType === 'storm'),
          stormInletsCount: opts.stormInletsCount ?? 2,
          isBlueprint: blueprint,
        });
        break;
      case 'finish':
        newModel = buildInteriorModel({
          finishLevel: opts.finishLevel ?? 'full',
          hasFloor: opts.finishFloor ?? true,
          hasWarmFloor: opts.finishWarm ?? false,
          hasElectric: opts.finishElectric ?? true,
          isBlueprint: blueprint,
        });
        break;
      default:
        newModel = buildHouseModel({
          w: objW,
          d: objD,
          h: objH,
          metal: isMetal,
          turnkey: isTurnkey,
          hasPiles,
          isBlueprint: blueprint,
        });
    }
    modelGroupRef.current.add(newModel);

    // Part 11: Camera Auto-fitting based on actual model bounds
    const box = new THREE.Box3().setFromObject(newModel);
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Set target look-at to model center with slight elevation
      targetLookAt.current.set(center.x, Math.max(0.5, center.y), center.z);

      // Calculate camera radius to comfortably fit model with 25-30% padding
      const maxDim = Math.max(size.x, size.y * 1.2, size.z);
      const fovRad = (cameraRef.current ? cameraRef.current.fov : 40) * (Math.PI / 180);
      let cameraDistance = (maxDim / 2) / Math.tan(fovRad / 2);
      // Add 25% safety margin
      cameraDistance *= 1.25;
      // Clamp to engineering limits
      cameraDistance = Math.max(7.5, Math.min(22.0, cameraDistance));
      sphericalRef.current.radius = cameraDistance;
    }
  }, [optionsKey, category, options]);

  // Update hotspot 2D positions on screen
  const updateHotspotPositions = useCallback(() => {
    if (!cameraRef.current || !containerRef.current || !showHotspots) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    if (width === 0 || height === 0) return;

    const coords = HERO_HOTSPOTS.map((hs) => {
      const v = new THREE.Vector3(...hs.position);
      v.project(cameraRef.current!);
      const visible = v.z < 1.0;
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-(v.y * 0.5) + 0.5) * height;
      return { item: hs, x, y, visible };
    });
    setScreenHotspots(coords);
  }, [showHotspots]);

  // Initial Three.js setup
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(isBlueprint ? 0x050b14 : 0x080c14);
      sceneRef.current = scene;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;

      // Lights
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.25);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xfff5ea, 1.5);
      dirLight.position.set(10, 16, 12);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 35;
      dirLight.shadow.camera.left = -8;
      dirLight.shadow.camera.right = 8;
      dirLight.shadow.camera.top = 8;
      dirLight.shadow.camera.bottom = -8;
      scene.add(dirLight);

      const blueAccent = new THREE.DirectionalLight(0x2563eb, 0.85);
      blueAccent.position.set(-10, 8, -10);
      scene.add(blueAccent);

      // Groups
      const groundGroup = new THREE.Group();
      const modelGroup = new THREE.Group();
      scene.add(groundGroup);
      scene.add(modelGroup);
      groundGroupRef.current = groundGroup;
      modelGroupRef.current = modelGroup;

      updateSceneModel(isBlueprint);

      // Animation loop: gentle auto-rotation when user is not interacting
      let lastTime = performance.now();
      const animate = (time: number) => {
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        const timeSinceUser = time - userInteractedAtRef.current;
        // Resume gentle auto-rotation after 2.5 seconds of inactivity
        const shouldAutoRotate = !isInteractingRef.current && !isDraggingRef.current && timeSinceUser > 2500 && autoRotateSpeed > 0;

        if (shouldAutoRotate) {
          sphericalRef.current.theta += autoRotateSpeed * delta * 0.45;
        }

        const { theta, phi, radius } = sphericalRef.current;
        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(targetLookAt.current);

        renderer.render(scene, camera);
        updateHotspotPositions();

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);

      // ResizeObserver
      const ro = new ResizeObserver((entries) => {
        if (!entries[0] || !cameraRef.current || !rendererRef.current) return;
        const { width: nw, height: nh } = entries[0].contentRect;
        if (nw === 0 || nh === 0) return;
        cameraRef.current.aspect = nw / nh;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(nw, nh);
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        renderer.dispose();
      };
    } catch (err) {
      console.error('WebGL initialization error:', err);
      setWebglError(true);
    }
  }, [updateSceneModel, updateHotspotPositions, autoRotateSpeed, isBlueprint]);

  // Handle options or blueprint changes reactively
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(isBlueprint ? 0x030712 : 0x080c14);
    }
    updateSceneModel(isBlueprint);
  }, [updateSceneModel, isBlueprint]);

  // Auto-hide mobile hint after 4 seconds
  useEffect(() => {
    if (!showMobileHint) return;
    const timer = setTimeout(() => {
      setShowMobileHint(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [showMobileHint]);

  // Desktop Mouse handlers for orbit
  const onMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    isInteractingRef.current = true;
    userInteractedAtRef.current = performance.now();
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !interactive) return;
    userInteractedAtRef.current = performance.now();
    const dx = e.clientX - prevMousePos.current.x;
    const dy = e.clientY - prevMousePos.current.y;
    prevMousePos.current = { x: e.clientX, y: e.clientY };

    sphericalRef.current.theta -= dx * 0.008;
    sphericalRef.current.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - dy * 0.008));
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
    isInteractingRef.current = false;
    userInteractedAtRef.current = performance.now();
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!interactive) return;
    userInteractedAtRef.current = performance.now();
    sphericalRef.current.radius = Math.max(6, Math.min(18, sphericalRef.current.radius + e.deltaY * 0.01));
  };

  // Mobile Touch Gestures: Pan-Y vs Horizontal 3D Orbit & 2-finger Pinch Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !interactive) return;

    const getTouchDist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      userInteractedAtRef.current = performance.now();
      isInteractingRef.current = true;

      if (!hintDismissed) {
        setHintDismissed(true);
        setShowMobileHint(false);
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStateRef.current = {
          status: mobileMode === 'rotate' ? 'horizontal_orbit' : 'deciding',
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY,
          initialDistance: 0,
          initialRadius: sphericalRef.current.radius,
        };
      } else if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        touchStateRef.current = {
          status: 'pinch_zoom',
          startX: 0,
          startY: 0,
          lastX: 0,
          lastY: 0,
          initialDistance: dist,
          initialRadius: sphericalRef.current.radius,
        };
        if (e.cancelable) e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      userInteractedAtRef.current = performance.now();
      const st = touchStateRef.current;

      // Two-finger pinch to zoom
      if (st.status === 'pinch_zoom' && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        if (st.initialDistance > 0 && dist > 10) {
          const factor = st.initialDistance / dist;
          sphericalRef.current.radius = Math.max(6, Math.min(18, st.initialRadius * factor));
        }
        return;
      }

      if (e.touches.length !== 1) return;
      const touch = e.touches[0];

      if (st.status === 'deciding') {
        const deltaX = Math.abs(touch.clientX - st.startX);
        const deltaY = Math.abs(touch.clientY - st.startY);

        // Threshold to determine horizontal rotate vs vertical page scroll
        if (deltaX > 8 || deltaY > 8) {
          if (deltaX > deltaY * 1.15) {
            st.status = 'horizontal_orbit';
            st.lastX = touch.clientX;
            st.lastY = touch.clientY;
          } else {
            // Predominantly vertical: yield to browser page scrolling!
            st.status = 'vertical_scroll';
            isInteractingRef.current = false;
          }
        }
      }

      if (st.status === 'horizontal_orbit') {
        // Prevent page scroll only when intentionally rotating 3D horizontally
        if (e.cancelable) e.preventDefault();

        const dx = touch.clientX - st.lastX;
        const dy = touch.clientY - st.lastY;
        st.lastX = touch.clientX;
        st.lastY = touch.clientY;

        sphericalRef.current.theta -= dx * 0.012;
        if (mobileMode === 'rotate') {
          sphericalRef.current.phi = Math.max(
            0.2,
            Math.min(Math.PI / 2 - 0.05, sphericalRef.current.phi - dy * 0.008)
          );
        }
      }
    };

    const handleTouchEnd = () => {
      touchStateRef.current.status = 'idle';
      isInteractingRef.current = false;
      userInteractedAtRef.current = performance.now();
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [interactive, mobileMode, hintDismissed]);

  const setAngle = (angle: 'iso' | 'front' | 'top') => {
    setViewAngle(angle);
    userInteractedAtRef.current = performance.now();
    if (angle === 'iso') {
      sphericalRef.current = { theta: 0.65, phi: 1.15, radius: 10.5 };
    } else if (angle === 'front') {
      sphericalRef.current = { theta: 0, phi: 1.35, radius: 11.0 };
    } else if (angle === 'top') {
      sphericalRef.current = { theta: 0, phi: 0.25, radius: 12.0 };
    }
  };

  const resetView = () => {
    setAngle('iso');
  };

  // Quick 45° step rotations for mobile buttons
  const rotateStep = (dir: 'left' | 'right') => {
    userInteractedAtRef.current = performance.now();
    sphericalRef.current.theta += (dir === 'left' ? -1 : 1) * (Math.PI / 4);
  };

  return (
    <div
      ref={containerRef}
      id="canvas-3d-container"
      className={`relative w-full rounded-xl overflow-hidden border border-slate-800 bg-[#080c14] select-none ${
        height ? '' : 'h-[340px] sm:h-[420px] lg:h-[520px]'
      } ${className}`}
      style={height ? { height } : undefined}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {webglError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <Box className="w-12 h-12 text-blue-500 mb-3 opacity-70" />
          <p className="font-semibold text-slate-200 mb-1">Интерактивная 3D-сцена</p>
          <p className="text-sm max-w-sm">
            Аппаратное 3D-ускорение не поддерживается вашим браузером. Используется интерактивный чертёжный режим.
          </p>
        </div>
      ) : (
        /* CRITICAL: touchAction: pan-y allows browser page vertical scrolling smoothly */
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
          style={{ touchAction: mobileMode === 'rotate' ? 'none' : 'pan-y' }}
        />
      )}

      {/* Blueprint grid overlay tag */}
      <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 z-20">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/90 border border-slate-700/80 rounded-md backdrop-blur-sm shadow-md">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
            {isBlueprint ? 'CAD ЧЕРТЁЖ' : '3D МОДЕЛЬ'}
          </span>
        </div>
      </div>

      {/* Mobile Mode Switcher: ОБЗОР (Скролл) | ВРАЩЕНИЕ */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 sm:hidden z-20 flex items-center bg-slate-900/90 border border-slate-700/80 p-0.5 rounded-lg shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setMobileMode('scroll');
            userInteractedAtRef.current = performance.now();
          }}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded font-semibold transition-colors ${
            mobileMode === 'scroll'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Свайп вверх/вниз прокручивает страницу"
        >
          <Smartphone className="w-3 h-3" />
          <span>ОБЗОР</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileMode('rotate');
            setShowMobileHint(false);
            setHintDismissed(true);
            userInteractedAtRef.current = performance.now();
          }}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded font-semibold transition-colors ${
            mobileMode === 'rotate'
              ? 'bg-amber-600 text-white shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Свайпы пальцем вращают модель"
        >
          <MoveHorizontal className="w-3 h-3" />
          <span>ВРАЩЕНИЕ</span>
        </button>
      </div>

      {/* Interactive HUD Controls (CAD, Camera angles, Reset) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 p-1 rounded-lg backdrop-blur-sm shadow-lg z-20">
        <button
          id="btn-blueprint-mode"
          type="button"
          onClick={() => setIsBlueprint(!isBlueprint)}
          title={isBlueprint ? 'Переключить в реалистичный режим' : 'Включить чертёжный режим (CAD)'}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium rounded transition-colors ${
            isBlueprint ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Чертёж</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-700 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1">
          <button
            id="btn-angle-iso"
            type="button"
            onClick={() => setAngle('iso')}
            className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
              viewAngle === 'iso' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Изометрия"
          >
            ИЗО
          </button>
          <button
            id="btn-angle-front"
            type="button"
            onClick={() => setAngle('front')}
            className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
              viewAngle === 'front' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Фасад"
          >
            ФАСАД
          </button>
          <button
            id="btn-angle-top"
            type="button"
            onClick={() => setAngle('top')}
            className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
              viewAngle === 'top' ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="План сверху"
          >
            ПЛАН
          </button>
        </div>

        <div className="w-[1px] h-4 bg-slate-700" />

        <button
          id="btn-reset-view"
          type="button"
          onClick={resetView}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Сбросить угол обзора"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile-Friendly Quick Rotate Step Controls at Bottom Right */}
      <div className="sm:hidden absolute bottom-12 right-3 flex items-center gap-1.5 z-20">
        <button
          type="button"
          onClick={() => rotateStep('left')}
          className="px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono font-bold shadow-lg active:scale-95 transition-transform backdrop-blur-md"
          title="Повернуть влево на 45°"
        >
          ↶ 45°
        </button>
        <button
          type="button"
          onClick={() => rotateStep('right')}
          className="px-2.5 py-1.5 bg-slate-900/90 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono font-bold shadow-lg active:scale-95 transition-transform backdrop-blur-md"
          title="Повернуть вправо на 45°"
        >
          45° ↷
        </button>
      </div>

      {/* Floating Gentle Mobile Hint (dissolves after 4.5s or on interaction) */}
      {showMobileHint && !hintDismissed && (
        <div className="sm:hidden absolute inset-x-4 top-13 flex justify-center z-20 pointer-events-none">
          <div className="flex items-center gap-2 bg-blue-950/95 border border-blue-500/50 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-blue-200 text-xs font-mono">
            <MoveHorizontal className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>↔ Проведите влево/вправо для вращения</span>
          </div>
        </div>
      )}

      {/* 3D Hotspot Annotations */}
      {showHotspots && category === 'house' &&
        screenHotspots.map(({ item, x, y, visible }) => {
          if (!visible) return null;
          const isActive = activeHotspot?.id === item.id;
          return (
            <div
              key={item.id}
              className="absolute z-10 transition-transform duration-75"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveHotspot(item)}
                onMouseLeave={() => setActiveHotspot(null)}
                onClick={() => setActiveHotspot(isActive ? null : item)}
                className="relative group p-2 focus:outline-none"
                aria-label={item.title}
              >
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white/80 shadow" />
                </span>
              </button>

              {/* Technical popover card */}
              {(isActive || activeHotspot?.id === item.id) && (
                <div
                  className="absolute left-6 top-0 -translate-y-1/2 w-64 bg-slate-900/95 border border-blue-500/40 p-3 rounded-lg shadow-2xl backdrop-blur-md pointer-events-none z-30"
                >
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                      {item.title}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">ТЕХСПЕЦИФИКАЦИЯ</span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-snug">
                    {item.spec}
                  </p>
                </div>
              )}
            </div>
          );
        })}

      {/* Exploration hint at bottom */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-950/85 px-2.5 py-1 rounded border border-slate-800 backdrop-blur-sm">
          <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="hidden sm:inline">Зажмите и вращайте · Колёсико — масштаб</span>
          <span className="sm:hidden flex items-center gap-1 text-[10px]">
            <ZoomIn className="w-3 h-3 text-slate-400" />
            2 пальца — зум · ↑↓ скролл страницы
          </span>
        </div>
        <div className="hidden sm:block bg-slate-950/85 px-2.5 py-1 rounded border border-slate-800 backdrop-blur-sm text-slate-400">
          Снеговой район IV (2.0 кПа) · СП 20
        </div>
      </div>
    </div>
  );
};
