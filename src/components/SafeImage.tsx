import React, { useState } from 'react';
import { ImageOff, HardHat } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  containerClassName?: string;
}

/**
 * Engineering Safe Image Component with graceful fallback handling.
 * Displays photo if loaded successfully; otherwise displays a clean
 * technical blueprint placeholder maintaining exact aspect ratio and grid structure.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'w-full h-full relative',
  fallbackTitle = 'Фотофиксация объекта',
  fallbackSubtitle = 'Инженерный архив Волгастрой 76',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If source changes, reset state
  React.useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#0c1424] to-[#060a12] border border-blue-900/40 text-center select-none ${containerClassName}`}
      >
        <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-2.5 shadow-inner">
          <HardHat className="w-5 h-5 text-blue-400" />
        </div>
        <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide line-clamp-1">
          {fallbackTitle}
        </span>
        <span className="text-[11px] font-mono text-blue-400/80 mt-0.5 line-clamp-1">
          {fallbackSubtitle}
        </span>
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400">
          <ImageOff className="w-3 h-3 text-slate-400" />
          <span>Служебная фотофиксация VGS</span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={src}
        alt={alt || fallbackTitle}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} ${!isLoaded ? 'opacity-90' : 'opacity-100'} transition-opacity duration-300`}
        {...props}
      />
    </div>
  );
};
