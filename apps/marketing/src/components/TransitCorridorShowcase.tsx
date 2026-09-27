import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export const TransitCorridorShowcase: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="max-w-2xl">
        <div className="text-[11px] font-mono uppercase tracking-widest text-[#FF6B35] mb-2">
          CORRIDOR TELEMETRY COMPARISON //
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-extrabold text-[#E8ECF0] tracking-tight">
          The physics of unburdened transit vs. the friction of baggage drag.
        </h2>
        <p className="text-sm text-[#8C9BA8] mt-2 leading-relaxed">
          Standard travel is burdened by an invisible tax: 3–6 hours lost between hotel check-outs and evening flights. Here is how our telemetry protocol reclaims that time.
        </p>
      </div>

      {/* Comparison Split Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Traditional Friction Card */}
        <div className="p-6 rounded-lg bg-[#0E1317] border border-[#263038] space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#263038] pb-3 font-mono text-xs">
            <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> TRADITIONAL FRICTION (STATUS QUO)
            </span>
            <span className="text-[#5A6874]">TAX: -4.5 HOURS</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#141A1F] rounded-sm border border-[#263038] text-slate-300">
              <span className="text-rose-400 font-bold block mb-1">11:00 AM // HOTEL CHECKOUT</span>
              Forced to haul heavy bags onto crowded transit or pay exorbitant baggage holding fees.
            </div>

            <div className="p-3 bg-[#141A1F] rounded-sm border border-[#263038] text-slate-300">
              <span className="text-rose-400 font-bold block mb-1">01:30 PM // SIGHTSEEING DRAG</span>
              Denied museum entry due to oversized luggage. Restricted mobility on metro stairs and cobblestone streets.
            </div>

            <div className="p-3 bg-[#141A1F] rounded-sm border border-[#263038] text-slate-300">
              <span className="text-rose-400 font-bold block mb-1">04:30 PM // RUSH & RETRIEVAL</span>
              Forced detour back across the city to original lodging before rushing to airport. Double transit costs.
            </div>
          </div>

          <div className="pt-2 border-t border-[#263038] font-mono text-xs text-rose-400 font-bold">
            TOTAL DEADWEIGHT: 28KG • TIME LOST: ~4.5 HOURS
          </div>
        </div>

        {/* Unburdened Telemetry Card */}
        <div className="p-6 rounded-lg bg-[#0E1714] border border-[#2A524A] space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#2A524A] pb-3 font-mono text-xs">
            <span className="text-[#74D680] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> UNBURDENED PROTOCOL (GO-TRAVEL)
            </span>
            <span className="text-[#52988B]">RECLAIMED: +100% FREEDOM</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#132622] rounded-sm border border-[#2A524A] text-slate-200">
              <span className="text-[#FF6B35] font-bold block mb-1">11:00 AM // STATION LOCKER DROP (90s)</span>
              Drop bags at verified vault hub next to transit platform. Tyvek serialized pass generated with cryptographic proof.
            </div>

            <div className="p-3 bg-[#132622] rounded-sm border border-[#2A524A] text-slate-200">
              <span className="text-[#FF6B35] font-bold block mb-1">11:05 AM // BAGLESS EXPLORATION</span>
              Move freely through museums, cafés, and urban corridors with zero deadweight.
            </div>

            <div className="p-3 bg-[#132622] rounded-sm border border-[#2A524A] text-slate-200">
              <span className="text-[#FF6B35] font-bold block mb-1">05:00 PM // 1-TAP DISPATCH & AIRPORT LINK</span>
              Scheduled 1h reminder pings device. Quick pickup and integrated taxi transit right to departures terminal.
            </div>
          </div>

          <div className="pt-2 border-t border-[#2A524A] font-mono text-xs text-[#74D680] font-bold">
            ZERO PHYSICAL DRAG • 100% UNBURDENED TRANSIT
          </div>
        </div>
      </div>
    </div>
  );
};
