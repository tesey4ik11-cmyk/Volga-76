import React, { useState } from 'react';
import { ConfiguratorState } from '../types';
import { Dynamic3DOptions } from './ObjectViewer3D';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface TechnicalScheme2DProps {
  config: ConfiguratorState;
  options?: Dynamic3DOptions;
  className?: string;
}

type SchemeView = 'plan' | 'facade' | 'section' | 'axon';

export const TechnicalScheme2D: React.FC<TechnicalScheme2DProps> = ({ config, options, className = '' }) => {
  const [view, setView] = useState<SchemeView>('plan');
  const [zoom, setZoom] = useState<number>(1);

  const svgW = 600;
  const svgH = 380;
  const cx = svgW / 2;
  const cy = svgH / 2;

  // ========================================================
  // 1. КАРКАСНЫЙ ДОМ (ДОМ)
  // ========================================================
  const renderHouse = () => {
    const area = Math.max(15, config.houseArea || 48);
    const aspect = 1.33;
    const width = Math.round(Math.sqrt(area * aspect) * 10) / 10;
    const depth = Math.round((area / width) * 10) / 10;
    const height = 2.7;
    const roofHeight = 1.4;
    const scale = 26;

    if (view === 'plan') {
      const boxW = width * scale;
      const boxH = depth * scale;
      const x = cx - boxW / 2;
      const y = cy - boxH / 2;

      // Сваи
      const cols = Math.max(3, Math.round(width / 2.0));
      const rows = Math.max(3, Math.round(depth / 2.0));
      const piles: { px: number; py: number }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          piles.push({
            px: x + (c / (cols - 1)) * boxW,
            py: y + (r / (rows - 1)) * boxH,
          });
        }
      }

      // Несущие лаги перекрытия
      const lagCount = Math.max(4, Math.round(depth / 0.6));
      const lags: number[] = [];
      for (let i = 0; i <= lagCount; i++) {
        lags.push(y + (i / lagCount) * boxH);
      }

      return (
        <g>
          {/* Оси здания по ЕСКД */}
          <line x1={x - 30} y1={y} x2={x + boxW + 30} y2={y} stroke="#64748b" strokeDasharray="8 4 2 4" strokeWidth="1" />
          <line x1={x - 30} y1={y + boxH} x2={x + boxW + 30} y2={y + boxH} stroke="#64748b" strokeDasharray="8 4 2 4" strokeWidth="1" />
          <line x1={x} y1={y - 30} x2={x} y2={y + boxH + 30} stroke="#64748b" strokeDasharray="8 4 2 4" strokeWidth="1" />
          <line x1={x + boxW} y1={y - 30} x2={x + boxW} y2={y + boxH + 30} stroke="#64748b" strokeDasharray="8 4 2 4" strokeWidth="1" />

          {/* Марки осей кружками */}
          <circle cx={x - 36} cy={y} r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" />
          <text x={x - 36} y={y + 3} fill="#60a5fa" fontSize="9" fontFamily="monospace" textAnchor="middle">А</text>
          <circle cx={x - 36} cy={y + boxH} r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" />
          <text x={x - 36} y={y + boxH + 3} fill="#60a5fa" fontSize="9" fontFamily="monospace" textAnchor="middle">Б</text>

          <circle cx={x} cy={y - 36} r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" />
          <text x={x} y={y - 33} fill="#60a5fa" fontSize="9" fontFamily="monospace" textAnchor="middle">1</text>
          <circle cx={x + boxW} cy={y - 36} r="8" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" />
          <text x={x + boxW} y={y - 33} fill="#60a5fa" fontSize="9" fontFamily="monospace" textAnchor="middle">2</text>

          {/* Несущие балки/лаги пола */}
          {lags.map((ly, idx) => (
            <line key={`lag-${idx}`} x1={x + 4} y1={ly} x2={x + boxW - 4} y2={ly} stroke="#334155" strokeDasharray="3 3" strokeWidth="1.2" />
          ))}

          {/* Наружные стены (двойной контур) */}
          <rect x={x} y={y} width={boxW} height={boxH} fill="#1e293b" fillOpacity="0.4" stroke="#60a5fa" strokeWidth="2.5" />
          <rect x={x + 8} y={y + 8} width={boxW - 16} height={boxH - 16} fill="none" stroke="#3b82f6" strokeWidth="1.5" />

          {/* Сваи */}
          {config.houseFund &&
            piles.map((p, i) => (
              <g key={`p-${i}`}>
                <rect x={p.px - 6} y={p.py - 6} width="12" height="12" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
                <circle cx={p.px} cy={p.py} r="3" fill="#ffffff" />
              </g>
            ))}

          {/* Окна и двери при комплектации под ключ */}
          {config.houseKit === 'turnkey' && (
            <>
              {/* Окно фасад 1 */}
              <rect x={x + boxW * 0.2} y={y - 3} width={boxW * 0.3} height="6" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
              {/* Окно фасад 2 */}
              <rect x={x + boxW * 0.6} y={y - 3} width={boxW * 0.25} height="6" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
              {/* Входная дверь */}
              <rect x={x + boxW * 0.7} y={y + boxH - 4} width={24} height="8" fill="#f59e0b" stroke="#d97706" />
              {/* Открывание двери радиусной дугой */}
              <path d={`M ${x + boxW * 0.7} ${y + boxH} A 24 24 0 0 1 ${x + boxW * 0.7 + 24} ${y + boxH + 24}`} fill="none" stroke="#f59e0b" strokeDasharray="2 2" />
            </>
          )}

          {/* Размерная линия по ширине B */}
          <line x1={x} y1={y + boxH + 20} x2={x + boxW} y2={y + boxH + 20} stroke="#94a3b8" strokeWidth="1" />
          <line x1={x} y1={y + boxH + 15} x2={x} y2={y + boxH + 25} stroke="#94a3b8" strokeWidth="1" />
          <line x1={x + boxW} y1={y + boxH + 15} x2={x + boxW} y2={y + boxH + 25} stroke="#94a3b8" strokeWidth="1" />
          <text x={cx} y={y + boxH + 34} fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            B = {width.toFixed(1)} м (габарит)
          </text>

          {/* Размерная линия по длине L */}
          <line x1={x + boxW + 20} y1={y} x2={x + boxW + 20} y2={y + boxH} stroke="#94a3b8" strokeWidth="1" />
          <line x1={x + boxW + 15} y1={y} x2={x + boxW + 25} y2={y} stroke="#94a3b8" strokeWidth="1" />
          <line x1={x + boxW + 15} y1={y + boxH} x2={x + boxW + 25} y2={y + boxH} stroke="#94a3b8" strokeWidth="1" />
          <text x={x + boxW + 32} y={cy + 4} fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="start" fontWeight="bold">
            L = {depth.toFixed(1)} м
          </text>

          {/* Текстовый штамп площади */}
          <text x={cx} y={cy - 4} fill="#f8fafc" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            ПЛАН КАРКАСА S = {area} м²
          </text>
          <text x={cx} y={cy + 14} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {config.houseMaterial === 'metal' ? 'Металлопрокат профильный ГОСТ 30245' : 'Сухая строганая доска 150×50 мм'}
          </text>
        </g>
      );
    }

    if (view === 'facade') {
      const boxW = width * scale;
      const wallH = height * scale;
      const roofH = roofHeight * scale;
      const x = cx - boxW / 2;
      const groundY = cy + 70;
      const wallY = groundY - wallH;

      return (
        <g>
          {/* Земля */}
          <line x1="30" y1={groundY} x2={svgW - 30} y2={groundY} stroke="#64748b" strokeWidth="2.5" />
          <text x="45" y={groundY + 16} fill="#64748b" fontSize="10" fontFamily="monospace">
            Ур. земли ±0.000
          </text>

          {/* Сваи в грунте */}
          {config.houseFund && (
            <>
              <line x1={x + 12} y1={groundY} x2={x + 12} y2={groundY + 50} stroke="#0284c7" strokeWidth="3" />
              <line x1={cx} y1={groundY} x2={cx} y2={groundY + 50} stroke="#0284c7" strokeWidth="3" />
              <line x1={x + boxW - 12} y1={groundY} x2={x + boxW - 12} y2={groundY + 50} stroke="#0284c7" strokeWidth="3" />
              {/* Лопасти */}
              <line x1={x + 5} y1={groundY + 46} x2={x + 19} y2={groundY + 50} stroke="#0284c7" strokeWidth="2" />
              <line x1={cx - 7} y1={groundY + 46} x2={cx + 7} y2={groundY + 50} stroke="#0284c7" strokeWidth="2" />
              <line x1={x + boxW - 19} y1={groundY + 46} x2={x + boxW - 5} y2={groundY + 50} stroke="#0284c7" strokeWidth="2" />
              <text x={cx} y={groundY + 40} fill="#38bdf8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Отметка низа свай: -2.500 м (ниже точки промерзания ЯО 1.45 м)
              </text>
            </>
          )}

          {/* Стеновая коробка */}
          <rect x={x} y={wallY} width={boxW} height={wallH} fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />

          {/* Двускатная крыша */}
          <polygon
            points={`${x - 14},${wallY} ${cx},${wallY - roofH} ${x + boxW + 14},${wallY}`}
            fill="#0f172a"
            stroke="#93c5fd"
            strokeWidth="2.5"
          />

          {/* Окна и двери на главном фасаде */}
          {config.houseKit === 'turnkey' ? (
            <>
              <rect x={x + boxW * 0.16} y={wallY + 20} width={boxW * 0.28} height={wallH * 0.52} fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x={x + boxW * 0.62} y={wallY + wallH * 0.22} width={boxW * 0.22} height={wallH * 0.78} fill="#334155" stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx={x + boxW * 0.62 + 6} cy={wallY + wallH * 0.6} r="2" fill="#fbbf24" />
            </>
          ) : (
            <text x={cx} y={wallY + wallH / 2} fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">
              // СИЛОВОЙ КАРКАС (КОРОБКА БЕЗ ОКНО-ДВЕРНЫХ БЛОКОВ)
            </text>
          )}

          {/* Высотная отметка конька */}
          <line x1={x - 25} y1={wallY - roofH} x2={x - 5} y2={wallY - roofH} stroke="#94a3b8" strokeWidth="1" />
          <text x={x - 30} y={wallY - roofH + 3} fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="end">
            +{(height + roofHeight).toFixed(2)}
          </text>
          {/* Высотная отметка карниза */}
          <line x1={x - 25} y1={wallY} x2={x - 5} y2={wallY} stroke="#94a3b8" strokeWidth="1" />
          <text x={x - 30} y={wallY + 3} fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
            +{height.toFixed(2)}
          </text>
        </g>
      );
    }

    if (view === 'section') {
      const boxW = width * scale;
      const wallH = height * scale;
      const x = cx - boxW / 2;
      const groundY = cy + 70;
      const wallY = groundY - wallH;

      return (
        <g>
          <line x1="30" y1={groundY} x2={svgW - 30} y2={groundY} stroke="#64748b" strokeWidth="2" />
          {/* Черновой пол */}
          <rect x={x} y={groundY - 12} width={boxW} height="12" fill="#334155" stroke="#475569" />
          {/* Сечение стоек стен */}
          <rect x={x} y={wallY} width="16" height={wallH - 12} fill="#e2e8f0" stroke="#0284c7" strokeWidth="1" />
          <rect x={x + boxW - 16} y={wallY} width="16" height={wallH - 12} fill="#e2e8f0" stroke="#0284c7" strokeWidth="1" />
          {/* Потолочные балки */}
          <rect x={x} y={wallY} width={boxW} height="10" fill="#334155" stroke="#475569" />

          {/* Стропильная ферма */}
          <line x1={x} y1={wallY} x2={cx} y2={wallY - 35} stroke="#60a5fa" strokeWidth="2.5" />
          <line x1={x + boxW} y1={wallY} x2={cx} y2={wallY - 35} stroke="#60a5fa" strokeWidth="2.5" />
          <line x1={cx} y1={wallY - 35} x2={cx} y2={wallY} stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />

          <text x={cx} y={cy - 10} fill="#4ade80" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            {config.houseKit === 'turnkey' ? 'Базальтовое утепление 150/200 мм + Пароизоляция' : 'Силовой каркас стоек 150×50 мм'}
          </text>
          <text x={cx} y={cy + 10} fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
            Высота чистового потолка: {height.toFixed(2)} м
          </text>
          <text x={cx} y={cy + 26} fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
            Снеговой район IV (Ярославская обл. расчет 2.0 кПа)
          </text>
        </g>
      );
    }

    // axon
    return (
      <g>
        <path d={`M ${cx - 120} ${cy + 10} L ${cx} ${cy - 55} L ${cx + 140} ${cy - 10} L ${cx + 20} ${cy + 55} Z`} fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
        <path d={`M ${cx - 120} ${cy + 10} L ${cx - 120} ${cy + 75} L ${cx + 20} ${cy + 120} L ${cx + 20} ${cy + 55} Z`} fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
        <path d={`M ${cx + 20} ${cy + 55} L ${cx + 20} ${cy + 120} L ${cx + 140} ${cy + 55} L ${cx + 140} ${cy - 10} Z`} fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
        <text x={cx} y={cy + 145} fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="middle">
          Аксонометрическая проекция пространственного силового каркаса
        </text>
      </g>
    );
  };

  // ========================================================
  // 2. БАССЕЙН (POOL)
  // ========================================================
  const renderPool = () => {
    const bowlW = 200;
    const bowlH = 120;
    const x = cx - bowlW / 2;
    const y = cy - bowlH / 2;

    if (view === 'plan') {
      return (
        <g>
          {/* Террасный настил вокруг чаши если включен */}
          {config.poolDeck && (
            <rect x={x - 45} y={y - 45} width={bowlW + 90} height={bowlH + 90} fill="#78350f" fillOpacity="0.25" stroke="#d97706" strokeWidth="2" strokeDasharray="5 3" rx="8" />
          )}

          {/* Чаша бассейна */}
          <rect x={x} y={y} width={bowlW} height={bowlH} fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="3" rx="16" />
          <rect x={x + 12} y={y + 12} width={bowlW - 24} height={bowlH - 24} fill="#0369a1" fillOpacity="0.5" stroke="#0ea5e9" strokeWidth="1.5" rx="10" />

          {/* Павильон если выбран */}
          {config.poolPavilion !== 'none' && (
            <rect x={x - 20} y={y - 20} width={bowlW + 40} height={bowlH + 40} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 4" rx="6" />
          )}

          {/* Форсунки и скиммер */}
          <circle cx={x + 30} cy={y + 30} r="4" fill="#38bdf8" />
          <circle cx={x + bowlW - 30} cy={y + 30} r="4" fill="#38bdf8" />
          <rect x={x + bowlW / 2 - 12} y={y + bowlH - 10} width="24" height="6" fill="#f8fafc" />

          {/* Техпомещение */}
          {config.poolTech && (
            <g>
              <rect x={x + bowlW + 25} y={y + 10} width="50" height="40" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" rx="4" />
              <text x={x + bowlW + 50} y={y + 34} fill="#e2e8f0" fontSize="9" fontFamily="monospace" textAnchor="middle">ТЕХБОКС</text>
            </g>
          )}

          <text x={cx} y={cy} fill="#ffffff" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            КОМПОЗИТНАЯ ЧАША 5.2 × 3.2 м
          </text>
          <text x={cx} y={cy + 18} fill="#bae6fd" fontSize="10" fontFamily="monospace" textAnchor="middle">
            Глубина 1.50 м · Утепление пенополиуретаном 50 мм
          </text>
        </g>
      );
    }

    // Разрез бассейна
    return (
      <g>
        {/* Котлован и чаша в грунте */}
        <line x1="40" y1={cy + 40} x2={svgW - 40} y2={cy + 40} stroke="#64748b" strokeWidth="2.5" />
        <path d={`M ${x - 20} ${cy + 40} L ${x} ${cy + 110} L ${x + bowlW} ${cy + 110} L ${x + bowlW + 20} ${cy + 40} Z`} fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        {/* Вода */}
        <rect x={x + 10} y={cy + 50} width={bowlW - 20} height="52" fill="#0284c7" fillOpacity="0.6" />
        <text x={cx} y={cy + 80} fill="#ffffff" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          Водяное зеркало V ≈ 21 м³
        </text>
        {/* Павильон купол */}
        {config.poolPavilion !== 'none' && (
          <path d={`M ${x - 30} ${cy + 40} Q ${cx} ${cy - 40} ${x + bowlW + 30} ${cy + 40}`} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
        )}
      </g>
    );
  };

  // ========================================================
  // 3. ТЕРРАСА ДПК (DECK)
  // ========================================================
  const renderDeck = () => {
    const area = Math.max(10, config.deckArea || 24);
    const aspect = 1.4;
    const width = Math.round(Math.sqrt(area * aspect) * 10) / 10;
    const depth = Math.round((area / width) * 10) / 10;
    const scale = 28;
    const boxW = width * scale;
    const boxH = depth * scale;
    const x = cx - boxW / 2;
    const y = cy - boxH / 2;

    if (view === 'plan') {
      return (
        <g>
          {/* Контур металлокаркаса террасы */}
          <rect x={x} y={y} width={boxW} height={boxH} fill="#451a03" fillOpacity="0.3" stroke="#d97706" strokeWidth="2.5" rx="4" />

          {/* Раскладка доски ДПК */}
          {config.deckLayout === 'diag' ? (
            <g opacity="0.6">
              {Array.from({ length: 12 }).map((_, i) => (
                <line key={`d-${i}`} x1={x + i * 28} y1={y} x2={x} y2={y + i * 28} stroke="#b45309" strokeWidth="1" />
              ))}
              <text x={cx} y={cy + 25} fill="#f59e0b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Раскладка ДПК под углом 45°
              </text>
            </g>
          ) : (
            <g opacity="0.6">
              {Array.from({ length: Math.round(boxH / 14) }).map((_, i) => (
                <line key={`s-${i}`} x1={x} y1={y + i * 14} x2={x + boxW} y2={y + i * 14} stroke="#b45309" strokeWidth="1" />
              ))}
              <text x={cx} y={cy + 25} fill="#f59e0b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Прямая палубная укладка доски ДПК
              </text>
            </g>
          )}

          {/* Ограждения по периметру */}
          {config.deckRail && (
            <rect x={x + 4} y={y + 4} width={boxW - 8} height={boxH - 8} fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="6 4" />
          )}

          {/* Ступени */}
          {(config.deckSteps || 0) > 0 && (
            <g>
              <rect x={cx - 30} y={y + boxH} width="60" height="18" fill="#78350f" stroke="#d97706" />
              <line x1={cx - 30} y1={y + boxH + 6} x2={cx + 30} y2={y + boxH + 6} stroke="#f59e0b" strokeWidth="1" />
              <line x1={cx - 30} y1={y + boxH + 12} x2={cx + 30} y2={y + boxH + 12} stroke="#f59e0b" strokeWidth="1" />
              <text x={cx} y={y + boxH + 28} fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Ступени ({config.deckSteps} шт)
              </text>
            </g>
          )}

          <text x={cx} y={cy - 10} fill="#ffffff" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            ТЕРРАСА ДПК S = {area} м² ({width} × {depth} м)
          </text>
          <text x={cx} y={cy + 8} fill="#fbbf24" fontSize="10" fontFamily="monospace" textAnchor="middle">
            Лаги 40×60 мм с шагом 350 мм · Кляймеры из нерж. стали
          </text>
        </g>
      );
    }

    // Фасад террасы со сваями
    return (
      <g>
        <line x1="30" y1={cy + 50} x2={svgW - 30} y2={cy + 50} stroke="#64748b" strokeWidth="2.5" />
        {/* Сваи террасы */}
        <line x1={x + 10} y1={cy + 50} x2={x + 10} y2={cy + 95} stroke="#0284c7" strokeWidth="3" />
        <line x1={cx} y1={cy + 50} x2={cx} y2={cy + 95} stroke="#0284c7" strokeWidth="3" />
        <line x1={x + boxW - 10} y1={cy + 50} x2={x + boxW - 10} y2={cy + 95} stroke="#0284c7" strokeWidth="3" />

        {/* Настил */}
        <rect x={x} y={cy + 38} width={boxW} height="12" fill="#78350f" stroke="#d97706" strokeWidth="1.5" />

        {/* Перила */}
        {config.deckRail && (
          <g>
            <line x1={x} y1={cy - 5} x2={x + boxW} y2={cy - 5} stroke="#f59e0b" strokeWidth="3" />
            <line x1={x + 15} y1={cy - 5} x2={x + 15} y2={cy + 38} stroke="#d97706" strokeWidth="2" />
            <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 38} stroke="#d97706" strokeWidth="2" />
            <line x1={x + boxW - 15} y1={cy - 5} x2={x + boxW - 15} y2={cy + 38} stroke="#d97706" strokeWidth="2" />
            <text x={cx} y={cy - 12} fill="#f59e0b" fontSize="10" fontFamily="monospace" textAnchor="middle">
              Ограждение ДПК H = 0.95 м
            </text>
          </g>
        )}
      </g>
    );
  };

  // ========================================================
  // 4. СВАЙНОЕ ПОЛЕ (PILE)
  // ========================================================
  const renderPiles = () => {
    const count = Math.max(4, config.pileCount || 20);
    const cols = Math.max(3, Math.round(Math.sqrt(count * 1.3)));
    const rows = Math.max(2, Math.ceil(count / cols));
    const step = 38;
    const gridW = (cols - 1) * step;
    const gridH = (rows - 1) * step;
    const startX = cx - gridW / 2;
    const startY = cy - gridH / 2;

    const pileList: { px: number; py: number }[] = [];
    let cur = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cur < count) {
          pileList.push({ px: startX + c * step, py: startY + r * step });
          cur++;
        }
      }
    }

    if (view === 'plan') {
      return (
        <g>
          {/* Сетка ростверка если включен */}
          {config.pileRostverk && (
            <g stroke="#3b82f6" strokeWidth="3" strokeOpacity="0.7">
              {Array.from({ length: rows }).map((_, r) => (
                <line key={`rr-${r}`} x1={startX} y1={startY + r * step} x2={startX + gridW} y2={startY + r * step} />
              ))}
              {Array.from({ length: cols }).map((_, c) => (
                <line key={`rc-${c}`} x1={startX + c * step} y1={startY} x2={startX + c * step} y2={startY + gridH} />
              ))}
            </g>
          )}

          {/* Сваи с оголовками */}
          {pileList.map((p, i) => (
            <g key={`pl-${i}`}>
              <rect x={p.px - 9} y={p.py - 9} width="18" height="18" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.2" />
              <circle cx={p.px} cy={p.py} r="5" fill="#f8fafc" stroke="#0369a1" strokeWidth="1" />
              <text x={p.px + 12} y={p.py + 3} fill="#64748b" fontSize="8" fontFamily="monospace">
                №{i + 1}
              </text>
            </g>
          ))}

          <text x={cx} y={startY - 25} fill="#f8fafc" fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            ПЛАН СВАЙНОГО ПОЛЯ: {count} ШТ Ø{config.pileDia} ММ
          </text>
          <text x={cx} y={startY + gridH + 35} fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">
            {config.pileRostverk ? 'Швеллер 140/160 мм по периметру' : 'Оголовки усиленные 200×200 мм'} · Заглубление 2.5 м
          </text>
        </g>
      );
    }

    // Разрез сваи
    return (
      <g>
        <line x1="40" y1={cy - 20} x2={svgW - 40} y2={cy - 20} stroke="#64748b" strokeWidth="2.5" />
        <text x="50" y={cy - 5} fill="#64748b" fontSize="10" fontFamily="monospace">Ур. земли ±0.000</text>

        {/* 3 сваи с шагом */}
        {[-100, 0, 100].map((dx, idx) => (
          <g key={idx} transform={`translate(${cx + dx}, ${cy})`}>
            {/* Оголовок */}
            <rect x="-18" y="-28" width="36" height="8" fill="#38bdf8" stroke="#0284c7" />
            {/* Ствол */}
            <rect x="-6" y="-20" width="12" height="130" fill="#0284c7" stroke="#38bdf8" />
            {/* Лопасть */}
            <path d="M -20 100 L 20 110" stroke="#38bdf8" strokeWidth="4" />
          </g>
        ))}

        <line x1="cx - 100" y1={cy + 115} x2="cx + 100" y2={cy + 115} stroke="#38bdf8" strokeDasharray="3 3" />
        <text x={cx} y={cy + 135} fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="middle">
          Глубина завинчивания: -2500 мм (до несущего пласта суглинка)
        </text>
      </g>
    );
  };

  // ========================================================
  // 5. НАРУЖНЫЕ СЕТИ (NET)
  // ========================================================
  const renderNets = () => {
    const len = Math.max(10, config.netLength || 30);
    const depthM = config.netDeep ? 1.7 : 1.2;

    if (view === 'plan') {
      return (
        <g>
          {/* Трасса траншеи */}
          <rect x="70" y={cy - 20} width={svgW - 140} height="40" fill="#1e293b" stroke="#64748b" strokeDasharray="6 3" />

          {/* Труба водопровода/канализации */}
          <line x1="70" y1={cy} x2={svgW - 70} y2={cy} stroke="#38bdf8" strokeWidth="5" />

          {/* Колодцы */}
          {config.netHasWells && (
            <>
              <circle cx="120" cy={cy} r="18" fill="#334155" stroke="#f59e0b" strokeWidth="2.5" />
              <text x="120" y={cy + 4} fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle">К-1</text>
              <circle cx={svgW - 120} cy={cy} r="18" fill="#334155" stroke="#f59e0b" strokeWidth="2.5" />
              <text x={svgW - 120} y={cy + 4} fill="#f59e0b" fontSize="9" fontFamily="monospace" textAnchor="middle">К-2</text>
            </>
          )}

          {/* Размеры длины */}
          <line x1="70" y1={cy + 40} x2={svgW - 70} y2={cy + 40} stroke="#94a3b8" strokeWidth="1" />
          <text x={cx} y={cy + 55} fill="#38bdf8" fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            L трассы = {len} м (уклон i = 0.02 по СП 32.13330)
          </text>
        </g>
      );
    }

    // Продольный профиль траншеи
    return (
      <g>
        <line x1="50" y1={cy - 40} x2={svgW - 50} y2={cy - 40} stroke="#64748b" strokeWidth="2.5" />
        <text x="60" y={cy - 25} fill="#64748b" fontSize="10" fontFamily="monospace">Ур. земли ±0.000</text>

        {/* Профиль дна траншеи с уклоном */}
        <line x1="70" y1={cy + 40} x2={svgW - 70} y2={cy + 75} stroke="#38bdf8" strokeWidth="4" />
        {/* Песчаная подушка */}
        <rect x="70" y={cy + 42} width={svgW - 140} height="15" fill="#eab308" fillOpacity="0.3" />

        <text x={cx} y={cy + 25} fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="middle">
          Заглубление H = {depthM.toFixed(1)} м · Песчаная подушка 150 мм
        </text>
      </g>
    );
  };

  // ========================================================
  // 6. ОТДЕЛКА (FINISH)
  // ========================================================
  const renderFinish = () => {
    const area = Math.max(20, config.finishArea || 50);

    return (
      <g>
        <rect x="100" y="70" width={svgW - 200} height="220" fill="#1e293b" stroke="#60a5fa" strokeWidth="2.5" rx="4" />

        {/* Водяной теплый пол спираль если включен */}
        {config.finishWarm && (
          <g stroke="#ef4444" strokeWidth="2" opacity="0.75" fill="none">
            <rect x="120" y="90" width={svgW - 240} height="180" strokeDasharray="12 6" />
            <path d={`M 150 120 L ${svgW - 150} 120 L ${svgW - 150} 210 L 170 210 L 170 140 L ${svgW - 170} 140`} />
            <text x={cx} y="250" fill="#ef4444" fontSize="10" fontFamily="monospace" textAnchor="middle">
              ✓ Водяной теплый пол: труба PEX-a Ø16 мм с шагом 150 мм
            </text>
          </g>
        )}

        {/* Электрика */}
        {config.finishElectric && (
          <g>
            <circle cx="140" cy="110" r="8" fill="#fbbf24" />
            <circle cx={svgW - 140} cy="110" r="8" fill="#fbbf24" />
            <text x={cx} y="105" fill="#fbbf24" fontSize="10" fontFamily="monospace" textAnchor="middle">
              ✓ ГОСТ кабель ВВГнг-LS 3×2.5 в штробах и гофре
            </text>
          </g>
        )}

        <text x={cx} y="175" fill="#f8fafc" fontSize="14" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          ПЛАН ПОМЕЩЕНИЙ S = {area} м² ({config.finishLevel === 'full' ? 'ПОД КЛЮЧ' : 'WHITE BOX'})
        </text>
      </g>
    );
  };

  const renderActiveScheme = () => {
    switch (config.category) {
      case 'house':
        return renderHouse();
      case 'pool':
        return renderPool();
      case 'deck':
        return renderDeck();
      case 'pile':
        return renderPiles();
      case 'net':
        return renderNets();
      case 'finish':
        return renderFinish();
      default:
        return renderHouse();
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col ${className}`}>
      {/* Шапка 2D чертежа */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
            Техническая 2D схема (ЕСКД)
          </span>
          <span className="hidden sm:inline text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            СП 20 / СП 31-105
          </span>
        </div>

        {/* Переключатель проекций */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setView('plan')}
            className={`px-2.5 py-1 rounded transition-colors ${
              view === 'plan' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            План
          </button>
          <button
            type="button"
            onClick={() => setView('facade')}
            className={`px-2.5 py-1 rounded transition-colors ${
              view === 'facade' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Фасад
          </button>
          <button
            type="button"
            onClick={() => setView('section')}
            className={`px-2.5 py-1 rounded transition-colors ${
              view === 'section' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Разрез
          </button>
          <button
            type="button"
            onClick={() => setView('axon')}
            className={`px-2.5 py-1 rounded transition-colors ${
              view === 'axon' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Изометрия
          </button>
        </div>
      </div>

      {/* SVG полотно */}
      <div className="relative flex-1 min-h-[300px] flex items-center justify-center bg-slate-950/90 p-2 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full max-h-[360px] select-none transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Инженерная миллиметровка */}
          <defs>
            <pattern id="millimeter-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#millimeter-grid)" />

          {/* Отрисовка геометрии категории */}
          {renderActiveScheme()}
        </svg>

        {/* Зум контролы */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded p-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded"
            title="Приблизить"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded"
            title="Отдалить"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 hover:bg-slate-800 text-slate-300 rounded"
            title="Сброс масштаба"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ГОСТ Штамп ЕСКД */}
        <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-slate-800 rounded px-2.5 py-1 text-[9px] font-mono text-slate-400 shadow-sm pointer-events-none">
          <div className="text-slate-200 font-bold">ВОЛГАСТРОЙ 76 · ИНЖЕНЕРНЫЙ ОТДЕЛ</div>
          <div className="text-emerald-400">Лист 1 · М 1:50 · Ярославль 2026</div>
        </div>
      </div>
    </div>
  );
};
