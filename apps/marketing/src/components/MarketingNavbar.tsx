import React, { useEffect, useState } from 'react';
import { Luggage, ArrowUpRight } from 'lucide-react';

export const MarketingNavbar: React.FC = () => {
  const [times, setTimes] = useState({
    utc: '',
    ber: '',
    nyc: '',
    tyo: '',
  });

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      setTimes({
        utc: now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false }),
        ber: now.toLocaleTimeString('en-US', { timeZone: 'Europe/Berlin', hour12: false }),
        nyc: now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false }),
        tyo: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour12: false }),
      });
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F12]/90 backdrop-blur-md border-b border-[#263038] font-mono">
      {/* Top World Clocks Telemetry Strip */}
      <div className="hidden md:flex items-center justify-between px-6 py-1.5 bg-[#050709] border-b border-[#1E252B] text-[10px] text-[#8C9BA8]">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#74D680] animate-pulse" />
            <span className="text-[#E8ECF0] font-bold">STATION NETWORK ACTIVE</span>
          </div>
          <span>•</span>
          <span>BER: {times.ber}</span>
          <span>UTC: {times.utc}</span>
          <span>NYC: {times.nyc}</span>
          <span>TYO: {times.tyo}</span>
        </div>

        <div className="flex items-center space-x-3 text-[#5A6874]">
          <span>TELEMETRY: ZERO DEADWEIGHT</span>
          <span>// PROTOCOL 4.15</span>
        </div>
      </div>

      {/* Main Livery Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Mark */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-[#1E252B] border border-[#37444F] rounded-sm flex items-center justify-center text-[#FF6B35]">
            <Luggage className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-display font-extrabold tracking-tight text-[#E8ECF0]">
              UNBURDENED<span className="text-[#FF6B35]">.TRANSIT</span>
            </div>
            <div className="text-[9px] text-[#8C9BA8] tracking-widest uppercase">
              TACTILE WAYFINDING & LUGGAGE TELEMETRY
            </div>
          </div>
        </div>

        {/* Navigation Anchors */}
        <nav className="hidden lg:flex items-center space-x-8 text-xs font-semibold uppercase tracking-wider text-[#8C9BA8]">
          <a href="#network" className="hover:text-[#E8ECF0] transition-colors">
            01/ HUB NETWORK
          </a>
          <a href="#departures" className="hover:text-[#E8ECF0] transition-colors">
            02/ DEPARTURES
          </a>
          <a href="#custody" className="hover:text-[#E8ECF0] transition-colors">
            03/ TYVEK CUSTODY
          </a>
          <a href="#corridors" className="hover:text-[#E8ECF0] transition-colors">
            04/ LAST-MILE
          </a>
        </nav>

        {/* Booking App Action Button */}
        <a
          href="http://localhost:3000"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FF6B35] hover:bg-[#E85D26] text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow-sm transition-all"
        >
          <span>LAUNCH BOOKING APP</span>
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
};
