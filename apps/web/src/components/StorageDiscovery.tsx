import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Luggage,
  Clock,
  Star,
  Shield,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Navigation,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { StorageDetailModal } from './StorageDetailModal';
import { StorageBookingModal } from './StorageBookingModal';

interface StorageDiscoveryProps {
  initialCoordinates?: { lat: number; lng: number };
  initialCity?: string;
  tripId?: string;
}

export const StorageDiscovery: React.FC<StorageDiscoveryProps> = ({
  initialCoordinates,
  initialCity = 'Berlin',
  tripId,
}) => {
  const [city, setCity] = useState(initialCity);
  const [lat, setLat] = useState(initialCoordinates?.lat || 52.520008);
  const [lng, setLng] = useState(initialCoordinates?.lng || 13.404954);

  const now = new Date();
  const [dropOffAt, setDropOffAt] = useState(
    new Date(now.getTime() + 2 * 3600000).toISOString().slice(0, 16)
  );
  const [pickUpAt, setPickUpAt] = useState(
    new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 16)
  );
  const [bagCount, setBagCount] = useState(1);
  const [itemSize, setItemSize] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [bookingLocation, setBookingLocation] = useState<any | null>(null);
  const [highlightedLocId, setHighlightedLocId] = useState<string | null>(null);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    if (newCity === 'Berlin') {
      setLat(52.520008);
      setLng(13.404954);
    } else if (newCity === 'Paris') {
      setLat(48.856613);
      setLng(2.352222);
    }
  };

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await apiClient.searchStorageLocations({
        lat,
        lng,
        city: city.toLowerCase(),
        drop_off_at: dropOffAt ? new Date(dropOffAt).toISOString() : undefined,
        pick_up_at: pickUpAt ? new Date(pickUpAt).toISOString() : undefined,
        bag_count: bagCount,
        item_size: itemSize !== 'all' ? itemSize : undefined,
        max_price: maxPrice,
        radius_km: 15,
      });
      setLocations(res.data || []);
      if (res.data?.length > 0 && !highlightedLocId) {
        setHighlightedLocId(res.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to search storage locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [city, lat, lng, bagCount, itemSize, maxPrice]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Luggage className="w-6 h-6 text-indigo-600" />
              <span>Luggage Storage Discovery</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Find verified, insured left-luggage drop points sorted by proximity, pricing, and ratings.
            </p>
          </div>

          {/* City Preset Switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl self-start">
            {['Berlin', 'Paris'].map((c) => (
              <button
                key={c}
                onClick={() => handleCityChange(c)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  city === c
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Drop-off Time</label>
            <input
              type="datetime-local"
              value={dropOffAt}
              onChange={(e) => setDropOffAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Pick-up Time</label>
            <input
              type="datetime-local"
              value={pickUpAt}
              onChange={(e) => setPickUpAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Bags Required</label>
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBagCount(num)}
                  className={`flex-1 py-1 rounded-lg font-bold text-xs transition-all ${
                    bagCount === num
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Bag Size / Category</label>
            <select
              value={itemSize}
              onChange={(e) => setItemSize(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Any Size (Standard)</option>
              <option value="cabin">Cabin / Backpack Only</option>
              <option value="large">Large Suitcase</option>
              <option value="oversized">Oversized / Heavy Equipment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Split Interactive Map & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Stylized City Map View */}
        <div className="lg:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[420px]">
          {/* Map Header */}
          <div className="flex items-center justify-between z-10 text-white">
            <div className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-200">Interactive {city} Radar</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {locations.length} verified hubs
            </span>
          </div>

          {/* Stylized SVG Map Graphic */}
          <div className="relative my-4 flex-1 flex items-center justify-center">
            <svg
              className="w-full h-64 text-slate-800"
              viewBox="0 0 400 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Map grid lines */}
              <circle cx="200" cy="150" r="120" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-slate-800" />
              <circle cx="200" cy="150" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-slate-800" />
              <circle cx="200" cy="150" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-slate-800" />
              <line x1="200" y1="20" x2="200" y2="280" stroke="currentColor" strokeWidth="1" className="text-slate-800/80" />
              <line x1="40" y1="150" x2="360" y2="150" stroke="currentColor" strokeWidth="1" className="text-slate-800/80" />

              {/* Center User Search Pin */}
              <g transform="translate(200, 150)">
                <circle cx="0" cy="0" r="10" fill="#6366F1" fillOpacity="0.3" className="animate-ping" />
                <circle cx="0" cy="0" r="6" fill="#6366F1" />
                <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
              </g>

              {/* Location Pins based on locations list */}
              {locations.slice(0, 6).map((loc, idx) => {
                // Approximate relative offsets for mock visualization
                const offsets = [
                  { x: 230, y: 110 },
                  { x: 160, y: 120 },
                  { x: 210, y: 180 },
                  { x: 270, y: 140 },
                  { x: 130, y: 170 },
                  { x: 180, y: 80 },
                ];
                const pos = offsets[idx % offsets.length];
                const isSelected = highlightedLocId === loc.id;

                return (
                  <g
                    key={loc.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      setHighlightedLocId(loc.id);
                      setSelectedLocation(loc);
                    }}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx="0"
                      cy="0"
                      r={isSelected ? '14' : '10'}
                      fill={isSelected ? '#10B981' : '#3B82F6'}
                      fillOpacity={isSelected ? '0.4' : '0.2'}
                      className="group-hover:scale-125 transition-transform"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r={isSelected ? '7' : '5'}
                      fill={isSelected ? '#10B981' : '#3B82F6'}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    {/* Tooltip badge */}
                    <text
                      x="0"
                      y="-12"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      className="drop-shadow"
                    >
                      ${loc.price_per_bag_per_day}/d
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Radar Center Legend */}
            <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>You / Arrival Point</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2" />
              <span>Storage Lockers</span>
            </div>
          </div>

          {/* Active Location Highlight Card in Map */}
          {highlightedLocId && (
            <div className="z-10 bg-slate-800/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 text-white flex items-center justify-between gap-3">
              {(() => {
                const active = locations.find((l) => l.id === highlightedLocId) || locations[0];
                if (!active) return null;
                return (
                  <>
                    <div className="truncate">
                      <h4 className="text-xs font-bold truncate text-white">{active.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{active.address}</p>
                    </div>
                    <button
                      onClick={() => setBookingLocation(active)}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs shrink-0 transition-colors"
                    >
                      Book ${Number(active.price_per_bag_per_day).toFixed(2)}
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* List of Storage Locations */}
        <div className="lg:col-span-7 space-y-3.5">
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <span>Searching nearby verified luggage storage points...</span>
            </div>
          ) : locations.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <Luggage className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No storage locations match your filters</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try widening your price range or adjusting the date window.
              </p>
            </div>
          ) : (
            locations.map((loc) => {
              const isSelected = highlightedLocId === loc.id;
              return (
                <div
                  key={loc.id}
                  onClick={() => setHighlightedLocId(loc.id)}
                  className={`bg-white rounded-3xl border p-5 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={
                        loc.photos?.[0] ||
                        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={loc.name}
                      className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-100"
                    />

                    <div>
                      <div className="flex items-center space-x-2 text-[11px] mb-1">
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          {loc.provider?.business_name || 'Verified Storage'}
                        </span>
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {loc.rating || 4.8}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {loc.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{loc.address}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px]">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          🚶 {loc.walking_time?.formatted_duration || '6 mins'} ({loc.distance_km} km)
                        </span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          {loc.available_capacity || 20} slots left
                        </span>
                        <span className="font-semibold text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-full capitalize">
                          Up to {loc.max_bag_size || 'large'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:self-center flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-2 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-lg font-black text-slate-900">
                        ${Number(loc.price_per_bag_per_day).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">per bag / day</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocation(loc);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookingLocation(loc);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
                      >
                        <span>Book</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedLocation && (
        <StorageDetailModal
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onBookNow={(loc) => setBookingLocation(loc)}
        />
      )}

      {bookingLocation && (
        <StorageBookingModal
          location={bookingLocation}
          tripId={tripId}
          defaultDropOff={dropOffAt}
          defaultPickUp={pickUpAt}
          onClose={() => setBookingLocation(null)}
          onBookingSuccess={() => {
            fetchLocations();
          }}
        />
      )}
    </div>
  );
};
