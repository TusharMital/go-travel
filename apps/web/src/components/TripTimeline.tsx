import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Luggage,
  Plane,
  Building,
  Car,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export interface ItineraryItem {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'storage' | 'transport';
  title: string;
  location_lat?: number | null;
  location_lng?: number | null;
  address?: string | null;
  starts_at: string;
  ends_at: string;
  sequence_order: number;
  linked_storage_booking_id?: string | null;
  linked_transport_booking_id?: string | null;
}

export interface ItineraryGap {
  id: string;
  gapType: 'ARRIVAL_GAP' | 'DEPARTURE_GAP' | 'TIMELINE_GAP';
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  durationFormatted: string;
  recommendedLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  hasStorageBooked: boolean;
  hasTransportBooked: boolean;
  recommendationAction: 'BOOK_STORAGE' | 'BOOK_TRANSPORT' | 'ALL_SET';
  previousItemId?: string;
  nextItemId?: string;
}

interface TripTimelineProps {
  tripId: string;
  onBack: () => void;
  onFindStorage?: (location: { lat: number; lng: number; address?: string }) => void;
  onFindTransport?: (origin: { lat: number; lng: number; address?: string }) => void;
}

export const TripTimeline: React.FC<TripTimelineProps> = ({
  tripId,
  onBack,
  onFindStorage,
  onFindTransport,
}) => {
  const [trip, setTrip] = useState<any>(null);
  const [gaps, setGaps] = useState<ItineraryGap[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Item Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [itemType, setItemType] = useState<ItineraryItem['type']>('flight');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      const [tripRes, gapsRes] = await Promise.all([
        api.request<any>(`/trips/${tripId}`),
        api.request<{ data: ItineraryGap[] }>(`/trips/${tripId}/gaps`),
      ]);
      setTrip(tripRes);
      setGaps(gapsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load trip timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const openCreateModal = () => {
    setEditingItem(null);
    setItemType('flight');
    setTitle('');
    setAddress('');
    setStartsAt('');
    setEndsAt('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ItineraryItem) => {
    setEditingItem(item);
    setItemType(item.type);
    setTitle(item.title);
    setAddress(item.address || '');
    setStartsAt(item.starts_at.slice(0, 16));
    setEndsAt(item.ends_at.slice(0, 16));
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const idempotencyKey = `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const payload = {
        type: itemType,
        title,
        address: address || undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        location_lat: 52.52,
        location_lng: 13.4,
      };

      if (editingItem) {
        await api.request(`/trips/${tripId}/itinerary/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(payload),
        });
      } else {
        await api.request(`/trips/${tripId}/itinerary`, {
          method: 'POST',
          headers: { 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchTripDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to save itinerary item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this stop from your itinerary?')) return;
    try {
      await api.request(`/trips/${tripId}/itinerary/${itemId}`, {
        method: 'DELETE',
      });
      fetchTripDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-4 h-4 text-sky-600" />;
      case 'hotel':
        return <Building className="w-4 h-4 text-[#1E3A34]" />;
      case 'storage':
        return <Luggage className="w-4 h-4 text-[#FF6B35]" />;
      case 'transport':
        return <Car className="w-4 h-4 text-[#F2C94C]" />;
      default:
        return <Compass className="w-4 h-4 text-[#263038]" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
        <div className="h-64 bg-slate-50 rounded" />
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-sm hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Trips</span>
        </button>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FF6B35] hover:bg-[#E85D26] text-white text-xs font-mono uppercase tracking-wider font-bold rounded-sm shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stop / Activity</span>
        </button>
      </div>

      {/* Trip Banner Header */}
      <div className="bg-[#FAF9F5] rounded-xl border border-[#D5D2C7] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#FF6B35] mb-1">
            <span className="uppercase tracking-widest">{trip.status}</span>
            <span>•</span>
            <span>{trip.timezone}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {trip.title}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
            <div className="flex items-center space-x-1.5 font-medium">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{trip.origin_place}</span>
              <span className="text-slate-400">→</span>
              <span className="font-bold text-slate-900">{trip.destination_place}</span>
            </div>
            <div className="flex items-center space-x-1.5 font-medium">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {new Date(trip.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} -{' '}
                {new Date(trip.end_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Gap Summary Badge */}
        {gaps.length > 0 ? (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 sm:max-w-xs flex items-start space-x-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block">
                {gaps.length} Itinerary {gaps.length === 1 ? 'Gap' : 'Gaps'} Detected
              </span>
              <span className="text-amber-700">
                You have unscheduled windows between arrival and check-in. Storage recommended.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:max-w-xs flex items-start space-x-3 text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold block">Seamless Timeline</span>
              <span className="text-emerald-700">No awkward luggage arrival gaps detected on this trip.</span>
            </div>
          </div>
        )}
      </div>

      {/* Chronological Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-4">
          <span>Itinerary Timeline</span>
          <span className="text-xs font-normal text-slate-500">
            {trip.itinerary_items.length} stops recorded
          </span>
        </h3>

        {trip.itinerary_items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <p className="text-sm">No items added to this itinerary yet.</p>
            <p className="text-xs text-slate-400">
              Add your arrival flight or train to enable automatic gap detection.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {trip.itinerary_items.map((item: ItineraryItem, idx: number) => {
              const startFormatted = new Date(item.starts_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const endFormatted = new Date(item.ends_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateFormatted = new Date(item.starts_at).toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });

              // Check if a gap follows this item
              const followingGap = gaps.find((g) => g.previousItemId === item.id);

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-300 group-hover:border-[#FF6B35] flex items-center justify-center shadow-xs transition-colors">
                    <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-[#FF6B35]" />
                  </div>

                  {/* Stop Card */}
                  <div className="bg-slate-50/70 hover:bg-slate-50 rounded-lg border border-slate-200/80 p-4 sm:p-5 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-white rounded-sm border border-slate-200 shadow-2xs">
                          {getItemIcon(item.type)}
                        </div>
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                          {item.type}
                        </span>
                        {item.linked_storage_booking_id && (
                          <span className="bg-[#FF6B35]/15 text-[#FF6B35] text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border border-[#FF6B35]/30 flex items-center gap-1">
                            <Luggage className="w-3 h-3" /> Auto-Linked Storage
                          </span>
                        )}
                        {item.linked_transport_booking_id && (
                          <span className="bg-[#1E3A34]/15 text-[#1E3A34] text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border border-[#1E3A34]/30 flex items-center gap-1">
                            <Car className="w-3 h-3" /> Auto-Linked Ride
                          </span>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-semibold text-slate-700">{dateFormatted}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-medium text-slate-600">
                          {startFormatted} - {endFormatted}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 text-slate-400 hover:text-[#FF6B35] rounded"
                            title="Edit stop"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    {item.address && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{item.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Interleaved Gap Banner if detected right after this item */}
                  {followingGap && (
                    <div className="my-4 ml-2 sm:ml-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 rounded-r-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-extrabold text-amber-900">
                                {followingGap.title}
                              </span>
                              <span className="bg-amber-200/80 text-amber-900 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                {followingGap.durationFormatted}
                              </span>
                            </div>
                            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                              {followingGap.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                          {followingGap.hasStorageBooked ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Storage Secured</span>
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                onFindStorage?.(followingGap.recommendedLocation)
                              }
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0"
                            >
                              <Luggage className="w-3.5 h-3.5" />
                              <span>Find Storage</span>
                            </button>
                          )}

                          {onFindTransport && (
                            <button
                              onClick={() => onFindTransport(followingGap.recommendedLocation)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-all shrink-0"
                            >
                              <Car className="w-3.5 h-3.5 text-[#FF6B35]" />
                              <span>Find Transport</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingItem ? 'Edit Itinerary Stop' : 'Add Itinerary Stop'}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stop Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['flight', 'hotel', 'storage', 'transport', 'activity'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setItemType(t)}
                      className={`p-2 rounded-sm text-xs font-mono font-semibold uppercase tracking-wider border transition-all ${
                        itemType === t
                          ? 'border-[#FF6B35] bg-[#FF6B35]/10 text-[#FF6B35] shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Flight BA 982 or Hotel Adlon Check-in"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Location / Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Willy-Brandt-Platz 1, Berlin"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Starts At</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-slate-700 mb-1 uppercase tracking-wider">Ends At</label>
                  <input
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-semibold text-slate-600 hover:bg-slate-100 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#FF6B35] hover:bg-[#E85D26] text-white text-xs font-mono font-bold uppercase tracking-wider rounded-sm shadow-xs transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Stop' : 'Add Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
