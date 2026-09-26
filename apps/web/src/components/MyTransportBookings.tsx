import React, { useState, useEffect } from 'react';
import {
  Car,
  Navigation,
  Train,
  Bike,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';

interface TransportBooking {
  id: string;
  user_id: string;
  transport_option_id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | string;
  scheduled_at: string;
  price_total: number;
  currency: string;
  idempotency_key?: string;
  notes?: string;
  transport_option?: {
    provider?: { name: string };
    mode: string;
    estimated_duration_min: number;
  };
  pickup_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  dropoff_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

export const MyTransportBookings: React.FC = () => {
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  // Cancel modal state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMyTransportBookings(
        1,
        20,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setBookings(res.data || []);
    } catch (err: any) {
      console.error('Fetch transport bookings error:', err);
      setError(err.message || 'Failed to load transport bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleCancel = async () => {
    if (!cancellingBookingId) return;
    setCancelLoading(true);
    try {
      await api.cancelTransportBooking(cancellingBookingId, cancelReason || 'User requested cancellation');
      setBookings((prev) =>
        prev.map((b) => (b.id === cancellingBookingId ? { ...b, status: 'cancelled' } : b))
      );
      setCancellingBookingId(null);
      setCancelReason('');
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message || 'Please try again.'}`);
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-500" />
            Cancelled
          </span>
        );
      case 'in_progress':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
            In Transit
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
            Completed
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-semibold">
            {status}
          </span>
        );
    }
  };

  const getModeIcon = (mode?: string) => {
    switch (mode) {
      case 'transit':
        return <Train className="w-4 h-4 text-indigo-600" />;
      case 'taxi':
        return <Car className="w-4 h-4 text-amber-600" />;
      case 'rideshare':
        return <Navigation className="w-4 h-4 text-slate-800" />;
      case 'bike':
        return <Bike className="w-4 h-4 text-emerald-600" />;
      default:
        return <Car className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Transport Reservations</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Transport Bookings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your direct transfers, verified taxi pickups, and transit pass reservations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          {(['all', 'confirmed', 'cancelled'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all capitalize ${
                statusFilter === filter
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Info notice about deep links */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-600">
        <ExternalLink className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-slate-800">Partner Handoff Notice: </span>
          Rides booked via deep link (Uber, Lime) are handled and billed directly within their mobile apps.
          TravelSync maintains immutable audit logs of each handoff event on your trip record.
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content list */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-sm font-medium">Loading your transport reservations...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Car className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-800">No transport bookings found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `You have no ${statusFilter} transport reservations.`
              : 'Search and book direct partner taxis or transit passes from the Find Transport tab.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {bookings.map((booking) => {
            const providerName =
              booking.transport_option?.provider?.name ||
              (booking.transport_option?.mode === 'transit' ? 'City Public Transit' : 'Partner Taxi Service');
            const mode = booking.transport_option?.mode || 'taxi';
            const isCancellable = booking.status === 'confirmed' || booking.status === 'pending';

            return (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      {getModeIcon(mode)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <h4 className="font-bold text-slate-900 text-base">{providerName}</h4>
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(booking.scheduled_at).toLocaleDateString()} at{' '}
                          {new Date(booking.scheduled_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          Ref: {booking.id.slice(0, 12)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Cancel Action */}
                  <div className="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-slate-900">
                        {booking.currency === 'USD' ? '$' : booking.currency}{' '}
                        {Number(booking.price_total).toFixed(2)}
                      </div>
                      <span className="text-[11px] text-slate-400">total paid</span>
                    </div>

                    {isCancellable && (
                      <button
                        onClick={() => {
                          setCancellingBookingId(booking.id);
                          setCancelReason('');
                        }}
                        className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100"
                      >
                        Cancel Ride
                      </button>
                    )}
                  </div>
                </div>

                {booking.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Notes:</span> {booking.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Cancel Transport Reservation</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel this booking? A full refund will be initiated to your original payment method.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule changed, took earlier train"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setCancellingBookingId(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-all"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
