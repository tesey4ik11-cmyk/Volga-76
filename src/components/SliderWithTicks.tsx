import React from 'react';

export interface SliderTick {
  val: number;
  label?: string;
}

interface SliderWithTicksProps {
  id?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  ticks: SliderTick[];
  className?: string;
}

export const SliderWithTicks: React.FC<SliderWithTicksProps> = ({
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  ticks,
  className = '',
}) => {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={`relative pt-1 pb-6 select-none ${className}`}>
      {/* Range input */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 relative z-10 block"
      />

      {/* Ticks positioned exactly by percentage matching (val - min)/(max - min) */}
      <div className="absolute left-0 right-0 top-3 pointer-events-none w-full h-7">
        {ticks.map((t) => {
          const tickPct = Math.min(100, Math.max(0, ((t.val - min) / (max - min)) * 100));
          const isSelected = Math.abs(value - t.val) < (step || 1) * 0.75;
          const displayLabel = t.label ?? `${t.val}${unit ? ` ${unit}` : ''}`;

          // Calculate translate to prevent label cutoff at 0% and 100%
          let translateStyle = '-translate-x-1/2';
          if (tickPct <= 5) translateStyle = '-translate-x-0';
          else if (tickPct >= 95) translateStyle = '-translate-x-full';

          return (
            <div
              key={t.val}
              className={`absolute top-0 flex flex-col items-center cursor-pointer pointer-events-auto transition-colors ${translateStyle}`}
              style={{ left: `${tickPct}%` }}
              onClick={() => onChange(t.val)}
            >
              {/* Tick pip mark */}
              <div
                className={`w-0.5 h-1.5 transition-colors ${
                  isSelected ? 'bg-blue-400 h-2' : 'bg-slate-700'
                }`}
              />
              {/* Tick label */}
              <span
                className={`text-[11px] font-mono mt-1 whitespace-nowrap transition-colors ${
                  isSelected ? 'text-blue-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {displayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
