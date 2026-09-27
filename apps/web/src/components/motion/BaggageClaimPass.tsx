import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, ShieldCheck, Download, Share2, ArrowRight, ExternalLink } from 'lucide-react';

interface BaggageClaimPassProps {
  bookingId: string;
  type: 'storage' | 'transport';
  serviceName: string;
  locationAddress: string;
  timeWindowStart: string;
  timeWindowEnd?: string;
  bagCount?: number;
  providerName?: string;
  totalPrice: number;
  currency?: string;
  onDone: () => void;
  onViewBookings?: () => void;
}

export const BaggageClaimPass: React.FC<BaggageClaimPassProps> = ({
  bookingId,
  type,
  serviceName,
  locationAddress,
  timeWindowStart,
  timeWindowEnd,
  bagCount = 1,
  providerName,
  totalPrice,
  currency = 'USD',
  onDone,
  onViewBookings,
}) => {
  const [stampLanded, setStampLanded] = useState(false);
  const [stubTorn, setStubTorn] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const formattedRef = bookingId.length > 10 ? bookingId.slice(0, 8).toUpperCase() : bookingId.toUpperCase();
  const serialNo = `TRV-${type.toUpperCase().slice(0, 3)}-${formattedRef}`;

  useEffect(() => {
    // Sequence the stamp impact and tear
    const stampTimer = setTimeout(() => {
      setStampLanded(true);
    }, 280);

    const tearTimer = setTimeout(() => {
      setStubTorn(true);
    }, 1100);

    return () => {
      clearTimeout(stampTimer);
      clearTimeout(tearTimer);
    };
  }, []);

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(bookingId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="relative py-2 px-1 max-w-md mx-auto select-none">
      {/* Visual Screen Shake Trigger during Stamp Impact */}
      <motion.div
        animate={stampLanded ? { x: [0, -2, 3, -1, 1, 0], y: [0, 2, -2, 1, 0] } : {}}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative"
      >
        {/* PHYSICAL BOARDING PASS CONTAINER */}
        <div className="bg-[#E8ECF0] text-[#0B0F12] rounded-[4px] border border-[#263038] shadow-2xl overflow-hidden relative font-sans">
          {/* Top Luggage Stencil Bar */}
          <div className="bg-[#0B0F12] text-[#E8ECF0] px-4 py-2.5 flex items-center justify-between border-b border-[#263038]">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cargo-500 inline-block animate-pulse" />
              <span className="font-mono text-[11px] tracking-wider uppercase font-bold text-parchment-200">
                {type === 'storage' ? 'LUGGAGE CLAIM RECEIPT' : 'TRANSIT BOARDING PASS'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-signal font-semibold tracking-widest">
              {serialNo}
            </span>
          </div>

          {/* MAIN TICKET BODY */}
          <div className="p-5 relative">
            {/* Background Tyvek Watermark */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none select-none font-display font-black text-7xl text-[#0B0F12] leading-none">
              TRANSIT
            </div>

            {/* Brass Eyelet Luggage Ring */}
            <div className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-[#8A95A0] bg-[#D5DDE4] flex items-center justify-center shadow-inner">
              <div className="w-2 h-2 rounded-full bg-[#0B0F12]" />
            </div>

            {/* Primary Waypoint Title */}
            <div className="pr-8">
              <span className="font-mono text-[10px] text-[#4A5560] uppercase tracking-wider block font-semibold">
                Designated Station / Facility
              </span>
              <h3 className="font-display font-extrabold text-xl text-[#0B0F12] tracking-tight leading-snug mt-0.5">
                {serviceName}
              </h3>
              <p className="font-mono text-xs text-[#5A6672] mt-0.5 truncate">
                {locationAddress}
              </p>
            </div>

            {/* Grid Telemetry */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[#BAC6D1]/80 font-mono text-xs">
              <div>
                <span className="text-[10px] text-[#5A6672] uppercase font-semibold block">
                  {type === 'storage' ? 'Drop-Off Window' : 'Scheduled Pickup'}
                </span>
                <span className="font-bold text-[#0B0F12]">
                  {new Date(timeWindowStart).toLocaleDateString([], { month: 'short', day: 'numeric' })} •{' '}
                  {new Date(timeWindowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {timeWindowEnd ? (
                <div>
                  <span className="text-[10px] text-[#5A6672] uppercase font-semibold block">
                    Claim By Pickup
                  </span>
                  <span className="font-bold text-[#0B0F12]">
                    {new Date(timeWindowEnd).toLocaleDateString([], { month: 'short', day: 'numeric' })} •{' '}
                    {new Date(timeWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] text-[#5A6672] uppercase font-semibold block">
                    Operator / Carrier
                  </span>
                  <span className="font-bold text-[#0B0F12] truncate block">
                    {providerName || 'Licensed Partner'}
                  </span>
                </div>
              )}

              <div>
                <span className="text-[10px] text-[#5A6672] uppercase font-semibold block">
                  Capacity Reserved
                </span>
                <span className="font-bold text-[#0B0F12]">
                  {bagCount} {bagCount === 1 ? 'Bag' : 'Bags'} [SEAL SECURED]
                </span>
              </div>

              <div>
                <span className="text-[10px] text-[#5A6672] uppercase font-semibold block">
                  Payment Captured
                </span>
                <span className="font-bold text-cargo-600 text-sm">
                  ${totalPrice.toFixed(2)} {currency}
                </span>
              </div>
            </div>

            {/* THE BRASS INK SEAL STAMP ANIMATION */}
            <motion.div
              initial={{ scale: 2.8, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: -6, opacity: 0.95 }}
              transition={{
                delay: 0.25,
                duration: 0.32,
                ease: [0.34, 1.56, 0.64, 1], // Mechanical latch curve
              }}
              className="absolute right-6 bottom-4 pointer-events-none z-20"
            >
              <div className="border-4 border-dashed border-[#1E3A34] text-[#1E3A34] px-3.5 py-1.5 rounded-[4px] font-display font-black tracking-widest text-sm uppercase text-center shadow-xs bg-[#1E3A34]/5">
                <div className="text-[8px] font-mono tracking-widest text-[#1E3A34]/80">AUTHORITY SEAL</div>
                CONFIRMED & LOCKED
                <div className="text-[7px] font-mono tracking-widest text-[#1E3A34]/70">VERIFIED ESCROW</div>
              </div>
            </motion.div>
          </div>

          {/* PERFORATED TEAR SEPARATOR WITH TICKET NOTCHES */}
          <div className="relative py-2 flex items-center justify-between">
            {/* Left Notch */}
            <div className="w-4 h-4 bg-[#0B0F12] rounded-r-full border-r border-[#263038] -ml-2 z-10" />

            {/* Dashed Tear Line */}
            <div className="flex-1 border-t-2 border-dashed border-[#8A95A0] mx-2" />

            {/* Center Tear Indicator */}
            <span className="font-mono text-[8px] uppercase tracking-widest text-[#5A6672] bg-[#E8ECF0] px-2 z-10">
              TEAR ALONG PERFORATION
            </span>

            {/* Dashed Tear Line Continued */}
            <div className="flex-1 border-t-2 border-dashed border-[#8A95A0] mx-2" />

            {/* Right Notch */}
            <div className="w-4 h-4 bg-[#0B0F12] rounded-l-full border-l border-[#263038] -mr-2 z-10" />
          </div>

          {/* LOWER SCANNER CLAIM STUB */}
          <div className="bg-[#DDE3EA] p-4 flex items-center justify-between border-t border-[#BAC6D1]">
            <div className="space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#4A5560] block font-bold">
                Digital Passcode & Gate Scan
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="font-mono font-black text-sm text-[#0B0F12] tracking-wider hover:text-cargo-600 transition-colors"
                  title="Click to copy booking ID"
                >
                  {formattedRef}
                </button>
                {isCopied && (
                  <span className="font-mono text-[10px] text-concourse font-bold">
                    ✓ Copied
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#5A6672]">
                Present directly to partner custodian upon arrival.
              </p>
            </div>

            {/* Physical QR Scan Stamp */}
            <div className="p-2 bg-white rounded-[3px] border border-[#BAC6D1] shadow-xs shrink-0">
              <QrCode className="w-10 h-10 text-[#0B0F12]" />
            </div>
          </div>

          {/* Mock Barcode Optical Line */}
          <div className="bg-[#0B0F12] px-4 py-1.5 flex items-center justify-between font-mono text-[9px] text-[#718096]">
            <span>||| | | |||| || | |||| ||| || | |||</span>
            <span className="text-[8px] text-signal font-mono">ENCRYPTED IDEMPOTENT PAYLOAD</span>
          </div>
        </div>
      </motion.div>

      {/* ACTION CONTROLS */}
      <div className="mt-5 flex items-center space-x-3">
        {onViewBookings ? (
          <button
            type="button"
            onClick={onViewBookings}
            className="flex-1 py-3 px-4 bg-[#141A20] hover:bg-[#1D252E] text-[#E8ECF0] border border-[#263038] font-mono text-xs font-bold rounded-[4px] transition-all flex items-center justify-center space-x-1.5"
          >
            <span>View Active Passes</span>
            <ArrowRight className="w-3.5 h-3.5 text-signal" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onDone}
          className="flex-1 py-3 px-4 bg-cargo-500 hover:bg-cargo-600 text-white font-mono text-xs font-bold rounded-[4px] shadow-cargo-glow transition-all flex items-center justify-center space-x-1.5"
        >
          <span>Acknowledge & Close</span>
        </button>
      </div>
    </div>
  );
};
