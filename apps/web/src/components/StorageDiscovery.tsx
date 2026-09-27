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
import { RadarTransitMap } from './motion/RadarTransitMap';
import { SplitFlapTicker } from './motion/SplitFlapTicker';

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
      <div className="bg-[#141A20] text-[#E8ECF0] rounded-[4px] border border-[#263038] p-5 shadow-transit-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#1C242A] text-signal font-bold rounded-[2px] border border-[#263038]">
                NETWORK TELEMETRY
              </span>
              <span className="font-mono text-[10px] text-[#718096]">ZONE 1-4 // VERIFIED LOCKERS</span>
            </div>
            <h2 className="text-xl font-display font-black text-[#E8ECF0] tracking-tight flex items-center gap-2 mt-1">
              <Luggage className="w-5 h-5 text-cargo-500" />
              <span>LUGGAGE STORAGE NETWORK</span>
            </h2>
            <p className="text-xs text-[#718096] font-mono mt-0.5">
              Secure bag drop facilities sorted by walking proximity, real-time locker capacity, and verified security tier.
            </p>
          </div>

          {/* City Preset Switcher */}
          <div className="flex items-center space-x-1 bg-[#0B0F12] p-1 rounded-[3px] border border-[#263038] self-start font-mono">
            {['Berlin', 'Paris'].map((c) => (
              <button
                key={c}
                onClick={() => handleCityChange(c)}
                className={`px-3.5 py-1 text-xs font-bold rounded-[2px] transition-all ${
                  city === c
                    ? 'bg-cargo-500 text-white shadow-cargo-glow'
                    : 'text-[#718096] hover:text-[#E8ECF0]'
                }`}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#263038] text-xs font-mono">
          <div>
            <label className="font-bold text-[#E8ECF0] block mb-1">DROP-OFF WINDOW</label>
            <input
              type="datetime-local"
              value={dropOffAt}
              onChange={(e) => setDropOffAt(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0F12] border border-[#263038] rounded-[3px] font-mono text-xs text-[#E8ECF0] focus:border-cargo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-[#E8ECF0] block mb-1">CLAIM BY WINDOW</label>
            <input
              type="datetime-local"
              value={pickUpAt}
              onChange={(e) => setPickUpAt(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0F12] border border-[#263038] rounded-[3px] font-mono text-xs text-[#E8ECF0] focus:border-cargo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-[#E8ECF0] block mb-1">BAG COUNT</label>
            <div className="flex items-center space-x-1.5 bg-[#0B0F12] border border-[#263038] rounded-[3px] p-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBagCount(num)}
                  className={`flex-1 py-1 rounded-[2px] font-bold text-xs transition-all ${
                    bagCount === num
                      ? 'bg-cargo-500 text-white shadow-cargo-glow'
                      : 'text-[#718096] hover:text-[#E8ECF0] hover:bg-[#141A20]'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-[#E8ECF0] block mb-1">DIMENSION SPEC</label>
            <select
              value={itemSize}
              onChange={(e) => setItemSize(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0F12] border border-[#263038] rounded-[3px] font-mono text-xs text-[#E8ECF0] focus:border-cargo-500 focus:outline-none"
            >
              <option value="all">Any Standard Size</option>
              <option value="cabin">Cabin / Backpack Only</option>
              <option value="large">Large Suitcase (28"+)</option>
              <option value="oversized">Oversized / Heavy Equipment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Split Interactive Map & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Radar Transit Map View */}
        <div className="lg:col-span-5">
          <RadarTransitMap
            city={city}
            locations={locations}
            highlightedLocId={highlightedLocId}
            onSelectLocation={(loc) => {
              setHighlightedLocId(loc.id);
              setSelectedLocation(loc);
            }}
            onBookLocation={(loc) => setBookingLocation(loc)}
          />
        </div>

        {/* List of Storage Locations styled as Luggage Waypoint Slips */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="bg-[#141A20] rounded-[4px] border border-[#263038] p-12 text-center text-[#718096] font-mono text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cargo-500" />
              <span>INTERROGATING LOCAL STORAGE HUBS & CAPACITY METERS...</span>
            </div>
          ) : locations.length === 0 ? (
            <div className="bg-[#141A20] rounded-[4px] border border-[#263038] p-12 text-center font-mono">
              <Luggage className="w-9 h-9 text-[#3A4854] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#E8ECF0]">NO STORAGE HUBS MATCH SPECIFIED CRITERIA</h3>
              <p className="text-xs text-[#718096] mt-1">
                Widen your radial distance query or modify your storage window.
              </p>
            </div>
          ) : (
            locations.map((loc) => {
              const isSelected = highlightedLocId === loc.id;
              return (
                <div
                  key={loc.id}
                  onClick={() => setHighlightedLocId(loc.id)}
                  className={`bg-[#141A20] text-[#E8ECF0] rounded-[4px] border p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden select-none ${
                    isSelected
                      ? 'border-cargo-500 ring-1 ring-cargo-500/50 shadow-cargo-glow'
                      : 'border-[#263038] hover:border-[#3A4854]'
                  }`}
                >
                  {/* Left Stenciled Color Edge */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isSelected ? 'bg-cargo-500' : 'bg-[#263038]'
                    }`}
                  />

                  <div className="flex items-start space-x-3.5 pl-1.5">
                    <img
                      src={
                        loc.photos?.[0] ||
                        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={loc.name}
                      className="w-16 h-16 rounded-[3px] object-cover shrink-0 border border-[#263038]"
                    />

                    <div>
                      <div className="flex items-center space-x-2 text-[10px] font-mono mb-1">
                        <span className="font-bold text-concourse-400 bg-[#0E1F1B] px-1.5 py-0.2 rounded-[2px] border border-[#1E3A34]">
                          {loc.provider?.business_name || 'VERIFIED HUB'}
                        </span>
                        <span className="flex items-center gap-0.5 text-signal font-bold">
                          <Star className="w-3 h-3 fill-signal text-signal" />
                          {loc.rating || 4.8}
                        </span>
                        <span className="text-[#718096]">
                          // {loc.walking_time?.formatted_duration || '6 MIN'} WALK
                        </span>
                      </div>

                      <h3 className="font-display font-extrabold text-sm text-[#E8ECF0] leading-snug">
                        {loc.name}
                      </h3>
                      <p className="font-mono text-xs text-[#718096] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-cargo-500 shrink-0" />
                        <span className="truncate max-w-xs">{loc.address}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2 font-mono text-[10px]">
                        <span className="font-semibold text-signal-400 bg-[#1C242A] px-2 py-0.5 rounded-[2px] border border-[#263038]">
                          {loc.available_capacity || 20} SLOTS OPEN
                        </span>
                        <span className="text-[#718096] bg-[#0B0F12] px-2 py-0.5 rounded-[2px] border border-[#263038] uppercase">
                          UP TO {loc.max_bag_size || 'LARGE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Price & Actions */}
                  <div className="sm:self-center flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#263038] gap-2 shrink-0">
                    <div className="text-left sm:text-right font-mono">
                      <SplitFlapTicker
                        value={Number(loc.price_per_bag_per_day).toFixed(2)}
                        prefix="$"
                        size="md"
                      />
                      <span className="text-[9px] text-[#718096] block uppercase tracking-wider mt-0.5">
                        PER BAG / DAY
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLocation(loc);
                        }}
                        className="px-2.5 py-1.5 text-xs font-mono font-semibold text-[#718096] hover:text-[#E8ECF0] hover:bg-[#1E262C] rounded-[2px] transition-colors"
                      >
                        SPECS
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookingLocation(loc);
                        }}
                        className="px-3.5 py-1.5 bg-cargo-500 hover:bg-cargo-600 text-white font-mono text-xs font-bold rounded-[3px] shadow-cargo-glow transition-all flex items-center gap-1 active:scale-95"
                      >
                        <span>LOCK SLOT</span>
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
