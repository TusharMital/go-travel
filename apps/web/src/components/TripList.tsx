import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Plus, Calendar, MapPin, ArrowRight, Trash2, Clock, Luggage, AlertCircle, Plane } from 'lucide-react';

export interface Trip {
  id: string;
  title: string;
  origin_place: string;
  destination_place: string;
  start_date: string;
  end_date: string;
  timezone: string;
  status: string;
  _count?: {
    itinerary_items: number;
    storage_bookings: number;
    transport_bookings: number;
  };
}

interface TripListProps {
  onSelectTrip: (tripId: string) => void;
}

export const TripList: React.FC<TripListProps> = ({ onSelectTrip }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.request<{ data: Trip[]; meta: any }>('/trips?limit=20');
      setTrips(res.data);
    } catch (err: any) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setErrorMsg(null);
    try {
      const idempotencyKey = `trip-create-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await api.request('/trips', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          title,
          origin_place: origin,
          destination_place: destination,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
          timezone: 'Europe/Berlin',
        }),
      });
      setIsCreateOpen(false);
      setTitle('');
      setOrigin('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      fetchTrips();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create trip');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTrip = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this trip?')) return;
    try {
      await api.request(`/trips/${tripId}`, { method: 'DELETE' });
      setTrips(trips.filter((t) => t.id !== tripId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete trip');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Trips & Itineraries</h2>
          <p className="text-xs text-slate-500 mt-1">
            Organize travels, track timeline windows, and discover gaps needing luggage handling.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#E85D26] text-white text-xs font-mono uppercase tracking-wider font-bold rounded-sm shadow-xs transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Plan New Trip</span>
        </button>
      </div>

      {/* Trips Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-slate-200 animate-pulse h-48" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-[#FAF9F5] rounded-xl border border-dashed border-[#D5D2C7] p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20 rounded-sm flex items-center justify-center mx-auto">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">No Trips Planned Yet</h3>
            <p className="text-xs text-slate-600 mt-1">
              Start planning your journey to uncover itinerary arrival gaps and book luggage storage seamlessly.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#FF6B35] hover:bg-[#E85D26] text-white text-xs font-mono uppercase tracking-wider font-bold rounded-sm shadow-xs"
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => {
            const start = new Date(trip.start_date).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });
            const end = new Date(trip.end_date).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={trip.id}
                onClick={() => onSelectTrip(trip.id)}
                className="group bg-[#FAF9F5] rounded-lg border border-[#D5D2C7] p-5 shadow-xs hover:border-[#FF6B35] transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30">
                      {trip.status}
                    </span>
                    <button
                      onClick={(e) => handleDeleteTrip(e, trip.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-sm transition-colors"
                      title="Delete trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-display font-bold text-slate-900 group-hover:text-[#FF6B35] transition-colors line-clamp-1 mb-2">
                    {trip.title}
                  </h3>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-600 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{trip.origin_place}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-semibold text-slate-800 truncate">{trip.destination_place}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {start} - {end}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-between text-xs mt-4">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {trip._count?.itinerary_items || 0} STOPS LOGGED
                  </span>
                  <span className="font-mono font-bold text-[#FF6B35] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                    <span>VIEW TIMELINE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Trip Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Plan a New Trip</h3>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTrip} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Trip Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Berlin Weekend Getaway"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Origin</label>
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="London LHR"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Destination</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Berlin BER"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-semibold text-slate-600 hover:bg-slate-100 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-[#FF6B35] hover:bg-[#E85D26] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm shadow-xs transition-all disabled:opacity-50"
                >
                  {createLoading ? 'Saving...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
