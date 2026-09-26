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
} from 'lucide-react';
import { api } from '../api/client';

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
        return <Train className="w-5 h-5 text-indigo-600" />;
      case 'taxi':
        return <Car className="w-5 h-5 text-amber-600" />;
      case 'rideshare':
        return <Navigation className="w-5 h-5 text-slate-800" />;
      case 'bike':
        return <Bike className="w-5 h-5 text-emerald-600" />;
      default:
        return <Car className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case 'transit':
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Multi-Modal Last-Mile Transport</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Compare & Book Local Transport
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Live quotes from partner taxis, city metro lines, and direct deep links to Uber & Lime.
            </p>
          </div>

          {/* Departure Time Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600">Departure:</span>
            <input
              type="datetime-local"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Origin / Destination Pickers with Presets */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Origin */}
          <div className="md:col-span-5 bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 focus-within:border-indigo-500 transition-all">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              Origin Pick-Up
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 truncate">{originLabel}</span>
              <select
                className="bg-white border border-slate-200 rounded-lg text-xs py-1 px-2 text-slate-600 focus:outline-none focus:border-indigo-500"
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
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {originLat.toFixed(4)}, {originLng.toFixed(4)}
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center">
            <button
              onClick={handleSwapLocations}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 transition-colors border border-slate-200 shadow-2xs"
              title="Swap Origin and Destination"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Destination */}
          <div className="md:col-span-5 bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 focus-within:border-indigo-500 transition-all">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Destination Drop-Off
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900 truncate">{destLabel}</span>
              <select
                className="bg-white border border-slate-200 rounded-lg text-xs py-1 px-2 text-slate-600 focus:outline-none focus:border-indigo-500"
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
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {destLat.toFixed(4)}, {destLng.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Mode Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Modes' },
              { id: 'transit', label: '🚇 Public Transit' },
              { id: 'taxi', label: '🚕 Partner Taxi' },
              { id: 'rideshare', label: '🚗 Rideshare' },
              { id: 'bike', label: '🚲 Micro-mobility' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedMode(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedMode === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchOptions}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all disabled:opacity-50"
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
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm font-medium">Calculating optimal transit routes and live quotes...</p>
          </div>
        ) : options.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
            <Car className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No transport options found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your origin, destination, or mode filter to view more transport routes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {options.map((opt) => {
              const hasSteps = opt.transit_steps && opt.transit_steps.length > 0;
              const isExpanded = expandedStepsId === opt.id;

              return (
                <div
                  key={opt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-indigo-100 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Provider Info & Mode */}
                    <div className="flex items-start space-x-3.5">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                        {getModeIcon(opt.mode)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-900 text-base">
                            {opt.provider_name}
                          </h4>
                          {getModeBadge(opt.mode)}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            ~{opt.estimated_duration_min} mins
                          </span>
                          <span>•</span>
                          <span>
                            {opt.is_direct_bookable ? (
                              <span className="text-emerald-700 font-medium">Direct Platform Booking</span>
                            ) : (
                              <span className="text-slate-600 font-medium">Deep Link Handoff</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-slate-900">
                          {opt.currency === 'USD' ? '$' : opt.currency} {opt.estimated_price.toFixed(2)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">estimated total</span>
                      </div>

                      {opt.is_direct_bookable ? (
                        <button
                          onClick={() => {
                            setBookingModalOption(opt);
                            setBookingSuccess(null);
                          }}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-200 transition-all flex items-center space-x-1.5"
                        >
                          <span>Book Direct</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleHandoff(opt)}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
                        >
                          <span>Open Partner App</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Transit Steps Toggle if available */}
                  {hasSteps && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setExpandedStepsId(isExpanded ? null : opt.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                      >
                        <span>{isExpanded ? 'Hide Step-by-Step Directions' : 'View Step-by-Step Directions'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70 space-y-2.5 animate-in fade-in">
                          {opt.transit_steps!.map((step, idx) => (
                            <div key={idx} className="flex items-start space-x-3 text-xs">
                              <div className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-slate-800 flex items-center gap-2">
                                  <span>{step.instruction}</span>
                                  {step.line && (
                                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                                      {step.line}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                  <span>{step.durationMinutes} mins</span>
                                  {step.distanceMeters && (
                                    <>
                                      <span>•</span>
                                      <span>{step.distanceMeters} m</span>
                                    </>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
            {!bookingSuccess ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Confirm Transport Booking</h3>
                    <p className="text-xs text-slate-500">Atomic instant reservation with partner confirmation</p>
                  </div>
                  <button
                    onClick={() => setBookingModalOption(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Provider:</span>
                    <span className="font-bold text-slate-900">{bookingModalOption.provider_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Origin:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">{originLabel}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Destination:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]">{destLabel}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Scheduled Departure:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(selectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(selectedTime).toLocaleDateString()})
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-indigo-100 pt-2">
                    <span className="font-bold text-slate-700">Total Price:</span>
                    <span className="text-base font-extrabold text-indigo-700">
                      ${bookingModalOption.estimated_price.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Special Pick-up Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Flight LH123 arriving, meeting at Terminal 1 pick-up zone"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => setBookingModalOption(null)}
                    className="flex-1 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDirectBooking}
                    disabled={bookingLoading}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                  >
                    {bookingLoading ? 'Processing...' : `Pay $${bookingModalOption.estimated_price.toFixed(2)}`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Booking Confirmed!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your transport booking reference is{' '}
                    <span className="font-mono font-bold text-slate-800">{bookingSuccess.id}</span>
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-xs text-left space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-emerald-700 uppercase">{bookingSuccess.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Provider:</span>
                    <span className="font-semibold text-slate-800">{bookingModalOption.provider_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paid:</span>
                    <span className="font-bold text-slate-900">${bookingModalOption.estimated_price.toFixed(2)} USD</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBookingModalOption(null);
                    setBookingSuccess(null);
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
