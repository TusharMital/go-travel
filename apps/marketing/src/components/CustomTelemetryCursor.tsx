import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export const CustomTelemetryCursor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);

  const springX = useSpring(0, { stiffness: 450, damping: 35 });
  const springY = useSpring(0, { stiffness: 450, damping: 35 });

  useEffect(() => {
    // Check if user prefers reduced motion or is on mobile touch device
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setIsVisible(true);
      springX.set(e.clientX);
      springY.set(e.clientY);
      setCoords({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement | null;
      setIsPointer(
        target?.tagName === 'BUTTON' ||
        target?.tagName === 'A' ||
        target?.closest('button') !== null ||
        target?.closest('a') !== null
      );
    };

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [springX, springY]);

  if (!isVisible) return null;

  return (
    <motion.div
      style={{
        x: springX,
        y: springY,
        pointerEvents: 'none',
      }}
      className="fixed top-0 left-0 z-50 -translate-x-1/2 -translate-y-1/2 hidden md:block"
    >
      {/* Outer Reticle */}
      <motion.div
        animate={{
          scale: isPointer ? 1.6 : 1,
          rotate: isPointer ? 45 : 0,
          borderColor: isPointer ? '#FF6B35' : '#8C9BA8',
        }}
        transition={{ duration: 0.15 }}
        className="w-8 h-8 rounded-full border border-dashed flex items-center justify-center"
      >
        {/* Center Point */}
        <div className={`w-1 h-1 rounded-full ${isPointer ? 'bg-[#FF6B35]' : 'bg-[#E8ECF0]'}`} />
      </motion.div>

      {/* Floating Telemetry Coordinates */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        className="absolute left-6 top-2 font-mono text-[9px] uppercase tracking-wider text-[#8C9BA8] whitespace-nowrap bg-[#0B0F12]/80 px-1 py-0.5 border border-[#263038] backdrop-blur-xs"
      >
        <span>X:{coords.x} Y:{coords.y}</span>
      </motion.div>
    </motion.div>
  );
};
