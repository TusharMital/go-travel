import { useEffect } from 'react';
import Lenis from 'lenis';
import { MarketingNavbar } from './components/MarketingNavbar';
import { CustomTelemetryCursor } from './components/CustomTelemetryCursor';
import { TransitShaderHero } from './components/TransitShaderHero';
import { SplitFlapDepartureWall } from './components/SplitFlapDepartureWall';
import { InteractiveLuggageTag } from './components/InteractiveLuggageTag';
import { TransitCorridorShowcase } from './components/TransitCorridorShowcase';
import { ArrowRight, ArrowUpRight, Luggage } from 'lucide-react';

export default function App() {
  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F12] text-[#E8ECF0] selection:bg-[#FF6B35] selection:text-white relative">
      <CustomTelemetryCursor />
      <MarketingNavbar />

      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-[#263038] py-20 px-4 sm:px-6 lg:px-8">
        {/* Kinetic Shader Canvas Canvas */}
        <TransitShaderHero />

        {/* Content Overlay */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-sm bg-[#1E252B] border border-[#37444F] font-mono text-[11px] uppercase tracking-widest text-[#FF6B35]">
            <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-ping" />
            <span>TERMINAL WAYFINDING • ACTIVE TRANSIT CORRIDORS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tight text-[#E8ECF0] leading-[1.05]">
            Explore cities without luggage dragging you down.
          </h1>

          <p className="max-w-2xl mx-auto text-[#8C9BA8] text-base sm:text-lg leading-relaxed">
            Bridge itinerary arrival & departure gaps. Secure verified locker vaults with Tyvek baggage claim stubs, orchestrate last-mile transit, and navigate without deadweight.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 font-mono">
            <a
              href="http://localhost:3000"
              className="px-8 py-4 bg-[#FF6B35] hover:bg-[#E85D26] text-white font-bold text-xs uppercase tracking-wider rounded-sm shadow-xl shadow-[#FF6B35]/20 transition-all flex items-center space-x-2"
            >
              <span>ENTER STATION APP</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <a
              href="#custody"
              className="px-6 py-4 bg-[#1E252B] hover:bg-[#263038] text-[#E8ECF0] border border-[#37444F] font-semibold text-xs uppercase tracking-wider rounded-sm transition-all"
            >
              INSPECT TYVEK CUSTODY TAG
            </a>
          </div>

          {/* Hero Telemetry Status Bar */}
          <div className="pt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#263038]/60 font-mono text-xs text-left max-w-3xl mx-auto">
            <div className="p-3 bg-[#0B0F12]/80 border border-[#1E252B] rounded-sm">
              <span className="text-[#5A6874] block text-[10px] uppercase">STORAGE HUBS</span>
              <span className="text-[#E8ECF0] font-bold text-sm">142 SECURE</span>
            </div>
            <div className="p-3 bg-[#0B0F12]/80 border border-[#1E252B] rounded-sm">
              <span className="text-[#5A6874] block text-[10px] uppercase">GAP ELIMINATION</span>
              <span className="text-[#74D680] font-bold text-sm">0.00ms DRAG</span>
            </div>
            <div className="p-3 bg-[#0B0F12]/80 border border-[#1E252B] rounded-sm">
              <span className="text-[#5A6874] block text-[10px] uppercase">CUSTODY PROOF</span>
              <span className="text-[#FF6B35] font-bold text-sm">TYVEK STAMPED</span>
            </div>
            <div className="p-3 bg-[#0B0F12]/80 border border-[#1E252B] rounded-sm">
              <span className="text-[#5A6874] block text-[10px] uppercase">LAST-MILE TRANSIT</span>
              <span className="text-[#F2C94C] font-bold text-sm">MULTI-MODAL</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: MECHANICAL DEPARTURE WALL */}
      <section id="departures" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#FF6B35] mb-2">
              DISPATCH TELEMETRY //
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#E8ECF0]">
              Mechanical Split-Flap Departure Wall
            </h2>
          </div>
          <p className="text-xs font-mono text-[#8C9BA8] max-w-md">
            Real-time status updates broadcast across central railway terminals, aerodromes, and secure locker nodes.
          </p>
        </div>

        <SplitFlapDepartureWall />
      </section>

      {/* SECTION 2: INTERACTIVE TYVEK CUSTODY TAG */}
      <section id="custody" className="py-24 px-4 sm:px-6 lg:px-8 border-y border-[#263038] bg-[#070A0D]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#FF6B35]">
              PHYSICAL TANGIBILITY //
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#E8ECF0] leading-tight">
              A cryptographic baggage claim tag you can feel.
            </h2>
            <p className="text-[#8C9BA8] text-sm leading-relaxed">
              We replaced generic app checkmarks with tactile Tyvek luggage tags. Every storage booking generates a perforated claim stub, serialized barcode, and immutable insurance stamp.
            </p>

            <div className="space-y-3 font-mono text-xs text-[#8C9BA8]">
              <div className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                <span>Micro-perforated physical tear boundaries for custody split</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#74D680]" />
                <span>Audited barcode scans for check-in and checkout handoffs</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C]" />
                <span>Brass eyelet grommet detailing with serialized asset tracking</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <InteractiveLuggageTag />
          </div>
        </div>
      </section>

      {/* SECTION 3: CORRIDOR TELEMETRY COMPARISON */}
      <section id="corridors" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <TransitCorridorShowcase />
      </section>

      {/* SECTION 4: CALL TO ACTION BANNER */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-[#263038] bg-[#070A0D]">
        <div className="max-w-4xl mx-auto bg-[#0B0F12] border border-[#263038] rounded-xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#74D680] bg-[#1E3A34]/20 border border-[#2A524A] px-3 py-1 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#74D680] animate-ping" />
              <span>READY FOR DISPATCH // LIVE DEPLOYMENT</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-[#E8ECF0]">
              Travel unburdened today.
            </h2>
            <p className="text-sm text-[#8C9BA8] max-w-lg mx-auto">
              Access verified luggage lockers, calculate last-mile routes, and bridge your journey gaps with zero physical deadweight.
            </p>

            <div className="pt-2">
              <a
                href="http://localhost:3000"
                className="inline-flex items-center space-x-2 px-8 py-4 bg-[#FF6B35] hover:bg-[#E85D26] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-sm shadow-xl transition-all"
              >
                <span>OPEN LIVE APP (:3000)</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1E252B] py-12 px-4 sm:px-6 lg:px-8 font-mono text-xs text-[#5A6874] bg-[#050709]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-[#8C9BA8]">
            <Luggage className="w-4 h-4 text-[#FF6B35]" />
            <span className="font-bold text-[#E8ECF0]">GO-TRAVEL TELEMETRY //</span>
            <span>MODULE 4.15 PREMIUM IDENTITY PASS</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span>STATION PORTAL: :3001</span>
            <span>•</span>
            <span>ADMIN CONSOLE: :3002</span>
            <span>•</span>
            <span className="text-[#74D680]">ALL 204 TESTS PASSING</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
