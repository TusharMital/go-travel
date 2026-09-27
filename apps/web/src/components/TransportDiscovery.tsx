import React, { useState, useEffect } from 'react';
import {
  Car,
  Navigation,
  Train,
  Bike,
  Clock,
  DollarSign,
  MapPin,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react';
import { api } from '../api/client';
import { TransportReviewsModal } from './TransportReviewsModal';
import { BaggageClaimPass } from './motion/BaggageClaimPass';
import { SplitFlapTicker } from './motion/SplitFlapTicker';

interface TransportOption {
  id: string;
  provider_id?: string;
  provider_name: string;
  mode: 'transit' | 'taxi' | 'rideshare' | 'bike' | string;
  estimated_price: number;
  currency: string;
  estimated_duration_min: number;
  is_direct_bookable: boolean;
  deep_link_url?: string | null;
  transit_steps?: {
    instruction: string;
    mode: 'walk' | 'subway' | 'bus' | 'tram' | 'train';
    line?: string;
    durationMinutes: number;
    distanceMeters?: number;
  }[] | null;
}

interface TransportDiscoveryProps {
  initialOrigin?: { lat: number; lng: number; label?: string };
  initialDestination?: { lat: number; lng: number; label?: string };
  onBookingSuccess?: () => void;
  tripId?: string;
}

const PRESET_LOCATIONS = [
  { label: 'Berlin Hauptbahnhof (Central Station)', lat: 52.5251, lng: 13.3694 },
  { label: 'Alexanderplatz (TV Tower)', lat: 52.5219, lng: 13.4132 },
  { label: 'Brandenburg Gate', lat: 52.5163, lng: 13.3777 },
  { label: 'BER Berlin Brandenburg Airport', lat: 52.3667, lng: 13.5033 },
  { label: 'Checkpoint Charlie', lat: 52.5074, lng: 13.3904 },
];

export const TransportDiscovery: React.FC<TransportDiscoveryProps> = ({
  initialOrigin,
  initialDestination,
  onBookingSuccess,
  tripId,
}) => {
  // Coordinates and query states
  const [originLat, setOriginLat] = useState<number>(initialOrigin?.lat ?? 52.5251);
  const [originLng, setOriginLng] = useState<number>(initialOrigin?.lng ?? 13.3694);
  const [destLat, setDestLat] = useState<number>(initialDestination?.lat ?? 52.5219);
  const [destLng, setDestLng] = useState<number>(initialDestination?.lng ?? 13.4132);
  const [originLabel, setOriginLabel] = useState<string>(initialOrigin?.label ?? 'Berlin Hauptbahnhof');
  const [destLabel, setDestLabel] = useState<string>(initialDestination?.label ?? 'Alexanderplatz');
  const [selectedTime, setSelectedTime] = useState<string>(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  );

  // Filters
  const [selectedMode, setSelectedMode] = useState<string>('all');

  // Search execution state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<TransportOption[]>([]);
  const [expandedStepsId, setExpandedStepsId] = useState<string | null>(null);

  // Direct Booking Modal state
  const [bookingModalOption, setBookingModalOption] = useState<TransportOption | null>(null);
  const [reviewsModalOption, setReviewsModalOption] = useState<TransportOption | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // Handoff Notification state
  const [handoffSuccess, setHandoffSuccess] = useState<{ provider: string; url: string } | null>(null);

  const fetchOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const query: any = {
        origin_lat: originLat,
        origin_lng: originLng,
        dest_lat: destLat,
        dest_lng: destLng,
        departure_time: new Date(selectedTime).toISOString(),
      };
      if (selectedMode !== 'all') {
        query.mode = selectedMode;
      }

      const res = await api.searchTransportOptions(query);
      setOptions(res.data || []);
      // Automatically expand transit steps if available
      const transitOpt = (res.data || []).find((o: TransportOption) => o.transit_steps && o.transit_steps.length > 0);
      if (transitOpt) {
        setExpandedStepsId(transitOpt.id);
      }
    } catch (err: any) {
      console.error('Transport options fetch failed:', err);
      setError(err.message || 'Unable to retrieve transport quotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [originLat, originLng, destLat, destLng, selectedMode]);

  const handleSwapLocations = () => {
    const tmpLat = originLat;
    const tmpLng = originLng;
    const tmpLbl = originLabel;
    setOriginLat(destLat);
    setOriginLng(destLng);
    setOriginLabel(destLabel);
    setDestLat(tmpLat);
    setDestLng(tmpLng);
    setDestLabel(tmpLbl);
  };

  const handleHandoff = async (opt: TransportOption) => {
    try {
      const deepLink = opt.deep_link_url || `https://m.uber.com/ul/?action=setPickup`;
      await api.recordTransportHandoff({
        transport_option_id: opt.id,
        deep_link_url: deepLink,
      });

      setHandoffSuccess({ provider: opt.provider_name, url: deepLink });
      // Open partner URL in a new tab
      window.open(deepLink, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(`Handoff error: ${err.message || 'Failed to process deep link'}`);
    }
  };

  const handleConfirmDirectBooking = async () => {
    if (!bookingModalOption) return;
    setBookingLoading(true);
    try {
      const idempotencyKey = `idem-tb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const payload = {
        transport_option_id: bookingModalOption.id,
        trip_id: tripId || undefined,
        origin_lat: originLat,
        origin_lng: originLng,
        dest_lat: destLat,
        dest_lng: destLng,
        scheduled_at: new Date(selectedTime).toISOString(),
        payment_method: 'card',
        notes: bookingNotes || undefined,
      };

      const result = await api.createTransportBooking(payload, idempotencyKey);
      setBookingSuccess(result);
      if (onBookingSuccess) onBookingSuccess();
    } catch (err: any) {
      alert(`Booking failed: ${err.message || 'Please check your inputs and try again.'}`);
    } finally {
      setBookingLoading(false);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'transit':
        return <Train className="w-5 h-5 text-[#FF6B35]" />;
      case 'taxi':
        return <Car className="w-5 h-5 text-[#F2C94C]" />;
      case 'rideshare':
        return <Navigation className="w-5 h-5 text-slate-800" />;
      case 'bike':
        return <Bike className="w-5 h-5 text-[#1E3A34]" />;
      default:
        return <Car className="w-5 h-5 text-[#FF6B35]" />;
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'transit':
        return (
          <span className="bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30 text-[11px] font-mono px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">
            Public Transit
          </span>
        );
      case 'taxi':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            City Taxi
          </span>
        );
      case 'rideshare':
        return (
          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            Rideshare
          </span>
        );
      case 'bike':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            Micro-mobility
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            {mode}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Route & Search Header Card */}
      <div className="bg-[#141A20] text-[#E8ECF0] rounded-[4px] border border-[#263038] p-5 shadow-transit-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#263038] pb-4 mb-4">
          <div>
            <div className="flex items-center space-x-2 text-cargo-500 mb-1">
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#1C242A] text-signal font-bold rounded-[2px] border border-[#263038]">
                INTERMODAL DISPATCH
              </span>
              <span className="font-mono text-[10px] text-[#718096]">LAST-MILE TRANSIT GRID</span>
            </div>
            <h2 className="text-xl font-display font-black text-[#E8ECF0] tracking-tight">
              TRANSIT & TRANSFER ROUTING
            </h2>
            <p className="text-xs text-[#718096] font-mono mt-0.5">
              Live telemetry quotes from licensed taxis, city rapid transit, and direct partner handoffs.
            </p>
          </div>

          {/* Departure Time Selector */}
          <div className="flex items-center space-x-2 bg-[#0B0F12] border border-[#263038] rounded-[3px] px-3 py-2 text-xs font-mono">
            <Clock className="w-4 h-4 text-signal" />
            <span className="font-semibold text-[#718096]">DEPARTURE:</span>
            <input
              type="datetime-local"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="bg-transparent font-mono text-[#E8ECF0] focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Origin / Destination Pickers with Presets */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Origin */}
          <div className="md:col-span-5 bg-[#0B0F12] border border-[#263038] rounded-[3px] p-3 focus-within:border-cargo-500 transition-all font-mono">
            <label className="text-[10px] font-bold text-cargo-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              ORIGIN WAYPOINT
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E8ECF0] truncate">{originLabel}</span>
              <select
                className="bg-[#141A20] border border-[#263038] rounded-[2px] text-xs py-1 px-2 text-[#E8ECF0] focus:outline-none focus:border-cargo-500 font-mono"
                value={originLabel}
                onChange={(e) => {
                  const loc = PRESET_LOCATIONS.find((p) => p.label === e.target.value);
                  if (loc) {
                    setOriginLabel(loc.label);
                    setOriginLat(loc.lat);
                    setOriginLng(loc.lng);
                  }
                }}
              >
                {PRESET_LOCATIONS.map((loc) => (
                  <option key={loc.label} value={loc.label}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[10px] text-[#718096] mt-1 font-mono">
              LAT: {originLat.toFixed(4)} // LNG: {originLng.toFixed(4)}
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={handleSwapLocations}
              className="p-2 rounded-[3px] bg-[#141A20] hover:bg-[#1E262C] hover:text-cargo-500 text-[#718096] transition-colors border border-[#263038]"
              title="Swap Origin and Destination"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Destination */}
          <div className="md:col-span-5 bg-[#0B0F12] border border-[#263038] rounded-[3px] p-3 focus-within:border-cargo-500 transition-all font-mono">
            <label className="text-[10px] font-bold text-signal uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              DESTINATION TERMINAL
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E8ECF0] truncate">{destLabel}</span>
              <select
                className="bg-[#141A20] border border-[#263038] rounded-[2px] text-xs py-1 px-2 text-[#E8ECF0] focus:outline-none focus:border-cargo-500 font-mono"
                value={destLabel}
                onChange={(e) => {
                  const loc = PRESET_LOCATIONS.find((p) => p.label === e.target.value);
                  if (loc) {
                    setDestLabel(loc.label);
                    setDestLat(loc.lat);
                    setDestLng(loc.lng);
                  }
                }}
              >
                {PRESET_LOCATIONS.map((loc) => (
                  <option key={loc.label} value={loc.label}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[10px] text-[#718096] mt-1 font-mono">
              LAT: {destLat.toFixed(4)} // LNG: {destLng.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Mode Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-[#263038] font-mono">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'ALL MODES' },
              { id: 'transit', label: '🚇 METRO / RAIL' },
              { id: 'taxi', label: '🚕 PARTNER TAXI' },
              { id: 'rideshare', label: '🚗 RIDESHARE' },
              { id: 'bike', label: '🚲 MICRO-TRANSIT' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMode(tab.id)}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-bold border transition-all ${
                  selectedMode === tab.id
                    ? 'bg-cargo-500 text-white border-cargo-500 shadow-cargo-glow'
                    : 'bg-[#0B0F12] border-[#263038] text-[#718096] hover:text-[#E8ECF0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchOptions}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#FF6B35] hover:bg-[#E85D26] text-white rounded-sm text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'Refreshing...' : 'Update Quotes'}</span>
          </button>
        </div>
      </div>

      {/* Handoff Toast Alert */}
      {handoffSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Partner Handoff Logged Successfully
              </h4>
              <p className="text-[11px] text-emerald-700">
                Opened {handoffSuccess.provider} deep link in a new window. Your trip record contains the handoff audit event.
              </p>
            </div>
          </div>
          <button
            onClick={() => setHandoffSuccess(null)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center space-x-3 text-rose-800 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-700">
            Available Route Options ({options.length})
          </h3>
          <span className="text-xs text-slate-400">
            Prices include local taxes & platform guarantees
          </span>
        </div>

        {loading ? (
          <div className="bg-[#141A20] rounded-[4px] border border-[#263038] p-12 text-center text-[#718096] font-mono text-xs space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cargo-500" />
            <p className="font-semibold">POLLING INTERMODAL TELEMETRY & DISPATCH METERS...</p>
          </div>
        ) : options.length === 0 ? (
          <div className="bg-[#141A20] rounded-[4px] border border-[#263038] p-12 text-center font-mono space-y-2">
            <Car className="w-9 h-9 text-[#3A4854] mx-auto" />
            <h4 className="text-sm font-bold text-[#E8ECF0]">NO ROUTING VECTORS FOUND</h4>
            <p className="text-xs text-[#718096] max-w-sm mx-auto">
              Modify designated origin/destination or select ALL MODES for complete transit sweep.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {options.map((opt) => {
              const hasSteps = opt.transit_steps && opt.transit_steps.length > 0;
              const isExpanded = expandedStepsId === opt.id;

              return (
                <div
                  key={opt.id}
                  className="bg-[#141A20] text-[#E8ECF0] rounded-[4px] border border-[#263038] p-4 shadow-transit-card hover:border-[#3A4854] transition-all select-none"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Provider Info & Mode */}
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2.5 bg-[#0B0F12] border border-[#263038] rounded-[3px] text-signal">
                        {getModeIcon(opt.mode)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display font-extrabold text-[#E8ECF0] text-sm">
                            {opt.provider_name}
                          </h4>
                          {getModeBadge(opt.mode)}
                          <button
                            onClick={() => setReviewsModalOption(opt)}
                            className="inline-flex items-center gap-1 text-signal font-mono text-[10px] font-bold bg-[#1C242A] px-2 py-0.5 rounded-[2px] border border-[#263038] hover:border-signal transition-colors"
                            title="View passenger ratings and reviews"
                          >
                            <Star className="w-3 h-3 fill-signal text-signal" />
                            <span>{(opt as any).rating || 4.8}</span>
                            <span className="text-[#718096]">
                              ({(opt as any).review_count || 16})
                            </span>
                          </button>
                        </div>
                        <div className="flex items-center space-x-3 text-xs font-mono text-[#718096] mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#718096]" />
                            ~{opt.estimated_duration_min} MINS
                          </span>
                          <span>//</span>
                          <span>
                            {opt.is_direct_bookable ? (
                              <span className="text-concourse-400 font-bold">DIRECT LOCKABLE</span>
                            ) : (
                              <span className="text-[#718096]">APP DEEP LINK</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#263038]">
                      <div className="text-right font-mono">
                        <SplitFlapTicker
                          value={opt.estimated_price.toFixed(2)}
                          prefix="$"
                          size="md"
                        />
                        <span className="text-[9px] text-[#718096] block uppercase tracking-wider mt-0.5">
                          ESTIMATED FARE
                        </span>
                      </div>

                      {opt.is_direct_bookable ? (
                        <button
                          onClick={() => {
                            setBookingModalOption(opt);
                            setBookingSuccess(null);
                          }}
                          className="px-3.5 py-2 bg-cargo-500 hover:bg-cargo-600 text-white rounded-[3px] font-mono text-xs font-bold shadow-cargo-glow transition-all flex items-center space-x-1.5 active:scale-95"
                        >
                          <span>BOOK RIDE</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleHandoff(opt)}
                          className="px-3.5 py-2 bg-[#0B0F12] hover:bg-[#1E262C] text-[#E8ECF0] border border-[#263038] rounded-[3px] font-mono text-xs font-bold transition-all flex items-center space-x-1.5"
                        >
                          <span>OPEN APP</span>
                          <ExternalLink className="w-3.5 h-3.5 text-signal" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Transit Steps Toggle if available */}
                  {hasSteps && (
                    <div className="mt-3 pt-2.5 border-t border-[#263038]">
                      <button
                        onClick={() => setExpandedStepsId(isExpanded ? null : opt.id)}
                        className="font-mono text-[11px] font-bold text-signal hover:text-signal-400 flex items-center space-x-1"
                      >
                        <span>{isExpanded ? '[-] HIDE INTERCHANGE WAYPOINTS' : '[+] VIEW INTERCHANGE WAYPOINTS'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 bg-[#0B0F12] rounded-[3px] p-3 border border-[#263038] space-y-2 font-mono animate-in fade-in">
                          {opt.transit_steps!.map((step, idx) => (
                            <div key={idx} className="flex items-start space-x-2.5 text-xs">
                              <div className="w-5 h-5 rounded-[2px] bg-[#141A20] border border-[#263038] text-signal flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-[#E8ECF0] flex items-center gap-2">
                                  <span>{step.instruction}</span>
                                  {step.line && (
                                    <span className="px-1.5 py-0.2 bg-[#1C242A] text-signal font-bold rounded-[2px] text-[10px] border border-[#263038]">
                                      {step.line}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Direct Booking Modal */}
      {bookingModalOption && (
        <div className="fixed inset-0 z-50 bg-[#0B0F12]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141A20] text-[#E8ECF0] rounded-[6px] max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#263038] space-y-4 animate-in zoom-in-95">
            {!bookingSuccess ? (
              <>
                <div className="flex items-center justify-between border-b border-[#263038] pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#1C242A] text-signal font-bold rounded-[2px] border border-[#263038]">
                        CARRIER DISPATCH
                      </span>
                      <h3 className="font-display text-sm font-bold text-[#E8ECF0]">
                        Confirm Transit Reservation
                      </h3>
                    </div>
                    <p className="font-mono text-xs text-[#718096] mt-0.5">
                      Direct carrier dispatch with atomic payment lock
                    </p>
                  </div>
                  <button
                    onClick={() => setBookingModalOption(null)}
                    className="p-1.5 rounded-[3px] text-[#718096] hover:text-[#E8ECF0] hover:bg-[#1E262C] transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-[#0B0F12] border border-[#263038] rounded-[3px] p-3.5 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#718096]">OPERATOR:</span>
                    <span className="font-bold text-[#E8ECF0]">{bookingModalOption.provider_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#718096]">ORIGIN:</span>
                    <span className="font-semibold text-[#E8ECF0] truncate max-w-[200px]">{originLabel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#718096]">DESTINATION:</span>
                    <span className="font-semibold text-[#E8ECF0] truncate max-w-[200px]">{destLabel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#718096]">DEPARTURE:</span>
                    <span className="font-semibold text-[#E8ECF0]">
                      {new Date(selectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(selectedTime).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#263038] pt-2">
                    <span className="font-bold text-[#E8ECF0]">CAPTURED FARE:</span>
                    <SplitFlapTicker
                      value={bookingModalOption.estimated_price.toFixed(2)}
                      prefix="$"
                      suffix=" USD"
                      size="md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold text-[#E8ECF0] mb-1">
                    PICKUP TELEMETRY & NOTES (OPTIONAL)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Flight LH123 arriving, meeting at Terminal 1 baggage claim curb"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full bg-[#0B0F12] border border-[#263038] rounded-[3px] p-2.5 font-mono text-xs text-[#E8ECF0] focus:outline-none focus:border-cargo-500"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => setBookingModalOption(null)}
                    className="flex-1 py-3 border border-[#263038] text-[#718096] hover:text-[#E8ECF0] hover:bg-[#1E262C] rounded-[3px] font-mono text-xs font-semibold transition-all"
                  >
                    ABORT
                  </button>
                  <button
                    onClick={handleConfirmDirectBooking}
                    disabled={bookingLoading}
                    className="flex-1 py-3 bg-cargo-500 hover:bg-cargo-600 text-white rounded-[3px] font-mono text-xs font-bold shadow-cargo-glow transition-all disabled:opacity-50 active:scale-95"
                  >
                    {bookingLoading ? 'DISPATCHING...' : `AUTHORIZE $${bookingModalOption.estimated_price.toFixed(2)}`}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-2">
                <BaggageClaimPass
                  bookingId={bookingSuccess.id}
                  type="transport"
                  serviceName={`${bookingModalOption.provider_name} [${bookingModalOption.mode.toUpperCase()}]`}
                  locationAddress={`${originLabel} → ${destLabel}`}
                  timeWindowStart={selectedTime}
                  providerName={bookingModalOption.provider_name}
                  totalPrice={bookingModalOption.estimated_price}
                  currency={bookingModalOption.currency || 'USD'}
                  onDone={() => {
                    setBookingModalOption(null);
                    setBookingSuccess(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transport Option Reviews Modal */}
      {reviewsModalOption && (
        <TransportReviewsModal
          option={reviewsModalOption}
          onClose={() => setReviewsModalOption(null)}
        />
      )}
    </div>
  );
};
