import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Luggage, ShieldCheck } from 'lucide-react';

export const InteractiveLuggageTag: React.FC = () => {
  const [bagType, setBagType] = useState<'standard' | 'heavy' | 'carryon'>('standard');
  const [isHovered, setIsHovered] = useState(false);

  const bagData = {
    standard: {
      label: 'CHECKED ROLLER (23KG)',
      code: 'TRV-BER-7740',
      weight: '18.4 KG',
      barcode: '||| |||| || ||||| |||| ||| ||||',
      rate: '$6.50 / DAY',
    },
    heavy: {
      label: 'EXPEDITION TRUNK (32KG)',
      code: 'TRV-BER-9921',
      weight: '29.2 KG',
      barcode: '|||| ||| |||| || |||| ||||| ||',
      rate: '$9.00 / DAY',
    },
    carryon: {
      label: 'WEEKENDER BACKPACK',
      code: 'TRV-BER-3108',
      weight: '7.8 KG',
      barcode: '|| ||||| ||| |||| || ||| |||||',
      rate: '$5.00 / DAY',
    },
  };

  const current = bagData[bagType];

  return (
    <div className="flex flex-col items-center">
      {/* Bag Type Selector Pills */}
      <div className="flex items-center gap-2 mb-6 font-mono text-xs">
        {(['carryon', 'standard', 'heavy'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setBagType(type)}
            className={`px-3 py-1.5 rounded-sm uppercase tracking-wider transition-all border ${
              bagType === type
                ? 'bg-[#FF6B35] text-white border-[#FF6B35] font-bold shadow-xs'
                : 'bg-[#1E252B] text-[#8C9BA8] border-[#37444F] hover:text-[#E8ECF0]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Physical Tyvek Luggage Tag */}
      <motion.div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          rotateZ: isHovered ? 1.5 : 0,
          y: isHovered ? -4 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-72 sm:w-80 bg-[#FAF9F5] text-slate-900 rounded-sm shadow-2xl border border-[#D5D2C7] relative overflow-hidden font-mono"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0,0,0,0.02)',
        }}
      >
        {/* Brass Eyelet Grommet & Tether Cord */}
        <div className="pt-4 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-[#37444F] border-2 border-[#1E252B] flex items-center justify-center shadow-inner">
            <div className="w-3.5 h-3.5 rounded-full bg-[#0B0F12]" />
          </div>
          <div className="w-0.5 h-4 bg-[#8C9BA8] border-r border-dashed border-[#5A6874]" />
        </div>

        {/* Tag Header Stencil */}
        <div className="p-4 border-b-2 border-slate-900 flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
              UNBURDENED TRANSIT PROTOCOL
            </div>
            <div className="text-xl font-display font-black text-slate-950 tracking-tight">
              BER // GARE
            </div>
          </div>
          <div className="p-2 bg-slate-900 text-white rounded-sm">
            <Luggage className="w-5 h-5" />
          </div>
        </div>

        {/* Physical Perforation Tear Line */}
        <div className="relative border-b-2 border-dashed border-slate-400 py-1 my-1 flex items-center justify-between px-3">
          <div className="w-3 h-3 rounded-full bg-[#0B0F12] -ml-4.5" />
          <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">
            ✂ PERFORATED BAGGAGE CUSTODY BOUNDARY
          </span>
          <div className="w-3 h-3 rounded-full bg-[#0B0F12] -mr-4.5" />
        </div>

        {/* Serial Telemetry Body */}
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                CLASSIFICATION
              </span>
              <span className="text-xs font-bold text-slate-900 block">
                {current.label}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                WEIGHT METRIC
              </span>
              <span className="text-sm font-extrabold text-[#FF6B35]">
                {current.weight}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                LOCKER NODE
              </span>
              <span className="font-bold text-slate-800">VAULT #4</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block">
                DAILY TARIFF
              </span>
              <span className="font-bold text-slate-800">{current.rate}</span>
            </div>
          </div>

          {/* Barcode Strip */}
          <div className="pt-2 text-center">
            <div className="text-lg tracking-widest text-slate-900 select-none font-bold">
              {current.barcode}
            </div>
            <div className="text-[10px] text-slate-500 tracking-widest mt-0.5">
              *{current.code}*
            </div>
          </div>

          {/* Stamped Ink Seal */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-sm border border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>INSURED & VERIFIED</span>
            </div>
            <span className="text-[9px] text-slate-400 uppercase">
              SEAL: INK-STAMPED
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
