import React, { useState, useEffect } from 'react';
import { partnerApi, PartnerBooking } from '../api/client';
import {
  CheckCircle2,
  Clock,
  Luggage,
  User,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Filter,
  Check,
  Calendar,
} from 'lucide-react';

export const BookingsManagementTab: React.FC = () => {
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await partnerApi.listBookings(1, 50, activeFilter === 'all' ? undefined : activeFilter);
      if (res && res.data) {
        setBookings(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load partner bookings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [activeFilter]);

  const handleCheckIn = async (bookingId: string) => {
    try {
      setProcessingId(bookingId);
      await partnerApi.checkInBooking(bookingId);
      setFeedback(`Booking ${bookingId.slice(0, 8)} marked CHECKED-IN! Capacity & audit trail updated.`);
      setTimeout(() => setFeedback(null), 4000);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'checked_in' } : b))
      );
    } catch (err: any) {
      alert(`Check-in failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      setProcessingId(bookingId);
      await partnerApi.checkOutBooking(bookingId);
      setFeedback(`Booking ${bookingId.slice(0, 8)} marked CHECKED-OUT! Stash completed.`);
      setTimeout(() => setFeedback(null), 4000);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: 'checked_out' } : b))
      );
    } catch (err: any) {
      alert(`Check-out failed: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>Confirmed (Arrival Expected)</span>
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Checked-In (Bags in Storage)</span>
          </span>
        );
      case 'checked_out':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Checked-Out (Completed)</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Cancelled (Refunded)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Manage Luggage Bookings</h2>
          <p className="text-xs text-slate-500">
            Review incoming arrivals, verify digital passes, and record check-in / check-out timestamps.
          </p>
        </div>

        <button
          onClick={loadBookings}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Bookings</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const).map((filterKey) => (
          <button
            key={filterKey}
            onClick={() => setActiveFilter(filterKey)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
              activeFilter === filterKey
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {filterKey.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-emerald-900 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Luggage className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No bookings in this filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Bookings made by travelers in the Traveler app will immediately appear here for your locations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isProcessing = processingId === booking.id;
            return (
              <div
                key={booking.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all"
              >
                {/* Left Booking Info */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {booking.id.slice(0, 14)}
                    </span>
                    {getStatusBadge(booking.status)}
                    <span className="text-xs text-slate-400 font-medium">
                      Location: <strong className="text-slate-700">{booking.location?.name || 'Berlin Central Hub'}</strong>
                    </span>
                  </div>

                  {/* Customer & Schedule Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block font-medium text-[11px]">Traveler Customer</span>
                      <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{booking.user?.full_name || 'Traveler'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{booking.user?.email}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block font-medium text-[11px]">Drop-Off / Pick-Up Window</span>
                      <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{new Date(booking.drop_off_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-slate-400 font-normal">→</span>
                        <span>{new Date(booking.pick_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(booking.drop_off_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-slate-400 block font-medium text-[11px]">Reserved Bags & Payout</span>
                      <div className="font-extrabold text-slate-900 mt-0.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Luggage className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{booking.bag_count || 1} Bag{(booking.bag_count || 1) > 1 ? 's' : ''}</span>
                        </span>
                        <span className="text-emerald-600 text-sm">${Number(booking.price_total).toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Paid via Card</p>
                    </div>
                  </div>
                </div>

                {/* Right Interactive Operational Actions */}
                <div className="shrink-0 flex items-center md:flex-col justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleCheckIn(booking.id)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isProcessing ? 'Verifying...' : 'Mark Checked-In'}</span>
                    </button>
                  )}

                  {booking.status === 'checked_in' && (
                    <button
                      onClick={() => handleCheckOut(booking.id)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isProcessing ? 'Releasing...' : 'Mark Checked-Out'}</span>
                    </button>
                  )}

                  {booking.status === 'checked_out' && (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      ✓ Storage Completed
                    </span>
                  )}

                  {booking.status === 'cancelled' && (
                    <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                      Refund Processed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
