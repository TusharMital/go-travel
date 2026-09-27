import React, { useEffect, useState } from 'react';

interface SplitFlapTickerProps {
  value: string | number;
  prefix?: string;
  suffix?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SplitFlapTicker: React.FC<SplitFlapTickerProps> = ({
  value,
  prefix = '',
  suffix = '',
  className = '',
  size = 'md',
}) => {
  const [displayValue, setDisplayValue] = useState(String(value));
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (String(value) !== displayValue) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setDisplayValue(String(value));
        setIsFlipping(false);
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 min-w-[20px] h-[22px]',
    md: 'text-sm px-2 py-1 min-w-[24px] h-[28px]',
    lg: 'text-lg px-2.5 py-1 min-w-[32px] h-[36px]',
    xl: 'text-2xl px-3 py-1.5 min-w-[40px] h-[46px]',
  };

  const characters = `${prefix}${displayValue}${suffix}`.split('');

  return (
    <div className={`inline-flex items-center space-x-1 font-mono select-none ${className}`}>
      {characters.map((char, index) => {
        const isStatic = char === ' ' || char === '.' || char === ':' || char === '$' || char === '€';

        if (isStatic) {
          return (
            <span key={index} className="text-signal-400 font-bold px-0.5">
              {char}
            </span>
          );
        }

        return (
          <div
            key={index}
            className={`relative flex flex-col justify-center items-center bg-[#131920] border border-[#263038] text-signal font-extrabold rounded-[3px] shadow-sm overflow-hidden font-tabular ${sizeClasses[size]}`}
            style={{
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {/* Split Flap Horizontal Crease */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#070A0C] z-10 opacity-80" />

            {/* Top flap highlight */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/[0.03] pointer-events-none" />

            {/* Character with mechanical flip transition */}
            <span
              className={`transition-transform duration-150 transform ${
                isFlipping ? 'scale-y-0 opacity-40' : 'scale-y-100 opacity-100'
              }`}
            >
              {char}
            </span>
          </div>
        );
      })}
    </div>
  );
};
