import React, { useState, useEffect } from 'react';
import {
  Luggage,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/client';

export const MyStorageBookings: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Trip schedule changed');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const res = await apiClient.listMyStorageBookings(1, 50, filter);
      setBookings(res.data || []);
    } catch (err: any) {
      console.error('Failed to load storage bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setCancellingId(cancelModalBooking.id);
    try {
      await apiClient.cancelStorageBooking(cancelModalBooking.id, cancelReason);
      setFeedback({
        message: `Booking #${cancelModalBooking.id.slice(0, 8)} successfully cancelled. Your refund has been initiated and slots restored.`,
        type: 'success',
      });
      setCancelModalBooking(null);
      await fetchBookings();
    } catch (err: any) {
      setFeedback({ message: err.message || 'Failed to cancel booking.', type: 'error' });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full text-[11px] font-bold">
            <Clock className="w-3.5 h-3.5" />
            Bags Checked In
          </span>
        );
      case 'checked_out':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/80 rounded-full text-[11px] font-bold">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled & Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            My Storage Reservations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track active bag drop-offs, access digital check-in passes, and manage cancellations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs self-start">
          {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <span>Loading your storage reservations...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-3xl mx-auto flex items-center justify-center mb-3">
            <Luggage className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No storage bookings found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don't have any bookings matching this status. Find verified lockers and stash your bags while travelling.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((booking) => {
            const isConfirmed = booking.status === 'confirmed';
            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      REF: #{booking.id.slice(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {booking.location?.name || 'Verified Storage Hub'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{booking.location?.address || 'Berlin, Germany'}</span>
                  </p>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 mt-3.5 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Drop-Off</span>
                      <span className="font-bold text-slate-800">
                        {new Date(booking.drop_off_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(booking.drop_off_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pick-Up</span>
                      <span className="font-bold text-slate-800">
                        {new Date(booking.pick_up_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(booking.pick_up_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">
                      {booking.bag_count} {booking.bag_count === 1 ? 'bag' : 'bags'} •{' '}
                    </span>
                    <span className="font-extrabold text-slate-900">
                      ${Number(booking.price_total).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isConfirmed && (
                      <button
                        onClick={() => setCancelModalBooking(booking)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-xl transition-all"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Cancel Storage Booking?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cancelling will release your reserved locker capacity and trigger a full refund of $
                {Number(cancelModalBooking.price_total).toFixed(2)} back to your card.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Trip schedule changed">Trip schedule changed</option>
                <option value="Found alternative accommodation">Found alternative accommodation</option>
                <option value="Booked wrong date/location">Booked wrong date/location</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={Boolean(cancellingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                {cancellingId ? 'Cancelling...' : 'Confirm Cancellation & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
