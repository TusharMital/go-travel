import React from 'react';
import { motion } from 'framer-motion';
import { SplitFlapTicker } from './SplitFlapTicker';

interface LocationPin {
  id: string;
  name: string;
  address: string;
  price_per_bag_per_day: number;
  available_capacity?: number;
  total_capacity?: number;
  rating?: number;
  lat?: number;
  lng?: number;
}

interface RadarTransitMapProps {
  city: string;
  locations: LocationPin[];
  highlightedLocId: string | null;
  onSelectLocation: (loc: LocationPin) => void;
  onBookLocation: (loc: LocationPin) => void;
}

export const RadarTransitMap: React.FC<RadarTransitMapProps> = ({
  city,
  locations,
  highlightedLocId,
  onSelectLocation,
  onBookLocation,
}) => {
  // Preset radial positions normalized to map coordinate space (400x320)
  const pinOffsets = [
    { x: 260, y: 110, code: 'HUB-01' },
    { x: 140, y: 130, code: 'HUB-02' },
    { x: 220, y: 220, code: 'HUB-03' },
    { x: 300, y: 170, code: 'HUB-04' },
    { x: 110, y: 210, code: 'HUB-05' },
    { x: 190, y: 70, code: 'HUB-06' },
    { x: 280, y: 240, code: 'HUB-07' },
    { x: 90, y: 120, code: 'HUB-08' },
  ];

  const activeLocation = locations.find((l) => l.id === highlightedLocId) || locations[0];

  return (
    <div className="bg-[#0B0F12] border border-[#263038] rounded-[4px] p-4 flex flex-col justify-between relative overflow-hidden min-h-[440px] select-none">
      {/* TOP RADAR TELEMETRY HEADER */}
      <div className="flex items-center justify-between z-10 font-mono text-xs border-b border-[#263038] pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-signal animate-ping" />
          <span className="font-bold text-[#E8ECF0] tracking-wider uppercase">
            {city} TELEMETRY RADAR
          </span>
          <span className="text-[10px] text-[#718096] bg-[#141A20] px-2 py-0.5 rounded-[2px] border border-[#263038]">
            SWEEP 15KM
          </span>
        </div>
        <div className="text-[11px] text-signal font-semibold">
          {locations.length} ACTIVE HUBS
        </div>
      </div>

      {/* RADAR CANVAS GRAPHIC CONTAINER */}
      <div className="relative my-3 flex-1 flex items-center justify-center overflow-hidden">
        {/* RADAR SWEEP LINE ANIMATION */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[300px] h-[300px] rounded-full border border-[#263038] relative overflow-hidden">
            {/* Rotating phosphor sweep wedge */}
            <div
              className="absolute inset-0 origin-center animate-radar-sweep"
              style={{
                background:
                  'conic-gradient(from 0deg at 50% 50%, rgba(242, 201, 76, 0.25) 0deg, rgba(242, 201, 76, 0.05) 45deg, transparent 75deg)',
              }}
            />
          </div>
        </div>

        {/* SVG RADAR RINGS & CROSSHAIRS */}
        <svg
          className="w-full h-72 text-[#1C242A]"
          viewBox="0 0 400 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Concentric Range Rings */}
          <circle cx="200" cy="150" r="135" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="200" cy="150" r="95" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="200" cy="150" r="55" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="150" r="18" stroke="currentColor" strokeWidth="1" />

          {/* Coordinate Crosshairs */}
          <line x1="200" y1="10" x2="200" y2="290" stroke="currentColor" strokeWidth="1" />
          <line x1="30" y1="150" x2="370" y2="150" stroke="currentColor" strokeWidth="1" />

          {/* Ring Mileage Telemetry Markers */}
          <text x="204" y="98" fill="#5A6672" fontSize="8" fontFamily="monospace">5 KM</text>
          <text x="204" y="58" fill="#5A6672" fontSize="8" fontFamily="monospace">10 KM</text>
          <text x="204" y="18" fill="#5A6672" fontSize="8" fontFamily="monospace">15 KM</text>

          {/* CENTER USER ARRIVAL POINT */}
          <g transform="translate(200, 150)">
            <circle cx="0" cy="0" r="8" fill="#FF6B35" fillOpacity="0.25" className="animate-ping" />
            <circle cx="0" cy="0" r="5" fill="#FF6B35" stroke="#E8ECF0" strokeWidth="1.5" />
            <text x="0" y="15" textAnchor="middle" fill="#FF6B35" fontSize="8" fontWeight="bold" fontFamily="monospace">
              YOU
            </text>
          </g>
        </svg>

        {/* STAGGERED SPRING-DAMPED LUGGAGE DROP PINS */}
        <div className="absolute inset-0 pointer-events-none">
          {locations.slice(0, 8).map((loc, idx) => {
            const pos = pinOffsets[idx % pinOffsets.length];
            const isSelected = highlightedLocId === loc.id;

            return (
              <motion.div
                key={loc.id}
                initial={{ scale: 0, y: -20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{
                  delay: idx * 0.08,
                  duration: 0.42,
                  ease: [0.34, 1.56, 0.64, 1], // Mechanical Latch recoil curve
                }}
                style={{
                  position: 'absolute',
                  left: `${(pos.x / 400) * 100}%`,
                  top: `${(pos.y / 300) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="pointer-events-auto"
              >
                <div
                  onClick={() => onSelectLocation(loc)}
                  className={`group cursor-pointer flex flex-col items-center transition-transform hover:scale-110 active:scale-95 ${
                    isSelected ? 'z-30' : 'z-20'
                  }`}
                >
                  {/* Miniature Stenciled Luggage Tag Pin */}
                  <div
                    className={`px-2 py-1 rounded-[3px] border font-mono text-[10px] font-extrabold flex items-center space-x-1 shadow-md transition-all ${
                      isSelected
                        ? 'bg-cargo-500 text-white border-white shadow-cargo-glow'
                        : 'bg-[#141A20] text-[#E8ECF0] border-[#263038] hover:border-signal-500'
                    }`}
                  >
                    {/* Brass Rivet Dot */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${
                        isSelected ? 'bg-white' : 'bg-signal'
                      }`}
                    />
                    <span>${loc.price_per_bag_per_day}/d</span>
                  </div>

                  {/* Pin Stalk / Direction Pointer */}
                  <div
                    className={`w-[1px] h-2.5 ${
                      isSelected ? 'bg-cargo-500' : 'bg-[#3A4854]'
                    }`}
                  />
                  <div
                    className={`w-1 h-1 rounded-full ${
                      isSelected ? 'bg-cargo-500' : 'bg-[#5A6672]'
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM ACTIVE HUB TELEMETRY SLIP */}
      {activeLocation && (
        <div className="z-20 bg-[#141A20] border border-[#263038] rounded-[4px] p-3 text-[#E8ECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="truncate space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-[#263038] text-signal rounded-[2px] font-bold">
                TARGET LOCK
              </span>
              <h4 className="font-display font-bold text-sm text-[#E8ECF0] truncate">
                {activeLocation.name}
              </h4>
            </div>
            <p className="font-mono text-xs text-[#718096] truncate">
              {activeLocation.address}
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right font-mono">
              <span className="text-[9px] text-[#718096] block uppercase">Daily Rate</span>
              <SplitFlapTicker
                value={activeLocation.price_per_bag_per_day.toFixed(2)}
                prefix="$"
                size="sm"
              />
            </div>

            <button
              type="button"
              onClick={() => onBookLocation(activeLocation)}
              className="py-2 px-3.5 bg-cargo-500 hover:bg-cargo-600 text-white font-mono text-xs font-bold rounded-[3px] shadow-cargo-glow transition-all active:scale-95"
            >
              Direct Book
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
