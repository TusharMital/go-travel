import React, { useEffect, useState } from 'react';

interface FlightRow {
  destination: string;
  service: string;
  status: string;
  code: string;
  time: string;
}

const DEPARTURE_CYCLES: FlightRow[][] = [
  [
    { destination: 'BERLIN CENTRAL', service: 'SECURE VAULT 04', status: 'CUSTODY ACTIVE', code: 'BER-902', time: '10:45' },
    { destination: 'LONDON ST PANCRAS', service: 'TAXI CORRIDOR', status: 'DISPATCH READY', code: 'STP-114', time: '11:15' },
    { destination: 'PARIS GARE DE LYON', service: 'LOCKER BANK 12', status: 'CONFIRMED', code: 'PAR-488', time: '11:30' },
    { destination: 'TOKYO SHINJUKU', service: 'HANDS-FREE METRO', status: 'EN ROUTE', code: 'TYO-021', time: '12:00' },
  ],
  [
    { destination: 'ZURICH HB TERMINAL', service: 'SECURE VAULT 01', status: 'SEALED & AUDITED', code: 'ZRH-309', time: '12:15' },
    { destination: 'AMSTERDAM CENTRAAL', service: 'CANAL TAXI LINK', status: 'DISPATCH READY', code: 'AMS-642', time: '12:40' },
    { destination: 'VIENNA HAUPTBAHNHOF', service: 'LOCKER BANK 08', status: 'CUSTODY ACTIVE', code: 'VIE-518', time: '13:05' },
    { destination: 'NEW YORK GRAND CTRL', service: 'SUBWAY CORRIDOR', status: 'TRANSIT CLEAR', code: 'NYC-704', time: '13:30' },
  ],
];

export const SplitFlapDepartureWall: React.FC = () => {
  const [cycleIndex, setCycleIndex] = useState(0);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlipping(true);
      setTimeout(() => {
        setCycleIndex((prev) => (prev + 1) % DEPARTURE_CYCLES.length);
        setFlipping(false);
      }, 400);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const currentRows = DEPARTURE_CYCLES[cycleIndex];

  return (
    <div className="bg-[#050709] border border-[#263038] rounded-xl p-4 sm:p-6 shadow-2xl font-mono relative overflow-hidden">
      {/* Telemetry Livery Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#263038] pb-3 mb-4 text-xs text-[#8C9BA8]">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-[#FF6B35] rounded-full animate-ping" />
          <span className="font-bold text-[#E8ECF0] tracking-widest uppercase">
            TERMINAL TELEMETRY DISPATCH BOARD
          </span>
        </div>
        <div className="text-[10px] text-[#5A6874] uppercase tracking-wider hidden sm:block">
          MECHANICAL SPLIT-FLAP // REFRESH 4.5s
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-widest text-[#5A6874] mb-2 px-2">
        <span className="col-span-2">FLIGHT / REF</span>
        <span className="col-span-4">DESTINATION HUB</span>
        <span className="col-span-3">TRANSIT SERVICE</span>
        <span className="col-span-2">TELEMETRY STATUS</span>
        <span className="col-span-1 text-right">TIME</span>
      </div>

      {/* Departure Rows */}
      <div className="space-y-2">
        {currentRows.map((row, idx) => (
          <div
            key={idx}
            className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-sm bg-[#0B0F12] border border-[#1E252B] transition-transform duration-200 ${
              flipping ? 'scale-[0.99] opacity-70' : 'scale-100 opacity-100'
            }`}
          >
            {/* Code */}
            <span className="col-span-2 text-xs font-bold text-[#FF6B35]">
              {row.code}
            </span>

            {/* Destination */}
            <div className="col-span-4 flex items-center space-x-1.5 overflow-hidden">
              <span className="text-xs sm:text-sm font-bold text-[#E8ECF0] tracking-wide truncate">
                {row.destination}
              </span>
            </div>

            {/* Service */}
            <span className="col-span-3 text-xs text-[#8C9BA8] truncate">
              {row.service}
            </span>

            {/* Status */}
            <div className="col-span-2">
              <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm bg-[#1E252B] text-[#74D680] border border-[#37444F]">
                {row.status}
              </span>
            </div>

            {/* Time */}
            <span className="col-span-1 text-xs text-[#F2C94C] font-semibold text-right">
              {row.time}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom Telemetry Ticker */}
      <div className="mt-4 pt-3 border-t border-[#1E252B] flex flex-wrap items-center justify-between text-[10px] text-[#5A6874]">
        <span>ALL TRANSIT CHANNELS MONITORED // ZERO LUGGAGE DEADWEIGHT</span>
        <span className="text-[#FF6B35]">STATION TIME: UTC+01:00 (BERLIN)</span>
      </div>
    </div>
  );
};
